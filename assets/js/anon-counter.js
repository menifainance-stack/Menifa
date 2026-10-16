/* Anonymous counter for /lp/mihzur, /lp/ihud, /q/mihzur, /q/ihud.
   No cookies, no localStorage or sessionStorage, no client id, no fingerprint.
   TODO: replace ANON_COUNTER_URL with the Make webhook Tamir creates for this counter.
   Do not point it at the lead webhook.
   While the constant still contains TODO-menifa-anon-counter, the beacon
   goes to the same-origin route /api/anon-count (204, nothing stored). */
var ANON_COUNTER_URL = "https://hook.us2.make.com/TODO-menifa-anon-counter";
(function () {
  "use strict";
  if (window.__menifaAnonCounter) return;
  window.__menifaAnonCounter = true;

  function normPath(p) {
    p = String(p || "/");
    p = p.replace(/\/index\.html$/, "/");
    if (p.length > 1 && p.charAt(p.length - 1) !== "/") p += "/";
    return p;
  }
  var path = normPath(location.pathname);
  var allowed = { "/lp/mihzur/": 1, "/lp/ihud/": 1, "/q/mihzur/": 1, "/q/ihud/": 1 };
  if (!allowed[path]) return;

  function counterUrl() {
    var override = window.ANON_COUNTER_URL;
    if (override) return String(override);
    if (!ANON_COUNTER_URL || /TODO-menifa-anon-counter/i.test(ANON_COUNTER_URL)) return "/api/anon-count";
    if (/9pclkzy81|u3ru/i.test(ANON_COUNTER_URL)) return "";
    return ANON_COUNTER_URL;
  }

  var q = new URLSearchParams(location.search);
  function cleanUtm(v) {
    v = String(v == null ? "" : v).trim().slice(0, 80);
    if (!v) return "";
    if (/@/.test(v) || /(?:\+972|0)5\d/.test(v)) return "";
    return v;
  }
  var utm = {
    utm_source: cleanUtm(q.get("utm_source")),
    utm_medium: cleanUtm(q.get("utm_medium")),
    utm_campaign: cleanUtm(q.get("utm_campaign"))
  };
  var hasFbclid = q.has("fbclid");
  var seen = {};

  function deliver(body) {
    var url = counterUrl();
    if (!url) return;
    var raw = JSON.stringify(body);
    if (window.fetch) {
      fetch(url, {
        method: "POST",
        mode: "cors",
        credentials: "omit",
        keepalive: true,
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: raw
      }).catch(function () {});
      return;
    }
    if (navigator.sendBeacon) {
      try {
        navigator.sendBeacon(url, new Blob([raw], { type: "text/plain;charset=UTF-8" }));
      } catch (e) {}
    }
  }
  function send(event, extra) {
    var body = { event: event, v: 1, anon: 1, path: path };
    if (extra) {
      Object.keys(extra).forEach(function (k) {
        if (extra[k] == null || extra[k] === "") return;
        body[k] = extra[k];
      });
    }
    deliver(body);
  }
  function pageViewExtras() {
    var extra = { has_fbclid: hasFbclid };
    if (utm.utm_source) extra.utm_source = utm.utm_source;
    if (utm.utm_medium) extra.utm_medium = utm.utm_medium;
    if (utm.utm_campaign) extra.utm_campaign = utm.utm_campaign;
    return extra;
  }
  function choiceOf(c) {
    if (!c) return "none";
    var stats = !!c.statistics;
    var mkt = !!c.marketing;
    if (stats && mkt) return "accept_all";
    if (!stats && !mkt) return "reject";
    return "custom";
  }
  function sendChoice() {
    var c = window.MenifaConsent && MenifaConsent.get && MenifaConsent.get();
    send("consent_choice", { choice: choiceOf(c) });
  }

  send("page_view", pageViewExtras());
  sendChoice();
  addEventListener("consent-update", sendChoice);

  function depth(el) {
    var doc = el === document;
    var top = doc ? (document.documentElement.scrollTop || document.body.scrollTop) : el.scrollTop;
    var span = (doc ? document.documentElement.scrollHeight : el.scrollHeight) - (doc ? document.documentElement.clientHeight : el.clientHeight);
    if (span <= 0) return;
    var pct = Math.min(100, Math.round(top / span * 100));
    [50, 90].forEach(function (bucket) {
      if (pct < bucket || seen["d" + bucket]) return;
      seen["d" + bucket] = 1;
      send("scroll", { depth: bucket });
    });
  }
  addEventListener("scroll", function () { depth(document); }, { passive: true });
  var log = document.getElementById("aic-log");
  if (log) log.addEventListener("scroll", function () { depth(log); }, { passive: true });

  document.addEventListener("focusin", function (e) {
    var t = e.target;
    if (seen.form || !t || !t.form || !/^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
    if (t.type === "hidden") return;
    seen.form = 1;
    send("form_start");
  }, true);

  function markBot() {
    if (seen.bot) return;
    seen.bot = 1;
    send("bot_step1");
  }
  document.addEventListener("change", function (e) {
    var t = e.target;
    var fs = t && t.closest && t.closest("fieldset[data-q]");
    if (!fs || t.type !== "radio") return;
    var all = document.querySelectorAll("fieldset[data-q]");
    if (all.length && all[0] === fs) markBot();
  });
  function watchQuiz() {
    var n = window.MENIFA_QUIZ_STEP;
    if (typeof n === "number" && n >= 0) markBot();
  }
  if (log && window.MutationObserver) new MutationObserver(watchQuiz).observe(log, { childList: true, subtree: true });
  watchQuiz();
  setTimeout(watchQuiz, 600);
})();
