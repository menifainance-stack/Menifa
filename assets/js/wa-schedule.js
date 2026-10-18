/**
 * Paid LP / quiz WhatsApp schedule link.
 * Prefill is built at click time. GA4 and Meta Contact run only when
 * MenifaConsent already allows that category. A click before consent is not queued.
 */
(function () {
  'use strict';

  var WA_NUMBER = '972524502821';
  var LABEL = 'וואטסאפ — לתיאום שיחה';

  function pickAtt() {
    var att = {};
    try { att = JSON.parse(sessionStorage.getItem('menifa-att') || '{}'); } catch (e) {}
    var qp = null;
    try { qp = new URLSearchParams(location.search); } catch (e2) {}
    return function (key) {
      var fromUrl = qp && qp.get(key);
      if (fromUrl) return fromUrl;
      if (att && att[key] != null && att[key] !== '') return String(att[key]);
      return '';
    };
  }

  function safeToken(value, max) {
    var s = String(value || '').trim();
    if (!s) return '';
    if (/@/.test(s) || /(?:\+972|0)5\d/.test(s)) return '';
    s = s.replace(/[^A-Za-z0-9_-]/g, '');
    if (!s) return '';
    return s.slice(0, max);
  }

  function sourceLine() {
    var pick = pickAtt();
    var parts = [];
    ['utm_source', 'utm_medium', 'utm_campaign'].forEach(function (key) {
      var token = safeToken(pick(key), 32);
      if (token) parts.push(token);
    });
    var gclid = safeToken(pick('gclid'), 6);
    var fbclid = safeToken(pick('fbclid'), 6);
    if (gclid) parts.push('gclid:' + gclid);
    if (fbclid) parts.push('fbclid:' + fbclid);
    if (!parts.length) return '';
    return 'מקור: ' + parts.join('/');
  }

  function pageLabel(anchor) {
    var name = anchor.getAttribute('data-wa-page') || '';
    if (anchor.getAttribute('data-wa-quiz') === '1') name += ' (שאלון)';
    return name;
  }

  function messageFor(anchor) {
    var lines = ['שלום תמיר, הגעתי מהעמוד: ' + pageLabel(anchor)];
    var source = sourceLine();
    if (source) lines.push(source);
    return lines.join('\n');
  }

  function hrefFor(anchor) {
    return 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(messageFor(anchor));
  }

  function gaOff() {
    if (window.MENIFA_GA_OFF) return true;
    var meta = document.querySelector('meta[name="menifa-ga"]');
    return !!(meta && String(meta.getAttribute('content') || '').toLowerCase() === 'off');
  }

  function consentNow() {
    var api = window.MenifaConsent;
    if (!api || typeof api.get !== 'function') return null;
    var value = api.get();
    if (!value || value.v !== 2) return null;
    return value;
  }

  function track(anchor) {
    var consent = consentNow();
    if (!consent) return;
    var page = location.pathname || '';
    if (consent.statistics && !gaOff() && !window.__menifaGaRevoked && window.gtag && window.__ga) {
      var pick = pickAtt();
      var params = {
        page_path: page,
        page: page,
        wa_variant: 'wa.me',
        cta_location: 'schedule'
      };
      ['utm_source', 'utm_medium', 'utm_campaign'].forEach(function (key) {
        var token = safeToken(pick(key), 80);
        if (token) params[key] = token;
      });
      window.gtag('event', 'whatsapp_click', params);
    }
    if (consent.marketing && typeof window.fbq === 'function') {
      window.fbq('track', 'Contact', { content_name: page });
    }
  }

  function arm(anchor) {
    if (anchor.getAttribute('data-wa-armed') === '1') return;
    anchor.setAttribute('data-wa-armed', '1');
    if (!anchor.getAttribute('aria-label')) anchor.setAttribute('aria-label', LABEL);
    function refresh() { anchor.href = hrefFor(anchor); }
    anchor.addEventListener('pointerdown', refresh);
    anchor.addEventListener('focus', refresh);
    anchor.addEventListener('click', function () {
      refresh();
      track(anchor);
    });
    anchor.addEventListener('auxclick', function () {
      refresh();
      track(anchor);
    });
  }

  function boot() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-wa-schedule]'), arm);
  }

  window.menifaWaSchedule = { hrefFor: hrefFor, messageFor: messageFor, sourceLine: sourceLine };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
