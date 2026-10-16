/**
 * Facebook in-app browser, 390x664.
 * Pre-consent: no Facebook requests, GA4 collect with gcs=G100, anonymous counter fires.
 * Usage: BASE=http://127.0.0.1:8765 node tests/fb-inapp-consent.mjs
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = (process.env.BASE || 'http://127.0.0.1:8765').replace(/\/$/, '');
const OUT = process.env.FB_OUT || '/opt/cursor/artifacts/fb-inapp-consent';
const FB_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21F79 [FBAN/FBIOS;FBAV/470.0.0.0.0;FBBV/470000000;FBDV/iPhone14,5;FBMD/iPhone;FBSN/iOS;FBSV/17.5;FBSS/3;FBID/phone;FBLC/he_IL;FBOP/5]';
const QS = '?utm_source=facebook&utm_medium=paid&utm_campaign=mihzur-oct&fbclid=IwAR_testvalue&email=x@y.com';
const PAGES = ['/lp/mihzur/', '/lp/ihud/', '/q/mihzur/', '/q/ihud/'];

fs.mkdirSync(OUT, { recursive: true });

function gcsOf(blob) {
  const m = String(blob).match(/(?:^|[?&])gcs=([^&\s]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}
function eventsOf(posts) {
  return posts.map(function (raw) {
    try { return JSON.parse(raw).event; } catch (e) { return ''; }
  }).filter(Boolean);
}

const browser = await chromium.launch({ headless: true });
const report = { base: BASE, ua: 'FBAN/FBIOS', viewport: '390x664', pages: [], errors: [] };

for (const pathname of PAGES) {
  const slug = pathname.replace(/\//g, '-').replace(/^-|-$/g, '');
  const row = { path: pathname, checks: {}, shots: {} };
  report.pages.push(row);
  const hits = [];
  const beacons = [];
  const context = await browser.newContext({
    viewport: { width: 390, height: 664 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: FB_UA,
    locale: 'he-IL'
  });
  context.on('request', function (req) {
    const url = req.url();
    const post = req.postData() || '';
    if (/facebook\.net|facebook\.com|fbcdn\.net/i.test(url)) hits.push({ kind: 'meta', url: url });
    if (/google-analytics\.com|googletagmanager\.com|analytics\.google\.com/i.test(url)) {
      hits.push({ kind: 'ga', url: url, post: post.slice(0, 500) });
    }
    if (/\/api\/anon-count/.test(url) || /TODO-menifa-anon-counter/.test(url)) {
      beacons.push(post);
    }
  });
  const page = await context.newPage();
  try {
    await page.goto(BASE + pathname + QS, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.locator('#cookie').waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(1800);

    const banner = await page.locator('#cookie').evaluate(function (el) {
      var r = el.getBoundingClientRect();
      var buttons = Array.prototype.map.call(el.querySelectorAll('button'), function (b) {
        var br = b.getBoundingClientRect();
        var style = getComputedStyle(b);
        return {
          id: b.id,
          text: (b.textContent || '').trim(),
          visible: style.display !== 'none' && br.width > 0 && br.height > 0,
          h: Math.round(br.height)
        };
      });
      var text = (el.innerText || '').replace(/\s+/g, ' ').trim();
      return { h: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom), buttons: buttons, text: text };
    });
    row.banner = banner;
    row.checks.bannerHeight = banner.h >= 56 && banner.h <= 76;
    if (!row.checks.bannerHeight) report.errors.push(slug + ': banner height ' + banner.h);
    const visibleBtns = banner.buttons.filter(function (b) { return b.visible; });
    row.checks.twoButtons = visibleBtns.length === 2 && visibleBtns.some(function (b) { return b.text === 'אישור הכל'; }) && visibleBtns.some(function (b) { return b.text === 'הגדרות'; });
    if (!row.checks.twoButtons) report.errors.push(slug + ': visible buttons ' + JSON.stringify(visibleBtns));
    row.checks.noGuillemets = !/[«»]|<<|>>/.test(banner.text);
    if (!row.checks.noGuillemets) report.errors.push(slug + ': banner text has angle quotes');

    const overlap = await page.evaluate(function () {
      var bar = document.getElementById('cookie').getBoundingClientRect();
      var nodes = Array.prototype.slice.call(document.querySelectorAll('.fab, .aic-dock, #aic-replies'));
      return nodes.map(function (el) {
        var r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) return null;
        var hits = !(r.bottom <= bar.top + 1 || r.top >= bar.bottom - 1 || r.right <= bar.left + 1 || r.left >= bar.right - 1);
        return { id: el.id || el.className, top: Math.round(r.top), bottom: Math.round(r.bottom), barTop: Math.round(bar.top), overlap: hits };
      }).filter(Boolean);
    });
    row.overlap = overlap;
    row.checks.noOverlap = overlap.every(function (n) { return !n.overlap; });
    if (!row.checks.noOverlap) report.errors.push(slug + ': overlap ' + JSON.stringify(overlap));

    row.shots.before = path.join(OUT, slug + '-before.png');
    await page.screenshot({ path: row.shots.before });

    const meta = hits.filter(function (h) { return h.kind === 'meta'; });
    const collects = hits.filter(function (h) { return h.kind === 'ga' && /\/collect/.test(h.url); });
    const gcs = collects.map(function (h) { return gcsOf(h.url + '\n' + h.post); }).filter(Boolean);
    row.checks.noFacebook = meta.length === 0;
    row.checks.gaDenied = collects.length > 0 && gcs.length > 0 && gcs.every(function (g) { return g.indexOf('G100') === 0; });
    row.gcs = gcs.slice(0, 6);
    row.checks.beacon = beacons.length > 0;
    if (!row.checks.noFacebook) report.errors.push(slug + ': facebook requests ' + meta.length);
    if (!row.checks.gaDenied) report.errors.push(slug + ': GA gcs ' + (gcs.join(',') || 'none') + ' collects=' + collects.length);
    if (!row.checks.beacon) report.errors.push(slug + ': counter beacon did not fire');

    const parsed = beacons.map(function (raw) { try { return JSON.parse(raw); } catch (e) { return null; } }).filter(Boolean);
    const names = parsed.map(function (p) { return p.event; });
    row.events = names;
    const view = parsed.find(function (p) { return p.event === 'page_view'; });
    row.checks.pageView = !!(view && view.has_fbclid === true && view.utm_source === 'facebook' && view.utm_medium === 'paid' && view.utm_campaign === 'mihzur-oct' && view.path === pathname);
    row.checks.choiceNone = parsed.some(function (p) { return p.event === 'consent_choice' && p.choice === 'none'; });
    row.checks.noPii = !beacons.some(function (raw) { return /IwAR_testvalue|x@y\.com|"sid"|"fbclid":/.test(raw); });
    if (!row.checks.pageView) report.errors.push(slug + ': page_view payload ' + JSON.stringify(view || null));
    if (!row.checks.choiceNone) report.errors.push(slug + ': missing consent_choice none');
    if (!row.checks.noPii) report.errors.push(slug + ': beacon leaked an id or the fbclid value');

    const storage = await page.evaluate(function () {
      var keys = [];
      try { for (var i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i)); } catch (e) {}
      return { cookie: document.cookie, local: keys };
    });
    row.checks.noGaCookie = !/(?:^|; )_ga=/.test(storage.cookie);
    row.checks.noCounterId = !storage.local.some(function (k) { return /anon|counter|sid/i.test(k); });
    if (!row.checks.noGaCookie) report.errors.push(slug + ': _ga cookie before consent ' + storage.cookie);
    if (!row.checks.noCounterId) report.errors.push(slug + ': counter id in localStorage');

    if (pathname.indexOf('/lp/') === 0) {
      await page.locator('fieldset[data-q] input[type="radio"]').first().check({ force: true });
      await page.locator('input[name="name"]').focus();
      await page.evaluate(function () {
        document.documentElement.style.scrollBehavior = 'auto';
        var spacer = document.createElement('div');
        spacer.style.height = '4000px';
        document.body.appendChild(spacer);
        window.scrollTo(0, document.documentElement.scrollHeight);
      });
    } else {
      await page.evaluate(function () {
        var log = document.getElementById('aic-log');
        if (!log) return;
        var spacer = document.createElement('div');
        spacer.style.height = '4000px';
        log.appendChild(spacer);
        log.scrollTop = log.scrollHeight;
      });
    }
    await page.waitForTimeout(400);
    const mid = beacons.map(function (raw) { try { return JSON.parse(raw); } catch (e) { return null; } }).filter(Boolean);
    row.checks.scroll50 = mid.some(function (p) { return p.event === 'scroll' && p.depth === 50; });
    row.checks.scroll90 = mid.some(function (p) { return p.event === 'scroll' && p.depth === 90; });
    if (pathname.indexOf('/lp/') === 0) {
      row.checks.botStep = mid.some(function (p) { return p.event === 'bot_step1'; });
      row.checks.formStart = mid.some(function (p) { return p.event === 'form_start'; });
      if (!row.checks.botStep) report.errors.push(slug + ': bot_step1 missing');
      if (!row.checks.formStart) report.errors.push(slug + ': form_start missing');
    } else {
      row.checks.botStep = mid.some(function (p) { return p.event === 'bot_step1'; });
      if (!row.checks.botStep) report.errors.push(slug + ': bot_step1 missing');
    }
    if (!row.checks.scroll50 || !row.checks.scroll90) report.errors.push(slug + ': scroll events ' + mid.filter(function (p) { return p.event === 'scroll'; }).map(function (p) { return p.depth; }).join(','));

    await page.evaluate(function () { window.scrollTo(0, 0); });
    await page.locator('#ck-all').click();
    await page.locator('#cookie').waitFor({ state: 'hidden', timeout: 5000 });
    await page.waitForTimeout(500);
    const after = await page.evaluate(function () {
      var open = document.documentElement.classList.contains('cookie-open');
      var fab = document.querySelector('.fab-wa');
      var bottom = null;
      if (fab) bottom = Math.round(parseFloat(getComputedStyle(fab).bottom));
      return { open: open, fabBottom: bottom };
    });
    row.after = after;
    row.checks.bannerClosed = after.open === false;
    if (!row.checks.bannerClosed) report.errors.push(slug + ': banner still offsetting the page');
    const choice = beacons.map(function (raw) { try { return JSON.parse(raw); } catch (e) { return null; } }).filter(Boolean);
    row.checks.acceptAll = choice.some(function (p) { return p.event === 'consent_choice' && p.choice === 'accept_all'; });
    if (!row.checks.acceptAll) report.errors.push(slug + ': consent_choice accept_all missing');
    row.shots.after = path.join(OUT, slug + '-after.png');
    await page.screenshot({ path: row.shots.after });
  } catch (err) {
    report.errors.push(slug + ': ' + err.message);
  }
  await context.close();
}

report.ok = report.errors.length === 0;
report.finished = new Date().toISOString();
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, errors: report.errors, pages: report.pages.map(function (p) {
  return { path: p.path, checks: p.checks, gcs: p.gcs, events: p.events, banner: p.banner && p.banner.h, overlap: p.overlap };
}) }, null, 2));
await browser.close();
process.exit(report.ok ? 0 : 1);
