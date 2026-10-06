/* ═══════════════════════════════════════════════════════════════
   Soft Preview ONLY — A24 first-touch
   slug: a24-utm-makor-2026-10-01
   לא לייב. לא מנחש ערוץ בלי UTM מאומת.
   מיפוי מקור הפניה לפי מילון UTM בלבד.
   ═══════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  var KEY = 'menifa_ft_v1';
  var FIELDS = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'utm_term',
    'gclid',
    'fbclid',
    'landing_page_path'
  ];
  var UNATTRIBUTED = 'לא מיוחס';
  var memory = null;

  function blank() {
    return {
      utm_source: '',
      utm_medium: '',
      utm_campaign: '',
      utm_content: '',
      utm_term: '',
      gclid: '',
      fbclid: '',
      landing_page_path: ''
    };
  }

  function normalize(raw) {
    var out = blank();
    if (!raw || typeof raw !== 'object') return out;
    FIELDS.forEach(function (key) {
      if (raw[key] != null) out[key] = String(raw[key]);
    });
    return out;
  }

  function readStored() {
    try {
      var raw = root.sessionStorage.getItem(KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return parsed;
    } catch (err) {
      return null;
    }
  }

  function writeStored(touch) {
    try {
      root.sessionStorage.setItem(KEY, JSON.stringify(touch));
    } catch (err) {
      /* sessionStorage חסום — נשארים עם העותק בזיכרון של הטעינה הזו */
    }
  }

  function param(params, key) {
    var value = params.get(key);
    if (value == null) return '';
    return String(value).trim();
  }

  function capture() {
    var params = new URLSearchParams(root.location.search || '');
    var touch = blank();
    FIELDS.forEach(function (key) {
      if (key === 'landing_page_path') return;
      touch[key] = param(params, key);
    });
    touch.landing_page_path = String(root.location.pathname || '');
    return touch;
  }

  function ensureFirstTouch() {
    if (memory) return memory;
    var existing = readStored();
    if (existing) {
      memory = normalize(existing);
      return memory;
    }
    memory = capture();
    writeStored(memory);
    return memory;
  }

  function getFirstTouch() {
    var src = ensureFirstTouch();
    var copy = blank();
    FIELDS.forEach(function (key) { copy[key] = src[key]; });
    return copy;
  }

  function norm(value) {
    return String(value == null ? '' : value).trim().toLowerCase();
  }

  function isOneOf(value, list) {
    return list.indexOf(value) !== -1;
  }

  function mapMakor(touch) {
    var source = norm(touch && touch.utm_source);
    var medium = norm(touch && touch.utm_medium);

    if (source === 'google' && medium === 'organic') return 'seo';
    if (source === 'google' && isOneOf(medium, ['cpc', 'paid', 'ppc'])) return 'google';
    if (isOneOf(source, ['facebook', 'fb', 'ig', 'instagram', 'meta']) &&
        isOneOf(medium, ['paid', 'cpc', 'social', 'paid_social'])) return 'meta';
    if (medium === 'referral' || source === 'referral') return 'referral';
    if (isOneOf(source, ['partner', 'b2b', 'affiliate'])) return 'b2b';
    return UNATTRIBUTED;
  }

  function getMakorHafnia(touch) {
    return mapMakor(touch || getFirstTouch());
  }

  ensureFirstTouch();

  root.MenifaFirstTouch = {
    getFirstTouch: getFirstTouch,
    getMakorHafnia: getMakorHafnia,
    STORAGE_KEY: KEY,
    UNATTRIBUTED: UNATTRIBUTED
  };
})(window);
