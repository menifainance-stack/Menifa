/**
 * Quiz attribution + Meta pixel behind the same menifa-consent choice as assets/site.js.
 * fbevents.js loads only after marketing consent. An empty pixel id does nothing.
 * Meta events are PageView and Lead with eventID only. ua and answers stay off Meta.
 */
(function () {
  "use strict";
  window.MENIFA_TRACK = window.MENIFA_TRACK || { ga4: "G-8ZP1G2VP40", meta_pixel: "", clarity: "" };
  if (!window.MENIFA_TRACK.ga4) window.MENIFA_TRACK.ga4 = "G-8ZP1G2VP40";
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
      att.referrer = document.referrer || "";
    }
    sessionStorage.setItem("menifa-att", JSON.stringify(att));
    var cleanLoc = (function () {
      var u = new URL(location.href);
      var next = new URL(u.origin + u.pathname);
      u.searchParams.forEach(function (value, key) {
        if (key === "gclid" || key.indexOf("utm_") === 0) next.searchParams.append(key, value);
      });
      if (u.hash) next.hash = u.hash;
      return next.href;
    })();
    if (!att.landing) {
      att.landing = cleanLoc;
      sessionStorage.setItem("menifa-att", JSON.stringify(att));
    }
    if (cleanLoc !== location.href) history.replaceState(history.state, "", cleanLoc);
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

  function syncCookiePad() {
    var root = document.documentElement;
    var bar = $("#cookie");
    if (!bar || bar.hidden) {
      root.style.removeProperty("--aic-cookie-pad");
      return;
    }
    var h = Math.ceil(bar.getBoundingClientRect().height + 24);
    root.style.setProperty("--aic-cookie-pad", h + "px");
  }

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
    syncCookiePad();
    maybeLoadPixel();
    maybeLoadGa();
    window.dispatchEvent(new CustomEvent("consent-update"));
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
    fbq('set','autoConfig',false,'1085659520839178');
    window.fbq("init", pixelId);
    window.fbq("track", "PageView");
  }

  window.menifaArmPixel = function (id) {
    pixelId = String(id || "").trim();
    if (pixelId) window.MENIFA_TRACK.meta_pixel = pixelId;
    maybeLoadPixel();
  };

  /* page_location allowlist: utm_* and gclid only. Same rule as assets/site.js. */
  function safePageLocation() {
    try {
      var u = new URL(location.href);
      var next = new URL(u.origin + u.pathname);
      u.searchParams.forEach(function (value, key) {
        if (key === "gclid" || key.indexOf("utm_") === 0) next.searchParams.append(key, value);
      });
      if (u.hash) next.hash = u.hash;
      return next.href;
    } catch (e) {
      return location.origin + location.pathname;
    }
  }
  function gaId() {
    return String((window.MENIFA_TRACK && window.MENIFA_TRACK.ga4) || "").trim() || "G-8ZP1G2VP40";
  }
  function updateGaConsent() {
    if (!window.gtag || !window.__ga) return;
    window.gtag("consent", "update", {
      analytics_storage: consent && consent.statistics ? "granted" : "denied",
      ad_storage: consent && consent.marketing ? "granted" : "denied",
      ad_user_data: consent && consent.marketing ? "granted" : "denied",
      ad_personalization: consent && consent.marketing ? "granted" : "denied"
    });
  }
  var gaQ = [];
  var GA_KEYS = { form_id: 1, page_path: 1, lead_source: 1, event_id: 1, step_number: 1, quiz: 1 };
  function sendGaEvent(name, params) {
    params = params || {};
    var clean = {};
    Object.keys(params).forEach(function (k) {
      if (GA_KEYS[k] && params[k] != null && params[k] !== "") clean[k] = params[k];
    });
    (window.dataLayer = window.dataLayer || []).push(Object.assign({ event: name }, clean));
    if (window.gtag && window.__ga) window.gtag("event", name, clean);
  }
  function flushGa() {
    if (!consent || !consent.statistics || !window.gtag || !window.__ga) return;
    while (gaQ.length) {
      var e = gaQ.shift();
      sendGaEvent(e[0], e[1]);
    }
  }
  function maybeLoadGa() {
    if (!consent || !consent.statistics) {
      if (window.__ga) updateGaConsent();
      return;
    }
    if (window.__ga) { updateGaConsent(); flushGa(); return; }
    var id = gaId();
    if (!id) return;
    window.__ga = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag("consent", "default", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      wait_for_update: 500
    });
    window.gtag("js", new Date());
    var cfg = {
      anonymize_ip: true,
      page_location: safePageLocation(),
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    };
    if (/\.vercel\.app$/i.test(location.hostname)) cfg.debug_mode = true;
    window.gtag("config", id, cfg);
    updateGaConsent();
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + id;
    document.head.appendChild(s);
    flushGa();
  }
  if (!window.menifaTrack) {
    window.menifaTrack = function (name, params) {
      if (consent && consent.statistics && window.gtag && window.__ga) sendGaEvent(name, params);
      else gaQ.push([name, params]);
    };
  }

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
    syncCookiePad();
    requestAnimationFrame(syncCookiePad);
    window.addEventListener("resize", syncCookiePad);
    if (window.ResizeObserver) new ResizeObserver(syncCookiePad).observe(banner);
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
  if (consent && consent.statistics) maybeLoadGa();
})();
