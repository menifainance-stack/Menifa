/**
 * Real-browser proof. Playwright intercepts every make.com request and
 * fulfills or aborts it locally. route.continue and route.fetch are never called.
 *
 *   PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --prefix /tmp/lead-proof playwright
 *   node tools/proof_lead_browser.mjs
 */
import fs from 'fs';
import http from 'http';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(process.env.PLAYWRIGHT_PACKAGE || '/tmp/lead-proof/node_modules/playwright/package.json');
const { chromium } = require('playwright');

function serve(dir) {
  const server = http.createServer(function (req, res) {
    const url = new URL(req.url, 'http://127.0.0.1');
    let rel = decodeURIComponent(url.pathname);
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.normalize(path.join(dir, rel));
    if (!file.startsWith(dir)) {
      res.writeHead(403); res.end(); return;
    }
    fs.readFile(file, function (err, buf) {
      if (err) { res.writeHead(404); res.end('missing'); return; }
      const ext = path.extname(file);
      const type = ext === '.css' ? 'text/css' : ext === '.js' ? 'text/javascript' : ext === '.svg' ? 'image/svg+xml' : 'text/html; charset=utf-8';
      res.writeHead(200, { 'content-type': type });
      res.end(buf);
    });
  });
  return new Promise(function (resolve) {
    server.listen(0, '127.0.0.1', function () { resolve(server); });
  });
}

function attach(context, mode) {
  const seen = [];
  context.route(/make\.com/i, function (route) {
    const req = route.request();
    seen.push({ url: req.url(), method: req.method() });
    if (mode === 'abort') return route.abort('failed');
    return route.fulfill({
      status: 200,
      contentType: 'text/plain',
      headers: { 'access-control-allow-origin': '*' },
      body: 'Accepted'
    });
  });
  return seen;
}

async function consent(context) {
  await context.addInitScript(function () {
    localStorage.setItem('menifa-consent', JSON.stringify({
      v: 2, necessary: true, statistics: true, marketing: true, ts: '2026-10-06T00:00:00.000Z'
    }));
  });
}

async function submit(page) {
  await page.locator('form[data-lead] [name=name]').fill('בדיקת ייחוס');
  await page.locator('form[data-lead] [name=phone]').fill('050-1234567');
  const need = page.locator('form[data-lead] [name=need]');
  if (await need.count()) await need.selectOption({ label: 'מסורבי בנקים' });
  await page.locator('form[data-lead] [name=consent]').check();
  await page.locator('form[data-lead] button[type=submit]').click();
}

const server = await serve(root);
const port = server.address().port;
const origin = 'http://127.0.0.1:' + port;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const shots = path.resolve('/opt/cursor/artifacts/screenshots');
fs.mkdirSync(shots, { recursive: true });

const shot = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'he-IL' });
await shot.route(/make\.com/i, function (route) { return route.abort('failed'); });
const shotPage = await shot.newPage();
await shotPage.goto(origin + '/calculators.html', { waitUntil: 'networkidle' });
await shotPage.locator('#ck-none').click();
await shotPage.locator('#lead').scrollIntoViewIfNeeded();
await shotPage.locator('#lead').screenshot({ path: path.join(shots, 'calculators-form-390.png') });
await shotPage.screenshot({ path: path.join(shots, 'calculators-form-390-viewport.png') });
await shotPage.setViewportSize({ width: 1280, height: 900 });
await shotPage.locator('#lead').scrollIntoViewIfNeeded();
await shotPage.locator('#lead').screenshot({ path: path.join(shots, 'calculators-form-desktop.png') });
await shotPage.screenshot({ path: path.join(shots, 'calculators-form-desktop-viewport.png') });
await shot.close();

const successContext = await browser.newContext();
await consent(successContext);
const successSeen = attach(successContext, 'fulfill');
const page = await successContext.newPage();
await page.goto(origin + '/?utm_source=first_src', { waitUntil: 'domcontentloaded' });
await page.goto(origin + '/contact.html', { waitUntil: 'domcontentloaded' });
await page.goto(origin + '/lp/ihud/?utm_source=second_src', { waitUntil: 'domcontentloaded' });
const posts = [];
page.on('request', function (req) {
  if (/make\.com/i.test(req.url()) && req.method() === 'POST') {
    posts.push({ url: req.url(), method: req.method(), body: req.postData() || '' });
  }
});
await submit(page);
await page.waitForFunction(function () {
  const msg = document.querySelector('[data-f=okmsg]');
  return msg && msg.textContent.indexOf('הפרטים התקבלו') === 0;
});
const lpEvents = await page.evaluate(function () {
  return (window.dataLayer || []).filter(function (e) { return e && e.event === 'generate_lead'; });
});
const lpAtt = await page.evaluate(function () { return sessionStorage.getItem('menifa-att'); });

