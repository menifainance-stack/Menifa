/**
 * Tier S switch for the six paths. Same four functions PR #99 turns on:
 *   window.MenifaTierS.isTierS()
 *   window.MenifaTierS.allowsAds()
 *   window.MenifaTierS.allowsPixel()
 *   window.MenifaTierS.filterGa4Params(params)
 * Clarity follows isTierS() (no separate method).
 * The Make body is not filtered. This branch still posts the live field names
 * (page, source, referrer). #99's copy of this file checks page_path, form_id,
 * and referrer_host after its own rename.
 *
 * fetch is stubbed. Nothing is sent to Make.
 *
 *   node tools/test_tier_s_paths.mjs
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const jsdomPkg = process.env.JSDOM_PACKAGE || '/tmp/privacy-harness/node_modules/jsdom/package.json';
const { JSDOM } = createRequire(jsdomPkg)('jsdom');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const siteJs = fs.readFileSync(path.join(root, 'assets/site.js'), 'utf8');

const IDS = {
  ga4: 'G-TIER',
  meta_pixel: '111222333',
  clarity: 'claritytier',
  google_ads: 'AW-999',
  google_ads_lead_label: 'leadLabel'
};

const TIER_S = [
  ['/masurvei-bankim.html', 'masurvei-bankim.html', 'service:masurvei-bankim'],
  ['/sirov-mashkanta-ma-osim.html', 'sirov-mashkanta-ma-osim.html', 'service:sirov-mashkanta-ma-osim'],
  ['/blog/מסורבי-משכנתא-7-דרכים-לאישור.html', 'blog/מסורבי-משכנתא-7-דרכים-לאישור.html', 'post:blog__art-19'],
  ['/ihud-halvaot-lemashkanta.html', 'ihud-halvaot-lemashkanta.html', 'service:ihud-halvaot-lemashkanta'],
  ['/blog/ihud-halvaot-matei-ken-lo.html', 'blog/ihud-halvaot-matei-ken-lo.html', 'post:blog__ihud-halvaot-matei-ken-lo'],
  ['/lp/ihud/', 'lp/ihud/index.html', 'lp-ihud']
];

const QUERY = '?utm_source=google&utm_medium=cpc&utm_campaign=winter&utm_term=secret-term&utm_content=secret-content&gclid=Cj0tier';
const REFERRER = 'https://news.example/story?id=9&loan=900000';
const GENERIC_PATH = '/service-page';
const SECRETS = /winter|secret-term|secret-content|Cj0tier|masurvei-bankim|sirov-mashkanta|ihud-halvaot|\/lp\/ihud|מסורב/;

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL: ' + msg);
    process.exitCode = 1;
    throw new Error(msg);
  }
}

function boot(file, urlPath, opts) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const dom = new JSDOM(html, {
    url: 'https://menifa.org' + urlPath + (opts.query === false ? '' : QUERY),
    referrer: opts.referrer || REFERRER,
    pretendToBeVisual: true,
    runScripts: 'outside-only'
  });
  const { window } = dom;
  window.scrollTo = function () {};
  if (opts.storage) {
    Object.keys(opts.storage).forEach(function (key) {
      window.sessionStorage.setItem(key, opts.storage[key]);
    });
  }
  window.localStorage.setItem('menifa-consent', JSON.stringify({
    v: 2, necessary: true, statistics: true, marketing: true, ts: '2026-10-06T00:00:00.000Z'
  }));
  window.MENIFA_TRACK = IDS;
  const crm = [];
  window.fetch = function (url, init) {
    const href = String(url);
    if (href.indexOf('make.com') !== -1) {
      crm.push({ mode: init && init.mode, body: String(init && init.body || '') });
      return Promise.resolve({ ok: false, status: 0, type: 'opaque' });
    }
    return Promise.reject(new Error('network disabled'));
  };
  window.eval(siteJs);
  return { window, crm };
}

function helperReady(window) {
  const api = window.MenifaTierS;
  return !!(api
    && typeof api.isTierS === 'function'
    && typeof api.allowsAds === 'function'
    && typeof api.allowsPixel === 'function'
    && typeof api.filterGa4Params === 'function');
}

function scripts(window) {
  return Array.prototype.map.call(window.document.scripts, function (s) { return s.src || ''; });
}

function leadEvents(window) {
  return (window.dataLayer || []).filter(function (e) { return e && e.event === 'generate_lead'; });
}

function gtagEvents(window) {
  return (window.dataLayer || []).filter(function (e) { return e && e[0] === 'event'; });
}

function pageReferrers(window) {
  const found = [];
  (window.dataLayer || []).forEach(function (e) {
    if (!e) return;
    if (e.page_referrer) found.push(String(e.page_referrer));
    if (e[0] === 'config' && e[2] && e[2].page_referrer) found.push(String(e[2].page_referrer));
    if (e[0] === 'event' && e[2] && e[2].page_referrer) found.push(String(e[2].page_referrer));
  });
  return found;
}

function utmKeys(obj) {
  return Object.keys(obj || {}).filter(function (k) { return k.indexOf('utm_') === 0; }).sort();
}

function submit(window) {
  const form = window.document.querySelector('form[data-lead]');
  assert(form, 'lead form missing on ' + window.location.pathname);
  form.querySelector('[name=name]').value = 'בדיקת רגיש';
  form.querySelector('[name=phone]').value = '050-1234567';
  const need = form.querySelector('[name=need]');
  if (need) need.value = 'מסורבי בנקים';
  const consent = form.querySelector('[name=consent]');
  if (consent) consent.checked = true;
  form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
}

assert(siteJs.indexOf('window.MenifaTierS') !== -1, 'MenifaTierS is not assigned');
assert((siteJs.match(/var TIER_S_EXACT =/g) || []).length === 1, 'Tier S path list is duplicated');

let enforced = 0;
for (const [urlPath, file, source] of TIER_S) {
  const open = boot(file, urlPath, {});
  assert(helperReady(open.window), urlPath + ' helper missing');
  const api = open.window.MenifaTierS;
  assert(api.isTierS() === true, urlPath + ' isTierS');
  assert(api.allowsAds() === false, urlPath + ' allowsAds');
  assert(api.allowsPixel() === false, urlPath + ' allowsPixel');
  const filtered = api.filterGa4Params({
    utm_source: 'google',
    utm_medium: 'cpc',
    utm_campaign: 'winter',
    utm_term: 'secret-term',
    utm_content: 'secret-content',
    gclid: 'Cj0tier',
    fbclid: 'fb-secret',
    form_id: source,
    page_path: urlPath,
    landing_page_path: urlPath,
    page_referrer: REFERRER,
    currency: 'ILS',
    value: 1
  });
  assert(filtered.form_id === 'service_page', urlPath + ' filter form_id');
  assert(filtered.page_path === GENERIC_PATH && filtered.landing_page_path === GENERIC_PATH, urlPath + ' filter paths');
  assert(filtered.page_location === 'https://menifa.org/service-page', urlPath + ' filter page_location');
  assert(filtered.page_referrer === 'https://news.example', urlPath + ' filter referrer ' + filtered.page_referrer);
  assert(filtered.utm_source === 'google' && filtered.utm_medium === 'cpc', urlPath + ' filter utm');
  ['utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'].forEach(function (key) {
    assert(!Object.prototype.hasOwnProperty.call(filtered, key), urlPath + ' filter kept ' + key);
  });
  assert(!SECRETS.test(JSON.stringify(filtered)), urlPath + ' filter leaked a real value');

  submit(open.window);
  const fields = Object.fromEntries(new URLSearchParams(open.crm[0].body));
  assert(decodeURIComponent(fields.page) === urlPath, urlPath + ' Make page ' + fields.page);
  assert(fields.source === source, urlPath + ' Make source ' + fields.source);
  assert(fields.source !== 'service_page' && fields.page !== GENERIC_PATH, urlPath + ' Make was generalized');
  assert(fields.utm_campaign === 'winter' && fields.utm_term === 'secret-term' && fields.utm_content === 'secret-content', urlPath + ' Make campaign');
  assert(fields.gclid === 'Cj0tier', urlPath + ' Make gclid');
  assert(fields.referrer === 'news.example', urlPath + ' Make referrer ' + fields.referrer);

  const srcs = scripts(open.window);
  assert(!srcs.some(function (s) { return s.indexOf('facebook.net') !== -1; }) && typeof open.window.fbq !== 'function', urlPath + ' loaded Pixel');
  assert(!srcs.some(function (s) { return s.indexOf('clarity.ms') !== -1; }) && typeof open.window.clarity !== 'function', urlPath + ' loaded Clarity');
  assert(!srcs.some(function (s) { return s.indexOf('AW-') !== -1; }), urlPath + ' loaded Ads');
  const ev = leadEvents(open.window)[0] || {};
  const gtagLead = gtagEvents(open.window).filter(function (e) { return e[1] === 'generate_lead'; });
  const payloads = [ev].concat(gtagLead.map(function (e) { return e[2] || {}; }));
  payloads.forEach(function (payload) {
    const keys = utmKeys(payload);
    assert(keys.length === 2 && keys[0] === 'utm_medium' && keys[1] === 'utm_source', urlPath + ' GA4 utm keys ' + keys.join(','));
    assert(payload.form_id === 'service_page' && payload.page_path === GENERIC_PATH && payload.landing_page_path === GENERIC_PATH, urlPath + ' GA4 page');
    assert(!SECRETS.test(JSON.stringify(payload)), urlPath + ' GA4 leaked a campaign or path');
  });
  const refs = pageReferrers(open.window);
  assert(refs.length > 0 && refs.every(function (r) { return r === 'https://news.example'; }), urlPath + ' referrer ' + refs.join(','));

  const next = boot('contact.html', '/contact.html', {
    query: false,
    referrer: 'https://menifa.org' + urlPath + '?utm_campaign=secret&loan=900000'
  });
  assert(next.window.MenifaTierS.isTierS() === true, urlPath + ' next page left Tier S');
  assert(next.window.MenifaTierS.allowsAds() === false && next.window.MenifaTierS.allowsPixel() === false, urlPath + ' next page allows trackers');
  const nextRefs = pageReferrers(next.window);
  assert(nextRefs.length > 0 && nextRefs.every(function (r) { return r === 'https://menifa.org'; }), urlPath + ' next referrer ' + nextRefs.join(','));
  assert(!SECRETS.test(JSON.stringify(nextRefs)), urlPath + ' next referrer leaked the path');
  enforced += 1;
  console.log('ENFORCED PASS ' + urlPath);
}

const plain = boot('contact.html', '/contact.html', { query: false, referrer: 'https://www.google.com/search?q=mortgage' });
assert(plain.window.MenifaTierS.isTierS() === false, 'contact isTierS');
assert(plain.window.MenifaTierS.allowsAds() === true && plain.window.MenifaTierS.allowsPixel() === true, 'contact allowsAds/Pixel');
const kept = plain.window.MenifaTierS.filterGa4Params({ utm_campaign: 'winter', form: 'contact', page: '/contact.html' });
assert(kept.utm_campaign === 'winter' && kept.form === 'contact' && kept.page === '/contact.html', 'off Tier S filter changed params');
assert(!kept.form_id && !kept.page_path, 'off Tier S filter added generic fields');

console.log('ENFORCED ' + enforced + '/6');
if (!process.exitCode) console.log('PASS');
