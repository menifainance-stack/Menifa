/**
 * Quiz attribution + Meta pixel behind the same menifa-consent choice as assets/site.js.
 * fbevents.js loads only after marketing consent. An empty pixel id does nothing.
 * Meta events are PageView and Lead with eventID only. ua and answers stay off Meta.
 */
(function () {
  "use strict";
  window.MENIFA_TRACK = window.MENIFA_TRACK || { ga4: "", meta_pixel: "", clarity: "" };
  var C_KEY = "menifa-consent";
  var C_VERSION = 2;
  var pixelId = "";
  var consent = null;

  try {
    consent = JSON.parse(localStorage.getItem(C_KEY) || "null");
  } catch (e) {
    consent = null;
  }
  if (!consent || consent.v !== C_VERSION) consent = null;

  var attKeys = [
    "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
    "gclid", "gbraid", "wbraid", "fbclid"
  ];

  try {
    var qp = new URLSearchParams(location.search);
    var att = JSON.parse(sessionStorage.getItem("menifa-att") || "{}");
    attKeys.forEach(function (k) {
      var fromUrl = qp.get(k);
      if (fromUrl) att[k] = fromUrl;
      else if (att[k] == null) att[k] = "";
    });
    if (!att.landing) {
      att.landing = location.href;
      att.referrer = document.referrer || "";
    }
    sessionStorage.setItem("menifa-att", JSON.stringify(att));
  } catch (err) {}

  function cookie(name) {
    var m = document.cookie.match("(?:^|; )" + name + "=([^;]*)");
    return m ? decodeURIComponent(m[1]) : "";
  }

  if (!window.menifaIds) {
    window.menifaIds = function () {
      return {
        event_id: "lead_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        fbp: cookie("_fbp"),
        fbc: cookie("_fbc")
      };
    };
  }

  function $(sel) { return document.querySelector(sel); }

  function saveConsent(stats, mkt) {
    consent = {
      v: C_VERSION,
      necessary: true,
      statistics: !!stats,
      marketing: !!mkt,
      ts: new Date().toISOString()
    };
    try { localStorage.setItem(C_KEY, JSON.stringify(consent)); } catch (e) {}
    var banner = $("#cookie");
    var modal = $("#cookie-modal");
    if (banner) banner.hidden = true;
    if (modal) modal.hidden = true;
    maybeLoadPixel();
  }

  function openPrefs() {
    var modal = $("#cookie-modal");
    if (!modal) return;
    var stats = $("#ck-stats");
    var mkt = $("#ck-mkt");
    if (stats) stats.checked = !!(consent && consent.statistics);
    if (mkt) mkt.checked = !!(consent && consent.marketing);
    modal.hidden = false;
    if (stats) stats.focus();
  }

  function maybeLoadPixel() {
    if (!pixelId || !consent || !consent.marketing || window.fbq) return;
    (function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = "2.0";
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("init", pixelId);
    window.fbq("track", "PageView");
  }

  window.menifaArmPixel = function (id) {
    pixelId = String(id || "").trim();
    if (pixelId) window.MENIFA_TRACK.meta_pixel = pixelId;
    maybeLoadPixel();
  };

  window.menifaTrackLead = function (eventId) {
    if (!consent || !consent.marketing || !pixelId) return;
    maybeLoadPixel();
    if (typeof window.fbq !== "function") return;
    window.fbq("track", "Lead", {}, { eventID: eventId });
    (window.dataLayer = window.dataLayer || []).push({ event: "Lead", event_id: eventId });
  };

  if (!window.MenifaConsent) {
    window.MenifaConsent = { get: function () { return consent; }, open: openPrefs };
  }

  var banner = $("#cookie");
  var modal = $("#cookie-modal");
  if (banner) {
    if (!consent) banner.hidden = false;
    var all = $("#ck-all");
    var none = $("#ck-none");
    var prefs = $("#ck-prefs");
    if (all) all.addEventListener("click", function () { saveConsent(true, true); });
    if (none) none.addEventListener("click", function () { saveConsent(false, false); });
    if (prefs) prefs.addEventListener("click", openPrefs);
  }
  if (modal) {
    var save = $("#ck-save");
    var cancel = $("#ck-cancel");
    if (save) save.addEventListener("click", function () {
      saveConsent($("#ck-stats").checked, $("#ck-mkt").checked);
    });
    if (cancel) cancel.addEventListener("click", function () { modal.hidden = true; });
  }
  Array.prototype.forEach.call(document.querySelectorAll("[data-cookie-settings]"), function (b) {
    b.addEventListener("click", function (e) { e.preventDefault(); openPrefs(); });
  });
})();
