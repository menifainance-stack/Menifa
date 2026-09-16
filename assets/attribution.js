/* ═══════════════════════════════════════════════════════════════
   Attribution — UTM / gclid / fbclid → sessionStorage (first-touch
   only: never overwrite an existing key for this tab).
   Exposes landing_page_path + session_source / session_medium /
   session_campaign for dataLayer (no PII).
   Safe without GTM: only sessionStorage + a public getter.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.MenifaAttribution) return;

  var PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid'];
  var PREFIX = 'menifa_attr_';
  var LANDING_KEY = 'menifa_landing_page_path';

  function ssGet(key) {
    try { return sessionStorage.getItem(key); } catch (e) { return null; }
  }
  function ssSetFirst(key, value) {
    if (value == null || value === '') return;
    if (ssGet(key)) return;
    try { sessionStorage.setItem(key, String(value)); } catch (e) { /* private mode */ }
  }

  function capture() {
    var params;
    try { params = new URLSearchParams(location.search); } catch (e) { params = null; }
    if (params) {
      PARAMS.forEach(function (k) {
        var v = params.get(k);
        if (v) ssSetFirst(PREFIX + k, v);
      });
    }
    ssSetFirst(LANDING_KEY, location.pathname || '/');
  }

  function get() {
    var out = {};
    PARAMS.forEach(function (k) {
      var v = ssGet(PREFIX + k);
      if (v) out[k] = v;
    });
    out.landing_page_path = ssGet(LANDING_KEY) || location.pathname || '/';
    out.session_source = out.utm_source || '';
    out.session_medium = out.utm_medium || '';
    out.session_campaign = out.utm_campaign || '';
    return out;
  }

  capture();
  window.MenifaAttribution = { get: get, capture: capture, PARAMS: PARAMS };
})();
