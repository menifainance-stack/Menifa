/* ═══════════════════════════════════════════════════════════════
   Attribution — UTM / gclid / fbclid → sessionStorage (first-touch
   landing path + last-present campaign params for the tab).
   No PII. Safe without GTM: only sessionStorage + a public getter.
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
  function ssSet(key, value) {
    if (value == null || value === '') return;
    try { sessionStorage.setItem(key, String(value)); } catch (e) { /* private mode */ }
  }

  function capture() {
    var params;
    try { params = new URLSearchParams(location.search); } catch (e) { params = null; }
    if (params) {
      PARAMS.forEach(function (k) {
        var v = params.get(k);
        if (v) ssSet(PREFIX + k, v);
      });
    }
    if (!ssGet(LANDING_KEY)) {
      ssSet(LANDING_KEY, location.pathname || '/');
    }
  }

  function get() {
    var out = {};
    PARAMS.forEach(function (k) {
      var v = ssGet(PREFIX + k);
      if (v) out[k] = v;
    });
    out.landing_page_path = ssGet(LANDING_KEY) || location.pathname || '/';
    return out;
  }

  capture();
  window.MenifaAttribution = { get: get, capture: capture, PARAMS: PARAMS };
})();
