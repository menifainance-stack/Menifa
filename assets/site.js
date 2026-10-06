/* MENIFA FINANCE — site behaviour (no dependencies) */
(function () {
  'use strict';

  /* ===== configuration: the developer fills these in production ===== */
  var CONFIG = {
    whatsapp: '972524502821',
    phone: '052-4502821',
    // Lead webhook (e.g. Make.com custom webhook -> Google Sheets CRM). Empty = WhatsApp hand-off only.
    leadWebhook: 'https://hook.us2.make.com/9pclkzy81xfnlh1nfyista793l9hbdig',
    // Tracking IDs load ONLY after the visitor consents to that category.
    // IDs are set in parts.py -> TRACKING and injected as window.MENIFA_TRACK
    ga4: (window.MENIFA_TRACK || {}).ga4 || '',               // statistics
    metaPixel: (window.MENIFA_TRACK || {}).meta_pixel || '',  // marketing
    clarity: (window.MENIFA_TRACK || {}).clarity || '',       // statistics
    consentVersion: 2
  };
  window.MENIFA_CONFIG = CONFIG;

  var store = {
    get: function (k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var fmt = function (n) { return Math.round(n).toLocaleString('he-IL'); };
  var waLink = function (text) { return 'https://wa.me/' + CONFIG.whatsapp + '?text=' + encodeURIComponent(text); };

  /* ===== mobile nav + dropdown ===== */
  var burger = $('.burger'), mnav = $('.mnav');
  if (burger && mnav) {
    burger.addEventListener('click', function () { mnav.classList.add('open'); burger.setAttribute('aria-expanded', 'true'); var c = $('.mnav-close'); if (c) c.focus(); });
    $$('.mnav-close, .mnav a').forEach(function (el) { el.addEventListener('click', function () { mnav.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); }); });
  }
  $$('.nav-dd').forEach(function (dd) {
    var b = $('button', dd);
    b.addEventListener('click', function (e) { e.stopPropagation(); var o = dd.classList.toggle('open'); b.setAttribute('aria-expanded', o ? 'true' : 'false'); });
    document.addEventListener('click', function () { dd.classList.remove('open'); b.setAttribute('aria-expanded', 'false'); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    $$('.nav-dd.open').forEach(function (d) { d.classList.remove('open'); });
    if (mnav) mnav.classList.remove('open');
    closeWa(); closeA11y();
  });

  /* ===== copy buttons ===== */
  $$('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = b.getAttribute('data-copy'), old = b.textContent;
      var done = function () { b.textContent = 'הועתק'; setTimeout(function () { b.textContent = old; }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, function () { selectText(b.previousElementSibling); });
      else selectText(b.previousElementSibling);
    });
  });
  function selectText(el) { if (!el) return; var r = document.createRange(); r.selectNodeContents(el); var s = getSelection(); s.removeAllRanges(); s.addRange(r); }

  /* ===== WhatsApp widget ===== */
  var waBtn = $('#wa-btn'), waPop = $('#wa-pop');
  function closeWa() { if (waPop && !waPop.hidden) { waPop.hidden = true; waBtn.setAttribute('aria-expanded', 'false'); } }
  if (waBtn && waPop) {
    waBtn.addEventListener('click', function () { var open = waPop.hidden; waPop.hidden = !open; waBtn.setAttribute('aria-expanded', open ? 'true' : 'false'); if (open) closeA11y(); });
    $('.wa-close', waPop).addEventListener('click', closeWa);
    $$('.wa-topics a', waPop).forEach(function (a) { a.href = waLink(a.getAttribute('data-msg')); });
  }
  $$('a[data-wa]').forEach(function (a) { a.href = waLink(a.getAttribute('data-wa') || 'שלום תמיר, אשמח לתאם שיחת ייעוץ'); });

  /* ===== accessibility widget ===== */
  var A11Y_KEY = 'menifa-a11y';
  var a11yBtn = $('#a11y-btn'), a11yPanel = $('#a11y-panel');
  var a11yState = store.get(A11Y_KEY) || { fs: 0 };
  var root = document.documentElement;
  var FS = [1, 1.12, 1.25, 1.4];
  function applyA11y() {
    root.style.setProperty('--fs', FS[a11yState.fs || 0]);
    ['contrast', 'readable', 'headings', 'links', 'nomotion', 'cursor'].forEach(function (k) { root.classList.toggle('a11y-' + k, !!a11yState[k]); });
    if (a11yPanel) {
      $$('[data-fs]', a11yPanel).forEach(function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-fs') === (a11yState.fs || 0))); });
      $$('[data-mode]', a11yPanel).forEach(function (b) { b.setAttribute('aria-pressed', String(!!a11yState[b.getAttribute('data-mode')])); });
    }
  }
  function closeA11y() { if (a11yPanel && !a11yPanel.hidden) { a11yPanel.hidden = true; a11yBtn.setAttribute('aria-expanded', 'false'); a11yBtn.focus(); } }
  applyA11y();
  if (a11yBtn && a11yPanel) {
    a11yBtn.addEventListener('click', function () { var open = a11yPanel.hidden; a11yPanel.hidden = !open; a11yBtn.setAttribute('aria-expanded', open ? 'true' : 'false'); if (open) { closeWa(); var f = $('button', a11yPanel); if (f) f.focus(); } });
    $('.a11y-close', a11yPanel).addEventListener('click', closeA11y);
    $$('[data-fs]', a11yPanel).forEach(function (b) { b.addEventListener('click', function () { a11yState.fs = +b.getAttribute('data-fs'); store.set(A11Y_KEY, a11yState); applyA11y(); }); });
    $$('[data-mode]', a11yPanel).forEach(function (b) { b.addEventListener('click', function () { var k = b.getAttribute('data-mode'); a11yState[k] = !a11yState[k]; store.set(A11Y_KEY, a11yState); applyA11y(); }); });
    $('#a11y-reset').addEventListener('click', function () { a11yState = { fs: 0 }; store.set(A11Y_KEY, a11yState); applyA11y(); });
  }

  /* ===== cookie consent (opt-in, granular) ===== */
  var C_KEY = 'menifa-consent';
  var banner = $('#cookie'), modal = $('#cookie-modal');
  var consent = store.get(C_KEY);
  if (consent && consent.v !== CONFIG.consentVersion) consent = null;
  function saveConsent(stats, mkt) {
    consent = { v: CONFIG.consentVersion, necessary: true, statistics: !!stats, marketing: !!mkt, ts: new Date().toISOString() };
    store.set(C_KEY, consent);
    if (banner) banner.hidden = true;
    if (modal) modal.hidden = true;
    loadTrackers();
  }
  function openPrefs() {
    if (!modal) return;
    $('#ck-stats').checked = !!(consent && consent.statistics);
    $('#ck-mkt').checked = !!(consent && consent.marketing);
    modal.hidden = false; $('#ck-stats').focus();
  }
  function loadScript(src) { var s = document.createElement('script'); s.async = true; s.src = src; document.head.appendChild(s); }
  function loadTrackers() {
    if (!consent) return;
    if (consent.statistics && CONFIG.ga4 && !window.__ga) {
      window.__ga = true; loadScript('https://www.googletagmanager.com/gtag/js?id=' + CONFIG.ga4);
      window.dataLayer = window.dataLayer || []; window.gtag = function () { dataLayer.push(arguments); };
      gtag('consent', 'default', { ad_storage: consent.marketing ? 'granted' : 'denied', ad_user_data: consent.marketing ? 'granted' : 'denied', ad_personalization: consent.marketing ? 'granted' : 'denied', analytics_storage: 'granted' });
      gtag('js', new Date()); gtag('config', CONFIG.ga4, { anonymize_ip: true });
    }
    if (consent.statistics && CONFIG.clarity && !window.clarity) {
      (function (c, l, a, r, i, t, y) { c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); }; t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i; y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y); })(window, document, 'clarity', 'script', CONFIG.clarity);
    }
    if (consent.marketing && CONFIG.metaPixel && !window.fbq) {
      (function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', CONFIG.metaPixel); fbq('track', 'PageView');
    }
    flushEvents();
  }
  /* ===== conversion events: one call -> GA4 + Meta Pixel (+ dataLayer), queued until consent =====
     Identity and financial detail stay on the CRM webhook. This gate is the only
     path into dataLayer / gtag / fbq, and it drops those fields before they leave. */
  var evQ = [], PIXEL_STD = { generate_lead: 'Lead', contact_whatsapp: 'Contact', contact_phone: 'Contact', schedule_call: 'Schedule' };
  var ANALYTICS_BLOCK = {
    need: 1, link_text: 1,
    name: 1, full_name: 1, first_name: 1, last_name: 1,
    phone: 1, tel: 1, mobile: 1, email: 1, mail: 1,
    note: 1, answers: 1, message: 1, comment: 1,
    income: 1, salary: 1, debt: 1, debts: 1, loan: 1, loans: 1, loan_amount: 1, amount: 1, balance: 1,
    health: 1, medical: 1,
    id_number: 1, national_id: 1, teudat_zehut: 1, tz: 1, passport: 1, zehut: 1,
    has_property: 1, loan_intent: 1, callback_window: 1
  };
  function analyticsParams(params) {
    var safe = {};
    if (!params) return safe;
    Object.keys(params).forEach(function (k) {
      if (ANALYTICS_BLOCK[String(k).toLowerCase()] || /^q\d+$/.test(String(k))) return;
      var v = params[k];
      if (v != null && typeof v === 'object') return;
      safe[k] = v;
    });
    return safe;
  }
  function sendEvent(name, params) {
    params = analyticsParams(params);
    (window.dataLayer = window.dataLayer || []).push(Object.assign({ event: name }, params));
    if (window.gtag && window.__ga) gtag('event', name, params);
    if (window.fbq) {
      var opts = params.event_id ? { eventID: params.event_id } : undefined;
      if (PIXEL_STD[name]) fbq('track', PIXEL_STD[name], params, opts); else fbq('trackCustom', name, params, opts);
    }
  }
  function flushEvents() { if (!consent || (!consent.statistics && !consent.marketing)) return; while (evQ.length) { var e = evQ.shift(); sendEvent(e[0], e[1]); } }
  window.menifaTrack = function (name, params) {
    params = analyticsParams(params);
    if (consent && (consent.statistics || consent.marketing)) sendEvent(name, params); else evQ.push([name, params]);
  };
  function cookie(n) { var m = document.cookie.match('(?:^|; )' + n + '=([^;]*)'); return m ? decodeURIComponent(m[1]) : ''; }
  /* First-touch attribution for the CRM body.
     Storage matches the retired menifa_ft_v1 script: sessionStorage, no TTL.
     That script locked the first landing for the browser session and did not
     use a 90-day localStorage window, so this does the same. Key stays
     menifa-att because the lead payload already reads it.
     Written once and never overwritten: utm_*, gclid, fbclid, landing, referrer.
     A later campaign in the same session is stored only as last_utm_*.
     The payload's utm_* keys stay first-touch so the Make field mapping holds.
     מקור_הפניה / makor_hafnia use the A24 dictionary from menifa-first-touch.js
     mapMakor (utm_source + utm_medium only). gclid, fbclid and referrer are
     stored and sent, and they do not change the channel: the old mapper
     returns לא מיוחס unless a verified UTM pair matches. These two channel
     fields are added to the CRM body at submit and are not passed to menifaTrack. */
  var ATT_KEY = 'menifa-att';
  var FT_UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  var FT_CLICK = ['gclid', 'fbclid'];
  var MAKOR_UNATTRIBUTED = 'לא מיוחס';
  function readAtt() {
    try {
      var raw = sessionStorage.getItem(ATT_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      return (parsed && typeof parsed === 'object') ? parsed : {};
    } catch (e) { return {}; }
  }
  function qpParam(qp, key) {
    var value = qp.get(key);
    return value == null ? '' : String(value).trim();
  }
  function captureAtt() {
    var qp = new URLSearchParams(location.search || '');
    var att = readAtt();
    var locked = typeof att.landing === 'string' && att.landing !== '';
    if (!locked) {
      FT_UTM.concat(FT_CLICK).forEach(function (k) { att[k] = qpParam(qp, k); });
      att.landing = location.pathname || '/';
      var host = '';
      try { host = document.referrer ? new URL(document.referrer).hostname : ''; } catch (e) { host = ''; }
      att.referrer = host || 'direct';
    }
    var hasLast = FT_UTM.some(function (k) { return qpParam(qp, k) !== ''; });
    if (hasLast) FT_UTM.forEach(function (k) { att['last_' + k] = qpParam(qp, k); });
    else if (!locked) FT_UTM.forEach(function (k) { att['last_' + k] = att[k] || ''; });
    try { sessionStorage.setItem(ATT_KEY, JSON.stringify(att)); } catch (e) {}
    return att;
  }
  function normAtt(value) { return String(value == null ? '' : value).trim().toLowerCase(); }
  function isOneOf(value, list) { return list.indexOf(value) !== -1; }
  function mapMakor(touch) {
    var source = normAtt(touch && touch.utm_source);
    var medium = normAtt(touch && touch.utm_medium);
    if (source === 'google' && medium === 'organic') return 'seo';
    if (source === 'google' && isOneOf(medium, ['cpc', 'paid', 'ppc'])) return 'google';
    if (isOneOf(source, ['facebook', 'fb', 'ig', 'instagram', 'meta']) &&
        isOneOf(medium, ['paid', 'cpc', 'social', 'paid_social'])) return 'meta';
    if (medium === 'referral' || source === 'referral') return 'referral';
    if (isOneOf(source, ['partner', 'b2b', 'affiliate'])) return 'b2b';
    return MAKOR_UNATTRIBUTED;
  }
  captureAtt();
  window.menifaIds = function () { return { event_id: 'lead_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8), fbp: cookie('_fbp'), fbc: cookie('_fbc') }; };
  // clicks: WhatsApp / phone
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
    var h = a.getAttribute('href') || '';
    if (/wa\.me\//.test(h) || a.hasAttribute('data-wa')) window.menifaTrack('contact_whatsapp', { page: location.pathname });
    else if (/^tel:/.test(h)) window.menifaTrack('contact_phone', { page: location.pathname });
  }, true);
  // first interaction with each calculator
  var usedCalc = {};
  document.addEventListener('input', function (e) {
    var box = e.target.closest && e.target.closest('[data-calc], #calc-ptax'); if (!box) return;
    var id = box.id || box.getAttribute('data-calc'); if (usedCalc[id]) return; usedCalc[id] = 1;
    window.menifaTrack('calculator_use', { calculator: id, page: location.pathname });
  }, true);
  window.MenifaConsent = { get: function () { return consent; }, open: openPrefs };
  if (banner) {
    if (!consent) banner.hidden = false; else loadTrackers();
    $('#ck-all').addEventListener('click', function () { saveConsent(true, true); });
    $('#ck-none').addEventListener('click', function () { saveConsent(false, false); });
    $('#ck-prefs').addEventListener('click', openPrefs);
  }
  if (modal) {
    $('#ck-save').addEventListener('click', function () { saveConsent($('#ck-stats').checked, $('#ck-mkt').checked); });
    $('#ck-cancel').addEventListener('click', function () { modal.hidden = true; });
  }
  $$('[data-cookie-settings]').forEach(function (b) { b.addEventListener('click', openPrefs); });

  /* ===== product fan (home) ===== */
  var PRODUCTS = window.MENIFA_PRODUCTS || [];
  var fan = $('#fan'), panel = $('#fan-panel');
  if (fan && panel && PRODUCTS.length) {
    var blades = $$('.blade', fan), sel = 4;
    var render = function () {
      var p = PRODUCTS[sel];
      blades.forEach(function (b, i) { b.setAttribute('aria-pressed', String(i === sel)); });
      $('[data-f=no]', panel).textContent = p.no;
      $('[data-f=title]', panel).textContent = p.title;
      $('[data-f=lead]', panel).textContent = p.lead;
      $('[data-f=who]', panel).textContent = p.who;
      $('[data-f=hook]', panel).textContent = p.hook;
      var ul = $('[data-f=points]', panel); ul.innerHTML = '';
      p.points.forEach(function (t) { var li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
      var cta = $('[data-f=cta]', panel); cta.textContent = 'לבדיקת ' + p.short + ' מול תמיר'; cta.href = waLink('שלום תמיר, אשמח לבדוק: ' + p.title);
      var more = $('[data-f=more]', panel); more.href = p.href; more.textContent = 'כל המידע על ' + p.title;
      panel.classList.remove('panel-in'); void panel.offsetWidth; panel.classList.add('panel-in');
    };
    blades.forEach(function (b, i) { b.addEventListener('click', function () { sel = i; render(); }); });
    $('[data-f=prev]', panel).addEventListener('click', function () { sel = (sel + PRODUCTS.length - 1) % PRODUCTS.length; render(); });
    $('[data-f=next]', panel).addEventListener('click', function () { sel = (sel + 1) % PRODUCTS.length; render(); });
    render();
  }

  /* ===== bank carousel ===== */
  $$('.banks').forEach(function (wrap) {
    var track = $('.bank-track', wrap); if (!track) return;
    var step = function () { var c = $('.bank', track); return c ? c.getBoundingClientRect().width + 20 : 260; };
    // RTL: scrollLeft goes negative; scrollBy with negative left moves "forward" (towards the end).
    var prev = $('[data-car=prev]', wrap), next = $('[data-car=next]', wrap);
    if (next) next.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: 'smooth' }); });
    if (prev) prev.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: 'smooth' }); });
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var paused = false;
    ['mouseenter', 'focusin', 'touchstart'].forEach(function (ev) { track.addEventListener(ev, function () { paused = true; }, { passive: true }); });
    ['mouseleave', 'focusout'].forEach(function (ev) { track.addEventListener(ev, function () { paused = false; }); });
    if (!reduce) setInterval(function () {
      if (paused || root.classList.contains('a11y-nomotion')) return;
      var max = track.scrollWidth - track.clientWidth;
      if (Math.abs(track.scrollLeft) >= max - 4) track.scrollTo({ left: 0, behavior: 'smooth' });
      else track.scrollBy({ left: -step(), behavior: 'smooth' });
    }, 3200);
    $$('img', track).forEach(function (img) {
      var ok = function () { img.closest('.bank').classList.add('has-logo'); };
      if (img.complete && img.naturalWidth) ok(); else img.addEventListener('load', ok);
      img.addEventListener('error', function () { img.remove(); });
    });
  });

  /* ===== calculators ===== */
  function pmt(P, annual, years) { var n = years * 12, i = annual / 100 / 12; return i === 0 ? P / n : P * i / (1 - Math.pow(1 + i, -n)); }
  function incomeTax(taxable) {
    // 2025-2027 annual brackets (frozen), approximate; credit points 2.25
    var b = [[84120, .10], [120720, .14], [193800, .20], [269280, .31], [560280, .35], [721560, .47], [Infinity, .50]];
    var tax = 0, prev = 0;
    for (var k = 0; k < b.length; k++) { var top = b[k][0]; if (taxable > prev) { tax += (Math.min(taxable, top) - prev) * b[k][1]; } prev = top; }
    return Math.max(0, tax - 2.25 * 2904);
  }
  function selfEmployedNI(annualIncome) {
    // approximate 2025-26 self-employed national insurance + health tax
    var m = annualIncome / 12, low = 7522, cap = 50695, ni = 0;
    ni += Math.min(m, low) * (0.0447 + 0.0323);
    if (m > low) ni += (Math.min(m, cap) - low) * (0.1283 + 0.0517);
    return ni * 12;
  }
  var CALCS = {
    mortgage: function (v) { var m = pmt(v.loan, v.rate, v.years); return { monthly: '₪' + fmt(m), total: '₪' + fmt(m * v.years * 12), interest: '₪' + fmt(m * v.years * 12 - v.loan) }; },
    pension: function (v) { var r = v.ret / 100 / 12, n = v.years * 12, fv = v.lump * Math.pow(1 + r, n) + (r ? v.monthly * (Math.pow(1 + r, n) - 1) / r : v.monthly * n); var dep = v.lump + v.monthly * n; return { total: '₪' + fmt(fv), deposits: '₪' + fmt(dep), profit: '₪' + fmt(fv - dep) }; },
    dti: function (v) { var pay = v.mortgage + v.loans, d = v.income ? pay / v.income * 100 : 0; var cls = d <= 30 ? ['מצוין', 'ok'] : d <= 40 ? ['סביר', 'mid'] : d <= 50 ? ['גבולי — מעל רף 40%', 'bad'] : ['מעל התקרה הרגולטורית', 'bad']; return { ratio: d.toFixed(1) + '%', total: '₪' + fmt(pay), cls: '<span class="pill ' + cls[1] + '">' + cls[0] + '</span>' }; },
    refinance: function (v) { var a = pmt(v.balance, v.cur, v.years), b = pmt(v.balance, v.next, v.years); return { monthly: '₪' + fmt(a - b), total: '₪' + fmt((a - b) * v.years * 12) }; },
    equity: function (v) { var goal = v.price * 0.25, need = goal - v.have; var yrs = need <= 0 ? 0 : need / v.save / 12; return { goal: '₪' + fmt(goal), time: need <= 0 ? 'כבר יש לכם' : yrs.toFixed(1) + ' שנים' }; },
    cpi: function (v) {
      var n = v.years * 12, i = v.rate / 100 / 12, g = Math.pow(1 + v.cpi / 100, 1 / 12) - 1, bal = v.loan, paid = 0, base = pmt(v.loan, v.rate, v.years);
      for (var k = 0; k < n; k++) { bal *= (1 + g); var p = pmt(bal, v.rate, (n - k) / 12); var intr = bal * i; paid += p; bal -= (p - intr); }
      return { total: '₪' + fmt(paid), extra: '₪' + fmt(paid - base * n) };
    },
    selfemployed: function (v) { var profit = Math.max(0, v.gross - v.exp); var ni = selfEmployedNI(profit); var taxable = Math.max(0, profit - v.pension - ni * 0.52); var tax = incomeTax(taxable); var net = profit - ni - tax - v.pension; return { annual: '₪' + fmt(net), monthly: '₪' + fmt(net / 12) }; }
  };
  $$('[data-calc]').forEach(function (box) {
    var type = box.getAttribute('data-calc'), fn = CALCS[type]; if (!fn) return;
    var run = function () {
      var v = {};
      $$('input[type=range]', box).forEach(function (inp) {
        v[inp.name] = parseFloat(inp.value);
        var out = $('output[for="' + inp.id + '"]', box);
        if (out) { var u = inp.getAttribute('data-unit') || ''; var val = parseFloat(inp.value); out.textContent = u === '₪' ? '₪' + fmt(val) : (u === '%' ? val.toFixed(2).replace(/\.?0+$/, '') + '%' : val + (u ? ' ' + u : '')); }
      });
      var r = fn(v);
      Object.keys(r).forEach(function (k) { var el = $('[data-out="' + k + '"]', box); if (el) { if (k === 'cls') el.innerHTML = r[k]; else el.textContent = r[k]; } });
    };
    $$('input', box).forEach(function (inp) { inp.addEventListener('input', run); });
    run();
  });

  /* ===== lead forms ===== */
  $$('form[data-lead]').forEach(function (form) {
    var err = $('.form-err', form), ok = form.parentNode.querySelector('.form-ok');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = {}, extra = [];
      $$('input, select, textarea', form).forEach(function (el) { if (!el.name) return; if (el.type === 'radio') { if (el.checked) data[el.name] = el.value; return; } data[el.name] = el.type === 'checkbox' ? el.checked : el.value.trim(); });
      $$('fieldset[data-q]', form).forEach(function (fs) { var c = $('input:checked', fs); if (c) extra.push($('legend', fs).textContent.trim() + ' ' + c.value); });
      if (!data.name || data.name.length < 2) { err.textContent = 'נא למלא שם מלא.'; $('[name=name]', form).focus(); return; }
      if (!/^0?5\d[-\s]?\d{3}[-\s]?\d{4}$/.test((data.phone || '').replace(/\s/g, '')) && !/^\+?972/.test(data.phone || '')) { err.textContent = 'נא למלא מספר נייד תקין, לדוגמה 050-1234567.'; $('[name=phone]', form).focus(); return; }
      if (!data.consent) { err.textContent = 'כדי שתמיר יוכל לחזור אליכם יש לאשר את מדיניות הפרטיות.'; $('[name=consent]', form).focus(); return; }
      err.textContent = '';
      data.page = location.pathname; data.source = form.getAttribute('data-lead'); data.ts = new Date().toISOString();
      var ids = window.menifaIds ? window.menifaIds() : {}; data.event_id = ids.event_id; data.fbp = ids.fbp; data.fbc = ids.fbc;
      var att = readAtt();
      Object.keys(att).forEach(function (k) { data[k] = att[k]; });
      var makor = mapMakor(att);
      data['מקור_הפניה'] = makor;
      data.makor_hafnia = makor;
      var leadEvent = { form: data.source, page: data.page, event_id: data.event_id, currency: 'ILS', value: 1 };
      var msg = 'שלום תמיר, השארתי פרטים באתר מניפה.\nשם: ' + data.name + '\nטלפון: ' + data.phone + (data.need ? '\nנושא: ' + data.need : '') + (data.when ? '\nמתי נוח: ' + data.when : '') + (extra.length ? '\n' + extra.join('\n') : '') + (data.note ? '\nהערה: ' + data.note : '');
      data.answers = extra;
      var finish = function (sent) {
        form.hidden = true;
        if (ok) {
          ok.classList.add('show');
          $('[data-f=okmsg]', ok).textContent = sent ? 'הפרטים התקבלו. תמיר יחזור אליכם בהקדם, בשעות הפעילות.' : 'עוד צעד אחד: לחצו על הכפתור כדי לשלוח את הפרטים לתמיר בוואטסאפ.';
          var a = $('[data-f=wa]', ok); a.href = waLink(msg); a.textContent = sent ? 'רוצים מענה מהיר יותר? כתבו בוואטסאפ' : 'שליחת הפרטים בוואטסאפ';
          ok.focus();
        }
      };
      if (CONFIG.leadWebhook) {
        // Simple form-urlencoded POST (no custom headers, so no CORS preflight).
        // Make Gateway returns Access-Control-Allow-Origin: * on the webhook
        // response (community.make.com/t/how-to-get-custom-headers-in-webhook-response/35367,
        // Chrome response headers, X-Powered-By: Make Gateway/production). CORS mode
        // can therefore read res.ok. generate_lead fires only then, with the same
        // event_id already placed on the CRM body. A failed or unreadable response
        // falls back to WhatsApp and is not retried in no-cors (that would duplicate the lead).
        var body = new URLSearchParams();
        Object.keys(data).forEach(function (k) { var v = data[k]; body.append(k, Array.isArray(v) ? v.join(' | ') : (v === true ? 'כן' : v === false ? 'לא' : String(v == null ? '' : v))); });
        var done = false, t = setTimeout(function () { if (!done) { done = true; finish(false); } }, 6000);
        fetch(CONFIG.leadWebhook, { method: 'POST', mode: 'cors', keepalive: true, body: body })
          .then(function (res) {
            if (done) return;
            done = true; clearTimeout(t);
            if (res && res.ok) {
              if (window.menifaTrack) window.menifaTrack('generate_lead', leadEvent);
              finish(true);
            } else finish(false);
          }, function () { if (!done) { done = true; clearTimeout(t); finish(false); } });
      } else finish(false);
    });
  });

  /* ===== palette switcher (preview) ===== */
  (function () {
    var KEY = 'menifa-palette', valid = ['privatebank', 'maison', 'atelier', 'emerald', 'navy', 'onyx', 'bordeaux', 'petrol', 'sapphire', 'ivory', 'white', 'royal', 'sand'], light = ['ivory', 'white', 'royal', 'sand', 'atelier'], sig = ['privatebank', 'maison', 'atelier'];
    var fromHash = (location.hash || '').replace('#palette-', '');
    var cur = 'privatebank'; // נבחר סופית: Private Bank
    var apply = function (k) { root.classList.toggle('light', light.indexOf(k) > -1); if (k === 'emerald') root.removeAttribute('data-palette'); else root.setAttribute('data-palette', k); $$('[data-pal]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-pal') === k)); }); };
    apply(cur);
    var FXKEY = 'menifa-fx';
    var fx = 'refined';
    var applyFx = function (f) { root.classList.toggle('fx-refined', f === 'refined'); $$('[data-fx]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-fx') === f)); }); window.dispatchEvent(new Event('menifa-fx')); };
    applyFx(fx);
    $$('[data-pal]').forEach(function (b) { b.addEventListener('click', function () { cur = b.getAttribute('data-pal'); store.set(KEY, cur); apply(cur); if (sig.indexOf(cur) > -1 && !store.get(FXKEY)) applyFx('refined'); }); });
    $$('[data-fx]').forEach(function (b) { b.addEventListener('click', function () { fx = b.getAttribute('data-fx'); store.set(FXKEY, fx); applyFx(fx); }); });
    var mn = $('[data-pal-min]'), pal = $('#pal');
    if (mn && pal) mn.addEventListener('click', function () { var m = pal.classList.toggle('min'); mn.textContent = m ? 'שילובי צבעים' : 'הסתרה'; });
  })();

  /* ===== refined effects: reveal, count-up, fan tilt ===== */
  (function () {
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var targets = $$('.sec-head, .card, .svc, .panel, .prose > h2');
    targets.forEach(function (el) { el.classList.add('rv'); });
    if (!('IntersectionObserver' in window) || reduce) { targets.forEach(function (el) { el.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
    targets.forEach(function (el) { io.observe(el); });
    // count-up for testimonial savings (only in refined mode, starts when visible)
    var counted = false;
    var cio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting || !root.classList.contains('fx-refined')) return;
        cio.unobserve(e.target);
        var el = e.target, m = el.textContent.match(/(\D*)(\d+)(\D*)/); if (!m) return;
        var end = +m[2], t0 = null;
        var step = function (t) { if (!t0) t0 = t; var k = Math.min(1, (t - t0) / 1300); var v = Math.round(end * (1 - Math.pow(1 - k, 3))); el.textContent = m[1] + v + m[3]; if (k < 1) requestAnimationFrame(step); };
        requestAnimationFrame(step);
      });
    }, { threshold: .6 });
    $$('.testi .save').forEach(function (el) { cio.observe(el); });
    // gentle 3D tilt of the fan following the cursor
    var fan = $('#fan');
    if (fan) {
      var hero = fan.closest('section');
      hero.addEventListener('mousemove', function (e) {
        if (!root.classList.contains('fx-refined') || root.classList.contains('a11y-nomotion')) return;
        var r = hero.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        fan.style.transform = 'perspective(900px) rotateY(' + (x * 8).toFixed(2) + 'deg) rotateX(' + (-y * 6).toFixed(2) + 'deg)';
      });
      hero.addEventListener('mouseleave', function () { fan.style.transform = ''; });
    }
  })();

  var y = $('[data-year]'); if (y) y.textContent = new Date().getFullYear();

  /* yearly average rates -> calculator */
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.yr[data-rate]'); if (!b) return;
    var inp = document.getElementById(b.getAttribute('data-target')); if (!inp) return;
    inp.value = b.getAttribute('data-rate'); inp.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelectorAll('.yr.on').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on');
    var rc = document.querySelector('#calc .result-card'); if (rc && rc.getBoundingClientRect().top < 0) rc.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  /* ===== navigation: always land at the top of a new page, smooth in-page anchors, instant-feel prefetch ===== */
  (function () {
    try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (e) {}
    var head = function () { var h = document.querySelector('.site-head'); return h ? h.getBoundingClientRect().height : 0; };
    function toTop() {
      var html = document.documentElement, prev = html.style.scrollBehavior;
      html.style.scrollBehavior = 'auto';
      window.scrollTo(0, 0);
      // also scrolls an outer container when the page is embedded (e.g. preview frame)
      try { (document.querySelector('.ticker') || document.body).scrollIntoView({ block: 'start', behavior: 'instant' }); } catch (e) {}
      html.style.scrollBehavior = prev;
    }
    function toHash(hash) {
      var el = hash && hash.length > 1 && document.getElementById(decodeURIComponent(hash.slice(1)));
      if (!el) return false;
      var y = el.getBoundingClientRect().top + window.pageYOffset - 12;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' }); return true;
    }
    function land() { if (!toHash(location.hash)) toTop(); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', land); else land();
    window.addEventListener('pageshow', function (e) { if (e.persisted) land(); });
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a) return;
      var h = a.getAttribute('href'); if (h.length < 2) return;
      if (toHash(h)) { e.preventDefault(); try { history.pushState(null, '', h); } catch (er) {} }
    });
    // prefetch internal pages on hover / touch so the click opens instantly
    var done = {};
    function pf(e) {
      var a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
      var u; try { u = new URL(a.href, location.href); } catch (er) { return; }
      if (u.origin !== location.origin || u.pathname === location.pathname || done[u.pathname] || !/\.html?$|\/$/.test(u.pathname)) return;
      done[u.pathname] = 1; var l = document.createElement('link'); l.rel = 'prefetch'; l.href = u.href; document.head.appendChild(l);
    }
    document.addEventListener('pointerover', pf, { passive: true });
    document.addEventListener('touchstart', pf, { passive: true });
  })();

  /* ===== smart purchase-tax calculator (מס רכישה) ===== */
  (function () {
    var box = document.getElementById('calc-ptax'); if (!box) return;
    var C; try { C = JSON.parse(box.getAttribute('data-ptax')); } catch (e) { return; }
    var q = function (s) { return box.querySelector(s); };
    var N = function (n) { return Math.round(n).toLocaleString('en-US'); };
    var S = function (n) { return '₪' + N(n); };
    var pct = function (r) { return (Math.round(r * 100) / 100).toString().replace(/\.0+$/, '') + '%'; };
    var dstr = function (d) { return ('0' + d.getDate()).slice(-2) + '.' + ('0' + (d.getMonth() + 1)).slice(-2) + '.' + d.getFullYear(); };
    var addD = function (d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; };
    var addM = function (d, n) { var x = new Date(d); x.setMonth(x.getMonth() + n); return x; };
    var LBL = { single: 'דירה יחידה', upgrade: 'משפרי דיור', additional: 'דירה נוספת', oleh: 'עולה חדש' };
    var price = q('#pt-price'), rng = q('#pt-price-r'), date = q('#pt-date'), hand = q('#pt-hand'), handL = q('.pt-hand-l');
    var two = q('#pt-two'), twoBox = q('.pt-two-box'), share = q('#pt-share'), third = q('#pt-third');
    var today = new Date(); date.value = today.toISOString().slice(0, 10);
    function brk(t) { return t === 'additional' ? C.additional : t === 'oleh' ? C.oleh : C.single; }
    function calc(p, t) {
      var rows = [], prev = 0, tax = 0, marg = 0;
      brk(t).forEach(function (b) {
        var top = b[0] == null ? Infinity : b[0], part = Math.max(0, Math.min(p, top) - prev), tx = part * b[1] / 100;
        rows.push({ from: prev, to: top, rate: b[1], part: part, tax: tx }); if (part > 0) marg = b[1]; tax += tx; prev = top;
      });
      return { tax: tax, rows: rows, marg: marg };
    }
    function val(name) { var r = box.querySelector('input[name="' + name + '"]:checked'); return r ? r.value : ''; }
    function eff(t) { return (third.checked && (t === 'additional' || t === 'upgrade')) ? 'single' : t; }
    function run() {
      var p = Math.max(0, parseInt(String(price.value).replace(/[^\d]/g, ''), 10) || 0);
      var t0 = val('pt-type'), deal = val('pt-deal'), t = eff(t0);
      handL.hidden = deal !== 'new';
      twoBox.hidden = !two.checked;
      var sh = two.checked ? parseInt(share.value, 10) / 100 : 1;
      q('output[for="pt-share"]').textContent = Math.round(sh * 100) + '%';
      var A = calc(p, t), tax = A.tax * sh, rowsHtml = '';
      A.rows.forEach(function (r) {
        var lab = r.to === Infinity ? 'מעל ' + N(r.from) : (r.from ? N(r.from) + ' עד ' : 'עד ') + N(r.to);
        rowsHtml += '<tr class="' + (r.part > 0 ? (r.tax > 0 ? 'hit' : '') : 'off') + '"><td>' + lab + '</td><td>' + pct(r.rate) + '</td><td>' + (r.part ? S(r.part * sh) : '—') + '</td><td>' + (r.part ? S(r.tax * sh) : '—') + '</td></tr>';
      });
      var B = null, t2 = '';
      if (two.checked) {
        t2 = val('pt-type2'); B = calc(p, t2 === 'upgrade' ? 'single' : t2);
        var b = B.tax * (1 - sh); tax += b;
        rowsHtml += '<tr class="hit"><td colspan="3">רוכש שני (' + Math.round((1 - sh) * 100) + '%, ' + LBL[t2] + ')</td><td>' + S(b) + '</td></tr>';
      }
      rowsHtml += '</tbody><tfoot><tr><td colspan="3">סה״כ מס רכישה</td><td>' + S(tax) + '</td></tr></tfoot><tbody>';
      q('[data-pt="rows"]').innerHTML = rowsHtml;
      q('[data-pt="tax"]').textContent = S(tax); q('[data-pt="tax2"]').textContent = S(tax);
      q('[data-pt="eff"]').textContent = p ? (tax / p * 100).toFixed(2) + '%' : '—';
      q('[data-pt="marg"]').textContent = pct(A.marg);
      // comparison
      var cmp = '';
      if (t === 'single' || t === 'oleh') {
        var add = calc(p, 'additional').tax * sh + (B ? B.tax * (1 - sh) : 0);
        cmp = 'לעומת רוכש <b>דירה נוספת</b>: ' + S(add) + '. המעמד שלכם חוסך <b>' + S(add - tax) + '</b>.';
        if (t === 'oleh') { var reg = calc(p, 'single').tax * sh + (B ? B.tax * (1 - sh) : 0); if (reg > tax) cmp += ' ולעומת מדרגות רגילות של דירה יחידה: חיסכון של <b>' + S(reg - tax) + '</b>.'; }
        if (t0 !== t) cmp += ' (חושב כדירה יחידה, כי חלק של עד שליש בדירה אחרת לא נספר.)';
      }
      if (t0 === 'upgrade' && t === 'single' && !third.checked) {
        var addU = calc(p, 'additional').tax * sh + (B ? B.tax * (1 - sh) : 0);
        cmp = 'בתנאי שהדירה הקודמת תימכר בזמן. אם לא, המס יעלה ל-' + S(addU) + ', כלומר <b>' + S(addU - tax) + ' יותר</b>, ועוד הצמדה וריבית.';
      }
      if (t === 'additional') {
        var sg = calc(p, 'single').tax * sh + (B ? B.tax * (1 - sh) : 0);
        cmp = 'אילו זו הייתה <b>דירה יחידה</b>, למשל אם הדירה הקיימת נמכרת במסגרת שדרוג דיור: ' + S(sg) + '. ההפרש: <b>' + S(tax - sg) + '</b>.';
      }
      q('[data-pt="cmp"]').innerHTML = cmp;
      // cash
      var ltv = C.ltv[t0 === 'upgrade' ? 'upgrade' : t] || 75, eq = p * (1 - ltv / 100);
      q('[data-pt="eq"]').textContent = S(eq);
      q('[data-pt="eqn"]').textContent = 'מימון עד ' + ltv + '% (' + (t0 === 'upgrade' ? 'משפר דיור' : t === 'additional' ? 'דירה נוספת' : 'דירה יחידה') + ', לפי בנק ישראל)';
      q('[data-pt="cash"]').textContent = S(eq + tax);
      // dates
      var d = date.value ? new Date(date.value) : today, dl = '';
      dl += '<li>דיווח העסקה לרשות המסים: עד <b>' + dstr(addD(d, 30)) + '</b> (30 יום)</li>';
      dl += '<li>תשלום מס הרכישה: עד <b>' + dstr(addD(d, 60)) + '</b> (60 יום). איחור גורר הצמדה וקנסות.</li>';
      if (t0 === 'upgrade' && !third.checked) {
        if (deal === 'used') dl += '<li class="warn">מכירת הדירה הקודמת: עד <b>' + dstr(addM(d, C.sell_months_used)) + '</b> (' + C.sell_months_used + ' חודשים מהרכישה)</li>';
        else dl += '<li class="warn">מכירת הדירה הקודמת: עד ' + (hand.value ? '<b>' + dstr(addM(new Date(hand.value), C.sell_months_new)) + '</b>' : C.sell_months_new + ' חודשים ממסירת הדירה החדשה') + ' (' + C.sell_months_new + ' חודשים מהמסירה)</li>';
      }
      if (t === 'oleh') dl += '<li>ההטבה לעולים חלה על רכישה בתוך 7 שנים מיום העלייה.</li>';
      q('[data-pt="dates"]').innerHTML = dl;
      // tips
      var tips = [], F = C.single[0][0], F2 = C.single[1][0];
      if ((t === 'single' || t === 'oleh') && p > F && p - F <= 200000) {
        var save = calc(p, t).tax - calc(F, t).tax;
        tips.push('המחיר עובר את תקרת הפטור (' + S(F) + ') ב-<b>' + S(p - F) + '</b>. הורדה של הסכום הזה במו״מ חוסכת <b>' + S(save * sh) + '</b> מס, מעבר להנחה עצמה.');
      }
      if (t === 'single' && p > F2 && p - F2 <= 150000) tips.push('עברתם את המדרגה של 5% ב-<b>' + S(p - F2) + '</b>. כל שקל מעל ' + S(F2) + ' ממוסה ב-5% במקום 3.5%.');
      if (tax > 0) tips.push('<b>מיטלטלין</b> (מטבח, מזגנים, ריהוט) שנמכרים עם הדירה אפשר לפרט בחוזה בנפרד, בשווי אמיתי ומתועד. הם לא חייבים במס רכישה, ורשות המסים בודקת שהשווי סביר.');
      if (deal === 'new') tips.push('בדירה מקבלן מס הרכישה מחושב על המחיר <b>כולל מע״מ</b>. שדרוגים ותוספות שנכנסים לחוזה מגדילים את המס.');
      if (t0 === 'upgrade' && !third.checked) tips.push('לא בטוחים שתמכרו בזמן? <b>הלוואת גישור</b> ותכנון נכון של המשכנתא נותנים מרווח. זה נבנה מראש, לא אחרי שהמועד עובר.');
      if (t === 'additional') tips.push('בני זוג נחשבים <b>יחידה אחת</b>. גם אם הדירה הקיימת רשומה רק על שם אחד מכם, הרכישה המשותפת היא דירה נוספת.');
      if (t === 'additional' && !third.checked) tips.push('יש לכם בדירה הקיימת חלק של <b>עד שליש</b>? סמנו את האפשרות. במקרה כזה הדירה לא נספרת והמס יורד משמעותית.');
      if (two.checked) tips.push('ברכישה של הורה וילד, כל אחד ממוסה לפי המצב שלו. <b>חלוקת הבעלות</b> משנה את המס. הזיזו את הסרגל וראו כמה.');
      if (t === 'oleh') tips.push('שירות צבאי לא נספר בתוך 7 השנים. כדאי לבקש אישור זכאות לפני החתימה.');
      q('[data-pt="tips"]').innerHTML = tips.slice(0, 4).map(function (x) { return '<li>' + x + '</li>'; }).join('');
    }
    price.addEventListener('input', function () {
      var raw = price.value.replace(/[^\d]/g, '').slice(0, 9), n = parseInt(raw, 10) || 0;
      price.value = raw ? N(n) : ''; rng.value = Math.min(Math.max(n, +rng.min), +rng.max); run();
    });
    price.addEventListener('focus', function () { price.select(); });
    rng.addEventListener('input', function () { price.value = N(+rng.value); run(); });
    box.addEventListener('change', run);
    share.addEventListener('input', run);
    run();
  })();
})();
