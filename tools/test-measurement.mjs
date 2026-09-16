#!/usr/bin/env node
/**
 * Measurement package checks (jsdom + static HTML).
 * Run: node tools/test-measurement.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);

let JSDOM;
try {
  ({ JSDOM } = require('/tmp/jsdom-pkg/node_modules/jsdom'));
} catch (e) {
  console.error('jsdom missing. Install with: npm install --prefix /tmp/jsdom-pkg jsdom');
  process.exit(2);
}

let failed = 0;
function ok(name, cond, detail) {
  if (cond) console.log('  ok  ' + name);
  else {
    failed++;
    console.log('  FAIL ' + name + (detail ? ' — ' + detail : ''));
  }
}

function stripHtmlComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, '');
}

function loadScript(window, rel) {
  const code = fs.readFileSync(path.join(root, rel), 'utf8');
  window.eval(code);
}

function makeDom(html, url) {
  const dom = new JSDOM(html, {
    url: url || 'https://menifa.org/calculators.html?utm_source=google&utm_medium=cpc&utm_campaign=test&gclid=abc',
    runScripts: 'outside-only',
    pretendToBeVisual: true
  });
  return dom;
}

function listPublicHtml() {
  const skipNames = new Set([
    'preview.html', 'preview-elite.html', 'preview-elite-v2.html', 'preview-elite-v3.html',
    'preview-palettes.html', 'preview-palettes-v2.html', 'preview-palettes-v3.html',
    'preview-bright.html', 'mockups.html', 'index-v2.html',
    'alut-kolelet-mashkanta-bituach.html'
  ]);
  const skipDirs = new Set(['mockups', 'assets']);
  function walk(dir, acc) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ent.name.startsWith('.')) continue;
      const full = path.join(dir, ent.name);
      const rel = path.relative(root, full);
      if (ent.isDirectory()) {
        if (skipDirs.has(ent.name)) continue;
        walk(full, acc);
      } else if (ent.name.endsWith('.html')) {
        if (skipNames.has(ent.name)) continue;
        if (rel === path.join('blog', 'index.html')) continue;
        acc.push(rel);
      }
    }
    return acc;
  }
  return walk(root, []).sort();
}

/* ── 1. Static: live HTML must not load GTM ── */
console.log('static GTM gate');
const htmlFiles = listPublicHtml();
ok('public HTML inventory includes masurvei + art-55 + mihzur + ihud week-1',
  htmlFiles.includes('masurvei-bankim.html') &&
  htmlFiles.includes(path.join('blog', 'art-55.html')) &&
  htmlFiles.includes('mihzur-mashkanta.html') &&
  htmlFiles.includes(path.join('blog', 'ihud-halvaot-matei-ken-lo.html')));
