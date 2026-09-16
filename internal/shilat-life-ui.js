(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  function ils(n) {
    if (n === null || n === undefined || !isFinite(n)) return '—';
    return '₪' + Number(n).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function rate(n) {
    if (n === null || n === undefined || !isFinite(n)) return '—';
    return Number(n).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  }

  function sexLabel(sex) {
    return sex === 'male' ? 'גבר' : sex === 'female' ? 'אישה' : '—';
  }

  function readForm() {
    var smokerEl = document.querySelector('input[name="smoker"]:checked');
    var sexEl = document.querySelector('input[name="sex"]:checked');
    var diabetesEl = $('diabetes');
    var medical = $('medical_loading_pct').value.trim();
    var occupational = $('occupational_loading_pct').value.trim();
    var company = $('company').value.trim();
    var agreement = $('agreement_code').value;
    var letter = $('discount_year_letter').value;
    var ageRaw = $('age').value.trim();
    var birthDate = $('birth_date').value || null;
    var asOf = ShilatLifeCalc.parseIsoDate($('as_of_date').value || '2026-09-16');
    var parsedBirth = ShilatLifeCalc.parseIsoDate(birthDate);
    if (parsedBirth && asOf && ageRaw !== '') {
      var computedAge = ShilatLifeCalc.floorAgeFromDates(parsedBirth, asOf);
      if (Number(ageRaw) !== computedAge) birthDate = null;
    }
    return {
      birth_date: birthDate,
      age: ageRaw === '' ? null : Number(ageRaw),
      sex: sexEl ? sexEl.value : null,
      smoker: smokerEl ? smokerEl.value === 'true' : null,
      cover_amount: Number($('cover_amount').value),
      agreement_code: agreement === '' ? null : Number(agreement),
      discount_year_letter: letter === '' ? null : letter,
      company: company === '' ? null : company,
      product: 'risk1',
      medical_loading_pct: medical === '' ? null : Number(medical),
      occupational_loading_pct: occupational === '' ? null : Number(occupational),
      payment_frequency: 'monthly',
      as_of_date: $('as_of_date').value || '2026-09-16',
      rate_source: $('rate_source').value,
      cover_type: $('cover_type').value,
      diabetes: !!(diabetesEl && diabetesEl.checked),
      height_cm: $('height_cm').value.trim() === '' ? null : Number($('height_cm').value),
      weight_kg: $('weight_kg').value.trim() === '' ? null : Number($('weight_kg').value),
    };
  }

  function syncAgeFromDob() {
    var birth = ShilatLifeCalc.parseIsoDate($('birth_date').value);
    var asOf = ShilatLifeCalc.parseIsoDate($('as_of_date').value || '2026-09-16');
    if (!birth || !asOf) return;
    $('age').value = String(ShilatLifeCalc.floorAgeFromDates(birth, asOf));
  }

  function fillAgreements() {
    var select = $('agreement_code');
    SHILAT_LIFE_DATA.agreements.forEach(function (row) {
      var opt = document.createElement('option');
      opt.value = String(row.agreement_code);
      var tag = row.is_special_until_67 ? 'מיוחד עד 67' : 'קוד קודם עד 60';
      opt.textContent =
        row.agreement_code +
        ' · מינ׳ ' +
        row.min_cover_ils.toLocaleString('he-IL') +
        ' ₪ · גיל ' +
        row.age_min +
        '–' +
        row.age_max +
        ' · ' +
        tag;
      select.appendChild(opt);
    });
    select.value = '3705';
  }

  function render(out) {
    var box = $('calc-output');
    if (!out.ok) {
      box.innerHTML =
        '<div class="shilat-error" role="alert"><strong>' +
        escapeHtml(out.error || 'שגיאה') +
        '</strong><br>' +
        escapeHtml(out.message || '') +
        '</div>';
      return;
    }

    var methodLabel =
      out.method === 'official_risk1_with_agreement_discount'
        ? 'תעריף ריסק 1 + הנחת הסכם'
        : out.method === 'empirical_median_fallback'
          ? 'fallback אמפירי — אין תא רשמי'
          : 'תעריף ריסק 1 הרשמי';

    var warnHtml = (out.eligibility_warnings || [])
      .map(function (w) { return '<div class="shilat-warn" role="status">' + escapeHtml(w) + '</div>'; })
      .join('');

    var loadingNote = out.method_flags && out.method_flags.manual_loading
      ? '<div class="shilat-note">הוחלה תוספת ידנית (רפואית/מקצועית). לא מתוך עלון החיתום.</div>'
      : '';

    var discountRow = out.discount_pct === null
      ? '<div class="shilat-row"><span>הנחת הסכם</span><span>לא הוחלה</span></div>'
      : '<div class="shilat-row"><span>הנחה קוד ' +
        escapeHtml(String(out.agreement_code)) +
        ' · אות הנחה ' +
        escapeHtml(out.discount_year_letter) +
        '</span><span>' +
        out.discount_pct +
        '%</span></div>';

    var flagsHtml = (out.underwriting_flags || [])
      .map(function (f) {
        return '<li><span class="src">' + escapeHtml(f.source) + '</span>' + escapeHtml(f.text) + '</li>';
      })
      .join('');

    box.innerHTML =
      '<div class="shilat-hero">' +
      '<div class="lbl">פרמיה חודשית משוערת אחרי הנחה</div>' +
      '<div class="amt" id="monthly-after">' + ils(out.monthly_premium_est) + '</div>' +
      '<div class="sub">שנתי אחרי הנחה: <span id="annual-after">' + ils(out.annual_premium_est) + '</span></div>' +
      '<span class="shilat-method">' + escapeHtml(methodLabel) + ' · תוקף תעריף ' + escapeHtml(out.tariff_as_of) + '</span>' +
      '</div>' +
      '<div class="shilat-compare">' +
      '<div><div class="k">לפני הנחה · חודשי</div><div class="v" id="monthly-before">' + ils(out.monthly_premium_before_discount) + '</div></div>' +
      '<div class="after"><div class="k">אחרי הנחה · חודשי</div><div class="v">' + ils(out.monthly_premium_est) + '</div></div>' +
      '<div><div class="k">לפני הנחה · שנתי</div><div class="v" id="annual-before">' + ils(out.annual_premium_before_discount) + '</div></div>' +
      '<div class="after"><div class="k">אחרי הנחה · שנתי</div><div class="v">' + ils(out.annual_premium_est) + '</div></div>' +
      '</div>' +
      '<div class="shilat-rows">' +
      '<div class="shilat-row"><span>גיל לחישוב</span><span id="age-used">' + out.age_used + '</span></div>' +
      '<div class="shilat-row"><span>מין / עישון</span><span>' + sexLabel(out.sex_used) + ' · ' + (out.smoker_used ? 'מעשן/ת' : 'לא מעשן/ת') + '</span></div>' +
      '<div class="shilat-row"><span>סכום כיסוי</span><span>' + ils(out.cover_amount) + '</span></div>' +
      '<div class="shilat-row"><span>שיעור בסיס (₪ שנתי ל־1,000)</span><span id="base-rate">' + rate(out.base_rate_annual_per_1000) + '</span></div>' +
      discountRow +
      '<div class="shilat-row"><span>שיעור נטו אחרי הנחה</span><span id="net-rate">' + rate(out.net_rate_annual_per_1000) + '</span></div>' +
      '<div class="shilat-row"><span>חברה בתעריפון</span><span>' + (out.company || 'לא מודפס במקור — ריק') + '</span></div>' +
      '<div class="shilat-row"><span>מוצר</span><span>תעריף ריסק 1</span></div>' +
      '<div class="shilat-row"><span>דמי פוליסה / סליקה / עמלות</span><span>לא במקורות — לא חושבו</span></div>' +
      '</div>' +
      '<div class="shilat-note">אות הנחה א–ו מוצגת כפי שנבחרה בטבלה. אין מקרא במקור — לא הומצאה משמעות.</div>' +
      warnHtml +
      loadingNote +
      '<details class="shilat-more"><summary>דגלי חיתום / מסמכים — לא חלק מהפרמיה</summary>' +
      '<ul class="shilat-flags">' + flagsHtml + '</ul>' +
      '<p class="hint" style="margin-top:.6rem">מקורות הדגלים: עלון חיתום 2026 (כלל) ודגשי הפניקס. אין לקשור אותם אוטומטית לתעריף ריסק 1.</p>' +
      '</details>' +
      '<details class="shilat-more"><summary>שדות UNKNOWN במקורות</summary>' +
      '<p class="shilat-unknown">' + escapeHtml((out.unknown_fields || []).join(' · ')) +
      '. משמעות אותיות א–ו אינה מופיעה במקרא. שם החברה בתעריף ריסק 1 ובטבלת המכונות לא מודפס במפורש.</p>' +
      '</details>';
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function recalc() {
    render(ShilatLifeCalc.compute(readForm(), SHILAT_LIFE_DATA));
  }

  document.addEventListener('DOMContentLoaded', function () {
    fillAgreements();
    syncAgeFromDob();
    ['birth_date', 'as_of_date'].forEach(function (id) {
      $(id).addEventListener('change', function () {
        syncAgeFromDob();
        recalc();
      });
    });
    $('shilat-form').addEventListener('input', recalc);
    $('shilat-form').addEventListener('change', recalc);
    recalc();
  });
})();
