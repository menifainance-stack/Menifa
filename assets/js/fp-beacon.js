/* Cookieless first-party beacon. Empty URL sends nothing.
   Preview override: window.FP_BEACON_URL (GAS web app). Never a lead webhook. */
const FP_BEACON_URL = "";
(function () {
  "use strict";
  var url = window.FP_BEACON_URL || FP_BEACON_URL;
  if (!url || /9pclkzy81|u3ru|hook\.us2\.make\.com/i.test(url)) return;
  var path = location.pathname, slim = path === "/lp/ihud" || path === "/lp/ihud/";
  var q = new URLSearchParams(location.search);
  var allow = ["utm_source", "utm_medium", "utm_campaign", "utm_content"], utm = {};
  allow.forEach(function (k) { var v = q.get(k); if (v) utm[k] = String(v).slice(0, 64); });
  var sid = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  var last = 0, maxScroll = 0, formStarted = false, seen = {}, exited = false;
  function send(event, extra) {
    if (slim && event !== "quiz_step" && event !== "page_exit") return;
    var o = { event: event, v: 1, fp: 1, path: path };
    if (utm.utm_source) o.utm_source = utm.utm_source;
    if (!slim) {
      allow.forEach(function (k) { if (k !== "utm_source" && utm[k]) o[k] = utm[k]; });
      o.has_fbclid = q.has("fbclid"); o.device = innerWidth < 768 ? "mobile" : "desktop";
      o.ts = Math.floor(Date.now() / 60000) * 60000; o.sid = sid;
    }
    if (extra) Object.keys(extra).forEach(function (k) { o[k] = extra[k]; });
    var body = JSON.stringify(o), blob = new Blob([body], { type: "text/plain;charset=UTF-8" });
    if (!(navigator.sendBeacon && navigator.sendBeacon(url, blob))) {
      fetch(url, { method: "POST", mode: "no-cors", keepalive: true, headers: { "Content-Type": "text/plain;charset=UTF-8" }, body: body }).catch(function () {});
    }
  }
  function markStep(n) { n = n | 0; if (n < 1 || seen["s" + n]) return; seen["s" + n] = 1; last = Math.max(last, n); send("quiz_step", { step: n }); }
  send("page_view");
  document.addEventListener("focusin", function (e) {
    var t = e.target;
    if (formStarted || !t || !t.form || !/^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
    formStarted = true; send("form_start");
  }, true);
  document.addEventListener("change", function (e) {
    var t = e.target, fs = t && t.closest && t.closest("fieldset[data-q]"), all, i;
    if (!fs || t.type !== "radio") return;
    all = document.querySelectorAll("fieldset[data-q]");
    for (i = 0; i < all.length; i++) if (all[i] === fs) markStep(i + 1);
  });
  var log = document.getElementById("aic-log");
  if (log && window.MENIFA_AIC && window.MutationObserver) {
    var titles = (MENIFA_AIC.questions || []).map(function (item) { return item.title; });
    new MutationObserver(function () {
      var cards = log.querySelectorAll(".aic-card"), text = cards.length ? cards[cards.length - 1].textContent : "", i;
      for (i = 0; i < titles.length; i++) if (titles[i] && text.indexOf(titles[i]) !== -1) markStep(i + 1);
    }).observe(log, { childList: true, subtree: true });
  }
  if (!slim) {
    [10, 30, 60, 120].forEach(function (sec) { setTimeout(function () { send("time_on_page", { bucket: sec }); }, sec * 1000); });
    addEventListener("scroll", function () { depth(document); }, { passive: true });
    if (log) log.addEventListener("scroll", function () { depth(log); }, { passive: true });
  }
  function depth(el) {
    var doc = el === document, top = doc ? (document.documentElement.scrollTop || document.body.scrollTop) : el.scrollTop;
    var span = (doc ? document.documentElement.scrollHeight : el.scrollHeight) - (doc ? document.documentElement.clientHeight : el.clientHeight), pct, b;
    if (span <= 0) return;
    pct = Math.min(100, Math.round(top / span * 100));
    [25, 50, 75, 100].forEach(function (bucket) {
      if (pct < bucket || seen["d" + bucket]) return;
      seen["d" + bucket] = 1; if (bucket > maxScroll) maxScroll = bucket; send("scroll_depth", { bucket: bucket });
    });
  }
  function exit() {
    if (exited) return; exited = true;
    send("page_exit", slim ? { last_step: last } : { last_step: last, max_scroll: maxScroll });
  }
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") exit(); });
  addEventListener("pagehide", exit);
})();
