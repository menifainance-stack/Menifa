/**
 * GA4 consent + privacy check. iPhone 13.
 * Usage: PREVIEW_URL=https://<preview>.vercel.app node tests/ga4-consent-preview.mjs
 * The Make lead webhook is always intercepted. No real lead is sent.
 */
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = (process.env.PREVIEW_URL || '').replace(/\/$/, '');
if (!BASE) {
  console.error('PREVIEW_URL is required');
  process.exit(1);
}
const TID = 'G-8ZP1G2VP40';
const QS = '?utm_source=facebook&email=x@y.com&fbclid=TEST&phone=0509999999';
const REFERRER = 'https://news.example/story?email=x@y.com&phone=0501234567&utm_source=newsletter&gclid=gclidtest';
const OUT = process.env.GA4_OUT || '/opt/cursor/artifacts/ga4';
const GA_HOST = /google-analytics\.com|googletagmanager\.com|analytics\.google\.com/i;
const META_HOST = /connect\.facebook\.net|facebook\.com\/tr|fbevents\.js/i;
const PII = /email|phone|name|@|0501234567|x@y\.com/i;

const PAGES = [
  { path: '/', name: 'home', lead: 'site', form: true },
  { path: '/lp/mihzur', name: 'lp-mihzur', lead: 'lp', form: true, formStart: true },
  { path: '/lp/ihud', name: 'lp-ihud', lead: 'lp', form: false },
  { path: '/q/mihzur', name: 'q-mihzur', lead: 'q', quiz: true, bot: true },
  { path: '/q/ihud', name: 'q-ihud', quiz: true },
  { path: '/blog/ריבית-משכנתא-היום.html', name: 'article' }
];

fs.mkdirSync(OUT, { recursive: true });

function blobOf(hit) {
  return hit.url + '\n' + (hit.post || '');
}
function isGa(hit) {
  return GA_HOST.test(hit.url);
}
function isMeta(hit) {
  return META_HOST.test(hit.url);
}
function isCollect(hit) {
  return /\/g\/collect|\/collect\b/i.test(hit.url) && isGa(hit);
}
function paramsOf(hit) {
  const raw = blobOf(hit);
  const out = {};
  const q = raw.split('?')[1] || raw;
  q.split('&').forEach(function (part) {
    const i = part.indexOf('=');
    if (i < 0) return;
    const k = decodeURIComponent(part.slice(0, i).replace(/\+/g, ' '));
    const v = decodeURIComponent(part.slice(i + 1).replace(/\+/g, ' '));
    if (out[k] == null) out[k] = v;
  });
  return out;
}
function hasPageView(hit) {
  const b = blobOf(hit);
  return /(?:^|[?&])en=page_view(?:&|$)/.test(b) || /en=page_view/.test(b);
}
function eventIdOf(hit) {
  const m = blobOf(hit).match(/(?:ep\.lead_uuid|(?:^|[?&])lead_uuid)=([^&\s]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}
function hasDebug(hit) {
  const b = blobOf(hit);
  /* blobOf joins url and body with a newline, so _dbg=1 at the end of the URL is not at end-of-string. */
  return /(?:^|[?&])_dbg=1(?:&|\n|$)/.test(b) || /ep\.debug_mode=1(?:&|\n|$)/.test(b) || /(?:^|[?&\n])debug_mode=1(?:&|\n|$)/.test(b);
}
function locationOf(hit) {
  const p = paramsOf(hit);
  return p.dl || p.page_location || '';
}
function redact(text) {
  return String(text || '')
    .replace(/phone=[^&\s]*/gi, 'phone=[redacted]')
    .replace(/name=[^&\s]*/gi, 'name=[redacted]')
    .replace(/email=[^&\s]*/gi, 'email=[redacted]')
    .replace(/answers=[^&\s]*/gi, 'answers=[redacted]')
    .replace(/ua=[^&\s]*/gi, 'ua=[redacted]')
    .replace(/fbp=[^&\s]*/gi, 'fbp=[redacted]')
    .replace(/fbc=[^&\s]*/gi, 'fbc=[redacted]')
    .replace(/050[- ]?\d{7}/g, '[phone]')
    .replace(/x@y\.com/gi, '[email]');
}

async function shot(page, name) {
  const file = path.join(OUT, name + '.png');
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function acceptStatistics(page) {
  await page.locator('#ck-prefs').click();
  await page.locator('#cookie-modal').waitFor({ state: 'visible' });
  await page.locator('#ck-stats').check();
  if (await page.locator('#ck-mkt').isChecked()) await page.locator('#ck-mkt').uncheck();
  await page.locator('#ck-save').click();
  await page.locator('#cookie-modal').waitFor({ state: 'hidden' });
}

function watch(page, bucket) {
  page.on('request', function (req) {
    const url = req.url();
    if (!GA_HOST.test(url) && !META_HOST.test(url)) return;
    bucket.push({
      url: url,
      method: req.method(),
      post: req.postData() || '',
      ts: new Date().toISOString()
    });
  });
}

async function stubLeads(context, leads) {
  await context.route('**/*hook.us2.make.com/**', async function (route) {
    const req = route.request();
    leads.push({
      url: req.url(),
      method: req.method(),
      post: req.postData() || '',
      ts: new Date().toISOString(),
      stubbed: true
    });
    await route.fulfill({
      status: 200,
      contentType: 'text/plain',
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'POST, OPTIONS',
        'access-control-allow-headers': '*'
      },
      body: 'ok'
    });
  });
}

async function openPage(page, urlPath) {
  const url = BASE + urlPath + QS;
  const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000, referer: REFERRER });
  const status = res ? res.status() : 0;
  if (status >= 400) {
    const alt = urlPath.endsWith('/') ? urlPath.slice(0, -1) : urlPath + '/';
    const res2 = await page.goto(BASE + alt + QS, { waitUntil: 'domcontentloaded', timeout: 45000, referer: REFERRER });
    return { url: page.url(), status: res2 ? res2.status() : status };
  }
  return { url: page.url(), status: status };
}

