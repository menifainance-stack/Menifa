/* ═══════════════════════════════════════════════════════════════
   WhatsApp click tracking → dataLayer event `whatsapp_click`.
   Covers a[href*="wa.me"], a[href*="api.whatsapp.com"], and
   window.open() to those hosts. Never pushes PII or ?text=.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__menifaWaTrack) return;
  window.__menifaWaTrack = true;

  var lastKey = '';
  var lastAt = 0;

  function isWaUrl(raw) {
    if (!raw) return false;
    var s = String(raw);
    return /wa\.me/i.test(s) || /api\.whatsapp\.com/i.test(s);
  }

  function normalizeLinkUrl(raw) {
    try {
      var u = new URL(String(raw), location.href);
      u.searchParams.delete('text');
      u.hash = '';
      var q = u.searchParams.toString();
      return u.origin + u.pathname + (q ? '?' + q : '');
    } catch (e) {
      return String(raw).replace(/([?&])text=[^&]*/gi, '$1').replace(/[?&]$/, '');
    }
  }

  function variantFromEl(el) {
    if (!el || !el.closest) return 'bare';
    if (el.getAttribute && el.getAttribute('data-wa-variant')) {
      return el.getAttribute('data-wa-variant');
    }
    if (el.closest('.fab-whatsapp, .whatsapp-fab, .fab-group')) return 'fab';
    if (el.closest('.side-drawer, #sideDrawer, .drawer-quick-card')) return 'dynamic';
    if (el.closest('.lead-form, .cta-buttons, .cta-final, .service-card, .calc-cta, main, article')) return 'inline';
    return 'bare';
  }

  function attribution() {
    if (window.MenifaAttribution && typeof window.MenifaAttribution.get === 'function') {
      return window.MenifaAttribution.get();
    }
    return { landing_page_path: location.pathname || '/' };
  }

  function pushWa(rawUrl, variant) {
    var linkUrl = normalizeLinkUrl(rawUrl);
    var now = Date.now();
    var key = variant + '|' + linkUrl;
    if (key === lastKey && now - lastAt < 600) return;
    lastKey = key;
    lastAt = now;

    var utm = attribution();
    var payload = {
      event: 'whatsapp_click',
      page_path: location.pathname,
      landing_page_path: utm.landing_page_path || location.pathname,
      session_source: utm.session_source || utm.utm_source || '',
      session_medium: utm.session_medium || utm.utm_medium || '',
      session_campaign: utm.session_campaign || utm.utm_campaign || '',
      wa_variant: variant || 'bare',
      link_url: linkUrl
    };
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);
  }

  document.addEventListener('click', function (ev) {
    var node = ev.target;
    if (!node) return;
    var a = node.closest ? node.closest('a[href]') : null;
    if (!a) return;
    var href = a.href || a.getAttribute('href') || '';
    if (!isWaUrl(href)) return;
    pushWa(href, variantFromEl(a));
  }, true);

  var nativeOpen = window.open;
  window.open = function (url) {
    if (url && isWaUrl(url)) pushWa(url, 'dynamic');
    return nativeOpen.apply(this, arguments);
  };
})();
