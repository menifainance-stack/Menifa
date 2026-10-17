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
      att.landing = location.pathname;
      att.referrer = document.referrer || "";
    }
    sessionStorage.setItem("menifa-att", JSON.stringify(att));
    /* Leave fbclid, gbraid, wbraid and gclid in the address bar for Meta _fbc. */
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
      /* 0px, not removeProperty: mobile CSS reserves the open banner's pad. */
      root.style.setProperty("--aic-cookie-pad", "0px");
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
  function isPreviewHost() {
    return /\.vercel\.app$/i.test(location.hostname);
  }
  function gaOff() {
    if (window.MENIFA_GA_OFF) return true;
    var meta = document.querySelector('meta[name="menifa-ga"]');
    return !!(meta && String(meta.getAttribute("content") || "").toLowerCase() === "off");
  }
  function isGaCollect(url) {
    return typeof url === "string" && /\/g\/(?:s\/)?collect/i.test(url) && /google-analytics\.com|analytics\.google\.com/i.test(url);
  }
  function scrubPairString(body) {
    return String(body || "").split("&").filter(function (part) {
      if (!part) return false;
      var text = part;
      try { text = decodeURIComponent(part.replace(/\+/g, " ")); } catch (e) {}
      return !hasSensitiveText(text);
    }).join("&");
  }
  function hasSensitiveText(text) {
    return /@[a-z0-9.-]+\.[a-z]{2,}/i.test(text) || /(?:\+972|0)5\d[-\s]?\d{3}[-\s]?\d{4}/.test(text) || /מסורב/.test(text);
  }
  function scrubCollect(url) {
    try {
      var u = new URL(url);
      var drop = [];
      u.searchParams.forEach(function (value, key) {
        var text = value;
        try { text = decodeURIComponent(value); } catch (e) {}
        if (hasSensitiveText(text) || hasSensitiveText(key)) drop.push(key);
      });
      drop.forEach(function (k) { u.searchParams.delete(k); });
      return u.toString();
    } catch (e) {
      return url;
    }
  }
  function tuneCollect(url) {
    if (!isGaCollect(url)) return url;
    if (window.__menifaGaRevoked) return null;
    url = scrubCollect(url);
    if (!isPreviewHost() || /(?:^|[?&])_dbg=/.test(url)) return url;
    return url + (url.indexOf("?") === -1 ? "?" : "&") + "_dbg=1";
  }
  /* Same preview-only transport patch as site.js. menifa.org is not patched. */
  function armGaTransport() {
    if (!isPreviewHost() || window.__menifaGaTransport) return;
    window.__menifaGaTransport = true;
    var origBeacon = navigator.sendBeacon && navigator.sendBeacon.bind(navigator);
    if (origBeacon) {
      navigator.sendBeacon = function (url, data) {
        if (typeof url !== "string") return origBeacon(url, data);
        var next = tuneCollect(url);
        if (next === null) return true;
        if (typeof data === "string") data = scrubPairString(data);
        return origBeacon(next, data);
      };
    }
    var origFetch = window.fetch && window.fetch.bind(window);
    if (origFetch) {
      window.fetch = function (input, init) {
        try {
          if (typeof input === "string") {
            var next = tuneCollect(input);
            if (next === null) return Promise.resolve(new Response("", { status: 204 }));
            input = next;
            if (init && typeof init.body === "string") init = Object.assign({}, init, { body: scrubPairString(init.body) });
          } else if (input && typeof input.url === "string") {
            var rewritten = tuneCollect(input.url);
            if (rewritten === null) return Promise.resolve(new Response("", { status: 204 }));
            if (rewritten !== input.url) input = new Request(rewritten, input);
          }
        } catch (e) {}
        return origFetch(input, init);
      };
    }
    var xo = XMLHttpRequest.prototype.open;
    var xs = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function () {
      var args = Array.prototype.slice.call(arguments);
      if (typeof args[1] === "string") {
        var next = tuneCollect(args[1]);
        if (next === null) { this.__menifaDrop = true; args[1] = "about:blank"; }
        else args[1] = next;
      }
      return xo.apply(this, args);
    };
    XMLHttpRequest.prototype.send = function () {
      if (this.__menifaDrop) return;
      return xs.apply(this, arguments);
    };
    try {
      var proto = window.HTMLImageElement && HTMLImageElement.prototype;
      var desc = proto && Object.getOwnPropertyDescriptor(proto, "src");
      if (desc && desc.set && desc.get) {
        Object.defineProperty(proto, "src", {
          configurable: true,
          enumerable: desc.enumerable,
          get: function () { return desc.get.call(this); },
          set: function (v) {
            if (typeof v === "string") {
              var next = tuneCollect(v);
              if (next === null) return;
              v = next;
            }
            desc.set.call(this, v);
          }
        });
      }
    } catch (e2) {}
  }
  function deleteGaCookies(id) {
    var suffix = String(id || "").replace(/^G-/, "");
    var names = ["_ga"];
    if (suffix) names.push("_ga_" + suffix);
    var domains = ["menifa.org", ".menifa.org"];
    var host = location.hostname;
    if (host && domains.indexOf(host) < 0) domains.push(host);
    if (host && host.indexOf(".") > 0 && domains.indexOf("." + host) < 0) domains.push("." + host);
    names.forEach(function (name) {
      var tail = "=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
      document.cookie = name + tail;
      document.cookie = name + tail + "; Secure";
      domains.forEach(function (domain) {
        document.cookie = name + tail + "; domain=" + domain;
        document.cookie = name + tail + "; domain=" + domain + "; Secure";
      });
    });
  }
  function revokeGa() {
    var id = gaId();
    if (id) window["ga-disable-" + id] = true;
    window.__menifaGaRevoked = true;
    armGaTransport();
    updateGaConsent();
    deleteGaCookies(id);
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
  var GA_KEYS = {
    form_id: 1, lead_uuid: 1, page_path: 1, landing_page_path: 1,
    utm_source: 1, utm_medium: 1, utm_campaign: 1, utm_content: 1, utm_term: 1,
    step_number: 1, quiz: 1, wa_variant: 1, cta_location: 1, link_url: 1, lead_source: 1
  };
  function sensitiveValue(v) {
    var s = String(v == null ? "" : v);
    if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(s)) return true;
    if (/(?:\+972|0)5\d[-\s]?\d{3}[-\s]?\d{4}/.test(s)) return true;
    if (/מסורב/.test(s)) return true;
    return false;
  }
  function sendGaEvent(name, params) {
    params = params || {};
    var allowStepOnly = name === "quiz_step";
    var clean = {};
    Object.keys(params).forEach(function (k) {
      if (allowStepOnly && k !== "step_number") return;
      if (!GA_KEYS[k] || params[k] == null || params[k] === "") return;
      if (k === "utm_source" && String(params[k]) === "direct/unknown") return;
      if (sensitiveValue(params[k])) return;
      clean[k] = params[k];
    });
    (window.dataLayer = window.dataLayer || []).push(Object.assign({ event: name }, clean));
    if (window.__menifaGaRevoked || gaOff() || !consent || !consent.statistics) return;
    if (window.gtag && window.__ga) window.gtag("event", name, clean);
  }
  function flushGa() {
    if (!consent || !consent.statistics || gaOff() || window.__menifaGaRevoked || !window.gtag || !window.__ga) return;
    while (gaQ.length) {
      var e = gaQ.shift();
      sendGaEvent(e[0], e[1]);
    }
  }
  function safeReferrer() {
    var raw = document.referrer;
    if (!raw) return "";
    try {
      var u = new URL(raw);
      var next = new URL(u.origin + u.pathname);
      u.searchParams.forEach(function (value, key) {
        if (key === "gclid" || key.indexOf("utm_") === 0) next.searchParams.append(key, value);
      });
      return next.href;
    } catch (e) {
      return String(raw).split("?")[0].split("#")[0];
    }
  }
  function maybeLoadGa() {
    if (gaOff() || !consent || !consent.statistics) {
      if (window.__ga) revokeGa();
      return;
    }
    window.__menifaGaRevoked = false;
    window["ga-disable-" + gaId()] = false;
    armGaTransport();
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
      page_location: safePageLocation(),
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    };
    var ref = safeReferrer();
    if (ref) cfg.page_referrer = ref;
    if (isPreviewHost()) cfg.debug_mode = true;
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
      if (consent && consent.statistics && !gaOff() && window.gtag && window.__ga) sendGaEvent(name, params);
      else gaQ.push([name, params]);
    };
  }
  if (!window.__menifaWaClick) {
    window.__menifaWaClick = true;
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a[href]");
      if (!a) return;
      var h = a.getAttribute("href") || "";
      if (!/wa\.me\/|api\.whatsapp\.com/i.test(h) && !a.hasAttribute("data-wa")) return;
      /* Schedule CTA and the floating button track themselves, and only after consent. Do not queue them here. */
      if (a.hasAttribute("data-wa-schedule") || a.hasAttribute("data-wa-float")) return;
      var href = a.href || h;
      var link = href;
      try {
        var u = new URL(href, location.href);
        u.searchParams.delete("text");
        u.hash = "";
        link = u.origin + u.pathname + (u.search ? u.search : "");
      } catch (err) {
        link = String(href).split("?")[0];
      }
      var zone = a.closest && a.closest("#aic-replies, #wa-pop, footer, header, aside, [id]");
      window.menifaTrack("whatsapp_click", {
        wa_variant: /api\.whatsapp\.com/i.test(href) ? "api" : "wa.me",
        cta_location: (zone && (zone.id || zone.tagName.toLowerCase())) || "page",
        link_url: link
      });
    }, true);
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

  function policyHref(p, file, fallback) {
    var link = p.querySelector('a[href*="' + file + '"]');
    if (!link) return fallback;
    var raw = link.getAttribute("href") || "";
    if (!raw || /^(?:https?:|javascript:|data:)/i.test(raw)) return fallback;
    return raw;
  }
  function policyLink(href, label) {
    var a = document.createElement("a");
    a.setAttribute("href", href);
    a.textContent = label;
    return a;
  }
  function syncCompactCookieCopy(bannerEl) {
    var p = bannerEl.querySelector("p");
    if (!p) return;
    var narrow = window.matchMedia("(max-width: 480px)").matches;
    if (!narrow) {
      if (p.getAttribute("data-cookie-compact") === "1" && p.__menifaFull) {
        p.innerHTML = p.__menifaFull;
        p.removeAttribute("data-cookie-compact");
      }
      return;
    }
    if (p.getAttribute("data-cookie-compact") === "1") return;
    if (!p.__menifaFull) p.__menifaFull = p.innerHTML;
    /* Same sentence as assets/site.js. Kept in both files: the quiz pages do not load site.js. */
    var COMPACT_COOKIE_BEFORE = "עוגיות סטטיסטיקה ושיווק פועלות רק באישורכם. פרטים ";
    var cookiesHref = policyHref(p, "cookies.html", "../../cookies.html");
    var privacyHref = policyHref(p, "privacy.html", "../../privacy.html");
    p.textContent = "";
    p.appendChild(document.createTextNode(COMPACT_COOKIE_BEFORE));
    p.appendChild(policyLink(cookiesHref, "במדיניות העוגיות"));
    p.appendChild(document.createTextNode(" "));
    p.appendChild(policyLink(privacyHref, "ובמדיניות הפרטיות"));
    p.appendChild(document.createTextNode("."));
    p.setAttribute("data-cookie-compact", "1");
  }

  var banner = $("#cookie");
  var modal = $("#cookie-modal");
  if (banner) {
    syncCompactCookieCopy(banner);
    window.addEventListener("resize", function () { syncCompactCookieCopy(banner); });
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

  /* Direct WhatsApp button. Quiz pages do not load assets/site.js.
     Same rules as the float in assets/site.js: one control, click-time
     prefill, events only after consent, nothing queued before it. */
  (function mountWaFloat() {
    if (/^\/(lp|q)\/(ihud|mihzur)(\/|\/index\.html)?$/i.test(String(location.pathname || ''))) return;
    var WA_NUMBER = "972524502821";
    var LABEL = "וואטסאפ — לתיאום שיחה";
    var GREETING = "שלום, אשמח לתיאום שיחה";
    var SVG = "<svg width=\"26\" height=\"26\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M20.5 11.6a8.6 8.6 0 0 1-12.7 7.6L3 20.6l1.5-4.6A8.6 8.6 0 1 1 20.5 11.6z\"/><path d=\"M9 8.6c.2 2.9 2.6 5.6 5.6 6.3l1.2-1.3-1.8-1-1 .8a5 5 0 0 1-2.4-2.4l.8-1-1-1.8z\" fill=\"currentColor\" stroke=\"none\"/></svg>";
    var link = null;
    var heldFocus = false;
    var queued = false;

    function pickAtt() {
      var att = {};
      try { att = JSON.parse(sessionStorage.getItem("menifa-att") || "{}"); } catch (e) {}
      var qp = null;
      try { qp = new URLSearchParams(location.search); } catch (e2) {}
      return function (key) {
        var fromUrl = qp && qp.get(key);
        if (fromUrl) return fromUrl;
        if (att && att[key] != null && att[key] !== "") return String(att[key]);
        return "";
      };
    }
    function safeToken(value, max) {
      var s = String(value || "").trim();
      if (!s) return "";
      if (/@/.test(s) || /(?:\+972|0)5\d/.test(s)) return "";
      s = s.replace(/[^A-Za-z0-9_-]/g, "");
      if (!s) return "";
      return s.slice(0, max);
    }
    function sourceLine() {
      var pick = pickAtt();
      var parts = [];
      ["utm_source", "utm_medium", "utm_campaign"].forEach(function (key) {
        var token = safeToken(pick(key), 32);
        if (token) parts.push(token);
      });
      var gclid = safeToken(pick("gclid"), 6);
      var fbclid = safeToken(pick("fbclid"), 6);
      if (gclid) parts.push("gclid:" + gclid);
      if (fbclid) parts.push("fbclid:" + fbclid);
      if (!parts.length) return "";
      return "מקור: " + parts.join("/");
    }
    function pageContext() {
      var marked = document.querySelector("[data-wa-page]");
      var name = marked ? (marked.getAttribute("data-wa-page") || "") : "";
      if (marked && marked.getAttribute("data-wa-quiz") === "1" && name) name += " (שאלון)";
      if (!name) name = String(document.title || "").split(/[|·]/)[0];
      name = name.replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 72);
      return name;
    }
    function messageFor() {
      var lines = [GREETING];
      var ctx = pageContext();
      if (ctx) lines.push("עמוד: " + ctx);
      var source = sourceLine();
      if (source) lines.push(source);
      return lines.join("\n");
    }
    function hrefFor() {
      return "https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(messageFor());
    }
    function consentNow() {
      var api = window.MenifaConsent;
      if (!api || typeof api.get !== "function") return null;
      var value = api.get();
      if (!value || value.v !== 2) return null;
      return value;
    }
    function track() {
      var consentValue = consentNow();
      if (!consentValue) return;
      var page = location.pathname || "";
      if (consentValue.statistics && !gaOff() && !window.__menifaGaRevoked && window.gtag && window.__ga) {
        var pick = pickAtt();
        var params = { page_path: page, page: page, wa_variant: "wa.me", cta_location: "float" };
        ["utm_source", "utm_medium", "utm_campaign"].forEach(function (key) {
          var token = safeToken(pick(key), 80);
          if (token) params[key] = token;
        });
        window.gtag("event", "whatsapp_click", params);
      }
      if (consentValue.marketing && typeof window.fbq === "function") {
        window.fbq("track", "Contact", { content_name: page });
      }
    }
    function arm(anchor) {
      if (anchor.getAttribute("data-wa-armed") === "1") return;
      anchor.setAttribute("data-wa-armed", "1");
      anchor.setAttribute("aria-label", LABEL);
      function refresh() { anchor.href = hrefFor(); }
      anchor.addEventListener("pointerdown", refresh);
      anchor.addEventListener("focus", refresh);
      anchor.addEventListener("click", function () { refresh(); track(); });
      anchor.addEventListener("auxclick", function () { refresh(); track(); });
    }
    function ensure() {
      if (link && document.body.contains(link)) return link;
      var existing = document.querySelector("[data-wa-float]");
      if (existing) { link = existing; arm(link); return link; }
      if (document.querySelector(".fab-wa")) return null;
      link = document.createElement("a");
      link.className = "wa-float";
      link.setAttribute("data-wa-float", "");
      link.href = "https://wa.me/" + WA_NUMBER;
      link.rel = "noopener noreferrer";
      link.setAttribute("aria-label", LABEL);
      link.innerHTML = SVG;
      document.body.appendChild(link);
      arm(link);
      return link;
    }
    function safeInset() {
      var probe = document.getElementById("wa-safe-probe");
      if (!probe) {
        probe = document.createElement("div");
        probe.id = "wa-safe-probe";
        probe.setAttribute("aria-hidden", "true");
        probe.style.cssText = "position:fixed;left:0;bottom:0;width:0;height:env(safe-area-inset-bottom,0px);pointer-events:none;visibility:hidden";
        document.body.appendChild(probe);
      }
      return probe.getBoundingClientRect().height || 0;
    }
    function baseLift() {
      var lift = 16 + safeInset();
      var cookie = document.getElementById("cookie");
      if (cookie && !cookie.hidden) {
        var r = cookie.getBoundingClientRect();
        if (r.height > 8 && r.bottom > 0) lift = Math.max(lift, Math.ceil(window.innerHeight - r.top) + 12);
      }
      var dock = document.querySelector(".aic-dock");
      if (dock) {
        var d = dock.getBoundingClientRect();
        if (d.height > 8) lift = Math.max(lift, Math.ceil(window.innerHeight - d.top) + 12);
      }
      return lift;
    }
    function fieldFocused(el) {
      if (!el || !el.matches) return false;
      if (!el.matches("input, textarea, select")) return false;
      if (el.closest("#cookie, #cookie-modal, .modal")) return false;
      return !!(el.closest("form, .aic-phone, .aic-input-row, .aic-dock"));
    }
    function hold(on) {
      if (!link) return;
      link.classList.toggle("is-held", on);
      if (on) { link.setAttribute("aria-hidden", "true"); link.setAttribute("tabindex", "-1"); }
      else { link.removeAttribute("aria-hidden"); link.removeAttribute("tabindex"); }
    }
    function hits(anchor) {
      var rect = anchor.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return false;
      var prev = anchor.style.pointerEvents;
      anchor.style.pointerEvents = "none";
      var points = [
        [rect.left + rect.width / 2, rect.top + rect.height / 2],
        [rect.left + 3, rect.top + 3],
        [rect.right - 3, rect.top + 3],
        [rect.left + 3, rect.bottom - 3],
        [rect.right - 3, rect.bottom - 3]
      ];
      var blocked = false;
      for (var i = 0; i < points.length; i++) {
        var el = document.elementFromPoint(points[i][0], points[i][1]);
        if (!el || !el.closest) continue;
        if (el.closest("[data-wa-float], #wa-safe-probe")) continue;
        if (el.closest("#cookie, .cookie, .aic-dock, form, .aic-phone, .aic-input-row, button[type='submit'], .aic-send")) {
          blocked = true;
          break;
        }
      }
      anchor.style.pointerEvents = prev;
      return blocked;
    }
    function place() {
      if (!ensure()) return;
      document.documentElement.style.setProperty("--wa-fab-bottom", baseLift() + "px");
      if (heldFocus || fieldFocused(document.activeElement)) { hold(true); return; }
      var step;
      for (step = 0; step <= 6; step++) {
        document.documentElement.style.setProperty("--wa-float-extra", (step * 56) + "px");
        if (!hits(link)) { hold(false); return; }
      }
      document.documentElement.style.setProperty("--wa-float-extra", "0px");
      hold(true);
    }
    function schedule() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; place(); });
    }
    ensure();
    place();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("consent-update", schedule);
    document.addEventListener("focusin", function (e) {
      if (fieldFocused(e.target)) { heldFocus = true; schedule(); }
    });
    document.addEventListener("focusout", function () {
      setTimeout(function () {
        heldFocus = fieldFocused(document.activeElement);
        schedule();
      }, 0);
    });
    var bar = document.getElementById("cookie");
    if (bar && window.MutationObserver) new MutationObserver(schedule).observe(bar, { attributes: true, attributeFilter: ["hidden", "style", "class"] });
    if (bar && window.ResizeObserver) new ResizeObserver(schedule).observe(bar);
    var dock = document.querySelector(".aic-dock");
    if (dock && window.ResizeObserver) new ResizeObserver(schedule).observe(dock);
    var log = document.getElementById("aic-log");
    if (log && window.MutationObserver) new MutationObserver(schedule).observe(log, { childList: true, subtree: true });
  })();
})();