async function submitSiteForm(page) {
  const form = page.locator('form[data-lead]').first();
  const need = form.locator('select[name="need"]');
  if (await need.count()) {
    const refused = need.locator('option', { hasText: 'מסורבי בנקים' });
    if (await refused.count()) await need.selectOption({ label: 'מסורבי בנקים' });
  }
  await form.locator('input[name="name"]').fill('בדיקה');
  await form.locator('input[name="phone"]').fill('0501234567');
  await form.locator('input[name="consent"]').check();
  await form.locator('button[type="submit"]').click();
  await page.locator('.form-ok.show, .form-ok').first().waitFor({ state: 'visible', timeout: 10000 }).catch(function () {});
}

async function completeBot(page) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const phone = page.locator('form.aic-phone input[name="phone"]');
    if (await phone.count() && await phone.first().isVisible().catch(function () { return false; })) break;
    const text = page.locator('#aic-replies input[name="v"]');
    if (await text.count()) {
      await text.first().fill('בדיקה', { force: true });
      await page.locator('#aic-replies button.aic-send').click({ force: true });
      await page.waitForTimeout(800);
      continue;
    }
    const chip = page.locator('#aic-replies button.aic-chip');
    if (await chip.count()) {
      await chip.first().click({ force: true });
      await page.waitForTimeout(800);
      continue;
    }
    await page.waitForTimeout(300);
  }
  const phone = page.locator('form.aic-phone input[name="phone"]');
  if (!(await phone.count())) {
    const tail = await page.locator('#aic-log').innerText().catch(function () { return ''; });
    throw new Error('quiz phone form did not appear: ' + tail.slice(-180));
  }
  await page.locator('form.aic-phone input[name="consent"]').check({ force: true });
  await phone.fill('0501234567');
  await page.locator('form.aic-phone button[type="submit"]').click({ force: true });
  await page.waitForTimeout(800);
}

