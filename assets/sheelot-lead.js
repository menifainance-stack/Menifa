/* Lead form — 8 השאלות לדירה ראשונה
   Same Make webhook as lead-capture.js. Field names: page, name, phone, amount, note, ts.
   Optional email rides in note. Public copy: no coordinator names. */
(function () {
  'use strict';

  var ENDPOINT = 'https://hook.us2.make.com/u3ru1sllh8ansej9ievnjyr2kici7942';
  var MIN_FILL_MS = 3000;
  var WA_PREFILL = 'שלום, אשמח לתיאום שיחה — 8 השאלות לדירה ראשונה';

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

  function showDone(form) {
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
      '<a class="btn btn-primary" href="' + waUrl(WA_PREFILL) + '" target="_blank" rel="noopener">וואטסאפ — לתיאום שיחה</a></p>';
    form.replaceChildren(done);
  }

  function init() {
    var form = document.getElementById('sheelot-form');
    if (!form) return;
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

      var name = ((form.elements.name && form.elements.name.value) || '').trim();
      var phone = normalizePhone(form.elements.phone && form.elements.phone.value);
      var email = ((form.elements.email && form.elements.email.value) || '').trim();
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
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        mark(form.elements.email, 'אימייל לא תקין — אפשר להשאיר ריק');
        ok = false;
      } else {
        mark(form.elements.email, '');
      }
      if (!ok) return;
      if (!consent) {
        if (status) status.textContent = 'צריך לאשר את יצירת הקשר כדי שנוכל לחזור אליכם.';
        if (form.elements.consent) form.elements.consent.focus();
        return;
      }

      var note = 'ליד מגנט 8 שאלות דירה ראשונה';
      if (email) note += ' | אימייל: ' + email;

      var payload = {
        page: '8-sheelot-dira-rishona',
        name: name,
        phone: phone,
        amount: '',
        note: note,
        ts: new Date().toISOString()
      };

      if (hp || !touched || Date.now() - touched < MIN_FILL_MS) {
        showDone(form);
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
        showDone(form);
      }).catch(function () {
        if (submit) { submit.disabled = false; submit.textContent = 'נחזור אליכם בהקדם לתיאום'; }
        if (status) status.textContent = 'השליחה נכשלה. אפשר לנסות שוב, או לפנות ישירות בוואטסאפ.';
        window.open(waUrl(WA_PREFILL + '\nשם: ' + name + '\nטלפון: ' + phone), '_blank', 'noopener');
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
