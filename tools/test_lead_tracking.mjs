/**
 * Headless proof for first-touch attribution, A24 makor, and generate_lead.
 *
 * Every window.fetch is stubbed. Node's fetch rejects any make.com URL.
 * Nothing is sent to the Make webhook.
 *
 *   npm install --prefix /tmp/privacy-harness jsdom
 *   node tools/test_lead_tracking.mjs
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const jsdomPkg = process.env.JSDOM_PACKAGE || '/tmp/privacy-harness/node_modules/jsdom/package.json';
const { JSDOM } = createRequire(jsdomPkg)('jsdom');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const siteJs = fs.readFileSync(path.join(root, 'assets/site.js'), 'utf8');
const TRACK = 'window.MENIFA_TRACK={"ga4": "", "meta_pixel": "", "clarity": ""}';

const makeHits = [];
const nativeFetch = globalThis.fetch;
globalThis.fetch = function (url, opts) {
  const href = String(url && url.url ? url.url : url);
  if (href.includes('make.com')) {
    makeHits.push(href);
    return Promise.reject(new Error('blocked make.com'));
  }
  if (typeof nativeFetch === 'function') return nativeFetch.call(globalThis, url, opts);
  return Promise.reject(new Error('network disabled'));
};

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL: ' + msg);
    process.exitCode = 1;
    throw new Error(msg);
  }
}

function dumpStorage(window) {
  const bag = {};
  for (let i = 0; i < window.sessionStorage.length; i++) {
    const key = window.sessionStorage.key(i);
    bag[key] = window.sessionStorage.getItem(key);
  }
  return bag;
}

function boot(file, url, opts) {
  opts = opts || {};
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const domOpts = {
    url: url,
    pretendToBeVisual: true,
    runScripts: 'outside-only'
  };
  if (opts.referrer) domOpts.referrer = opts.referrer;
  const dom = new JSDOM(html, domOpts);
  const { window } = dom;
  window.scrollTo = function () {};
  if (opts.storage) {
    Object.keys(opts.storage).forEach(function (key) {
      window.sessionStorage.setItem(key, opts.storage[key]);
    });
  }
  if (opts.consent !== false) {
    window.localStorage.setItem('menifa-consent', JSON.stringify({
      v: 2, necessary: true, statistics: true, marketing: true, ts: '2026-10-06T00:00:00.000Z'
    }));
  }
  const crm = [];
  window.fetch = function (fetchUrl, init) {
    const href = String(fetchUrl);
    crm.push({
      url: href,
      mode: init && init.mode,
      body: init && init.body ? String(init.body) : ''
    });
    if (opts.fetchImpl) return opts.fetchImpl(fetchUrl, init);
    return Promise.resolve({ ok: true, status: 200, type: 'basic' });
  };
  window.eval(siteJs);
  return { window, crm };
}

async function flush() {
  await new Promise(function (resolve) { setTimeout(resolve, 0); });
}

function fill(window) {
  const form = window.document.querySelector('form[data-lead]');
  assert(form, 'lead form missing on ' + window.location.pathname);
  form.querySelector('[name=name]').value = 'בדיקת ייחוס';
  form.querySelector('[name=phone]').value = '050-1234567';
  const need = form.querySelector('[name=need]');
  if (need) need.value = 'מסורבי בנקים';
  form.querySelector('[name=consent]').checked = true;
  return form;
}

function leadEvents(window) {
  return (window.dataLayer || []).filter(function (e) { return e && e.event === 'generate_lead'; });
}

function decoded(entry) {
  return Object.fromEntries(new URLSearchParams(entry.body));
}

const MAKOR = [
  ['https://menifa.org/contact.html?utm_source=google&utm_medium=organic', 'seo'],
  ['https://menifa.org/contact.html?utm_source=Google&utm_medium=Organic', 'seo'],
  ['https://menifa.org/contact.html?utm_source=google&utm_medium=cpc', 'google'],
  ['https://menifa.org/contact.html?utm_source=google&utm_medium=paid', 'google'],
  ['https://menifa.org/contact.html?utm_source=google&utm_medium=ppc', 'google'],
  ['https://menifa.org/contact.html?utm_source=facebook&utm_medium=paid_social', 'meta'],
  ['https://menifa.org/contact.html?utm_source=fb&utm_medium=paid', 'meta'],
  ['https://menifa.org/contact.html?utm_source=ig&utm_medium=cpc', 'meta'],
  ['https://menifa.org/contact.html?utm_source=instagram&utm_medium=social', 'meta'],
  ['https://menifa.org/contact.html?utm_source=meta&utm_medium=paid', 'meta'],
  ['https://menifa.org/contact.html?utm_medium=referral', 'referral'],
  ['https://menifa.org/contact.html?utm_source=referral&utm_medium=email', 'referral'],
  ['https://menifa.org/contact.html?utm_source=partner', 'b2b'],
  ['https://menifa.org/contact.html?utm_source=b2b&utm_medium=email', 'b2b'],
  ['https://menifa.org/contact.html?utm_source=affiliate&utm_medium=cpc', 'b2b'],
  ['https://menifa.org/contact.html', 'לא מיוחס'],
  ['https://menifa.org/contact.html?utm_source=google', 'לא מיוחס'],
  ['https://menifa.org/contact.html?gclid=Cj0test', 'לא מיוחס'],
  ['https://menifa.org/contact.html?fbclid=IwARtest', 'לא מיוחס'],
  ['https://menifa.org/contact.html?utm_source=first_src', 'לא מיוחס']
];

for (const [url, expected] of MAKOR) {
  const session = boot('contact.html', url, { referrer: 'https://www.google.com/search?q=1' });
  const form = fill(session.window);
  form.dispatchEvent(new session.window.Event('submit', { bubbles: true, cancelable: true }));
  await flush();
  assert(session.crm.length === 1, 'expected one post for ' + url);
  const fields = decoded(session.crm[0]);
  assert(fields['מקור_הפניה'] === expected, url + ' מקור_הפניה ' + fields['מקור_הפניה']);
  assert(fields.makor_hafnia === expected, url + ' makor_hafnia ' + fields.makor_hafnia);
  assert(session.crm[0].mode === 'cors', 'mode for ' + url);
  const ev = leadEvents(session.window);
  assert(ev.length === 1, 'generate_lead missing for success ' + url);
  assert(!Object.prototype.hasOwnProperty.call(ev[0], 'need'), 'need leaked');
  assert(!Object.prototype.hasOwnProperty.call(ev[0], 'makor_hafnia'), 'makor leaked');
  assert(!Object.prototype.hasOwnProperty.call(ev[0], 'מקור_הפניה'), 'hebrew makor leaked');
  assert(!Object.prototype.hasOwnProperty.call(ev[0], 'name'), 'name leaked');
  assert(!Object.prototype.hasOwnProperty.call(ev[0], 'phone'), 'phone leaked');
  assert(ev[0].event_id === fields.event_id, 'event_id diverged');
  assert(fields.need === 'מסורבי בנקים', 'CRM lost need');
}

const gclid = boot('contact.html', 'https://menifa.org/contact.html?gclid=Cj0test');
fill(gclid.window).dispatchEvent(new gclid.window.Event('submit', { bubbles: true, cancelable: true }));
await flush();
const gclidFields = decoded(gclid.crm[0]);
assert(gclidFields.gclid === 'Cj0test', 'gclid not stored');
assert(gclidFields['מקור_הפניה'] === 'לא מיוחס', 'gclid must not invent a channel');

let bag = {};
const home = boot('index.html', 'https://menifa.org/?utm_source=first_src', { referrer: 'https://www.google.com/' });
bag = dumpStorage(home.window);
const homeAtt = JSON.parse(bag['menifa-att']);
assert(homeAtt.utm_source === 'first_src', 'first touch not stored');
assert(homeAtt.landing === '/', 'landing should be /');
assert(homeAtt.referrer === 'www.google.com', 'referrer host not stored: ' + homeAtt.referrer);
assert(homeAtt.last_utm_source === 'first_src', 'last touch should start as the first campaign');

const contactPass = boot('contact.html', 'https://menifa.org/contact.html', { storage: bag });
bag = dumpStorage(contactPass.window);
assert(JSON.parse(bag['menifa-att']).utm_source === 'first_src', 'contact navigation overwrote first touch');
assert(JSON.parse(bag['menifa-att']).landing === '/', 'landing changed on contact');

const ihud = boot('lp/ihud/index.html', 'https://menifa.org/lp/ihud/?utm_source=second_src', { storage: bag });
bag = dumpStorage(ihud.window);
const locked = JSON.parse(bag['menifa-att']);
assert(locked.utm_source === 'first_src', 'second utm overwrote first touch');
assert(locked.last_utm_source === 'second_src', 'last touch missing');
assert(locked.landing === '/', 'landing changed on second touch');
assert(locked.utm_medium === '', 'first medium should stay empty');
assert(locked.last_utm_medium === '', 'partial last touch should replace the set');

const pages = [
  ['lp/ihud/index.html', 'https://menifa.org/lp/ihud/?utm_source=second_src', 'lp-ihud', '/lp/ihud/'],
  ['contact.html', 'https://menifa.org/contact.html', 'contact', '/contact.html'],
  ['calculators.html', 'https://menifa.org/calculators.html', 'calculators', '/calculators.html']
];
const bodies = {};
for (const [file, url, source, page] of pages) {
  const session = boot(file, url, { storage: bag });
  const form = fill(session.window);
  form.dispatchEvent(new session.window.Event('submit', { bubbles: true, cancelable: true }));
  await flush();
  assert(session.crm.length === 1, 'posts for ' + page + ': ' + session.crm.length);
  const fields = decoded(session.crm[0]);
  assert(fields.utm_source === 'first_src', page + ' utm_source ' + fields.utm_source);
  assert(fields.last_utm_source === 'second_src', page + ' last_utm_source ' + fields.last_utm_source);
  assert(fields.landing === '/', page + ' landing ' + fields.landing);
  assert(fields['מקור_הפניה'] === 'לא מיוחס', page + ' makor');
  assert(fields.makor_hafnia === 'לא מיוחס', page + ' makor_hafnia');
  assert(fields.source === source, page + ' source ' + fields.source);
  assert(fields.page === page, page + ' page ' + fields.page);
  assert(fields.referrer === 'www.google.com', page + ' referrer');
  const ev = leadEvents(session.window);
  assert(ev.length === 1, page + ' generate_lead');
  assert(ev[0].event_id === fields.event_id, page + ' event_id');
  assert(ev[0].form === source && ev[0].page === page, page + ' analytics ids');
  assert(ev[0].value === 1 && ev[0].currency === 'ILS', page + ' value');
  assert(!Object.prototype.hasOwnProperty.call(ev[0], 'need'), page + ' need leaked');
  const msg = session.window.document.querySelector('[data-f=okmsg]');
  assert(msg && msg.textContent.indexOf('הפרטים התקבלו') === 0, page + ' success copy');
  bodies[page] = fields;
}

const seoThenMeta = boot('index.html', 'https://menifa.org/?utm_source=google&utm_medium=organic&utm_campaign=brand');
const afterSeo = dumpStorage(seoThenMeta.window);
const second = boot('lp/ihud/index.html', 'https://menifa.org/lp/ihud/?utm_source=facebook&utm_medium=paid_social&utm_campaign=retarget', { storage: afterSeo });
fill(second.window).dispatchEvent(new second.window.Event('submit', { bubbles: true, cancelable: true }));
await flush();
const mixed = decoded(second.crm[0]);
assert(mixed.utm_source === 'google' && mixed.utm_medium === 'organic', 'first touch lost on paid follow-up');
assert(mixed.last_utm_source === 'facebook' && mixed.last_utm_medium === 'paid_social', 'last touch');
assert(mixed['מקור_הפניה'] === 'seo' && mixed.makor_hafnia === 'seo', 'makor must stay first-touch seo');
assert(mixed.landing === '/', 'seo landing');
bodies.makor_stays_first_touch = {
  utm_source: mixed.utm_source,
  utm_medium: mixed.utm_medium,
  last_utm_source: mixed.last_utm_source,
  last_utm_medium: mixed.last_utm_medium,
  'מקור_הפניה': mixed['מקור_הפניה'],
  makor_hafnia: mixed.makor_hafnia,
  landing: mixed.landing
};

const failed = boot('contact.html', 'https://menifa.org/contact.html?utm_source=google&utm_medium=cpc', {
  fetchImpl: function () { return Promise.reject(new Error('network down')); }
});
fill(failed.window).dispatchEvent(new failed.window.Event('submit', { bubbles: true, cancelable: true }));
await flush();
assert(failed.crm.length === 1, 'failure must not retry the post');
assert(failed.crm[0].mode === 'cors', 'failure retry must not switch to no-cors');
assert(leadEvents(failed.window).length === 0, 'generate_lead fired after a network error');
const failMsg = failed.window.document.querySelector('[data-f=okmsg]');
assert(failMsg && failMsg.textContent.indexOf('עוד צעד אחד') === 0, 'network failure should show the WhatsApp handoff');

const httpFail = boot('contact.html', 'https://menifa.org/contact.html?utm_source=google&utm_medium=cpc', {
  fetchImpl: function () { return Promise.resolve({ ok: false, status: 500, type: 'basic' }); }
});
fill(httpFail.window).dispatchEvent(new httpFail.window.Event('submit', { bubbles: true, cancelable: true }));
await flush();
assert(httpFail.crm.length === 1, 'HTTP failure must not retry');
assert(leadEvents(httpFail.window).length === 0, 'generate_lead fired when res.ok is false');
const httpMsg = httpFail.window.document.querySelector('[data-f=okmsg]');
assert(httpMsg && httpMsg.textContent.indexOf('עוד צעד אחד') === 0, 'HTTP failure should show the WhatsApp handoff');

const blogDir = path.join(root, 'blog');
const names = fs.readdirSync(blogDir).filter(function (name) { return name.endsWith('.html'); });
const art = names.filter(function (name) { return /^art-\d+\.html$/.test(name); });
const canon = names.filter(function (name) { return name !== 'index.html' && !/^art-\d+\.html$/.test(name); });
let withTrack = 0;
let withSite = 0;
let artPolluted = 0;
canon.forEach(function (name) {
  const html = fs.readFileSync(path.join(blogDir, name), 'utf8');
  if (html.includes(TRACK)) withTrack += 1;
  if (html.includes('src="../assets/site.js"')) withSite += 1;
});
art.concat(['index.html']).forEach(function (name) {
  const html = fs.readFileSync(path.join(blogDir, name), 'utf8');
  if (html.includes('MENIFA_TRACK')) artPolluted += 1;
});
assert(canon.length === withTrack && withTrack === withSite && withTrack > 0, 'blog injection ' + withTrack + '/' + canon.length + ' site ' + withSite);
assert(artPolluted === 0, 'art stubs received MENIFA_TRACK');

const calc = fs.readFileSync(path.join(root, 'calculators.html'), 'utf8');
const leadAt = calc.indexOf('data-lead="calculators"');
assert(leadAt > 0, 'calculators form missing');
const slice = calc.slice(Math.max(0, leadAt - 400), leadAt + 1800);
assert(!slice.includes('<<') && !slice.includes('>>'), 'calculators form has guillemets');
assert(slice.includes('privacy.html'), 'privacy link missing');
assert(slice.includes('name="consent"'), 'consent missing');
assert(calc.includes('מדיניות הפרטיות'), 'privacy copy missing');

assert(makeHits.length === 0, 'make.com network hits: ' + makeHits.join(', '));

const proof = {
  note: 'window.fetch was stubbed and Node fetch rejects make.com. No request left the process.',
  make_com_network_hits: makeHits.length,
  journey: ' /?utm_source=first_src -> /contact.html -> /lp/ihud/?utm_source=second_src ',
  storage: 'sessionStorage menifa-att, no TTL, same as menifa_ft_v1',
  bodies: bodies,
  blog: {
    canonical: canon.length,
    with_MENIFA_TRACK: withTrack,
    with_site_js: withSite,
    art_n_files: art.length,
    art_or_index_with_track: artPolluted
  },
  generate_lead_on_network_error: leadEvents(failed.window).length,
  generate_lead_on_http_500: leadEvents(httpFail.window).length
};
console.log(JSON.stringify(proof, null, 2));
if (!process.exitCode) console.log('\nPASS');