function assertCleanLocation(hits, errors, label) {
  const collects = hits.filter(isCollect);
  const withDl = collects.map(locationOf).filter(Boolean);
  if (!withDl.length) {
    errors.push(label + ': no dl/page_location on collect');
    return;
  }
  withDl.forEach(function (dl) {
    if (/email/i.test(dl) || /x@y\.com/i.test(dl)) errors.push(label + ': page_location contains email: ' + dl);
    let u;
    try { u = new URL(dl); } catch (e) { errors.push(label + ': bad page_location ' + dl); return; }
    const keys = Array.from(u.searchParams.keys());
    keys.forEach(function (k) {
      if (k !== 'gclid' && k.indexOf('utm_') !== 0) errors.push(label + ': page_location kept ' + k);
    });
    if (u.searchParams.get('utm_source') !== 'facebook') errors.push(label + ': utm_source missing from page_location');
    if (u.searchParams.has('fbclid')) errors.push(label + ': page_location kept fbclid');
  });
}

function assertCleanReferrer(hits, errors, label) {
  const views = hits.filter(function (h) { return isCollect(h) && hasPageView(h); });
  const refs = views.map(function (h) { return paramsOf(h).dr || ''; }).filter(Boolean);
  if (!refs.length) {
    errors.push(label + ': no dr/page_referrer on page_view');
    return false;
  }
  let ok = true;
  refs.forEach(function (dr) {
    if (/x@y\.com|0501234567|email=|phone=/i.test(dr)) {
      errors.push(label + ': dr leaks contact data: ' + dr);
      ok = false;
    }
    if (!/utm_source=newsletter/.test(dr) || !/gclid=gclidtest/.test(dr)) {
      errors.push(label + ': dr dropped an allowlisted referrer param: ' + dr);
      ok = false;
    }
  });
  return ok;
}

const iphone = devices['iPhone 13'];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = { base: BASE, started: new Date().toISOString(), pages: [], errors: [], samples: [], debugHits: [] };

async function freshContext() {
  const context = await browser.newContext({ ...iphone });
  const leads = [];
  await stubLeads(context, leads);
  const page = await context.newPage();
  const hits = [];
  watch(page, hits);
  return { context, page, hits, leads };
}

