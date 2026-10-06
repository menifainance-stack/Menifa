/**
 * Tier S coverage for the six paths in measurement card decision 4.
 *
 * PR #96 owns the gate (no Pixel, no Clarity, no Google Ads, GA4 keeps only
 * utm_source and utm_medium, origin-only referrer on the page and the next
 * page). This branch must not copy that path list. It routes the new Ads
 * conversion through window.MenifaTierS.allowsAds when that helper exists.
 *
 * What this file enforces now:
 * - Ads does not load or fire on any of the six paths when the helper says no.
 * - Make still receives the real path, campaign, gclid and form_id.
 * - generate_lead never carries utm_term / utm_content, and never a stand-in
 *   value for a campaign #96 has not omitted yet.
 * - referrer_host is a hostname or "direct", including on the following page.
 *
 * What it records, and does not fail, until #96 lands the helper:
 * - Pixel and Clarity still load when IDs are filled.
 * - GA4 still receives utm_campaign, the real form_id and the real page_path.
 * - GA4 referrer is not rewritten to origin.
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
  window.MENIFA_TRACK = {
    ga4: 'G-TIER',
    meta_pixel: '111222333',
    clarity: 'claritytier',
    google_ads: 'AW-999',
    google_ads_lead_label: 'leadLabel'
  };
  if (opts.blockAds) window.MenifaTierS = { allowsAds: function () { return false; } };
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

function scripts(window) {
  return Array.prototype.map.call(window.document.scripts, function (s) { return s.src || ''; });
}

function leadEvents(window) {
  return (window.dataLayer || []).filter(function (e) { return e && e.event === 'generate_lead'; });
}

function conversions(window) {
  return (window.dataLayer || []).filter(function (e) {
    return e && (e[0] === 'event' && e[1] === 'conversion' || e.event === 'conversion');
  });
}

function adsConfigs(window) {
  return (window.dataLayer || []).filter(function (e) {
    return e && e[0] === 'config' && e[1] === 'AW-999';
  });
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

assert(siteJs.includes('TODO(#96)'), 'site.js should point at #96 for Tier S');
assert(!siteJs.includes('SENSITIVE_PATHS'), 'site.js should not carry its own Tier S list');
assert(typeof globalThis.MenifaTierS === 'undefined', 'this branch should not define MenifaTierS');

const gaps = [];
const covered = [];

for (const [urlPath, file, formId] of TIER_S) {
  const open = boot(file, urlPath, { blockAds: false });
  const srcs = scripts(open.window);
  if (srcs.some(function (s) { return s.includes('facebook.net'); })) {
    gaps.push(urlPath + ': Pixel script still loads when an ID is set (TODO #96)');
  }
  if (srcs.some(function (s) { return s.includes('clarity.ms'); })) {
    gaps.push(urlPath + ': Clarity script still loads when an ID is set (TODO #96)');
  }
  if (srcs.some(function (s) { return s.includes('AW-999'); }) || adsConfigs(open.window).length) {
    gaps.push(urlPath + ': Google Ads config still runs when the helper is absent (TODO #96)');
  }
  submit(open.window);
  await flush();
  if (conversions(open.window).length) {
    gaps.push(urlPath + ': Google Ads conversion still fires when the helper is absent (TODO #96)');
  }
  const fields = Object.fromEntries(new URLSearchParams(open.crm[0].body));
  const ev = leadEvents(open.window)[0];
  assert(fields.page_path === open.window.location.pathname, urlPath + ' Make page_path ' + fields.page_path);
  assert(decodeURIComponent(fields.page_path) === urlPath, urlPath + ' Make page_path decoded ' + fields.page_path);
  assert(fields.form_id === formId, urlPath + ' Make form_id ' + fields.form_id);
  assert(fields.utm_campaign === 'winter', urlPath + ' Make lost the real campaign');
  assert(fields.gclid === 'Cj0tier', urlPath + ' Make lost gclid');
  assert(fields.utm_term === 'secret-term', urlPath + ' Make lost utm_term');
  assert(fields.referrer_host === 'news.example', urlPath + ' referrer_host ' + fields.referrer_host);
  assert(!String(fields.referrer_host).includes('?'), urlPath + ' referrer_host has a query');
  assert(fields.form_id !== 'service_page', urlPath + ' Make form_id was generalized');
  assert(ev, urlPath + ' generate_lead missing');
  assert(!Object.prototype.hasOwnProperty.call(ev, 'utm_term'), urlPath + ' generate_lead has utm_term');
  assert(!Object.prototype.hasOwnProperty.call(ev, 'utm_content'), urlPath + ' generate_lead has utm_content');
  assert(ev.utm_source === 'google' && ev.utm_medium === 'cpc', urlPath + ' GA4 lost source/medium');
  assert(ev.utm_campaign === 'winter' || !Object.prototype.hasOwnProperty.call(ev, 'utm_campaign'), urlPath + ' campaign stand-in');
  if (Object.prototype.hasOwnProperty.call(ev, 'utm_campaign')) {
    gaps.push(urlPath + ': GA4 still has utm_campaign (TODO #96 must omit it, with no replacement)');
  }
  if (ev.form_id !== 'service_page' || ev.page_path !== '/service-page') {
    gaps.push(urlPath + ': GA4 form_id/page_path are still the real values (TODO #96)');
  }
  const next = boot('contact.html', '/contact.html', {
    query: false,
    referrer: 'https://menifa.org' + urlPath + '?utm_campaign=secret&loan=900000',
    storage: { 'menifa-att': open.window.sessionStorage.getItem('menifa-att') },
    blockAds: false
  });
  const nextHost = JSON.parse(next.window.sessionStorage.getItem('menifa-att')).referrer_host;
  assert(nextHost === 'news.example', urlPath + ' next page referrer_host changed to ' + nextHost);
  assert(!siteJs.includes('page_referrer'), urlPath + ' invented a referrer override');
  gaps.push(urlPath + ': GA4 referrer is not truncated to origin on this page or the next (TODO #96)');

  const gated = boot(file, urlPath, { blockAds: true });
  const gatedSrc = scripts(gated.window).join(' ');
  assert(!gatedSrc.includes('AW-999'), urlPath + ' Ads script loaded although the helper blocked it');
  assert(!gatedSrc.includes('googletagmanager.com/gtag/js?id=AW-999'), urlPath + ' Ads tag loaded');
  submit(gated.window);
  await flush();
  const gatedLead = leadEvents(gated.window)[0];
  assert(gatedLead && gatedLead.lead_uuid, urlPath + ' lead_uuid missing behind the helper');
  assert(adsConfigs(gated.window).length === 0, urlPath + ' Ads config ran although the helper blocked it');
  assert(conversions(gated.window).length === 0, urlPath + ' Ads conversion fired although the helper blocked it');
  const gatedFields = Object.fromEntries(new URLSearchParams(gated.crm[0].body));
  assert(gatedFields.utm_campaign === 'winter' && decodeURIComponent(gatedFields.page_path) === urlPath, urlPath + ' helper must not redact Make');
  covered.push(urlPath);
}

const report = {
  covered: covered,
  ads_routed_through_MenifaTierS: true,
  waiting_on_96: gaps,
  note: 'Pixel, Clarity, GA4 campaign omission and origin-only referrer stay in PR #96. This branch does not reimplement them.'
};
console.log(JSON.stringify(report, null, 2));
if (!process.exitCode) console.log('\nPASS (' + covered.length + ' Tier S paths, ' + gaps.length + ' checks waiting on #96)');
