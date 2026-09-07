/* ═══════════════════════════════════════════════════════════════
   Lead Capture — מניפה פיננסית
   ───────────────────────────────────────────────────────────────
   עד היום כל CTA באתר הוביל לטלפון או לוואטסאפ. מי שלא היה מוכן
   להתקשר באותו רגע — נעלם. המודול הזה תופס את הליד ברגע השיא:
   מיד אחרי שהמחשבון הראה לו כמה כסף הוא מפסיד.

   הלידים נשלחים ל-webhook הקיים "מניפה — לידים מדפי הנחיתה",
   שמזרים אותם לטלגרם ולגיליון Google Sheets.

   דורש: assets/script.js (עבור monthlyPayment ו-fmt) ו-lead-capture.css
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var ENDPOINT = 'https://hook.us2.make.com/u3ru1sllh8ansej9ievnjyr2kici7942';

  // בוטים ממלאים טופס מיידית. אדם צריך כמה שניות.
  var MIN_FILL_MS = 3000;

  var prefix = location.pathname.indexOf('/blog/') !== -1 ? '../' : '';

  /* ── עזרי פורמט: מגיעים מ-script.js. אם הוא לא נטען, נעצור בשקט
        במקום לשכפל כאן את הנוסחה הפיננסית ולתת לשתי הגרסאות להיפרד. ── */
  function hasDeps() {
    return typeof monthlyPayment === 'function' && typeof fmt === 'function';
  }

  /* ── נרמול טלפון ישראלי ──
     מקבל 052-4502821 / 0524502821 / +972524502821 / 972-52-450-2821
     ומחזיר 0524502821, או null אם זה לא נייד ישראלי תקין. */
  function normalizePhone(raw) {
    var d = String(raw).replace(/[^\d+]/g, '');
    if (d.indexOf('+972') === 0) d = '0' + d.slice(4);
    else if (d.indexOf('972') === 0 && d.length >= 12) d = '0' + d.slice(3);
    d = d.replace(/\D/g, '');
    return /^05\d{8}$/.test(d) ? d : null;
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  var seq = 0;

  /**
   * בונה טופס לכידה.
   * @param {Object} cfg
   * @param {string} cfg.title    כותרת הטופס
   * @param {string} cfg.sub      שורת הסבר
   * @param {string} cfg.cta      טקסט הכפתור
   * @param {string} cfg.page     מזהה המקור שנשלח ל-CRM
   * @param {Function} cfg.snapshot  מחזיר {amount, note} — המספרים של המשתמש
   * @returns {HTMLFormElement}
   */
  function buildForm(cfg) {
    var uid = 'lf' + (++seq);
    var form = el('form', 'lead-form');
    form.noValidate = true;
    form.setAttribute('aria-labelledby', uid + '-title');

    var head = el('div', 'lead-form__head');
    var title = el('p', 'lead-form__title', cfg.title);
    title.id = uid + '-title';
    head.appendChild(title);
    head.appendChild(el('p', 'lead-form__sub', cfg.sub));
    form.appendChild(head);

    var row = el('div', 'lead-form__row');

    function field(name, type, labelText, autocomplete, placeholder) {
      var wrap = el('div', 'lead-form__field');
      var id = uid + '-' + name;
      var lab = el('label', null, labelText);
      lab.htmlFor = id;
      var inp = document.createElement('input');
      inp.type = type;
      inp.id = id;
      inp.name = name;
      inp.autocomplete = autocomplete;
      inp.placeholder = placeholder;
      inp.required = true;
      inp.setAttribute('aria-describedby', id + '-err');
      var err = el('span', 'lead-form__error');
      err.id = id + '-err';
      wrap.appendChild(lab);
      wrap.appendChild(inp);
      wrap.appendChild(err);
      row.appendChild(wrap);
      return { input: inp, error: err };
    }

    var fName = field('name', 'text', 'שם', 'name', 'איך לפנות אליכם?');
    var fPhone = field('phone', 'tel', 'טלפון נייד', 'tel', '05X-XXXXXXX');
    fPhone.input.inputMode = 'tel';
    form.appendChild(row);

    // שדה דבש
    var hp = el('div', 'lead-form__hp');
    hp.setAttribute('aria-hidden', 'true');
    var hpInput = document.createElement('input');
    hpInput.type = 'text';
    hpInput.name = 'website';
    hpInput.tabIndex = -1;
    hpInput.autocomplete = 'off';
    hp.appendChild(hpInput);
    form.appendChild(hp);

    // הסכמה
    var consent = el('label', 'lead-form__consent');
    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.required = true;
    consent.appendChild(cb);
    var cText = el('span');
    cText.appendChild(document.createTextNode('אני מאשר/ת שתמיר גרמה יחזור אליי בטלפון או בוואטסאפ בנוגע לפנייה. '));
    var pLink = el('a', null, 'מדיניות הפרטיות');
    pLink.href = prefix + 'privacy.html';
    pLink.target = '_blank';
    pLink.rel = 'noopener';
    cText.appendChild(pLink);
    consent.appendChild(cText);
    form.appendChild(consent);

    var submit = el('button', 'lead-form__submit', cfg.cta);
    submit.type = 'submit';
    form.appendChild(submit);

    var status = el('p', 'lead-form__error');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.style.textAlign = 'center';
    status.style.marginTop = '0.5rem';
    form.appendChild(status);

    var alt = el('p', 'lead-form__alt');
    alt.appendChild(document.createTextNode('מעדיפים ישר לדבר? '));
    var wa = el('a', null, 'וואטסאפ');
    wa.href = 'https://wa.me/972524502821';
    wa.target = '_blank';
    wa.rel = 'noopener';
    alt.appendChild(wa);
    alt.appendChild(document.createTextNode(' · '));
    var tel = el('a', null, '052-4502821');
    tel.href = 'tel:052-4502821';
    alt.appendChild(tel);
    form.appendChild(alt);

    // מודדים כמה זמן לקח *למלא* את הטופס, לא כמה זמן הדף פתוח.
    // עוגן בזמן הבנייה היה חסר ערך: מי שגלל דקה עד לטופס עובר אותו ממילא.
    var touched = 0;
    ['focusin', 'input'].forEach(function (evt) {
      form.addEventListener(evt, function () {
        if (!touched) touched = Date.now();
      });
    });

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      status.textContent = '';

      var name = fName.input.value.trim();
      var phone = normalizePhone(fPhone.input.value);
      var ok = true;

      function mark(f, message) {
        f.error.textContent = message;
        f.input.setAttribute('aria-invalid', message ? 'true' : 'false');
        if (message && ok) { f.input.focus(); ok = false; }
      }

      mark(fName, name.length >= 2 ? '' : 'נא למלא שם');
      mark(fPhone, phone ? '' : 'מספר נייד ישראלי, למשל 052-4502821');
      if (!ok) return;

      if (!cb.checked) {
        status.textContent = 'צריך לאשר את יצירת הקשר כדי שנוכל לחזור אליכם.';
        cb.focus();
        return;
      }

      // בוט: מילא את שדה הדבש, או שלח בלי לגעת בשדות, או מילא הכל
      // מהר מדי. מציגים "הצלחה" ולא שולחים — בוט שרואה שגיאה מנסה שוב.
      if (hpInput.value || !touched || Date.now() - touched < MIN_FILL_MS) {
        showDone(form, cfg);
        return;
      }

      var snap = cfg.snapshot ? cfg.snapshot() : { amount: '', note: '' };

      submit.disabled = true;
      submit.textContent = 'שולח…';

      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page: cfg.page,
          name: name,
          phone: phone,
          amount: snap.amount,
          note: snap.note,
          ts: new Date().toISOString()
        })
      }).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        showDone(form, cfg);
      }).catch(function () {
        submit.disabled = false;
        submit.textContent = cfg.cta;
        status.textContent = 'השליחה נכשלה. אפשר לנסות שוב, או לפנות ישירות בוואטסאפ למטה.';
      });
    });

    return form;
  }

  function showDone(form, cfg) {
    var done = el('div', 'lead-form__done');
    var icon = el('div', 'lead-form__done-icon');
    icon.innerHTML = '<svg width="24" height="24" fill="none" stroke="currentColor" ' +
      'stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true">' +
      '<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>';
    done.appendChild(icon);
    done.appendChild(el('h4', null, 'קיבלתי. חוזר אליכם.'));
    done.appendChild(el('p', null,
      'תמיר יחזור אליכם עם בדיקת הכדאיות המלאה — בדרך כלל תוך שעות ספורות ' +
      'בשעות הפעילות. אם זה דחוף, הוואטסאפ תמיד פתוח: 052-4502821.'));
    form.replaceChildren(done);
    done.setAttribute('role', 'status');
    if (cfg && cfg.onDone) cfg.onDone();
  }

  /* ═══ 1. הצמדת טפסים למחשבונים בדף calculators.html ═══
     כל מחשבון מגדיר מאיפה לקרוא את המספרים שהמשתמש הרכיב.
     ה-snapshot נקרא ברגע השליחה, כך שהוא תמיד משקף את המסך. */
  var CALCS = {
    'calc-mortgage': {
      title: 'רוצים את הריבית הזו בפועל?',
      sub: 'המספר למעלה הוא תיאורטי. השאירו פרטים ואבדוק מול הבנקים מה באמת אפשר להשיג לכם.',
      cta: 'בדקו לי מול הבנקים',
      page: 'מחשבון משכנתא',
      read: { amount: 'm1-loan', out: 'm1-out', total: 'm1-total' },
      note: function (v) {
        return 'הלוואה ' + fmt(v['m1-loan']) + ' · ריבית ' + v['m1-rate'] + '%' +
               ' · ' + v['m1-years'] + ' שנה · החזר חודשי ' + v.out;
      },
      inputs: ['m1-loan', 'm1-rate', 'm1-years']
    },
    'calc-refinance': {
      title: 'החיסכון הזה לא קורה לבד',
      sub: 'השאירו פרטים ואשלח לכם בדיקת כדאיות מחזור מלאה — כולל עמלת פירעון מוקדם והאם זה באמת משתלם לכם.',
      cta: 'שלחו לי בדיקת כדאיות',
      page: 'מחשבון מיחזור משכנתא',
      read: { amount: 'm4-balance', out: 'm4-out', total: 'm4-total' },
      note: function (v) {
        return 'יתרה ' + fmt(v['m4-balance']) + ' · ריבית ' + v['m4-cur-rate'] +
               '% ← ' + v['m4-new-rate'] + '% · ' + v['m4-years'] + ' שנים · ' +
               'חיסכון חודשי ' + v.out + ' · סה"כ ' + v.total;
      },
      inputs: ['m4-balance', 'm4-cur-rate', 'm4-new-rate', 'm4-years']
    },
    'calc-dti': {
      title: 'יחס ההחזר שלכם מול מה שהבנק יאשר',
      sub: 'המספר למעלה הוא חישוב. מה הבנק בפועל יאשר תלוי בעוד כמה דברים — אשמח לעבור עליהם איתכם.',
      cta: 'בדקו לי את יחס ההחזר',
      page: 'מחשבון יחס החזר DTI',
      read: { amount: 'm3-income', out: 'm3-out' },
      note: function (v) { return 'יחס החזר מחושב: ' + v.out; },
      inputs: []
    }
  };

  function attachToCalculators() {
    Object.keys(CALCS).forEach(function (panelId) {
      var panel = document.getElementById(panelId);
      if (!panel) return;
      var cfg = CALCS[panelId];

      // מוודאים שכל המזהים שהתצורה מסתמכת עליהם קיימים בדף.
      var required = (cfg.inputs || []).concat([cfg.read.amount, cfg.read.out]);
      var missing = required.filter(function (id) { return !document.getElementById(id); });
      if (missing.length) return;

      var ctaBox = panel.querySelector('.calc-cta');
      if (!ctaBox) return;

      var form = buildForm({
        title: cfg.title,
        sub: cfg.sub,
        cta: cfg.cta,
        page: cfg.page,
        snapshot: function () {
          var v = {};
          required.forEach(function (id) {
            var node = document.getElementById(id);
            v[id] = node.tagName === 'INPUT' ? +node.value : node.textContent.trim();
          });
          // המחשבונים מציגים "₪301 / חודש". ה-note כבר אומר "חודשי",
          // אז מסירים את הסיומת כדי שלא ייצא "חיסכון חודשי ₪301 / חודש".
          v.out = document.getElementById(cfg.read.out).textContent
            .trim().replace(/\s*\/\s*חודש$/, '');
          v.total = cfg.read.total
            ? document.getElementById(cfg.read.total).textContent.trim() : '';
          return { amount: v[cfg.read.amount], note: cfg.note(v) };
        }
      });

      ctaBox.replaceChildren(form);
    });
  }

  /* ═══ 2. ווידג'ט בדיקת כדאיות בדף המדריך ═══
     דף הפילר הוא הדף עם תנועת החיפוש הגבוהה ביותר, ועד היום
     לא היה בו שום מנגנון המרה. הווידג'ט נשתל בסעיף המחזור. */
  function buildFeasibilityWidget() {
    var mount = document.getElementById('feasibility-widget');
    if (!mount) return;

    var FIELDS = [
      { id: 'balance', label: 'יתרת החוב שלכם', min: 100000, max: 3000000, step: 50000, value: 900000, format: fmt },
      { id: 'cur', label: 'הריבית שאתם משלמים היום', min: 2, max: 9, step: 0.1, value: 5.5, format: function (n) { return n.toFixed(1) + '%'; } },
      { id: 'years', label: 'שנים שנותרו', min: 3, max: 30, step: 1, value: 20, format: function (n) { return n + ' שנה'; } }
    ];

    // הריבית ההשוואתית: ממוצע קל"צ + מרווח שמרני, בהתאם למחשבון הראשי.
    var TARGET_RATE = 4.9;

    var box = el('div', 'feas');
    box.appendChild(el('h3', 'feas__title', 'כמה אתם משלמים לבנק יותר מדי?'));
    box.appendChild(el('p', 'feas__desc',
      'שלושה מספרים, ותדעו אם יש לכם מה למחזר. ההשוואה מול ריבית של ' +
      TARGET_RATE.toFixed(1) + '% — ממוצע קל"צ בשוק בתוספת מרווח שמרני.'));

    var inputsBox = el('div', 'feas__inputs');
    var refs = {};
    FIELDS.forEach(function (f) {
      var wrap = el('div', 'feas__input');
      var lab = el('label');
      lab.htmlFor = 'feas-' + f.id;
      lab.appendChild(el('span', null, f.label));
      var valSpan = el('span', 'val', f.format(f.value));
      lab.appendChild(valSpan);
      var inp = document.createElement('input');
      inp.type = 'range';
      inp.id = 'feas-' + f.id;
      inp.min = f.min; inp.max = f.max; inp.step = f.step; inp.value = f.value;
      wrap.appendChild(lab);
      wrap.appendChild(inp);
      inputsBox.appendChild(wrap);
      refs[f.id] = { input: inp, val: valSpan, format: f.format };
    });
    box.appendChild(inputsBox);

    var out = el('div', 'feas__out');
    out.appendChild(el('div', 'feas__out-label', 'חיסכון חודשי משוער'));
    var outVal = el('div', 'feas__out-val', '₪0');
    out.appendChild(outVal);
    var outSub = el('div', 'feas__out-sub');
    out.appendChild(outSub);
    box.appendChild(out);

    var state = { monthly: 0, total: 0 };

    function recompute() {
      var bal = +refs.balance.input.value;
      var cur = +refs.cur.input.value;
      var years = +refs.years.input.value;

      FIELDS.forEach(function (f) {
        refs[f.id].val.textContent = refs[f.id].format(+refs[f.id].input.value);
      });

      state.monthly = Math.max(0, monthlyPayment(bal, cur, years) - monthlyPayment(bal, TARGET_RATE, years));
      state.total = state.monthly * years * 12;

      outVal.textContent = fmt(state.monthly);
      outSub.replaceChildren();
      if (state.monthly < 50) {
        outSub.appendChild(document.createTextNode(
          'הריבית שלכם כבר קרובה לשוק. מחזור כנראה לא ישתלם — וזו גם תשובה.'));
      } else {
        outSub.appendChild(document.createTextNode('לאורך התקופה: '));
        var strong = el('strong', null, fmt(state.total));
        outSub.appendChild(strong);
      }
    }

    FIELDS.forEach(function (f) {
      refs[f.id].input.addEventListener('input', recompute);
    });
    recompute();

    box.appendChild(buildForm({
      title: 'רוצים לדעת אם זה באמת משתלם לכם?',
      sub: 'המספר למעלה מתעלם מעמלת פירעון מוקדם ומהתמהיל הספציפי שלכם. ' +
           'השאירו פרטים ואשלח בדיקת כדאיות אמיתית — כולל המקרים שבהם עדיף לא למחזר.',
      cta: 'שלחו לי בדיקת כדאיות',
      page: 'מדריך משכנתא — בדיקת כדאיות מחזור',
      snapshot: function () {
        return {
          amount: +refs.balance.input.value,
          note: 'יתרה ' + fmt(+refs.balance.input.value) +
                ' · ריבית נוכחית ' + (+refs.cur.input.value).toFixed(1) + '%' +
                ' · ' + refs.years.input.value + ' שנים' +
                ' · חיסכון חודשי משוער ' + fmt(state.monthly) +
                ' · סה"כ ' + fmt(state.total)
        };
      }
    }));

    box.appendChild(el('p', 'feas__note',
      'החישוב הוא הערכה בלבד ואינו מהווה ייעוץ. הוא מניח מחזור מלא של היתרה ' +
      'לאותה תקופה, ואינו כולל עמלת פירעון מוקדם, עלויות פתיחת תיק או הצמדה למדד.'));

    mount.replaceChildren(box);
  }

  function init() {
    if (!hasDeps()) return;
    attachToCalculators();
    buildFeasibilityWidget();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
