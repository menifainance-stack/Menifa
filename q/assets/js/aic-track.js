/**
 * Quiz attribution + a Lead-only pixel path.
 * meta_pixel stays empty until it is set on window.MENIFA_TRACK.
 * An empty id does not define fbq, does not load fbevents, and does not fire.
 * Financial answers never leave this page toward Meta.
 */
(function () {
  "use strict";
  window.MENIFA_TRACK = window.MENIFA_TRACK || { ga4: "", meta_pixel: "", clarity: "" };
  var pixelId = String(window.MENIFA_TRACK.meta_pixel || "").trim();
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

  function sendEvent(name, params) {
    params = params || {};
    if (name !== "Lead" && name !== "generate_lead") return;
    var eventId = params.event_id || "";
    (window.dataLayer = window.dataLayer || []).push({ event: "Lead", event_id: eventId });
    if (!pixelId || typeof window.fbq !== "function") return;
    window.fbq("track", "Lead", {}, eventId ? { eventID: eventId } : undefined);
  }

  if (!window.menifaTrack) {
    window.menifaTrack = function (name, params) {
      sendEvent(name, params);
    };
  }

  /* fbevents loads only when an id is set. Empty id is a no-op: no fbq, no PageView. */
  if (pixelId && typeof window.fbq !== "function") {
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
  }
})();