async function submitHere(pathname) {
  await page.goto(origin + pathname, { waitUntil: 'domcontentloaded' });
  const before = posts.length;
  await submit(page);
  await page.waitForFunction(function () {
    const msg = document.querySelector('[data-f=okmsg]');
    return msg && msg.textContent.length > 0;
  });
  const body = posts[posts.length - 1] && posts[posts.length - 1].body;
  const events = await page.evaluate(function () {
    return (window.dataLayer || []).filter(function (e) { return e && e.event === 'generate_lead'; });
  });
  if (posts.length !== before + 1) throw new Error('expected one new post on ' + pathname);
  return { body: Object.fromEntries(new URLSearchParams(body)), events: events };
}

const contact = await submitHere('/contact.html');
const calculators = await submitHere('/calculators.html');
const ihudBody = Object.fromEntries(new URLSearchParams(posts[0].body));

const failContext = await browser.newContext();
await consent(failContext);
const failSeen = attach(failContext, 'abort');
const failPage = await failContext.newPage();
await failPage.goto(origin + '/contact.html?utm_source=google&utm_medium=cpc', { waitUntil: 'domcontentloaded' });
await submit(failPage);
await failPage.waitForFunction(function () {
  const msg = document.querySelector('[data-f=okmsg]');
  return msg && msg.textContent.indexOf('עוד צעד אחד') === 0;
});
const failEvents = await failPage.evaluate(function () {
  return (window.dataLayer || []).filter(function (e) { return e && e.event === 'generate_lead'; });
});

const options = successSeen.concat(failSeen).filter(function (r) { return r.method === 'OPTIONS'; });
const proof = {
  note: 'Playwright fulfilled or aborted every make.com request. route.continue and route.fetch were not called.',
  origin: origin,
  intercepted: { success: successSeen.length, failure: failSeen.length, options: options.length },
  continued_to_network: 0,
  storage_after_journey: JSON.parse(lpAtt),
  lp_submit: { body: ihudBody, generate_lead: lpEvents },
  contact_submit: contact,
  calculators_submit: calculators,
  network_failure: {
    generate_lead: failEvents,
    intercepted: failSeen.length
  }
};

function check(cond, msg) {
  if (!cond) throw new Error(msg);
}
check(ihudBody.utm_source === 'first_src', 'lp utm_source');
check(ihudBody.last_utm_source === 'second_src', 'lp last');
check(ihudBody.landing === '/', 'lp landing');
check(ihudBody['מקור_הפניה'] === 'לא מיוחס' && ihudBody.makor_hafnia === 'לא מיוחס', 'lp makor');
check(lpEvents.length === 1 && lpEvents[0].event_id === ihudBody.event_id, 'lp event_id');
check(!Object.prototype.hasOwnProperty.call(lpEvents[0], 'need'), 'lp need leaked');
check(contact.body.utm_source === 'first_src' && contact.body.last_utm_source === 'second_src', 'contact attribution');
check(calculators.body.source === 'calculators' && calculators.body.landing === '/', 'calculators attribution');
check(contact.events.length === 1 && contact.events[0].event_id === contact.body.event_id, 'contact event');
check(calculators.events.length === 1 && !Object.prototype.hasOwnProperty.call(calculators.events[0], 'need'), 'calculators analytics');
check(failEvents.length === 0, 'generate_lead on abort');
check(failSeen.length === 1, 'failure must be a single attempt');
check(options.length === 0, 'preflight was sent');
check(successSeen.every(function (r) { return r.method === 'POST'; }), 'unexpected method');

const out = path.join(shots, '..', 'lead-tracking-browser-proof.json');
fs.writeFileSync(out, JSON.stringify(proof, null, 2));
console.log(JSON.stringify(proof, null, 2));
console.log('\nPASS');
await browser.close();
server.close();