for (const spec of PAGES) {
  const row = { name: spec.name, path: spec.path, checks: {} };
  report.pages.push(row);

  // Before consent + reject: zero GA and zero Meta.
  {
    const { context, page, hits } = await freshContext();
    try {
      const opened = await openPage(page, spec.path);
      row.status = opened.status;
      await page.locator('#cookie').waitFor({ state: 'visible', timeout: 10000 });
      await page.waitForTimeout(1500);
      const before = hits.filter(function (h) { return isGa(h) || isMeta(h); });
      row.checks.beforeConsent = before.length === 0;
      if (before.length) report.errors.push(spec.name + ': requests before consent ' + before.map(function (h) { return h.url; }).join(' | '));
      await shot(page, spec.name + '-before-consent');
      await page.locator('#ck-none').click();
      await page.waitForTimeout(1500);
      const afterReject = hits.filter(function (h) { return isGa(h) || isMeta(h); });
      row.checks.afterReject = afterReject.length === 0;
      if (afterReject.length) report.errors.push(spec.name + ': requests after reject ' + afterReject.map(function (h) { return h.url; }).join(' | '));
      await shot(page, spec.name + '-after-reject');
    } catch (err) {
      row.checks.beforeConsent = false;
      report.errors.push(spec.name + ' reject flow: ' + err.message);
    }
    await context.close();
  }

  // Statistics only. Marketing stays off, so Meta must stay at 0.
  {
    const { context, page, hits, leads } = await freshContext();
    try {
      await openPage(page, spec.path);
      await page.locator('#cookie').waitFor({ state: 'visible', timeout: 10000 });
      await page.waitForTimeout(800);
      const before = hits.filter(isGa);
      if (before.length) report.errors.push(spec.name + ': GA before accept ' + before.length);
      await acceptStatistics(page);
      await page.waitForRequest(function (req) {
        return GA_HOST.test(req.url()) && /\/collect/.test(req.url()) && (req.url().includes(TID) || (req.postData() || '').includes(TID));
      }, { timeout: 15000 });
      await page.waitForTimeout(1200);
      const collects = hits.filter(isCollect);
      const expectDebug = /\.vercel\.app$/i.test(new URL(page.url()).hostname);
      row.expectDebug = expectDebug;
      row.checks.tid = collects.some(function (h) { return blobOf(h).includes('tid=' + TID) || blobOf(h).includes(TID); });
      row.checks.pageView = collects.some(hasPageView);
      row.checks.debug = expectDebug ? collects.some(hasDebug) : true;
      if (!row.checks.tid) report.errors.push(spec.name + ': missing tid ' + TID);
      if (!row.checks.pageView) report.errors.push(spec.name + ': missing page_view');
      if (expectDebug && !row.checks.debug) report.errors.push(spec.name + ': missing debug_mode on preview');
      if (!expectDebug && collects.some(hasDebug)) report.errors.push(spec.name + ': debug_mode set off preview');
      assertCleanLocation(hits, report.errors, spec.name);
      row.checks.referrer = assertCleanReferrer(hits, report.errors, spec.name);
      const bar = new URL(page.url());
      row.checks.urlKeptFbclid = bar.searchParams.get('fbclid') === 'TEST';
      if (!row.checks.urlKeptFbclid) report.errors.push(spec.name + ': address bar lost fbclid');
      row.checks.location = !report.errors.some(function (e) { return e.indexOf(spec.name + ':') === 0 && /page_location|utm_source|dr /.test(e); });
      const meta = hits.filter(isMeta);
      row.checks.metaBeforeMarketing = meta.length === 0;
      if (meta.length) report.errors.push(spec.name + ': Meta before marketing ' + meta.map(function (h) { return h.url; }).join(' | '));
      collects.forEach(function (h) {
        if (hasDebug(h) || hasPageView(h)) report.debugHits.push({ page: spec.name, ts: h.ts, url: redact(h.url), post: redact(h.post).slice(0, 500) });
      });
      const sample = collects.find(hasPageView) || collects[0];
      if (sample) {
        report.samples.push({
          page: spec.name,
          event: 'page_view',
          ts: sample.ts,
          url: redact(sample.url),
          post: redact(sample.post).slice(0, 800),
          dl: locationOf(sample)
        });
      }
      await shot(page, spec.name + '-stats-accepted');

      if (spec.quiz && !spec.bot) {
        const chip = page.locator('#aic-replies button.aic-chip').first();
        await chip.waitFor({ state: 'visible', timeout: 10000 });
        await chip.click();
        await page.waitForTimeout(1000);
      }
      if (spec.quiz) {
        const steps = hits.filter(function (h) {
          return isCollect(h) && /quiz_step/.test(blobOf(h));
        });
        const numbered = steps.some(function (h) {
          const b = blobOf(h);
          return /epn\.step_number=\d+/.test(b) || /ep\.step_number=\d+/.test(b) || /step_number=\d+/.test(b);
        });
        row.checks.quizStep = steps.length > 0 && numbered;
        if (!row.checks.quizStep) report.errors.push(spec.name + ': quiz_step missing a step number');
        const stepHit = steps[0];
        if (stepHit) {
          const body = blobOf(stepHit);
          const segment = body.split(/[\r\n]+/).filter(function (part) { return part.indexOf('en=quiz_step') >= 0; }).join('\n');
          if (/ep\.quiz=|answer|מסורב|@/.test(segment)) report.errors.push(spec.name + ': quiz_step included more than the step number');
          report.samples.push({ page: spec.name, event: 'quiz_step', ts: stepHit.ts, url: redact(stepHit.url), post: redact(stepHit.post).slice(0, 800) });
        }
        await shot(page, spec.name + '-quiz-step');
      }

      if (spec.form) {
        await submitSiteForm(page);
        await page.waitForRequest(function (req) {
          return /form_submit_success/.test(req.url() + (req.postData() || ''));
        }, { timeout: 12000 }).catch(function () {});
        const allLead = hits.filter(function (h) { return isCollect(h) && /form_submit_success/.test(blobOf(h)); });
        row.checks.formSubmit = allLead.length > 0;
        if (!row.checks.formSubmit) report.errors.push(spec.name + ': form_submit_success did not fire');
        if (spec.formStart) {
          const started = hits.some(function (h) {
            const b = blobOf(h);
            return isCollect(h) && /form_start/.test(b) && /lead_source=lp/.test(b);
          });
          row.checks.formStart = started;
          if (!started) report.errors.push(spec.name + ': form_start did not fire');
        }
        row.checks.webhookStubbed = leads.length > 0 && leads.every(function (l) { return l.stubbed; });
        if (!row.checks.webhookStubbed) report.errors.push(spec.name + ': Make webhook was not stubbed');
        const leadHit = allLead[0];
        const leadBody = leadHit ? blobOf(leadHit) : '';
        const decodedLead = leadHit ? decodeURIComponent(leadBody) : '';
        if (leadHit && /x@y\.com|0501234567|בדיקה|מסורב/.test(decodedLead)) {
          report.errors.push(spec.name + ': form_submit_success payload has PII or a sensitive answer');
        }
        const eventId = leadHit ? eventIdOf(leadHit) : '';
        const webhookId = (leads[0] && (leads[0].post.match(/(?:^|&)event_id=([^&]+)/) || [])[1]) || '';
        const webhookEventId = webhookId ? decodeURIComponent(webhookId) : '';
        row.checks.eventIdMatch = !!(eventId && webhookEventId && eventId === webhookEventId);
        if (!row.checks.eventIdMatch) report.errors.push(spec.name + ': lead_uuid mismatch ga=' + eventId + ' webhook=' + webhookEventId);
        row.checks.leadParams = /ep\.form_id=/.test(leadBody) && /ep\.landing_page_path=/.test(leadBody) && /ep\.utm_source=facebook/.test(leadBody) && (/(?:^|[?&])dp=/.test(leadBody) || /ep\.page_path=/.test(leadBody));
        if (!row.checks.leadParams) report.errors.push(spec.name + ': form_submit_success missing canonical params');
        if (leadHit) report.samples.push({ page: spec.name, event: 'form_submit_success', ts: leadHit.ts, url: redact(leadHit.url), post: redact(leadHit.post).slice(0, 800), event_id: eventId });
        if (leads[0]) report.samples.push({ page: spec.name, event: 'webhook_stub', ts: leads[0].ts, post: redact(leads[0].post).slice(0, 500), stubbed: true });
        await shot(page, spec.name + '-lead');
      }

      if (spec.bot) {
        await completeBot(page);
        await page.waitForRequest(function (req) {
          return /form_submit_success/.test(req.url() + (req.postData() || ''));
        }, { timeout: 15000 }).catch(function () {});
        const allLead = hits.filter(function (h) { return isCollect(h) && /form_submit_success/.test(blobOf(h)); });
        row.checks.formSubmit = allLead.length > 0;
        if (!row.checks.formSubmit) report.errors.push(spec.name + ': bot form_submit_success did not fire');
        row.checks.webhookStubbed = leads.length > 0 && leads.every(function (l) { return l.stubbed; });
        if (!row.checks.webhookStubbed) report.errors.push(spec.name + ': bot webhook was not stubbed');
        const leadHit = allLead[0];
        const leadBody = leadHit ? blobOf(leadHit) : '';
        if (leadHit && /0501234567|בדיקה|מסורב/.test(decodeURIComponent(leadBody))) report.errors.push(spec.name + ': bot form_submit_success has PII');
        const eventId = leadHit ? eventIdOf(leadHit) : '';
        const webhookId = (leads[0] && (leads[0].post.match(/(?:^|&)event_id=([^&]+)/) || [])[1]) || '';
        const webhookEventId = webhookId ? decodeURIComponent(webhookId) : '';
        row.checks.eventIdMatch = !!(eventId && webhookEventId && eventId === webhookEventId);
        if (!row.checks.eventIdMatch) report.errors.push(spec.name + ': bot lead_uuid mismatch ga=' + eventId + ' webhook=' + webhookEventId);
        row.checks.leadParams = /ep\.form_id=q-/.test(leadBody) && /ep\.lead_uuid=/.test(leadBody) && /ep\.landing_page_path=/.test(leadBody);
        if (!row.checks.leadParams) report.errors.push(spec.name + ': bot form_submit_success missing canonical params');
        const meta = hits.filter(isMeta);
        if (meta.length) report.errors.push(spec.name + ': Meta during bot submit without marketing');
        if (leadHit) report.samples.push({ page: spec.name, event: 'form_submit_success', ts: leadHit.ts, url: redact(leadHit.url), post: redact(leadHit.post).slice(0, 800), event_id: eventId });
        if (leads[0]) report.samples.push({ page: spec.name, event: 'webhook_stub', ts: leads[0].ts, post: redact(leads[0].post).slice(0, 500), stubbed: true });
        await shot(page, spec.name + '-bot-lead');
      }
      if (spec.name === 'home') {
        await page.evaluate(function () {
          var a = document.querySelector('a[href*="wa.me"], a[href*="api.whatsapp.com"]');
          if (!a) throw new Error('no whatsapp link');
          a.addEventListener('click', function (e) { e.preventDefault(); });
          a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        });
        await page.waitForRequest(function (req) {
          return /whatsapp_click/.test((req.url() || '') + (req.postData() || ''));
        }, { timeout: 10000 }).catch(function () {});
        const waHits = hits.filter(function (h) { return isCollect(h) && /whatsapp_click/.test(blobOf(h)); });
        row.checks.whatsapp = waHits.length > 0;
        if (!row.checks.whatsapp) report.errors.push('home: whatsapp_click did not fire');
        const waBody = waHits.length ? decodeURIComponent(blobOf(waHits[0])) : '';
        if (waHits.length && (/[?&]text=/.test(waBody) || /שלום/.test(waBody))) report.errors.push('home: whatsapp link_url kept the message text');
        if (waHits.length) report.samples.push({ page: 'home', event: 'whatsapp_click', ts: waHits[0].ts, post: redact(waHits[0].post).slice(0, 500), url: redact(waHits[0].url).slice(0, 300) });
      }
      hits.filter(isCollect).forEach(function (h) {
        const raw = decodeURIComponent(blobOf(h));
        if (/[?&]email=/i.test(raw) || /x@y\.com/i.test(raw) || /0501234567/.test(raw) || /מסורב/.test(raw)) {
          report.errors.push(spec.name + ': collect still carries query or form PII');
        }
      });
      const beforeOpt = hits.length;
      await page.evaluate(function () {
        document.cookie = '_ga=GA1.1.111.222; path=/';
        document.cookie = '_ga_8ZP1G2VP40=GS1.1.111; path=/';
      });
      await page.evaluate(function () { window.MenifaConsent.open(); });
      await page.locator('#cookie-modal').waitFor({ state: 'visible' });
      await page.locator('#ck-stats').uncheck();
      await page.locator('#ck-save').click();
      await page.waitForTimeout(2500);
      const after = hits.slice(beforeOpt).filter(isCollect);
      row.checks.optOutSilent = after.length === 0;
      if (after.length) report.errors.push(spec.name + ': collect after statistics opt-out ' + after.length);
      const revoked = await page.evaluate(function () {
        return {
          disabled: window['ga-disable-G-8ZP1G2VP40'] === true,
          cookie: document.cookie
        };
      });
      row.checks.gaDisable = revoked.disabled;
      if (!revoked.disabled) report.errors.push(spec.name + ': ga-disable flag was not set');
      row.checks.cookiesDeleted = !/(?:^|; )_ga=/.test(revoked.cookie) && !/_ga_8ZP1G2VP40=/.test(revoked.cookie);
      if (!row.checks.cookiesDeleted) report.errors.push(spec.name + ': GA cookies still present: ' + revoked.cookie);
      await shot(page, spec.name + '-opt-out');
    } catch (err) {
      report.errors.push(spec.name + ' accept flow: ' + err.message);
    }
    await context.close();
  }
}

