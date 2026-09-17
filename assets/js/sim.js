/* מניפה · איחוד הלוואות simulator · illustration only */
(function () {
  'use strict';

  const WA_BASE = 'https://wa.me/972524502821';
  const WA_PREFILL = encodeURIComponent('שלום, אשמח לתיאום שיחה');

  const els = {
    panelInputs: document.getElementById('panel-inputs'),
    panelResult: document.getElementById('panel-result'),
    leadBlock: document.getElementById('lead-block'),
    formOk: document.getElementById('form-ok'),
    leadForm: document.getElementById('lead-form'),
    btnCalc: document.getElementById('btn-calc'),
    btnBack: document.getElementById('btn-back'),
    stepsBar: document.getElementById('steps-bar'),
    outMonthly: document.getElementById('out-monthly'),
    outRelief: document.getElementById('out-relief'),
    outCompare: document.getElementById('out-compare'),
    totalBal: document.getElementById('total-bal'),
    totalBalRange: document.getElementById('total-bal-range'),
    monthlyNow: document.getElementById('monthly-now'),
    monthlyNowRange: document.getElementById('monthly-now-range'),
    avgRate: document.getElementById('avg-rate'),
    avgRateRange: document.getElementById('avg-rate-range'),
    yearsWant: document.getElementById('years-want'),
    yearsWantRange: document.getElementById('years-want-range'),
  };

  function fmtILS(n) {
    const v = Math.round(n);
    return '₪' + v.toLocaleString('he-IL');
  }

  function syncRangeFill(range) {
    const min = Number(range.min) || 0;
    const max = Number(range.max) || 100;
    const val = Number(range.value) || 0;
    const pct = ((val - min) / (max - min)) * 100;
    range.style.setProperty('--pct', pct + '%');
  }

  function bindPair(num, range, opts) {
    const clamp = (v) => {
      let x = Number(String(v).replace(/[^\d.]/g, ''));
      if (Number.isNaN(x)) x = Number(range.value);
      if (opts && opts.int) x = Math.round(x);
      x = Math.min(Number(range.max), Math.max(Number(range.min), x));
      return x;
    };
    const push = (fromRange) => {
      const v = clamp(fromRange ? range.value : num.value);
      num.value = opts && opts.rate ? String(v) : String(Math.round(v));
      range.value = String(v);
      syncRangeFill(range);
      updateStepDots();
    };
    num.addEventListener('input', () => push(false));
    num.addEventListener('change', () => push(false));
    range.addEventListener('input', () => push(true));
    push(true);
  }

  function updateStepDots() {
    const filled = [
      Number(els.totalBal.value) > 0,
      Number(els.monthlyNow.value) > 0,
      Number(els.avgRate.value) > 0,
      Number(els.yearsWant.value) > 0,
    ];
    const dots = els.stepsBar.querySelectorAll('.step-dot');
    dots.forEach((d, i) => {
      d.classList.toggle('done', filled[i]);
      d.classList.toggle('on', filled[i] && (i === 0 || filled[i - 1]));
    });
  }

  /** Standard amortization payment */
  function pmt(principal, annualRatePct, years) {
    const r = (annualRatePct / 100) / 12;
    const n = years * 12;
    if (n <= 0) return 0;
    if (r <= 0) return principal / n;
    return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }

  /**
   * Illustration-only estimate.
   * Suggests a modest rate improvement band — NEVER a guaranteed saving.
   * Returns suggested monthly RANGE and possible monthly relief RANGE.
   */
  function estimate() {
    const balance = Number(els.totalBal.value) || 0;
    const currentMonthly = Number(els.monthlyNow.value) || 0;
    const avgRate = Number(els.avgRate.value) || 0;
    const years = Number(els.yearsWant.value) || 1;

    // Conservative illustration: assume possible consolidated rate
    // roughly 0.8–1.8pp below stated average (bounded), not a promise.
    const rateLow = Math.max(3.5, avgRate - 1.8);
    const rateHigh = Math.max(rateLow + 0.4, avgRate - 0.6);

    const payLow = pmt(balance, rateLow, years);
    const payHigh = pmt(balance, rateHigh, years);

    // Suggested new monthly shown as mid of band, relief as range vs current
    const suggestedMid = (payLow + payHigh) / 2;
    let reliefLow = currentMonthly - payHigh;
    let reliefHigh = currentMonthly - payLow;

    // If "relief" would be negative, show possible change band honestly
    if (reliefHigh < 0) {
      reliefLow = currentMonthly - payHigh;
      reliefHigh = currentMonthly - payLow;
    }

    return {
      suggestedLow: Math.min(payLow, payHigh),
      suggestedHigh: Math.max(payLow, payHigh),
      suggestedMid,
      reliefLow: Math.min(reliefLow, reliefHigh),
      reliefHigh: Math.max(reliefLow, reliefHigh),
      currentMonthly,
      years,
    };
  }

  function showResult() {
    const e = estimate();
    els.outMonthly.textContent =
      fmtILS(e.suggestedLow) + ' – ' + fmtILS(e.suggestedHigh);
    const rLo = e.reliefLow;
    const rHi = e.reliefHigh;
    if (rHi <= 0) {
      els.outRelief.textContent = 'תלוי בתנאים';
      els.outCompare.textContent =
        'ההמחשה לא מצביעה על הקלה חודשית ברורה במספרים שהוזנו — כדאי לבדוק יחד בשיחה.';
    } else {
      const lo = Math.max(0, rLo);
      els.outRelief.textContent = fmtILS(lo) + ' – ' + fmtILS(rHi);
      els.outCompare.textContent =
        'מול החזר נוכחי של ' +
        fmtILS(e.currentMonthly) +
        ' · לתקופה משוערת של ' +
        e.years +
        ' שנים';
    }
    els.panelResult.classList.add('show');
    els.leadBlock.classList.add('show');
    els.panelResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function buildWaUrl(name, phone) {
    let msg = 'שלום, אשמח לתיאום שיחה';
    if (name) msg += '\nשם: ' + name;
    if (phone) msg += '\nטלפון: ' + phone;
    msg +=
      '\n(הגעתי מסימולטור איחוד הלוואות — המחשה בלבד)';
    return WA_BASE + '?text=' + encodeURIComponent(msg);
  }

  // Wire inputs
  bindPair(els.totalBal, els.totalBalRange, { int: true });
  bindPair(els.monthlyNow, els.monthlyNowRange, { int: true });
  bindPair(els.avgRate, els.avgRateRange, { rate: true });
  bindPair(els.yearsWant, els.yearsWantRange, { int: true });

  els.btnCalc.addEventListener('click', function (ev) {
    ev.preventDefault();
    showResult();
  });

  if (els.btnBack) {
    els.btnBack.addEventListener('click', function (ev) {
      ev.preventDefault();
      els.panelResult.classList.remove('show');
      els.leadBlock.classList.remove('show');
    });
  }

  if (els.leadForm) {
    els.leadForm.addEventListener('submit', function (ev) {
      ev.preventDefault();
      const name = (document.getElementById('lead-name') || {}).value || '';
      const phone = (document.getElementById('lead-phone') || {}).value || '';
      const consent = document.getElementById('lead-consent');
      if (consent && !consent.checked) {
        consent.focus();
        return;
      }
      const url = buildWaUrl(name.trim(), phone.trim());
      els.leadForm.style.display = 'none';
      els.formOk.classList.add('show');
      const waLink = document.getElementById('ok-wa');
      if (waLink) waLink.href = url;
      window.open(url, '_blank', 'noopener,noreferrer');
    });
  }

  // Header / fab already have static WA links; keep prefill consistent
  document.querySelectorAll('[data-wa]').forEach(function (a) {
    a.href = WA_BASE + '?text=' + WA_PREFILL;
  });
})();
