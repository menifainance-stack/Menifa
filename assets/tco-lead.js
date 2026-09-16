/* Instant Form — דף עלות כוללת (משכנתא + ביטוח)
   Webhook: אותו תרחיש Make כמו lead-capture.js.
   שמות שדות לפי מיפוי SmartNPV 2026-09-15:
   full_name, phone, has_property, loan_intent, callback_window,
   landing_page, offer_code, utm_*, note. */
(function () {
  'use strict';

  var ENDPOINT = 'https://hook.us2.make.com/u3ru1sllh8ansej9ievnjyr2kici7942';
  var MIN_FILL_MS = 3000;
  var WA_PREFILL = 'שלום, אשמח לשיחת בדיקת עלות כוללת (משכנתא+ביטוח)';
  var THANK_YOU = 'תודה! קיבלנו את הפרטים. נחזור אליכם בהקדם לתיאום שיחת בדיקת עלות כוללת (משכנתא + ביטוח).';
  var ATTR_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid'];

  function makeLeadUuid() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      var v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function readAttribution() {
    if (window.MenifaAttribution && typeof window.MenifaAttribution.get === 'function') {
      return window.MenifaAttribution.get();
    }
    var out = {};
    ATTR_KEYS.forEach(function (k) {
      var v = qs(k);
      if (v) out[k] = v;
    });
    out.landing_page_path = location.pathname || '/';
    out.session_source = out.utm_source || '';
    out.session_medium = out.utm_medium || '';
    out.session_campaign = out.utm_campaign || '';
    return out;
  }

  function pushFormSubmitSuccess(formId, leadUuid, attr) {
    window.dataLayer = window.dataLayer || [];
    var payload = {
      event: 'form_submit_success',
      form_id: formId,
      page_path: location.pathname,
      landing_page_path: (attr && attr.landing_page_path) || location.pathname,
      session_source: (attr && (attr.session_source || attr.utm_source)) || '',
      session_medium: (attr && (attr.session_medium || attr.utm_medium)) || '',
      session_campaign: (attr && (attr.session_campaign || attr.utm_campaign)) || '',
      lead_uuid: leadUuid
    };
    window.dataLayer.push(payload);
  }

  function qs(name) {
    try { return new URLSearchParams(location.search).get(name) || ''; }
    catch (e) { return ''; }
  }

  function normalizePhone(raw) {
    var d = String(raw).replace(/[^\d+]/g, '');
    if (d.indexOf('+972') === 0) d = '0' + d.slice(4);
    else if (d.indexOf('972') === 0 && d.length >= 12) d = '0' + d.slice(3);
    d = d.replace(/\D/g, '');
    return /^05\d{8}$/.test(d) ? d : null;
  }

  function waUrl(text) {
    return 'https://wa.me/972524502821?text=' + encodeURIComponent(text);
  }

  function fillUtm(form) {
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (k) {
      var el = form.querySelector('[name="' + k + '"]');
      if (el && !el.value) el.value = qs(k);
    });
    var camp = form.querySelector('[name="utm_campaign"]');
    if (camp && !camp.value) camp.value = 'alut_bituach';
  }

  function showThanks(form) {
    var done = document.createElement('div');
    done.className = 'lead-form__done';
    done.setAttribute('role', 'status');
    done.innerHTML =
      '<div class="lead-form__done-icon" aria-hidden="true">' +
      '<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">' +
      '<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg></div>' +
      '<h4>תודה! קיבלנו את הפרטים</h4>' +
      '<p>' + THANK_YOU + '</p>' +
      '<p class="lead-form__alt" style="margin-top:1rem">' +
      '<a class="btn btn-primary" href="' + waUrl(WA_PREFILL) + '" target="_blank" rel="noopener">וואטסאפ — לתיאום שיחה</a></p>';
    form.replaceChildren(done);
  }

  function init() {
    var form = document.getElementById('tco-form');
    if (!form) return;
    fillUtm(form);
    var waAlt = form.querySelector('[data-wa-alt]');
    if (waAlt) waAlt.href = waUrl(WA_PREFILL);

    var touched = 0;
    ['focusin', 'input', 'change'].forEach(function (evt) {
      form.addEventListener(evt, function () { if (!touched) touched = Date.now(); });
    });

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var status = form.querySelector('[data-form-status]');
      if (status) status.textContent = '';

      var hasProperty = (form.elements.has_property && form.elements.has_property.value) || '';
      var intent = (form.elements.loan_intent && form.elements.loan_intent.value) || '';
      var windowWhen = (form.elements.callback_window && form.elements.callback_window.value) || '';
      var fullName = ((form.elements.full_name && form.elements.full_name.value) || '').trim();
      var phone = normalizePhone(form.elements.phone && form.elements.phone.value);
      var consent = form.elements.consent && form.elements.consent.checked;
      var hp = form.elements.website && form.elements.website.value;

      function mark(el, msg) {
        if (!el) return;
        var err = el.parentElement && el.parentElement.querySelector('.lead-form__error');
        if (err) err.textContent = msg || '';
        el.setAttribute('aria-invalid', msg ? 'true' : 'false');
      }

      var ok = true;
      mark(form.elements.has_property, hasProperty ? '' : 'נא לבחור');
      if (!hasProperty) ok = false;
      mark(form.elements.loan_intent, intent ? '' : 'נא לבחור');
      if (!intent) ok = false;
      mark(form.elements.callback_window, windowWhen ? '' : 'נא לבחור');
      if (!windowWhen) ok = false;
      mark(form.elements.full_name, fullName.length >= 2 ? '' : 'נא למלא שם מלא');
      if (fullName.length < 2) ok = false;
      mark(form.elements.phone, phone ? '' : 'מספר נייד ישראלי, למשל 052-4502821');
      if (!phone) ok = false;
      if (!ok) return;

      if (!consent) {
        if (status) status.textContent = 'צריך לאשר את יצירת הקשר כדי שנוכל לחזור אליכם.';
        if (form.elements.consent) form.elements.consent.focus();
        return;
      }

      var offerCode = 'alut|bituach';
      var note = 'ליד מדף עלות כוללת | צורך: ' + intent +
        ' | חזרה: ' + windowWhen +
        ' | נכס: ' + hasProperty +
        ' | קוד: alut|bituach' +
        ' | owner=עינב | בעלים: עינב';

      var attr = readAttribution();
      var formId = form.getAttribute('data-form-id') || 'pillar_alut_mashkanta';
      var leadUuid = makeLeadUuid();
      var payload = {
        full_name: fullName,
        phone: phone,
        has_property: hasProperty,
        loan_intent: intent,
        callback_window: windowWhen,
        landing_page: 'alut-bituach',
        landing_page_path: attr.landing_page_path || location.pathname,
        offer_code: offerCode,
        note: note,
        owner: 'עינב',
        form_id: formId,
        lead_uuid: leadUuid,
        utm_source: attr.utm_source || qs('utm_source'),
        utm_medium: attr.utm_medium || qs('utm_medium'),
        utm_campaign: attr.utm_campaign || qs('utm_campaign') || 'alut_bituach',
        utm_content: attr.utm_content || qs('utm_content'),
        utm_term: attr.utm_term || qs('utm_term'),
        ts: new Date().toISOString()
      };
      ['gclid', 'fbclid'].forEach(function (k) {
        if (attr[k]) payload[k] = attr[k];
      });

      var waFallback = waUrl(
        'עלות\n' + WA_PREFILL +
        '\nשם: ' + fullName +
        '\nטלפון: ' + phone +
        '\nנכס: ' + hasProperty +
        '\nצורך: ' + intent +
        '\nחזרה: ' + windowWhen
      );

      if (hp || !touched || Date.now() - touched < MIN_FILL_MS) {
        showThanks(form);
        return;
      }

      var submit = form.querySelector('[type="submit"]');
      if (submit) { submit.disabled = true; submit.textContent = 'שולח…'; }

      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        pushFormSubmitSuccess(formId, leadUuid, attr);
        showThanks(form);
      }).catch(function () {
        if (submit) { submit.disabled = false; submit.textContent = 'קביעת שיחת בדיקה'; }
        if (status) status.textContent = 'השליחה נכשלה. אפשר לנסות שוב, או לפנות ישירות בוואטסאפ.';
        window.open(waFallback, '_blank', 'noopener');
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