const EXTRA_REF = [
  { path: '/cookies.html', name: 'cookies' },
  { path: '/privacy.html', name: 'privacy' },
  { path: '/contact.html', name: 'contact' }
];
for (const spec of EXTRA_REF) {
  const row = { name: spec.name, path: spec.path, checks: {} };
  report.pages.push(row);
  const { context, page, hits } = await freshContext();
  try {
    await openPage(page, spec.path);
    await page.locator('#cookie').waitFor({ state: 'visible', timeout: 10000 });
    const before = hits.filter(isGa);
    row.checks.beforeConsent = before.length === 0;
    if (before.length) report.errors.push(spec.name + ': GA before consent');
    await acceptStatistics(page);
    await page.waitForTimeout(2500);
    row.checks.referrer = assertCleanReferrer(hits, report.errors, spec.name);
    row.checks.pageView = hits.some(function (h) { return isCollect(h) && hasPageView(h); });
    if (!row.checks.pageView) report.errors.push(spec.name + ': missing page_view');
    const bar = new URL(page.url());
    if (bar.searchParams.get('fbclid') !== 'TEST') report.errors.push(spec.name + ': address bar lost fbclid');
  } catch (err) {
    report.errors.push(spec.name + ' referrer flow: ' + err.message);
  }
  await context.close();
}

