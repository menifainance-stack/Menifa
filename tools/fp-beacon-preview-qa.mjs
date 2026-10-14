/**
 * iPhone 13 QA for assets/js/fp-beacon.js.
 * Local: real TCP mock. HTTPS Preview: Playwright intercepts the beacon
 * (mixed content would block a public page from posting to http://127.0.0.1).
 *
 *   node tools/fp-beacon-preview-qa.mjs
 *   FP_ORIGIN=https://<preview>.vercel.app node tools/fp-beacon-preview-qa.mjs
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium, devices } = require("playwright");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = process.env.FP_OUT || "/opt/cursor/artifacts/fp-beacon";
const QUERY = "?utm_source=facebook&fbclid=TEST&email=x@y.com";
const PAGES = ["/lp/mihzur/", "/lp/ihud/", "/q/mihzur/", "/q/ihud/"];
const LEAD = "https://hook.us2.make.com/9pclkzy81xfnlh1nfyista793l9hbdig";
const iphone = devices["iPhone 13"];

function listen(handler) {
  const server = http.createServer(handler);
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function staticHandler(req, res) {
  const url = new URL(req.url, "http://127.0.0.1");
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith("/")) rel += "index.html";
  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end("missing"); return;
  }
  const ext = path.extname(file);
  const type = ext === ".js" ? "text/javascript" : ext === ".css" ? "text/css" : "text/html";
  res.writeHead(200, { "Content-Type": type + "; charset=utf-8" });
  fs.createReadStream(file).pipe(res);
}

const mockHits = [];
function mockHandler(req, res) {
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    mockHits.push({
      method: req.method,
      url: req.url,
      contentType: req.headers["content-type"] || "",
      body: Buffer.concat(chunks).toString("utf8")
    });
    res.writeHead(204); res.end();
  });
}

function waitFor(fn, ms) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      try {
        const value = fn();
        if (value) return resolve(value);
      } catch (err) { return reject(err); }
      if (Date.now() - start > ms) return reject(new Error("timeout waiting for beacon"));
      setTimeout(tick, 40);
    };
    tick();
  });
}

function slimPath(p) { return p === "/lp/ihud" || p === "/lp/ihud/"; }

function assertClean(raw, pathname) {
  const bad = ["x@y.com", "email", "TEST", "fbclid=", "userAgent", "user-agent"];
  bad.forEach((token) => {
    if (raw.includes(token)) throw new Error(pathname + " payload leaked " + token);
  });
  const data = JSON.parse(raw);
  if (data.path !== pathname) throw new Error(pathname + " path " + data.path);
  if (String(data.path).includes("?")) throw new Error("path has query");
  if (data.v !== 1 || data.fp !== 1) throw new Error("missing v/fp");
  if (data.utm_source !== "facebook") throw new Error("utm_source");
  const allowed = slimPath(pathname)
    ? ["event", "v", "fp", "path", "utm_source", "sid", "step", "last_step"]
    : ["event", "v", "fp", "path", "utm_source", "utm_medium", "utm_campaign", "utm_content", "has_fbclid", "device", "ts", "sid", "step", "bucket", "last_step", "max_scroll"];
  Object.keys(data).forEach((key) => {
    if (!allowed.includes(key)) throw new Error(pathname + " unexpected field " + key);
  });
  if (typeof data.sid !== "string" || data.sid.length < 8) throw new Error(pathname + " sid");
  if (slimPath(pathname)) {
    ["has_fbclid", "device", "ts", "bucket", "max_scroll", "utm_medium", "utm_campaign", "utm_content"].forEach((key) => {
      if (key in data) throw new Error("slim field " + key);
    });
  } else {
    if (data.has_fbclid !== true) throw new Error("has_fbclid");
    if (data.device !== "mobile") throw new Error("device " + data.device);
    if (typeof data.ts !== "number" || data.ts % 60000 !== 0) throw new Error("ts");
  }
  return data;
}

async function bootBrowser() {
  return chromium.launch({
    executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
    args: ["--no-sandbox", "--disable-dev-shm-usage"]
  });
}

async function instrument(context, beaconUrl) {
  await context.addInitScript((beacon) => {
    if (beacon) window.FP_BEACON_URL = beacon;
    window.__fpWrites = [];
    const note = (store, key) => {
      window.__fpWrites.push({ store: store, key: String(key), stack: String(new Error().stack || "") });
    };
    const proto = Storage.prototype;
    const origSet = proto.setItem;
    proto.setItem = function (key, value) {
      note(this === window.sessionStorage ? "session" : "local", key);
      return origSet.call(this, key, value);
    };
    const desc = Object.getOwnPropertyDescriptor(Document.prototype, "cookie");
    if (desc && desc.set) {
      Object.defineProperty(Document.prototype, "cookie", {
        configurable: true,
        get: desc.get,
        set: function (value) { note("cookie", value); return desc.set.call(this, value); }
      });
    }
  }, beaconUrl || "");
}

async function silenceProbe(page) {
  await page.clock.fastForward(12000);
  await page.evaluate(() => {
    const el = document.scrollingElement || document.documentElement;
    el.style.scrollBehavior = "auto";
    const span = Math.max(el.scrollHeight - el.clientHeight, 0);
    if (span) el.scrollTop = span;
    const log = document.getElementById("aic-log");
    if (!log) return;
    log.style.scrollBehavior = "auto";
    if (log.scrollHeight > log.clientHeight) log.scrollTop = log.scrollHeight;
  });
  await new Promise((r) => setTimeout(r, 150));
}

async function acceptStatistics(page) {
  await page.evaluate(() => {
    const open = document.querySelector("[data-cookie-settings]");
    if (open) open.click();
    const stats = document.getElementById("ck-stats");
    const mkt = document.getElementById("ck-mkt");
    if (stats) stats.checked = true;
    if (mkt) mkt.checked = false;
    const save = document.getElementById("ck-save");
    if (save) save.click();
  });
}

async function exercise(page, pathname) {
  if (pathname.startsWith("/lp/")) {
    const name = page.locator('input[name="name"]');
    await name.focus();
    await page.locator('fieldset[data-q] input[type="radio"]').first().check({ force: true });
    await page.evaluate(() => {
      const el = document.scrollingElement || document.documentElement;
      el.style.scrollBehavior = "auto";
      const span = Math.max(el.scrollHeight - el.clientHeight, 1);
      [0.25, 0.5, 0.75, 1].forEach((part) => { el.scrollTop = Math.round(span * part); });
    });
    return;
  }
  for (let i = 0; i < 24; i++) {
    const state = await page.evaluate(() => ({
      chips: document.querySelectorAll("button.aic-chip").length,
      field: !!document.querySelector(".aic-input-row input")
    }));
    if (state.field) break;
    if (state.chips) {
      await page.evaluate(() => {
        const btn = document.querySelector("button.aic-chip");
        if (btn) btn.click();
      });
    }
    await page.clock.fastForward(400);
  }
  await page.evaluate(() => {
    const log = document.getElementById("aic-log");
    if (!log) return;
    const spacer = document.createElement("div");
    spacer.setAttribute("data-qa-spacer", "1");
    spacer.style.height = "5000px";
    log.appendChild(spacer);
    log.style.scrollBehavior = "auto";
    const span = Math.max(log.scrollHeight - log.clientHeight, 1);
    [0.25, 0.5, 0.75, 1].forEach((part) => { log.scrollTop = Math.round(span * part); });
  });
}

async function runPage(browser, origin, beaconUrl, pathname, viaRoute, disableBeacon) {
  const context = await browser.newContext({ ...iphone });
  const pixel = [];
  const posts = [];
  const routed = [];
  context.on("request", (req) => {
    const u = req.url();
    if (/connect\.facebook\.net|facebook\.com\/tr|fbevents|google-analytics|clarity\.ms/i.test(u)) pixel.push(u);
    if (req.method() === "POST") posts.push(u);
  });
  if (viaRoute) {
    await context.route(beaconUrl, async (route) => {
      const req = route.request();
      routed.push({
        method: req.method(),
        url: req.url(),
        contentType: req.headers()["content-type"] || "",
        body: req.postData() || ""
      });
      await route.fulfill({ status: 204, body: "" });
    });
    await context.route("**/*hook.us2.make.com/**", (route) => route.abort());
  }
  await instrument(context, disableBeacon ? "" : beaconUrl);
  const page = await context.newPage();
  await page.clock.install({ time: new Date("2026-10-14T12:00:00Z") });
  const before = mockHits.length;
  await page.goto(origin + pathname + QUERY, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.clock.fastForward(500);
  const shotDir = path.join(OUT, "screenshots");
  fs.mkdirSync(shotDir, { recursive: true });
  const shotName = pathname.replace(/\//g, "_").replace(/^_|_$/g, "") + ".png";
  await page.screenshot({ path: path.join(shotDir, shotName), fullPage: false });
  const landedNow = new URL(page.url()).pathname;
  const seen = () => (viaRoute ? routed.length : mockHits.length - before);
  let beforeConsent = 0;
  let afterReject = 0;
  if (!disableBeacon) {
    await silenceProbe(page);
    beforeConsent = seen();
    await page.evaluate(() => {
      const none = document.getElementById("ck-none");
      if (none) none.click();
    });
    await silenceProbe(page);
    afterReject = seen();
    await acceptStatistics(page);
    await exercise(page, landedNow);
  }
  const acceptedAt = afterReject;
  await page.clock.fastForward(121000);
  const privacy = await page.evaluate(() => ({
    cookie: document.cookie,
    local: Object.keys(localStorage),
    session: Object.keys(sessionStorage),
    writes: window.__fpWrites || [],
    fbq: typeof window.fbq,
    fbqCalls: window.fbq && window.fbq.queue ? window.fbq.queue.length : 0
  }));
  await page.evaluate(() => {
    try {
      Object.defineProperty(Document.prototype, "visibilityState", { configurable: true, get: () => "hidden" });
    } catch (e) {}
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await new Promise((r) => setTimeout(r, 400));
  let batch;
  if (viaRoute) batch = routed.slice(acceptedAt);
  else {
    if (!disableBeacon) await waitFor(() => mockHits.length - before > acceptedAt, 4000).catch(() => null);
    await new Promise((r) => setTimeout(r, 300));
    batch = mockHits.slice(before + acceptedAt);
  }
  const landed = new URL(page.url()).pathname;
  const engineStep = await page.evaluate(() => window.MENIFA_QUIZ_STEP);
  await context.close();
  return { pathname: landed, shotName, pixel, posts, privacy, batch, beforeConsent, afterReject, engineStep };
}

function expectEvents(pathname, events) {
  const names = events.map((e) => e.event);
  const slim = slimPath(pathname);
  const need = slim
    ? ["quiz_step", "page_exit"]
    : ["page_view", "form_start", "quiz_step", "time_on_page", "scroll_depth", "page_exit"];
  need.forEach((name) => {
    if (!names.includes(name)) throw new Error(pathname + " missing " + name + " got " + names.join(","));
  });
  const sids = events.map((e) => e.sid);
  if (sids.some((id) => typeof id !== "string" || id.length < 8) || new Set(sids).size !== 1) {
    throw new Error(pathname + " sid missing or unstable");
  }
  if (slim) {
    ["page_view", "form_start", "time_on_page", "scroll_depth"].forEach((name) => {
      if (names.includes(name)) throw new Error(pathname + " slim sent " + name);
    });
  } else {
    [10, 30, 60, 120].forEach((bucket) => {
      if (!events.some((e) => e.event === "time_on_page" && e.bucket === bucket)) throw new Error("time " + bucket);
    });
    [25, 50, 75, 100].forEach((bucket) => {
      if (!events.some((e) => e.event === "scroll_depth" && e.bucket === bucket)) throw new Error("scroll " + bucket);
    });
    const exit = events.find((e) => e.event === "page_exit");
    if (!exit || typeof exit.last_step !== "number" || typeof exit.max_scroll !== "number") throw new Error("page_exit fields");
  }
  const steps = events.filter((e) => e.event === "quiz_step").map((e) => e.step);
  if (!steps.includes(1)) throw new Error("quiz step 1");
  const exit = events.find((e) => e.event === "page_exit");
  if (!exit || exit.last_step < 1) throw new Error("last_step");
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const mock = await listen(mockHandler);
  const mockPort = mock.address().port;
  const beaconLocal = "http://127.0.0.1:" + mockPort + "/collect";
  let origin = process.env.FP_ORIGIN || "";
  let site;
  if (!origin) {
    site = await listen(staticHandler);
    origin = "http://127.0.0.1:" + site.address().port;
  }
  const viaRoute = origin.startsWith("https:");
  const beaconUrl = viaRoute ? "https://script.google.com/macros/s/fp-beacon-preview-mock/exec" : beaconLocal;
  const browser = await bootBrowser();
  const results = [];
  const samples = {};
  try {
    const pages = process.env.FP_ONLY ? [process.env.FP_ONLY] : PAGES;
    for (const pathname of pages) {
      mockHits.length = 0;
      const row = await runPage(browser, origin, beaconUrl, pathname, viaRoute, false);
      if (row.pixel.length) throw new Error(pathname + " pixel requests " + row.pixel.join(" "));
      if (row.privacy.fbq !== "undefined" || row.privacy.fbqCalls) throw new Error(pathname + " fbq before consent");
      if (row.beforeConsent) throw new Error(pathname + " beacon before consent " + row.beforeConsent);
      if (row.afterReject) throw new Error(pathname + " beacon after reject " + row.afterReject);
      if (row.privacy.cookie) throw new Error(pathname + " cookie written " + row.privacy.cookie);
      const localExtra = row.privacy.local.filter((k) => k !== "menifa-consent");
      if (localExtra.length) throw new Error(pathname + " localStorage " + localExtra.join(","));
      const beaconWrites = row.privacy.writes.filter((w) => /fp-beacon\.js/.test(w.stack));
      if (beaconWrites.length) throw new Error(pathname + " beacon wrote storage");
      const foreign = row.privacy.session.filter((k) => k !== "menifa-att" && !/^vc-|^__vtkb/.test(k));
      if (foreign.length) throw new Error(pathname + " unexpected session keys " + foreign.join(","));
      if (row.posts.some((u) => u.includes("hook.us2.make.com"))) throw new Error(pathname + " lead webhook");
      if (row.batch.some((h) => h.method === "OPTIONS")) throw new Error(pathname + " CORS preflight");
      const events = row.batch.map((h) => {
        if (!/text\/plain/i.test(h.contentType)) throw new Error(row.pathname + " content-type " + h.contentType);
        return assertClean(h.body, row.pathname);
      });
      expectEvents(row.pathname, events);
      if (row.pathname.indexOf("/q/") === 0) {
        const steps = events.filter((e) => e.event === "quiz_step").map((e) => e.step);
        const max = steps.reduce((hi, n) => Math.max(hi, n), 0);
        for (let s = 1; s <= max; s++) {
          if (!steps.includes(s)) throw new Error(row.pathname + " missing engine step " + s);
        }
        if (row.engineStep !== max - 1) throw new Error(row.pathname + " engine index " + row.engineStep + " last step " + max);
      }
      samples[row.pathname] = events;
      results.push({
        page: row.pathname,
        events: events.map((e) => e.event + (e.step ? ":" + e.step : e.bucket ? ":" + e.bucket : "")),
        requests: events.length,
        beforeConsent: row.beforeConsent,
        afterReject: row.afterReject,
        engineStep: row.engineStep,
        pixel: 0,
        cookies: row.privacy.cookie || "(none)",
        localStorage: row.privacy.local,
        sessionStorage: row.privacy.session,
        beaconStorageWrites: 0,
        contentType: row.batch[0] ? row.batch[0].contentType : "",
        screenshot: row.shotName
      });
      console.log("PASS", pathname, results[results.length - 1].events.join(" "));
    }

    mockHits.length = 0;
    const quiet = await runPage(browser, origin, beaconUrl, "/lp/mihzur/", viaRoute, true);
    if (quiet.batch.length) throw new Error("empty URL still sent " + quiet.batch.length);
    console.log("PASS empty FP_BEACON_URL sends nothing");

    const blocked = await browser.newContext({ ...iphone });
    let leadHits = 0;
    await blocked.route("**/*", (route) => {
      const hit = route.request().url();
      if (hit.includes("hook.us2.make.com") || hit.includes("9pclkzy81") || hit.includes("u3ru")) {
        leadHits += 1;
        return route.abort();
      }
      return route.continue();
    });
    await instrument(blocked, LEAD);
    const blockedPage = await blocked.newPage();
    await blockedPage.goto(origin + "/lp/mihzur/" + QUERY, { waitUntil: "domcontentloaded", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 500));
    await blocked.close();
    if (leadHits) throw new Error("lead webhook was called " + leadHits);
    console.log("PASS lead webhook blocked");
  } finally {
    await browser.close();
    mock.close();
    if (site) site.close();
  }

  fs.writeFileSync(path.join(OUT, "samples.json"), JSON.stringify(samples, null, 2));
  fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify({ origin, beaconUrl, viaRoute, results }, null, 2));
  console.log("WROTE", OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
