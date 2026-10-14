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
const QS = '?utm_source=facebook&email=x@y.com';
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
  const m = blobOf(hit).match(/(?:evnid|ep\.event_id|(?:^|[?&])event_id)=([^&\s]+)/);
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
  const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  const status = res ? res.status() : 0;
  if (status >= 400) {
    const alt = urlPath.endsWith('/') ? urlPath.slice(0, -1) : urlPath + '/';
    const res2 = await page.goto(BASE + alt + QS, { waitUntil: 'domcontentloaded', timeout: 45000 });
    return { url: page.url(), status: res2 ? res2.status() : status };
  }
  return { url: page.url(), status: status };
}

async function submitSiteForm(page) {
  const form = page.locator('form[data-lead]').first();
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
  });
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
      row.checks.location = !report.errors.some(function (e) { return e.indexOf(spec.name + ':') === 0 && /page_location|utm_source/.test(e); });
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
          if (/ep\.quiz=(?!ihud|mihzur)/.test(body)) report.errors.push(spec.name + ': quiz_step quiz name is not ihud or mihzur');
          report.samples.push({ page: spec.name, event: 'quiz_step', ts: stepHit.ts, url: redact(stepHit.url), post: redact(stepHit.post).slice(0, 800) });
        }
        await shot(page, spec.name + '-quiz-step');
      }

      if (spec.form) {
        await submitSiteForm(page);
        await page.waitForRequest(function (req) {
          return /generate_lead/.test(req.url() + (req.postData() || ''));
        }, { timeout: 12000 }).catch(function () {});
        const allLead = hits.filter(function (h) { return isCollect(h) && /generate_lead/.test(blobOf(h)); });
        row.checks.generateLead = allLead.length > 0;
        if (!row.checks.generateLead) report.errors.push(spec.name + ': generate_lead did not fire');
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
        if (leadHit && PII.test(decodeURIComponent(leadBody)) && /x@y\.com|0501234567|בדיקה/.test(decodeURIComponent(leadBody))) {
          report.errors.push(spec.name + ': generate_lead payload has PII');
        }
        const eventId = leadHit ? eventIdOf(leadHit) : '';
        const webhookId = (leads[0] && (leads[0].post.match(/(?:^|&)event_id=([^&]+)/) || [])[1]) || '';
        const webhookEventId = webhookId ? decodeURIComponent(webhookId) : '';
        row.checks.eventIdMatch = !!(eventId && webhookEventId && eventId === webhookEventId);
        if (!row.checks.eventIdMatch) report.errors.push(spec.name + ': event_id mismatch ga=' + eventId + ' webhook=' + webhookEventId);
        const bucket = (leadBody.match(/lead_source=([^&\s]+)/) || [])[1];
        row.checks.leadSource = bucket === spec.lead;
        if (!row.checks.leadSource) report.errors.push(spec.name + ': lead_source ' + bucket + ' expected ' + spec.lead);
        if (leadHit) report.samples.push({ page: spec.name, event: 'generate_lead', ts: leadHit.ts, url: redact(leadHit.url), post: redact(leadHit.post).slice(0, 800), event_id: eventId });
        if (leads[0]) report.samples.push({ page: spec.name, event: 'webhook_stub', ts: leads[0].ts, post: redact(leads[0].post).slice(0, 500), stubbed: true });
        await shot(page, spec.name + '-lead');
      }

      if (spec.bot) {
        await completeBot(page);
        await page.waitForRequest(function (req) {
          return /generate_lead/.test(req.url() + (req.postData() || ''));
        }, { timeout: 15000 }).catch(function () {});
        const allLead = hits.filter(function (h) { return isCollect(h) && /generate_lead/.test(blobOf(h)); });
        row.checks.generateLead = allLead.length > 0;
        if (!row.checks.generateLead) report.errors.push(spec.name + ': bot generate_lead did not fire');
        row.checks.webhookStubbed = leads.length > 0 && leads.every(function (l) { return l.stubbed; });
        if (!row.checks.webhookStubbed) report.errors.push(spec.name + ': bot webhook was not stubbed');
        const leadHit = allLead[0];
        const leadBody = leadHit ? blobOf(leadHit) : '';
        if (leadHit && /0501234567|בדיקה/.test(decodeURIComponent(leadBody))) report.errors.push(spec.name + ': bot generate_lead has PII');
        const eventId = leadHit ? eventIdOf(leadHit) : '';
        const webhookId = (leads[0] && (leads[0].post.match(/(?:^|&)event_id=([^&]+)/) || [])[1]) || '';
        const webhookEventId = webhookId ? decodeURIComponent(webhookId) : '';
        row.checks.eventIdMatch = !!(eventId && webhookEventId && eventId === webhookEventId);
        if (!row.checks.eventIdMatch) report.errors.push(spec.name + ': bot event_id mismatch ga=' + eventId + ' webhook=' + webhookEventId);
        const bucket = (leadBody.match(/lead_source=([^&\s]+)/) || [])[1];
        row.checks.leadSource = bucket === 'q';
        if (bucket !== 'q') report.errors.push(spec.name + ': bot lead_source ' + bucket);
        const meta = hits.filter(isMeta);
        if (meta.length) report.errors.push(spec.name + ': Meta during bot submit without marketing');
        if (leadHit) report.samples.push({ page: spec.name, event: 'generate_lead', ts: leadHit.ts, url: redact(leadHit.url), post: redact(leadHit.post).slice(0, 800), event_id: eventId });
        if (leads[0]) report.samples.push({ page: spec.name, event: 'webhook_stub', ts: leads[0].ts, post: redact(leads[0].post).slice(0, 500), stubbed: true });
        await shot(page, spec.name + '-bot-lead');
      }
      hits.filter(isCollect).forEach(function (h) {
        const raw = decodeURIComponent(blobOf(h));
        if (/[?&]email=/i.test(raw) || /x@y\.com/i.test(raw) || /0501234567/.test(raw)) {
          report.errors.push(spec.name + ': collect still carries query or form PII');
        }
      });
    } catch (err) {
      report.errors.push(spec.name + ' accept flow: ' + err.message);
    }
    await context.close();
  }
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