for (const spec of [{ path: '/', name: 'home' }, { path: '/lp/mihzur', name: 'lp-mihzur' }, { path: '/q/mihzur', name: 'q-mihzur' }]) {
  const row = { name: spec.name + '-marketing', path: spec.path, checks: {} };
  report.pages.push(row);
  const { context, page, hits } = await freshContext();
  try {
    await openPage(page, spec.path);
    await page.locator('#cookie').waitFor({ state: 'visible', timeout: 10000 });
    if (hits.filter(isMeta).length) report.errors.push(spec.name + ': Meta before marketing consent');
    await page.locator('#ck-all').click();
    await page.waitForTimeout(4000);
    const fbc = await page.evaluate(function () {
      var m = document.cookie.match(/(?:^|; )_fbc=([^;]*)/);
      return m ? decodeURIComponent(m[1]) : '';
    });
    row.checks.fbc = fbc.indexOf('TEST') !== -1;
    if (!row.checks.fbc) report.errors.push(spec.name + ': _fbc missing after marketing consent, cookie=' + fbc);
    if (new URL(page.url()).searchParams.get('fbclid') !== 'TEST') report.errors.push(spec.name + ': fbclid stripped before pixel');
    await shot(page, spec.name + '-marketing');
  } catch (err) {
    report.errors.push(spec.name + ' marketing flow: ' + err.message);
  }
  await context.close();
}

