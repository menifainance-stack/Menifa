/* Paid LP lead form — /lp/
   Same Make webhook as lead-capture.js.
   Required field names: page, name, phone, amount, note, ts.
   UTM rides as hidden inputs + extra payload keys + note suffix.
   No coordinator names. WhatsApp prefill = mortgage consult (not «עלות»). */
(function () {
  'use strict';

  var ENDPOINT = 'https://hook.us2.make.com/u3ru1sllh8ansej9ievnjyr2kici7942';
  var MIN_FILL_MS = 3000;
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

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
    UTM_KEYS.forEach(function (k) {
      var el = form.querySelector('[name="' + k + '"]');
      if (el && !el.value) el.value = qs(k);
    });
    var camp = form.querySelector('[name="utm_campaign"]');
    var fallback = form.getAttribute('data-utm-campaign') || '';
    if (camp && !camp.value && fallback) camp.value = fallback;
  }

  function utmBlob(form) {
    return UTM_KEYS.map(function (k) {
      var el = form.querySelector('[name="' + k + '"]');
      var v = (el && el.value) || qs(k) || '';
      return v ? (k + '=' + v) : '';
    }).filter(Boolean).join(' | ');
  }

  function showDone(form, prefill) {
    var done = document.createElement('div');
    done.className = 'lead-form__done';
    done.setAttribute('role', 'status');
    done.innerHTML =
      '<div class="lead-form__done-icon" aria-hidden="true">' +
      '<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">' +
      '<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg></div>' +
      '<h4>תודה! קיבלנו את הפרטים</h4>' +
      '<p>נחזור אליכם בהקדם לתיאום. ייעוץ ראשון חינם.</p>' +
      '<p class="lead-form__alt" style="margin-top:1rem">' +
      '<a class="btn btn-primary" href="' + waUrl(prefill) + '" target="_blank" rel="noopener">וואטסאפ — לתיאום שיחה</a></p>';
    form.replaceChildren(done);
  }

  function bindWa(root, prefill) {
    if (!root || !prefill) return;
    root.querySelectorAll('[data-wa]').forEach(function (a) {
      a.href = waUrl(prefill);
    });
  }

  function initForm(form) {
    var page = form.getAttribute('data-page') || 'lp';
    var prefill = form.getAttribute('data-wa-prefill') || 'שלום, אשמח לתיאום שיחת ייעוץ משכנתא';
    var noteBase = form.getAttribute('data-note') || 'ליד מדף נחיתה ממומן';
    fillUtm(form);
    bindWa(form, prefill);
    bindWa(document, prefill);

    var touched = 0;
    ['focusin', 'input', 'change'].forEach(function (evt) {
      form.addEventListener(evt, function () { if (!touched) touched = Date.now(); });
    });

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var status = form.querySelector('[data-form-status]');
      if (status) status.textContent = '';

      var name = ((form.elements.name && form.elements.name.value) || '').trim();
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
      mark(form.elements.name, name.length >= 2 ? '' : 'נא למלא שם');
      if (name.length < 2) ok = false;
      mark(form.elements.phone, phone ? '' : 'מספר נייד ישראלי, למשל 052-4502821');
      if (!phone) ok = false;
      if (!ok) return;
      if (!consent) {
        if (status) status.textContent = 'צריך לאשר את יצירת הקשר כדי שנוכל לחזור אליכם.';
        if (form.elements.consent) form.elements.consent.focus();
        return;
      }

      var utm = utmBlob(form);
      var note = noteBase;
      if (utm) note += ' | ' + utm;

      var payload = {
        page: page,
        name: name,
        phone: phone,
        amount: '',
        note: note,
        ts: new Date().toISOString(),
        utm_source: qs('utm_source') || (form.elements.utm_source && form.elements.utm_source.value) || '',
        utm_medium: qs('utm_medium') || (form.elements.utm_medium && form.elements.utm_medium.value) || '',
        utm_campaign: (form.elements.utm_campaign && form.elements.utm_campaign.value) || qs('utm_campaign') || '',
        utm_content: qs('utm_content') || (form.elements.utm_content && form.elements.utm_content.value) || '',
        utm_term: qs('utm_term') || (form.elements.utm_term && form.elements.utm_term.value) || ''
      };

      if (hp || !touched || Date.now() - touched < MIN_FILL_MS) {
        showDone(form, prefill);
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
        showDone(form, prefill);
      }).catch(function () {
        if (submit) { submit.disabled = false; submit.textContent = 'נחזור אליכם בהקדם לתיאום'; }
        if (status) status.textContent = 'השליחה נכשלה. אפשר לנסות שוב, או לפנות ישירות בוואטסאפ.';
        window.open(waUrl(prefill + '\nשם: ' + name + '\nטלפון: ' + phone), '_blank', 'noopener');
      });
    });
  }

  function init() {
    var form = document.getElementById('lp-form');
    if (!form) {
      var fallback = document.body && document.body.getAttribute('data-wa-prefill');
      if (fallback) bindWa(document, fallback);
      return;
    }
    initForm(form);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
