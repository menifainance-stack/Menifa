/* ═══════════════════════════════════════════════════════════════
   GTM loader — gated. Will not fetch googletagmanager.com unless
   MENIFA_MEASUREMENT_PREVIEW === true AND MENIFA_GTM_ID is a real
   GTM-… id (not the GTM-XXXXXXX /* REPLACE_ME */ placeholder).
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__menifaGtmLoaderRan) return;
  window.__menifaGtmLoaderRan = true;

  var preview = window.MENIFA_MEASUREMENT_PREVIEW === true;
  var id = String(window.MENIFA_GTM_ID || '');
  var isPlaceholder = !id || id === 'GTM-XXXXXXX' || /X{3,}/i.test(id) || !/^GTM-[A-Z0-9]+$/.test(id);

  if (!preview || isPlaceholder) return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    'gtm.start': new Date().getTime(),
    event: 'gtm.js',
    page_path: location.pathname,
    page_location: location.href
  });

  (function (w, d, s, l, i) {
    w[l] = w[l] || [];
    w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    var j = d.createElement(s);
    var dl = l !== 'dataLayer' ? '&l=' + l : '';
    j.async = true;
    j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl;
    var f = d.getElementsByTagName(s)[0];
    if (f && f.parentNode) f.parentNode.insertBefore(j, f);
    else (d.head || d.documentElement).appendChild(j);
  })(window, document, 'script', 'dataLayer', id);
})();
