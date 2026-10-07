/**
 * Soft quiz attribution + Pixel path. Same shape as assets/site.js.
 * meta_pixel stays empty until it is set on window.MENIFA_TRACK.
 * Does not send leads.
 */
(function () {
  "use strict";
  window.MENIFA_TRACK = window.MENIFA_TRACK || { ga4: "", meta_pixel: "", clarity: "" };
  var pixelId = String(window.MENIFA_TRACK.meta_pixel || "").trim();
  var attKeys = [
    "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
    "gclid", "fbclid", "gbraid", "wbraid"
  ];

  try {
    var qp = new URLSearchParams(location.search);
    var att = JSON.parse(sessionStorage.getItem("menifa-att") || "{}");
    var got = false;
    attKeys.forEach(function (k) {
      if (qp.get(k)) {
        att[k] = qp.get(k);
        got = true;
      }
    });
    if (!att.landing) {
      att.landing = location.pathname;
      att.referrer = "direct";
      if (document.referrer) {
        try { att.referrer = new URL(document.referrer).hostname; } catch (e) {}
      }
      got = true;
    }
    if (got) sessionStorage.setItem("menifa-att", JSON.stringify(att));
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

  var pixelStd = {
    generate_lead: "Lead",
    contact_whatsapp: "Contact",
    contact_phone: "Contact",
    schedule_call: "Schedule"
  };

  function sendEvent(name, params) {
    params = params || {};
    (window.dataLayer = window.dataLayer || []).push(Object.assign({ event: name }, params));
    if (!window.fbq) return;
    var opts = params.event_id ? { eventID: params.event_id } : undefined;
    if (pixelStd[name]) window.fbq("track", pixelStd[name], params, opts);
    else window.fbq("trackCustom", name, params, opts);
  }

  if (!window.menifaTrack) {
    window.menifaTrack = function (name, params) {
      sendEvent(name, params);
    };
  }

  /* Load fbevents only when an id is configured. Empty string does nothing. */
  if (pixelId && !window.fbq) {
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
})();