{
  const row = { name: 'kill-switch', path: '/', checks: {} };
  report.pages.push(row);
  const context = await browser.newContext({ ...iphone });
  await context.addInitScript(function () { window.MENIFA_GA_OFF = true; });
  await stubLeads(context, []);
  const page = await context.newPage();
  const hits = [];
  watch(page, hits);
  try {
    await openPage(page, '/');
    await page.locator('#ck-all').click();
    await page.waitForTimeout(2000);
    row.checks.noGa = hits.filter(isGa).length === 0;
    if (!row.checks.noGa) report.errors.push('kill-switch: GA loaded while MENIFA_GA_OFF');
  } catch (err) {
    report.errors.push('kill-switch: ' + err.message);
  }
  await context.close();
  const context2 = await browser.newContext({ ...iphone });
  await context2.route('**/*', async function (route) {
    const req = route.request();
    if (req.resourceType() !== 'document') return route.continue();
    const res = await route.fetch();
    const body = (await res.text()).replace(/<head[^>]*>/i, function (open) {
      return open + '<meta name="menifa-ga" content="off">';
    });
    await route.fulfill({ response: res, body: body });
  });
  const page2 = await context2.newPage();
  const hits2 = [];
  watch(page2, hits2);
  try {
    await openPage(page2, '/');
    await page2.locator('#ck-all').click();
    await page2.waitForTimeout(2000);
    row.checks.metaOff = hits2.filter(isGa).length === 0;
    if (!row.checks.metaOff) report.errors.push('kill-switch: GA loaded with meta menifa-ga=off');
  } catch (err) {
    report.errors.push('kill-switch meta: ' + err.message);
  }
  await context2.close();
}

report.finished = new Date().toISOString();
const debugTimes = report.debugHits.map(function (h) { return h.ts; }).sort();
report.debugWindowUtc = debugTimes.length ? { from: debugTimes[0], to: debugTimes[debugTimes.length - 1] } : null;
report.ok = report.errors.length === 0;
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(OUT, 'samples.json'), JSON.stringify(report.samples, null, 2));
console.log(JSON.stringify({ ok: report.ok, errors: report.errors, pages: report.pages, debugWindowUtc: report.debugWindowUtc }, null, 2));
await browser.close();
process.exit(report.ok ? 0 : 1);
