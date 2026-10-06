/**
 * Privacy proof for generate_lead / Pixel / GA4.
 *
 * Loads contact.html + assets/site.js in jsdom, submits a fake lead with
 * need = מסורבי בנקים, and prints the analytics payloads next to the CRM body.
 * fetch is stubbed. Nothing is sent to Make.com or SmartNPV.
 *
 *   npm install --prefix /tmp/privacy-harness jsdom
 *   node tools/test_analytics_privacy.mjs
 * jsdom is loaded from JSDOM_PACKAGE or /tmp/privacy-harness (not a site dependency).
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const jsdomPkg = process.env.JSDOM_PACKAGE || '/tmp/privacy-harness/node_modules/jsdom/package.json';
const { JSDOM } = createRequire(jsdomPkg)('jsdom');

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

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'contact.html'), 'utf8');
const siteJs = fs.readFileSync(path.join(root, 'assets/site.js'), 'utf8');
const NEED = 'מסורבי בנקים';
const SENSITIVE = /מסורב|סירוב|050-1234567|חוב 500000|123456782|test@example\.com/;
const FAKE_TRACK = { ga4: 'G-FAKE000000', meta_pixel: '000000000000000', clarity: 'fakclarity0' };
const SECRETS = /camp-secret-99|term-secret-99|content-secret-99|gclid-secret-99|fbclid-secret-99|masurvei-bankim|sirov-mashkanta|ihud-halvaot|\/lp\/ihud|מסורב/;
const OMIT_KEYS = ['utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid', 'campaign_name', 'campaign_term', 'campaign_content', 'campaign_id', 'campaign_source', 'campaign_medium', 'form', 'page', 'need', 'link_text'];
const SENS_QUERY = '?utm_source=facebook&utm_medium=cpc&utm_campaign=camp-secret-99&utm_term=term-secret-99&utm_content=content-secret-99&gclid=gclid-secret-99&fbclid=fbclid-secret-99';
const SENSITIVE_PAGES = [
  ['masurvei-bankim.html', 'https://menifa.org/masurvei-bankim.html'],
  ['sirov-mashkanta-ma-osim.html', 'https://menifa.org/sirov-mashkanta-ma-osim.html'],
  ['ihud-halvaot-lemashkanta.html', 'https://menifa.org/ihud-halvaot-lemashkanta.html'],
  ['blog/ihud-halvaot-matei-ken-lo.html', 'https://menifa.org/blog/ihud-halvaot-matei-ken-lo.html'],
  ['blog/מסורבי-משכנתא-7-דרכים-לאישור.html', 'https://menifa.org/blog/' + encodeURIComponent('מסורבי-משכנתא-7-דרכים-לאישור') + '.html'],
  ['lp/ihud/index.html', 'https://menifa.org/lp/ihud/'],
  ['lp/ihud/index.html', 'https://menifa.org/lp/ihud/index.html']
];

function boot(consentOrOpts) {
  const opts = (consentOrOpts && typeof consentOrOpts === 'object')
    ? consentOrOpts
    : { consent: !!consentOrOpts, stubAfter: true };
  const pageHtml = opts.html ? fs.readFileSync(path.join(root, opts.html), 'utf8') : html;
  const pageUrl = opts.url || 'https://menifa.org/contact.html?utm_source=preview&utm_medium=qa&utm_campaign=privacy-test&utm_content=need-gate';
  const dom = new JSDOM(pageHtml, {
    url: pageUrl,
    referrer: opts.referrer || undefined,
    pretendToBeVisual: true,
    runScripts: 'outside-only'
  });
  const { window } = dom;
  window.scrollTo = function () {};
  window.MENIFA_TRACK = opts.track || { ga4: '', meta_pixel: '', clarity: '' };
  const consentOn = opts.consent !== undefined ? !!opts.consent : !!consentOrOpts;
  if (consentOn) {
    window.localStorage.setItem('menifa-consent', JSON.stringify({
      v: 2, necessary: true, statistics: true, marketing: true, ts: '2026-10-06T00:00:00.000Z'
    }));
  }
  if (opts.hop) window.sessionStorage.setItem('menifa-sensitive-hop', '1');
  window.document.cookie = '_fbp=fb.1.privacytest';
  window.document.cookie = '_fbc=fb.1.privacyclick';
  const crm = [];
  window.fetch = function (url, opts2) {
    crm.push({
      url: String(url),
      mode: opts2 && opts2.mode,
      body: opts2 && opts2.body ? String(opts2.body) : ''
    });
    return Promise.resolve({ ok: false, status: 0, type: 'opaque' });
  };
  window.eval(opts.siteSource || siteJs);
  window.document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (a) e.preventDefault();
  }, true);
  const gtagCalls = [];
  const fbqCalls = [];
  if (opts.stubAfter !== false) {
    window.__ga = true;
    window.gtag = function () { gtagCalls.push(Array.prototype.slice.call(arguments)); };
    window.fbq = function () { fbqCalls.push(Array.prototype.slice.call(arguments)); };
  }
  return { window, crm, gtagCalls, fbqCalls };
}

function leadEvents(window) {
  return (window.dataLayer || []).filter(function (e) { return e && e.event === 'generate_lead'; });
}

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL: ' + msg);
    process.exitCode = 1;
    throw new Error(msg);
  }
}

function noSensitive(payload, label) {
  const blob = JSON.stringify(payload);
  assert(!SENSITIVE.test(blob), label + ' still contains sensitive text: ' + blob);
  assert(!Object.prototype.hasOwnProperty.call(payload, 'need'), label + ' has need');
  assert(!Object.prototype.hasOwnProperty.call(payload, 'name'), label + ' has name');
  assert(!Object.prototype.hasOwnProperty.call(payload, 'phone'), label + ' has phone');
  assert(!Object.prototype.hasOwnProperty.call(payload, 'email'), label + ' has email');
  assert(!Object.prototype.hasOwnProperty.call(payload, 'note'), label + ' has note');
  assert(!Object.prototype.hasOwnProperty.call(payload, 'answers'), label + ' has answers');
  assert(!Object.prototype.hasOwnProperty.call(payload, 'link_text'), label + ' has link_text');
  assert(!Object.prototype.hasOwnProperty.call(payload, 'income'), label + ' has income');
  assert(!Object.prototype.hasOwnProperty.call(payload, 'amount'), label + ' has amount');
  assert(!Object.prototype.hasOwnProperty.call(payload, 'id_number'), label + ' has id_number');
}

const { window, crm, gtagCalls, fbqCalls } = boot(true);
const { document } = window;
const form = document.querySelector('form[data-lead]');
form.querySelector('[name=name]').value = 'בדיקת פרטיות';
form.querySelector('[name=phone]').value = '050-1234567';
form.querySelector('[name=need]').value = NEED;
form.querySelector('[name=when]').value = 'השבוע';
form.querySelector('[name=consent]').checked = true;

const note = document.createElement('textarea');
note.name = 'note';
note.value = 'חוב 500000 והכנסה 20000';
form.appendChild(note);
const fsEl = document.createElement('fieldset');
fsEl.setAttribute('data-q', '');
const legend = document.createElement('legend');
legend.textContent = 'כמה הלוואות פעילות יש לכם?';
fsEl.appendChild(legend);
const radio = document.createElement('input');
radio.type = 'radio';
radio.name = 'q0';
radio.value = '4 ומעלה';
radio.checked = true;
fsEl.appendChild(radio);
form.appendChild(fsEl);

form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
await new Promise(function (resolve) { setTimeout(resolve, 0); });

const dl = leadEvents(window);
assert(dl.length === 1, 'expected one generate_lead on the dataLayer, got ' + dl.length);
const analyticsEvent = dl[0];
noSensitive(analyticsEvent, 'dataLayer generate_lead');
assert(analyticsEvent.value === 1, 'value must stay 1');
assert(analyticsEvent.currency === 'ILS', 'currency must stay ILS');
assert(analyticsEvent.form_id === 'contact', 'form_id should remain the public form id');
assert(analyticsEvent.page_path === '/contact.html', 'page_path should remain the public path');
assert(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(analyticsEvent.lead_uuid), 'lead_uuid should be a UUID v4');
assert(!Object.prototype.hasOwnProperty.call(analyticsEvent, 'form'), 'old form param should be gone');
assert(!Object.prototype.hasOwnProperty.call(analyticsEvent, 'utm_content'), 'generate_lead must not carry utm_content');
assert(!Object.prototype.hasOwnProperty.call(analyticsEvent, 'utm_term'), 'generate_lead must not carry utm_term');

const gtagLead = gtagCalls.filter(function (c) { return c[0] === 'event' && c[1] === 'generate_lead'; });
assert(gtagLead.length === 1, 'expected one gtag generate_lead');
noSensitive(gtagLead[0][2], 'gtag generate_lead');
assert(gtagLead[0][2].value === 1, 'gtag value must stay 1');

const fbqLead = fbqCalls.filter(function (c) { return c[0] === 'track' && c[1] === 'Lead'; });
assert(fbqLead.length === 1, 'expected one fbq Lead');
noSensitive(fbqLead[0][2], 'fbq Lead');
assert(fbqLead[0][2].value === 1, 'fbq value must stay 1');
assert(fbqLead[0][3] && fbqLead[0][3].eventID === analyticsEvent.lead_uuid, 'fbq eventID should match lead_uuid');
assert(fbqCalls.every(function (c) { return c[0] !== 'trackCustom'; }), 'fbq trackCustom should be gone');
assert(!gtagCalls.some(function (c) { return c[1] === 'conversion'; }), 'empty Ads placeholders must not fire a conversion');

assert(crm.length === 1, 'expected exactly one stubbed CRM post, got ' + crm.length);
assert(crm[0].url === window.MENIFA_CONFIG.leadWebhook, 'CRM url changed');
assert(crm[0].url === 'https://hook.us2.make.com/9pclkzy81xfnlh1nfyista793l9hbdig', 'CRM url changed');
assert(crm[0].url.endsWith('bdig'), 'CRM webhook endpoint changed');
assert(!crm[0].url.endsWith('7942'), 'CRM webhook must stay the live endpoint');
assert(crm[0].mode === 'no-cors', 'CRM mode should stay no-cors until Make sends CORS headers');
const crmFields = Object.fromEntries(new URLSearchParams(crm[0].body));
assert(crmFields.need === NEED, 'CRM lost need: ' + crmFields.need);
assert(crmFields.name === 'בדיקת פרטיות', 'CRM lost name');
assert(crmFields.phone === '050-1234567', 'CRM lost phone');
assert(crmFields.note === 'חוב 500000 והכנסה 20000', 'CRM lost note');
assert(crmFields.answers.indexOf('4 ומעלה') !== -1, 'CRM lost quiz answers');
assert(crmFields.utm_source === 'preview', 'CRM lost utm_source');
assert(crmFields.utm_medium === 'qa', 'CRM lost utm_medium');
assert(crmFields.utm_campaign === 'privacy-test', 'CRM lost utm_campaign');
assert(crmFields.utm_content === 'need-gate', 'CRM lost utm_content');
assert(crmFields.form_id === 'contact', 'CRM lost form_id');
assert(crmFields.page_path === '/contact.html', 'CRM lost page_path');
assert(crmFields.landing_page_path === '/contact.html', 'CRM lost landing_page_path');
assert(crmFields.referrer_host === 'direct', 'CRM referrer_host');
assert(!Object.prototype.hasOwnProperty.call(crmFields, 'source'), 'old source key should be gone');
assert(crmFields.when === 'השבוע', 'CRM lost when');
assert(crmFields.consent === 'כן', 'CRM lost consent');
assert(crmFields.fbp === 'fb.1.privacytest', 'CRM lost fbp');
assert(crmFields.fbc === 'fb.1.privacyclick', 'CRM lost fbc');
assert(crmFields['מקור_הפניה'] === 'לא מיוחס', 'CRM makor should follow the A24 dictionary: ' + crmFields['מקור_הפניה']);
assert(crmFields.makor_hafnia === 'לא מיוחס', 'CRM makor_hafnia mismatch');
assert(crmFields.lt_utm_source === 'preview', 'CRM lost lt_utm_source');
assert(crmFields.lead_uuid === analyticsEvent.lead_uuid, 'CRM lead_uuid must match generate_lead');
assert(crmFields.consent_analytics === 'true', 'consent_analytics');
assert(crmFields['יידוע_פרטיות_הוצג'] === 'true', 'privacy notice flag');
assert(!Object.prototype.hasOwnProperty.call(analyticsEvent, 'makor_hafnia'), 'analytics received makor_hafnia');
assert(!Object.prototype.hasOwnProperty.call(analyticsEvent, 'מקור_הפניה'), 'analytics received מקור_הפניה');

const wa = Array.prototype.find.call(document.querySelectorAll('.wa-topics a'), function (a) {
  return a.textContent.trim() === NEED;
});
assert(wa, 'WhatsApp topic link missing');
wa.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
const waEvents = (window.dataLayer || []).filter(function (e) { return e && e.event === 'contact_whatsapp'; });
assert(waEvents.length === 1, 'expected one contact_whatsapp');
noSensitive(waEvents[0], 'contact_whatsapp');
assert(waEvents[0].page_path === '/contact.html', 'whatsapp page missing');
assert(waEvents[0].cta_location === 'topic', 'whatsapp topic location');
const fbqContact = fbqCalls.filter(function (c) { return c[0] === 'track' && c[1] === 'Contact'; });
assert(fbqContact.length === 1, 'expected fbq Contact');
noSensitive(fbqContact[0][2], 'fbq Contact');

window.menifaTrack('generate_lead', {
  form: 'contact',
  page: '/contact.html',
  need: NEED,
  link_text: NEED,
  name: 'בדיקת פרטיות',
  phone: '050-1234567',
  email: 'test@example.com',
  income: '20000',
  amount: '500000',
  note: 'חוב 500000',
  answers: ['כמה הלוואות 4 ומעלה'],
  id_number: '123456782',
  health: 'condition',
  loan_intent: 'איחוד הלוואות',
  has_property: 'כן',
  q0: '4 ומעלה',
  currency: 'ILS',
  value: 1,
  event_id: 'lead_gate_check'
});
const gated = leadEvents(window).filter(function (e) { return e.event_id === 'lead_gate_check'; });
assert(gated.length === 1, 'gate event missing');
noSensitive(gated[0], 'direct menifaTrack gate');
assert(gated[0].value === 1 && gated[0].currency === 'ILS', 'gate dropped value/currency');
assert(gated[0].form === 'contact' && gated[0].page === '/contact.html', 'gate dropped safe fields');
assert(!Object.prototype.hasOwnProperty.call(gated[0], 'q0'), 'gate kept quiz answer q0');

const queued = boot(false);
queued.window.menifaTrack('generate_lead', {
  form: 'contact', page: '/contact.html', need: NEED, name: 'בדיקת פרטיות',
  phone: '050-1234567', currency: 'ILS', value: 1, event_id: 'lead_queued'
});
assert(leadEvents(queued.window).length === 0, 'queued event must not hit dataLayer before consent');
queued.window.document.getElementById('ck-all').click();
const flushed = leadEvents(queued.window);
assert(flushed.length === 1, 'consent should flush the queued lead');
noSensitive(flushed[0], 'flushed generate_lead');
assert(flushed[0].value === 1, 'flushed value must stay 1');
assert(queued.crm.length === 0, 'queue scenario must not post a lead');

function scriptSrcs(win) {
  return Array.prototype.map.call(win.document.scripts, function (s) { return s.src || ''; });
}
function flatDL(win) {
  return (win.dataLayer || []).map(function (entry) {
    if (entry && Object.prototype.hasOwnProperty.call(entry, 'event') && entry[0] === undefined) return entry;
    return Array.prototype.slice.call(entry);
  });
}
function ga4ConfigOf(win) {
  const config = flatDL(win).filter(function (c) { return Array.isArray(c) && c[0] === 'config'; });
  return config.length ? config[0][2] : null;
}
function assertDomainOnly(url, label) {
  assert(/^https:\/\/[^/?#]+\/$/.test(url), label + ' is not domain-only');
  assert(!SECRETS.test(url), label + ' still identifies a sensitive page');
}
function assertOriginOnly(url, label) {
  assert(/^https:\/\/[^/?#]+$/.test(url), label + ' is not origin-only');
  assert(!SECRETS.test(url), label + ' still identifies a sensitive page');
}
function assertNoForbidden(value, label) {
  const blob = JSON.stringify(value);
  assert(blob && !SECRETS.test(blob), label + ' contains a sensitive or campaign value');
  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    OMIT_KEYS.forEach(function (k) {
      assert(!Object.prototype.hasOwnProperty.call(node, k), label + ' still has ' + k);
    });
    Object.keys(node).forEach(function (k) { walk(node[k]); });
  }
  walk(value);
}
function trackerSrc(srcs, kind) {
  return srcs.some(function (s) { return s.indexOf(kind) !== -1; });
}

const idsFile = fs.readFileSync(path.join(root, 'assets/tracking-ids.js'), 'utf8');
assert(/window\.MENIFA_TRACK = \{ ga4: "", meta_pixel: "", clarity: "" \}/.test(idsFile), 'tracking IDs are not empty');
assert(!/G-[A-Z0-9]{4,}/.test(idsFile) && !/gtm\.js/i.test(idsFile) && !/GTM-/.test(idsFile), 'tracking file must not contain a real ID or GTM');
assert(!/gtm\.js/.test(siteJs) && !/GTM-/.test(siteJs), 'site.js must stay on gtag, not GTM');
assert(!/campaign_name\s*=/.test(siteJs) && !/cfg\.gclid\s*=/.test(siteJs) && !/cfg\.fbclid\s*=/.test(siteJs), 'sensitive GA4 must omit campaign and click ids');
assert(siteJs.indexOf('if (!privacyGateIntact()) return;') !== -1, 'privacy gate missing');
assert(siteJs.indexOf('if (!privacyGateIntact()) return;') < siteJs.indexOf('googletagmanager.com/gtag/js'), 'gate must run before gtag');
assert(!/contact_whatsapp',\s*\{[^}]*link_text/.test(siteJs), 'link_text returned on WhatsApp');
assert(!/generate_lead',\s*\{[^}]*\bneed\s*:/.test(siteJs), 'need returned on generate_lead');
['generate_lead', 'contact_whatsapp', 'contact_phone', 'calculator_use'].forEach(function (name) {
  assert(siteJs.indexOf("'" + name + "'") !== -1, 'event name missing: ' + name);
});

function walkHtml(dir, out) {
  fs.readdirSync(dir).forEach(function (name) {
    if (name === 'node_modules' || name === '.git') return;
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walkHtml(full, out);
    else if (name.endsWith('.html')) out.push(full);
  });
}
const htmlFiles = [];
walkHtml(root, htmlFiles);
const sensitiveRel = [
  'masurvei-bankim.html',
  'sirov-mashkanta-ma-osim.html',
  'ihud-halvaot-lemashkanta.html',
  'blog/ihud-halvaot-matei-ken-lo.html',
  'blog/מסורבי-משכנתא-7-דרכים-לאישור.html',
  'lp/ihud/index.html'
];
htmlFiles.forEach(function (full) {
  const text = fs.readFileSync(full, 'utf8');
  const rel = path.relative(root, full).split(path.sep).join('/');
  assert(!/MENIFA_TRACK\s*=\s*\{[^}]*(ga4|meta_pixel|clarity)"\s*:\s*"[^"]+/.test(text), rel + ' has a non-empty inline tracker ID');
  const site = text.match(/<script src="([^"]*site\.js)"><\/script>/);
  if (!site) return;
  const track = site[1].replace('site.js', 'tracking-ids.js');
  const trackTag = '<script src="' + track + '"></script>';
  assert(text.indexOf(trackTag) !== -1 && text.indexOf(trackTag) < text.indexOf(site[0]), rel + ' does not load tracking-ids.js first');
});
sensitiveRel.forEach(function (rel) {
  const text = fs.readFileSync(path.join(root, rel), 'utf8');
  assert(text.indexOf('name="referrer" content="origin"') !== -1, rel + ' missing domain-only referrer policy');
});

const broken = siteJs.replace('need: 1, link_text: 1,', 'link_text: 1,');
assert(broken !== siteJs, 'could not build a gate-bypass fixture');
const bypass = boot({
  consent: true,
  siteSource: broken,
  track: FAKE_TRACK,
  stubAfter: false,
  url: 'https://menifa.org/contact.html'
});
assert(!trackerSrc(scriptSrcs(bypass.window), 'gtag/js') && !bypass.window.fbq, 'trackers loaded after the need block was removed');

function runSensitive(file, url) {
  const loaded = boot({
    consent: true,
    html: file,
    url: url + SENS_QUERY,
    referrer: 'https://www.google.com/search?q=masurvei-bankim&gclid=gclid-secret-99',
    track: FAKE_TRACK,
    stubAfter: false
  });
  const win = loaded.window;
  const srcs = scriptSrcs(win);
  assert(trackerSrc(srcs, 'gtag/js?id=G-FAKE000000'), file + ' did not queue gtag');
  assert(!trackerSrc(srcs, 'fbevents'), file + ' loaded the Meta Pixel');
  assert(!trackerSrc(srcs, 'clarity.ms'), file + ' loaded Clarity');
  assert(!win.fbq, file + ' defined fbq');
  assert(win.MenifaTierS.isTierS() === true, file + ' isTierS');
  assert(win.MenifaTierS.allowsAds() === false && win.MenifaTierS.allowsPixel() === false, file + ' allowsAds or allowsPixel');
  assertDomainOnly(win.document.referrer, file + ' document.referrer');
  assert(win.document.referrer === 'https://www.google.com/', file + ' external referrer was not truncated to the domain');
  const cfg = ga4ConfigOf(win);
  assert(cfg, file + ' missing GA4 config');
  assert(cfg.page_location === 'https://menifa.org/service-page', file + ' page_location was not overridden');
  assert(!/[?]/.test(cfg.page_location), file + ' page_location still has a query');
  assert(cfg.page_path === '/service-page' && cfg.landing_page_path === '/service-page', file + ' page paths');
  assert(cfg.page_title === 'service' && cfg.form_id === 'service_page', file + ' generic title or form_id');
  assertOriginOnly(cfg.page_referrer, file + ' page_referrer');
  assert(cfg.page_referrer === 'https://www.google.com', file + ' page_referrer origin');
  assert(cfg.utm_source === 'facebook' && cfg.utm_medium === 'cpc', file + ' dropped allowed utm_source or utm_medium');
  assertNoForbidden(cfg, file + ' GA4 config');
  assertNoForbidden(flatDL(win), file + ' dataLayer');
  const anchors = win.document.querySelectorAll('a[href]');
  assert(anchors.length > 0, file + ' has no links');
  Array.prototype.forEach.call(anchors, function (a) {
    assert(a.referrerPolicy === 'origin', file + ' link does not truncate the referrer');
  });
  win.menifaTrack('generate_lead', {
    form: 'service:masurvei-bankim',
    page: win.location.pathname,
    utm_source: 'facebook',
    utm_medium: 'cpc',
    utm_campaign: 'camp-secret-99',
    utm_term: 'term-secret-99',
    utm_content: 'content-secret-99',
    gclid: 'gclid-secret-99',
    fbclid: 'fbclid-secret-99',
    need: NEED,
    link_text: NEED,
    currency: 'ILS',
    value: 1,
    event_id: 'lead_sensitive'
  });
  win.menifaTrack('contact_whatsapp', { page: win.location.pathname, link_text: NEED });
  win.menifaTrack('contact_phone', { page: win.location.pathname });
  win.menifaTrack('calculator_use', { calculator: 'demo', page: win.location.pathname });
  const ev = leadEvents(win).filter(function (e) { return e.event_id === 'lead_sensitive'; });
  assert(ev.length === 1, file + ' generate_lead missing');
  assert(ev[0].event === 'generate_lead', file + ' renamed generate_lead');
  assert(ev[0].utm_source === 'facebook' && ev[0].utm_medium === 'cpc', file + ' event lost source or medium');
  assert(ev[0].form_id === 'service_page' && ev[0].page_path === '/service-page' && ev[0].landing_page_path === '/service-page', file + ' event page was not generalized');
  assertNoForbidden(ev[0], file + ' generate_lead');
  const names = (win.dataLayer || []).map(function (e) { return e && e.event; }).filter(Boolean);
  assert(names.indexOf('contact_whatsapp') !== -1, file + ' renamed contact_whatsapp');
  assert(names.indexOf('contact_phone') !== -1, file + ' renamed contact_phone');
  assert(names.indexOf('calculator_use') !== -1, file + ' renamed calculator_use');
  (win.dataLayer || []).forEach(function (entry) {
    if (entry && entry.event) assertNoForbidden(entry, file + ' ' + entry.event);
  });
  assertNoForbidden(flatDL(win), file + ' dataLayer after events');
  assert(!win.fbq, file + ' fbq appeared after events');
  return loaded;
}

const sensitiveRuns = SENSITIVE_PAGES.map(function (pair) { return runSensitive(pair[0], pair[1]); });
const sens = sensitiveRuns[0];
const sensForm = sens.window.document.querySelector('form[data-lead]');
sensForm.querySelector('[name=name]').value = 'בדיקת פרטיות';
sensForm.querySelector('[name=phone]').value = '050-1234567';
sensForm.querySelector('[name=need]').value = NEED;
sensForm.querySelector('[name=when]').value = 'השבוע';
sensForm.querySelector('[name=consent]').checked = true;
sensForm.dispatchEvent(new sens.window.Event('submit', { bubbles: true, cancelable: true }));
assert(sens.crm.length === 1, 'sensitive page did not post the CRM body');
assert(sens.crm[0].url === sens.window.MENIFA_CONFIG.leadWebhook && sens.crm[0].url.endsWith('bdig'), 'sensitive CRM endpoint changed');
assert(sens.crm[0].mode === 'no-cors', 'sensitive CRM mode changed');
const sensCrm = Object.fromEntries(new URLSearchParams(sens.crm[0].body));
assert(sensCrm.need === NEED, 'CRM lost need on the sensitive page');
assert(sensCrm.utm_source === 'facebook' && sensCrm.utm_medium === 'cpc', 'CRM lost source or medium');
assert(sensCrm.utm_campaign === 'camp-secret-99', 'CRM lost utm_campaign');
assert(sensCrm.utm_term === 'term-secret-99' && sensCrm.utm_content === 'content-secret-99', 'CRM lost term or content');
assert(sensCrm.gclid === 'gclid-secret-99' && sensCrm.fbclid === 'fbclid-secret-99', 'CRM lost click ids');
assert(sensCrm.page_path === '/masurvei-bankim.html' && sensCrm.form_id === 'service_masurvei_bankim', 'CRM lost the real page');
assert(sensCrm.form_id !== 'service_page' && decodeURIComponent(sensCrm.page_path) !== '/service-page', 'CRM was passed through filterGa4Params');
assert(sensCrm.landing_page_path === '/masurvei-bankim.html', 'CRM lost landing');
assert(sensCrm.referrer_host === 'www.google.com', 'CRM referrer hostname changed');
leadEvents(sens.window).forEach(function (ev) { assertNoForbidden(ev, 'submitted generate_lead'); });
const sensWa = Array.prototype.find.call(sens.window.document.querySelectorAll('.wa-topics a'), function (a) {
  return a.textContent.trim() === NEED;
});
assert(sensWa, 'sensitive WhatsApp topic missing');
sensWa.dispatchEvent(new sens.window.MouseEvent('click', { bubbles: true, cancelable: true }));
const sensWaEvents = (sens.window.dataLayer || []).filter(function (e) { return e && e.event === 'contact_whatsapp'; });
assert(sensWaEvents.length >= 1, 'sensitive WhatsApp event missing');
sensWaEvents.forEach(function (ev) { assertNoForbidden(ev, 'sensitive contact_whatsapp'); });

const emptySens = boot({
  consent: true,
  html: 'masurvei-bankim.html',
  url: 'https://menifa.org/masurvei-bankim.html',
  stubAfter: false
});
assert(!trackerSrc(scriptSrcs(emptySens.window), 'gtag/js') && !emptySens.window.fbq && !emptySens.window.__ga, 'empty IDs still loaded a tracker on the sensitive page');
const emptyContact = boot({ consent: true, url: 'https://menifa.org/contact.html', stubAfter: false });
assert(!trackerSrc(scriptSrcs(emptyContact.window), 'gtag/js') && !emptyContact.window.fbq, 'empty IDs still loaded a tracker');

const contactLive = boot({
  consent: true,
  url: 'https://menifa.org/contact.html',
  track: FAKE_TRACK,
  stubAfter: false
});
assert(trackerSrc(scriptSrcs(contactLive.window), 'fbevents'), 'contact page should still load the Pixel');
assert(contactLive.window.fbq && contactLive.window.fbq.queue.some(function (args) { return args[0] === 'track' && args[1] === 'PageView'; }), 'contact PageView missing');

const next = boot({
  consent: true,
  html: 'contact.html',
  url: 'https://menifa.org/contact.html',
  referrer: 'https://menifa.org/lp/ihud/?utm_campaign=camp-secret-99&fbclid=fbclid-secret-99',
  hop: true,
  track: FAKE_TRACK,
  stubAfter: false
});
assertDomainOnly(next.window.document.referrer, 'referrer after leaving a sensitive page');
assert(next.window.document.referrer === 'https://menifa.org/', 'internal sensitive referrer was not truncated to the domain');
assert(next.window.MenifaTierS.isTierS() === true, 'the page after Tier S must stay Tier S');
assert(next.window.MenifaTierS.allowsAds() === false && next.window.MenifaTierS.allowsPixel() === false, 'Ads and Pixel must stay off on the following page');
const nextCfg = ga4ConfigOf(next.window);
assert(nextCfg && nextCfg.page_referrer === 'https://menifa.org', 'next page page_referrer');
assert(nextCfg.page_path === '/service-page' && nextCfg.form_id === 'service_page', 'next page GA4 was not generalized');
assertNoForbidden(nextCfg, 'next page GA4 config');
assert(next.window.sessionStorage.getItem('menifa-sensitive-hop') == null, 'sensitive hop flag was not consumed');
assert(!next.window.fbq && !trackerSrc(scriptSrcs(next.window), 'clarity.ms'), 'Pixel or Clarity loaded on the page after Tier S');

const ordinary = boot({
  consent: true,
  url: 'https://menifa.org/about.html',
  html: 'about.html',
  referrer: 'https://www.google.com/search?q=mortgage',
  track: FAKE_TRACK,
  stubAfter: false
});
assert(ordinary.window.MenifaTierS.isTierS() === false && ordinary.window.MenifaTierS.allowsAds() === true && ordinary.window.MenifaTierS.allowsPixel() === true, 'ordinary page was treated as Tier S');
assert(ordinary.window.document.referrer === 'https://www.google.com/search?q=mortgage', 'non-sensitive external referrer was rewritten');
const ordinaryCfg = ga4ConfigOf(ordinary.window);
assert(ordinaryCfg && !ordinaryCfg.page_referrer, 'non-sensitive page should not override page_referrer');

const sensCfg = ga4ConfigOf(sens.window);
const sensLead = leadEvents(sens.window).filter(function (e) { return e.event_id === 'lead_sensitive'; })[0];

const proof = {
  note: 'fetch was stubbed. No request left the process.',
  analytics: {
    dataLayer: analyticsEvent,
    gtag: gtagLead[0],
    fbq: fbqLead[0]
  },
  contact_whatsapp: {
    dataLayer: waEvents[0],
    fbq: fbqContact[0]
  },
  gate_if_caller_still_passes_need: gated[0],
  flushed_after_consent: flushed[0],
  sensitive_ga4_config: sensCfg,
  sensitive_generate_lead: sensLead,
  sensitive_crm_decoded: sensCrm,
  crm: {
    endpoint: 'existing Make webhook, unchanged',
    mode: crm[0].mode,
    decoded: crmFields
  }
};

assert(makeHits.length === 0, 'a real fetch reached make.com: ' + makeHits.join(', '));
proof.make_com_network_hits = makeHits.length;

console.log(JSON.stringify(proof, null, 2));
if (!process.exitCode) console.log('\nPASS');
