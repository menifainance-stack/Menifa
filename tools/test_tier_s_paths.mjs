/**
 * Tier S coverage for the six paths in measurement card decision 4.
 *
 * IDs are filled in the test config below. Make-body assertions always run.
 * The privacy assertions (no Pixel, no Clarity, no Google Ads, GA4 limited to
 * utm_source + utm_medium, form_id=service_page, generic page paths, origin-only
 * referrer on this page and the next) are TODO(#96) expected-fail until site.js
 * defines the helper. After the rebase onto #96 they run as real assertions.
 *
 * Interface this test turns on, and that #99 expects #96 to assign:
 *   window.MenifaTierS.isTierS()
 *   window.MenifaTierS.allowsAds()
 *   window.MenifaTierS.allowsPixel()
 *   window.MenifaTierS.filterGa4Params(params)
 * Clarity follows isTierS() (no separate method). The Make body is not filtered.
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
  ['/masurvei-bankim.html', 'masurvei-bankim.html', 'service_masurvei_bankim'],
  ['/sirov-mashkanta-ma-osim.html', 'sirov-mashkanta-ma-osim.html', 'service_sirov_mashkanta_ma_osim'],
  ['/blog/מסורבי-משכנתא-7-דרכים-לאישור.html', 'blog/מסורבי-משכנתא-7-דרכים-לאישור.html', 'post_blog_art_19'],
  ['/ihud-halvaot-lemashkanta.html', 'ihud-halvaot-lemashkanta.html', 'service_ihud_halvaot_lemashkanta'],
  ['/blog/ihud-halvaot-matei-ken-lo.html', 'blog/ihud-halvaot-matei-ken-lo.html', 'post_blog_ihud_halvaot_matei_ken_lo'],
  ['/lp/ihud/', 'lp/ihud/index.html', 'lp_ihud']
];

const QUERY = '?utm_source=google&utm_medium=cpc&utm_campaign=winter&utm_term=secret-term&utm_content=secret-content&gclid=Cj0tier';
const REFERRER = 'https://news.example/story?id=9&loan=900000';
const GENERIC_PATH = '/service-page';

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
    if (href.includes('make.com')) {
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
  return (window.dataLayer || []).filter(function (e) {
    return e && e[0] === 'event';
  });
}

function adsConfigs(window) {
  return (window.dataLayer || []).filter(function (e) {
    return e && e[0] === 'config' && String(e[1] || '').indexOf('AW-') === 0;
  });
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

async function flush() {
  await new Promise(function (resolve) { setTimeout(resolve, 0); });
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

const lines = [];
const makePass = [];
let expectedFail = 0;
let skippedPass = 0;
let enforced = 0;

function note(status, label) {
  lines.push(status + ' ' + label);
  if (status === 'TODO(#96) expected-fail') expectedFail += 1;
  else if (status === 'TODO(#96) skipped') skippedPass += 1;
  else if (status === 'ENFORCED PASS') enforced += 1;
}

function checkTierS(ready, cond, label) {
  if (ready) {
    assert(cond, label);
    note('ENFORCED PASS', label);
    return;
  }
  note(cond ? 'TODO(#96) skipped' : 'TODO(#96) expected-fail', label);
}

console.log('test config IDs: ' + JSON.stringify(IDS));

for (const [urlPath, file, formId] of TIER_S) {
  const open = boot(file, urlPath, {});
  const ready = helperReady(open.window);
  const srcs = scripts(open.window);
  submit(open.window);
  await flush();

  const fields = Object.fromEntries(new URLSearchParams(open.crm[0].body));
  assert(fields.page_path === open.window.location.pathname, urlPath + ' Make page_path ' + fields.page_path);
  assert(decodeURIComponent(fields.page_path) === urlPath, urlPath + ' Make page decoded ' + fields.page_path);
  assert(fields.form_id === formId, urlPath + ' Make form_id ' + fields.form_id);
  assert(fields.form_id !== 'service_page', urlPath + ' Make form_id was generalized');
  assert(fields.utm_source === 'google', urlPath + ' Make utm_source');
  assert(fields.utm_medium === 'cpc', urlPath + ' Make utm_medium');
  assert(fields.utm_campaign === 'winter', urlPath + ' Make utm_campaign');
  assert(fields.utm_term === 'secret-term', urlPath + ' Make utm_term');
  assert(fields.utm_content === 'secret-content', urlPath + ' Make utm_content');
  assert(fields.gclid === 'Cj0tier', urlPath + ' Make gclid');
  assert(fields.referrer_host === 'news.example', urlPath + ' Make referrer_host ' + fields.referrer_host);
  assert(decodeURIComponent(fields.page_path) !== GENERIC_PATH, urlPath + ' Make page was generalized');
  note('MAKE PASS', urlPath + ' form_id=' + fields.form_id + ' campaign=' + fields.utm_campaign + ' gclid=' + fields.gclid);
  makePass.push(urlPath);

  const ev = leadEvents(open.window)[0] || {};
  const gtagLead = gtagEvents(open.window).filter(function (e) { return e[1] === 'generate_lead'; });
  const ga4Payloads = [ev].concat(gtagLead.map(function (e) { return e[2] || {}; }));
  const noPixel = !srcs.some(function (s) { return s.includes('facebook.net'); }) && typeof open.window.fbq !== 'function';
  const noClarity = !srcs.some(function (s) { return s.includes('clarity.ms'); }) && typeof open.window.clarity !== 'function';
  const noAdsTag = adsConfigs(open.window).length === 0 && !srcs.some(function (s) { return s.includes('AW-'); });
  const noAdsConversion = !(open.window.dataLayer || []).some(function (e) {
    return e && (e[1] === 'conversion' || e.event === 'conversion');
  });
  const onlySourceMedium = ga4Payloads.every(function (payload) {
    const keys = utmKeys(payload);
    return keys.length === 2 && keys[0] === 'utm_medium' && keys[1] === 'utm_source'
      && !Object.prototype.hasOwnProperty.call(payload, 'utm_campaign')
      && !Object.prototype.hasOwnProperty.call(payload, 'utm_term')
      && !Object.prototype.hasOwnProperty.call(payload, 'utm_content');
  });
  const genericPage = ga4Payloads.every(function (payload) {
    return payload.form_id === 'service_page'
      && payload.page_path === GENERIC_PATH
      && payload.landing_page_path === GENERIC_PATH;
  });
  const hereOrigin = 'https://news.example';
  const hereRefs = pageReferrers(open.window);
  const hereReferrer = hereRefs.length > 0 && hereRefs.every(function (r) { return r === hereOrigin; });

  checkTierS(ready, noPixel, urlPath + ' no fbq load/calls');
  checkTierS(ready, noClarity, urlPath + ' no Clarity');
  checkTierS(ready, noAdsTag, urlPath + ' no Google Ads tag');
  checkTierS(ready, noAdsConversion, urlPath + ' no Google Ads conversion');
  checkTierS(ready, onlySourceMedium, urlPath + ' GA4 only utm_source+utm_medium');
  checkTierS(ready, genericPage, urlPath + ' form_id=service_page page_path=/service-page');
  checkTierS(ready, hereReferrer, urlPath + ' referrer origin-only (' + (hereRefs.join(',') || 'missing') + ')');

  const nextReferrer = 'https://menifa.org' + urlPath + '?utm_campaign=secret&loan=900000';
  const next = boot('contact.html', '/contact.html', {
    query: false,
    referrer: nextReferrer,
    storage: { 'menifa-att': open.window.sessionStorage.getItem('menifa-att') }
  });
  const nextReady = helperReady(next.window);
  const nextRefs = pageReferrers(next.window);
  const nextOrigin = 'https://menifa.org';
  const nextOk = nextRefs.length > 0 && nextRefs.every(function (r) { return r === nextOrigin; });
  checkTierS(ready && nextReady, nextOk, urlPath + ' next page referrer origin-only (' + (nextRefs.join(',') || 'missing') + ')');
}

const helperOn = lines.some(function (line) { return line.indexOf('ENFORCED PASS') === 0; });
console.log(lines.join('\n'));
console.log('\n' + (helperOn
  ? 'Tier S helper is present; privacy assertions are enforced.'
  : 'TODO(#96) Tier S helper is absent (window.MenifaTierS.isTierS/allowsAds/allowsPixel/filterGa4Params). Privacy assertions are expected-fail and turn on after the rebase onto #96.'));
console.log('MAKE PASS ' + makePass.length + '/6; TODO(#96) expected-fail ' + expectedFail + '; TODO(#96) skipped ' + skippedPass + '; enforced ' + enforced);
if (!process.exitCode) console.log('PASS');