for (const file of htmlFiles) {
  const raw = fs.readFileSync(path.join(root, file), 'utf8');
  const live = stripHtmlComments(raw);
  ok(file + ' has commented GTM placeholder', /GTM-XXXXXXX/.test(raw));
  ok(file + ' marks GTM-XXXXXXX as REPLACE_ME', /REPLACE_ME/.test(raw));
  ok(file + ' live HTML has no googletagmanager.com', !/googletagmanager\.com/.test(live));
  ok(file + ' live HTML has no executing GTM-XXXXXXX snippet', !/gtm\.js\?id='/.test(live) && !/ns\.html\?id=GTM-/.test(live));
  const prefix = file.startsWith('blog' + path.sep) ? '../assets/' : 'assets/';
  ok(file + ' includes measurement-config.js', raw.includes(`src="${prefix}measurement-config.js`));
  ok(file + ' includes attribution.js', raw.includes(`src="${prefix}attribution.js`));
  ok(file + ' includes wa-track.js', raw.includes(`src="${prefix}wa-track.js`));
  ok(file + ' includes gtm-loader.js', raw.includes(`src="${prefix}gtm-loader.js`));
}
ok('contact notes missing contact_main form',
  /contact_main/.test(fs.readFileSync(path.join(root, 'contact.html'), 'utf8')));
ok('tco form has data-form-id',
  /data-form-id="pillar_alut_mashkanta"/.test(fs.readFileSync(path.join(root, 'alut-mashkanta-kolel-bituach.html'), 'utf8')));
ok('measurement-config preview flag is false',
  /MENIFA_MEASUREMENT_PREVIEW = false/.test(fs.readFileSync(path.join(root, 'assets/measurement-config.js'), 'utf8')));
ok('gtm-loader refuses placeholder',
  /GTM-XXXXXXX/.test(fs.readFileSync(path.join(root, 'assets/gtm-loader.js'), 'utf8')));
ok('measurement-config marks REPLACE_ME placeholders',
  /REPLACE_ME/.test(fs.readFileSync(path.join(root, 'assets/measurement-config.js'), 'utf8')) &&
  /G-XXXXXXXX/.test(fs.readFileSync(path.join(root, 'assets/measurement-config.js'), 'utf8')));
ok('STATUS doc explains placeholders + DoD',
  /REPLACE_ME/.test(fs.readFileSync(path.join(root, 'docs/website-landing/2026-09-16-ga4-gtm-preview-status.md'), 'utf8')) &&
  /Definition of Done/.test(fs.readFileSync(path.join(root, 'docs/website-landing/2026-09-16-ga4-gtm-preview-status.md'), 'utf8')) &&
  /session_source/.test(fs.readFileSync(path.join(root, 'docs/website-landing/2026-09-16-ga4-gtm-preview-status.md'), 'utf8')));

/* ── 2. Attribution ── */
console.log('attribution.js');
{
  const dom = makeDom('<!doctype html><html><body></body></html>');
  loadScript(dom.window, 'assets/attribution.js');
  const a = dom.window.MenifaAttribution.get();
  ok('stores utm_source', a.utm_source === 'google');
  ok('stores utm_medium', a.utm_medium === 'cpc');
  ok('stores utm_campaign', a.utm_campaign === 'test');
  ok('stores gclid', a.gclid === 'abc');
  ok('landing_page_path first-touch', a.landing_page_path === '/calculators.html');
  ok('session_source first-touch', a.session_source === 'google');
  ok('session_medium first-touch', a.session_medium === 'cpc');
  ok('session_campaign first-touch', a.session_campaign === 'test');
  ok('sessionStorage has utm_source',
    dom.window.sessionStorage.getItem('menifa_attr_utm_source') === 'google');
}
{
  const dom = makeDom(
    '<!doctype html><html><body></body></html>',
    'https://menifa.org/calculators.html?utm_source=google&utm_medium=cpc&utm_campaign=first'
  );
  loadScript(dom.window, 'assets/attribution.js');
  dom.window.history.replaceState({}, '', 'https://menifa.org/contact.html?utm_source=facebook&utm_medium=paid&utm_campaign=later');
  delete dom.window.MenifaAttribution;
  loadScript(dom.window, 'assets/attribution.js');
  const again = dom.window.MenifaAttribution.get();
  ok('first-touch does not overwrite utm_source', again.session_source === 'google');
  ok('first-touch does not overwrite campaign', again.session_campaign === 'first');
  ok('first-touch keeps landing_page_path', again.landing_page_path === '/calculators.html');
}

/* ── 3. GTM loader gates ── */
console.log('gtm-loader.js');
{
  const dom = makeDom('<!doctype html><html><head></head><body></body></html>', 'https://menifa.org/');
  loadScript(dom.window, 'assets/measurement-config.js');
  loadScript(dom.window, 'assets/gtm-loader.js');
  const injected = [...dom.window.document.querySelectorAll('script')].map((s) => s.src).join(' ');
  ok('default preview false: no gtm.js', !/googletagmanager/.test(injected));
}
{
  const dom = makeDom('<!doctype html><html><head></head><body></body></html>', 'https://menifa.org/');
  loadScript(dom.window, 'assets/measurement-config.js');
  dom.window.MENIFA_MEASUREMENT_PREVIEW = true;
  dom.window.MENIFA_GTM_ID = 'GTM-XXXXXXX';
  loadScript(dom.window, 'assets/gtm-loader.js');
  const injected = [...dom.window.document.querySelectorAll('script')].map((s) => s.src).join(' ');
  ok('preview true + placeholder: still no gtm.js', !/googletagmanager/.test(injected));
}
{
  const dom = makeDom('<!doctype html><html><head></head><body></body></html>', 'https://menifa.org/');
  loadScript(dom.window, 'assets/measurement-config.js');
  dom.window.MENIFA_MEASUREMENT_PREVIEW = true;
  dom.window.MENIFA_GTM_ID = 'GTM-ABC1234';
  loadScript(dom.window, 'assets/gtm-loader.js');
  const injected = [...dom.window.document.querySelectorAll('script')].map((s) => s.src).join(' ');
  ok('preview true + real-looking ID: loads gtm.js', /googletagmanager\.com\/gtm\.js\?id=GTM-ABC1234/.test(injected));
}

/* ── 4. WhatsApp tracker ── */
console.log('wa-track.js');
{
  const dom = makeDom(
    '<!doctype html><html><body>' +
    '<a class="fab fab-whatsapp" href="https://wa.me/972524502821?text=שלום%20תמיר">WA</a>' +
    '<a href="https://api.whatsapp.com/send?phone=972524502821&text=secret">API</a>' +
    '</body></html>'
  );
  loadScript(dom.window, 'assets/attribution.js');
  const originalOpen = dom.window.open;
  dom.window.open = function () { return null; };
  loadScript(dom.window, 'assets/wa-track.js');
  const fab = dom.window.document.querySelector('.fab-whatsapp');
  fab.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  const events = (dom.window.dataLayer || []).filter((e) => e.event === 'whatsapp_click');
  ok('fab click pushes whatsapp_click', events.length === 1);
  ok('wa_variant fab', events[0].wa_variant === 'fab');
  ok('link_url strips text=', events[0].link_url === 'https://wa.me/972524502821');
  ok('session_source on WA event', events[0].session_source === 'google');
  ok('session_medium on WA event', events[0].session_medium === 'cpc');
  ok('session_campaign on WA event', events[0].session_campaign === 'test');
  ok('WA event has no raw utm_* keys', !('utm_source' in events[0]));
  ok('no PII keys on WA event', !('name' in events[0]) && !('phone' in events[0]) && !/secret|שלום/.test(JSON.stringify(events[0])));

  dom.window.open('https://wa.me/972524502821?text=private-message', '_blank');
  const afterOpen = (dom.window.dataLayer || []).filter((e) => e.event === 'whatsapp_click');
  ok('window.open WA pushes event', afterOpen.length === 2);
  ok('window.open variant dynamic', afterOpen[1].wa_variant === 'dynamic');
  ok('window.open link_url has no text', afterOpen[1].link_url === 'https://wa.me/972524502821');
}

/* ── 5. lead-capture.js ── */
console.log('lead-capture.js');
async function runLeadTests() {
  const fixture = `
    <!doctype html><html><body>
      <div id="calc-mortgage">
        <input id="m1-loan" value="1000000">
        <input id="m1-rate" value="5">
        <input id="m1-years" value="25">
        <div id="m1-out">₪5,000 / חודש</div>
        <div id="m1-total">₪1,500,000</div>
        <div class="calc-cta"><a class="calc-cta-link">x</a></div>
      </div>
      <div id="calc-refinance">
        <input id="m4-balance" value="900000">
        <input id="m4-cur-rate" value="5.5">
        <input id="m4-new-rate" value="4.5">
        <input id="m4-years" value="20">
        <div id="m4-out">₪200 / חודש</div>
        <div id="m4-total">₪48,000</div>
        <div class="calc-cta"><a class="calc-cta-link">x</a></div>
      </div>
      <div id="calc-dti">
        <input id="m3-income" value="20000">
        <div id="m3-out">30%</div>
        <div class="calc-cta"><a class="calc-cta-link">x</a></div>
      </div>
      <div id="feasibility-widget"></div>
    </body></html>`;

  function boot(fetchImpl, nowStart) {
    const dom = makeDom(fixture);
    let now = nowStart || 1_000_000;
    dom.window.Date.now = () => now;
    dom.window.advance = (ms) => { now += ms; };
    dom.window.monthlyPayment = () => 5000;
    dom.window.fmt = (n) => '₪' + n;
    const fetches = [];
    dom.window.fetch = function (url, opts) {
      fetches.push({ url, opts });
      return fetchImpl(url, opts);
    };
    loadScript(dom.window, 'assets/attribution.js');
    loadScript(dom.window, 'assets/lead-capture.js');
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    return { dom, fetches, nowRef: () => now };
  }

  function fill(form, { honey } = {}) {
    const name = form.querySelector('[name="name"]');
    const phone = form.querySelector('[name="phone"]');
    const consent = form.querySelector('.lead-form__consent input[type="checkbox"]');
    name.value = 'ישראל ישראלי';
    phone.value = '052-4502821';
    consent.checked = true;
    if (honey) form.querySelector('[name="website"]').value = 'http://spam';
    form.dispatchEvent(new form.ownerDocument.defaultView.Event('focusin', { bubbles: true }));
  }

  {
    const { dom, fetches } = boot(() => Promise.resolve({ ok: true, status: 200 }));
    const form = dom.window.document.querySelector('form.lead-form');
    ok('calc_mortgage data-form-id', form && form.getAttribute('data-form-id') === 'calc_mortgage');
    ok('calc_refinance data-form-id',
      dom.window.document.querySelector('#calc-refinance form.lead-form').getAttribute('data-form-id') === 'calc_refinance');
    ok('calc_dti data-form-id',
      dom.window.document.querySelector('#calc-dti form.lead-form').getAttribute('data-form-id') === 'calc_dti');
    ok('madrich_refinance_widget data-form-id',
      dom.window.document.querySelector('#feasibility-widget form.lead-form').getAttribute('data-form-id') === 'madrich_refinance_widget');
    fill(form);
    dom.window.advance(4000);
    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await Promise.resolve();
    await Promise.resolve();
    ok('fetch called once on real submit', fetches.length === 1);
    const body = JSON.parse(fetches[0].opts.body);
    ok('Make payload keeps page/name/phone', body.page && body.name === 'ישראל ישראלי' && body.phone === '0524502821');
    ok('Make payload form_id', body.form_id === 'calc_mortgage');
    ok('Make payload lead_uuid uuid-ish', /^[0-9a-f-]{36}$/i.test(body.lead_uuid));
    ok('Make payload landing_page_path', body.landing_page_path === '/calculators.html');
    ok('Make payload utm_source', body.utm_source === 'google');
    ok('Make payload utm_campaign', body.utm_campaign === 'test');
    const ev = (dom.window.dataLayer || []).filter((e) => e.event === 'form_submit_success');
    ok('form_submit_success after res.ok', ev.length === 1);
    ok('dataLayer form_id', ev[0].form_id === 'calc_mortgage');
    ok('dataLayer lead_uuid matches Make', ev[0].lead_uuid === body.lead_uuid);
    ok('dataLayer session_source', ev[0].session_source === 'google');
    ok('dataLayer session_medium', ev[0].session_medium === 'cpc');
    ok('dataLayer session_campaign', ev[0].session_campaign === 'test');
    ok('dataLayer landing_page_path', ev[0].landing_page_path === '/calculators.html');
    ok('dataLayer has no raw utm_* keys', !('utm_source' in ev[0]));
    ok('dataLayer has no PII', !('name' in ev[0]) && !('phone' in ev[0]) && !('email' in ev[0]) && !('amount' in ev[0]) && !('note' in ev[0]));
  }

  {
    const { dom, fetches } = boot(() => Promise.resolve({ ok: false, status: 500 }));
    const form = dom.window.document.querySelector('form.lead-form');
    fill(form);
    dom.window.advance(4000);
    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await Promise.resolve();
    await Promise.resolve();
    const ev = (dom.window.dataLayer || []).filter((e) => e.event === 'form_submit_success');
    ok('no form_submit_success when !res.ok', ev.length === 0);
    ok('fetch still attempted', fetches.length === 1);
  }

  {
    const { dom, fetches } = boot(() => Promise.resolve({ ok: true, status: 200 }));
    const form = dom.window.document.querySelector('form.lead-form');
    fill(form, { honey: true });
    dom.window.advance(4000);
    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await Promise.resolve();
    ok('honeypot does not fetch', fetches.length === 0);
    const ev = (dom.window.dataLayer || []).filter((e) => e.event === 'form_submit_success');
    ok('honeypot does not push form_submit_success', ev.length === 0);
  }

  {
    const { dom, fetches } = boot(() => Promise.resolve({ ok: true, status: 200 }));
    const form = dom.window.document.querySelector('form.lead-form');
    fill(form);
    // no advance — too fast
    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await Promise.resolve();
    ok('fast fill does not fetch', fetches.length === 0);
    const ev = (dom.window.dataLayer || []).filter((e) => e.event === 'form_submit_success');
    ok('fast fill does not push form_submit_success', ev.length === 0);
  }
}

await runLeadTests();

if (failed) {
  console.log('\n' + failed + ' failed');
  process.exit(1);
}
console.log('\nall passed');
