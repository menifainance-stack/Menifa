/* MENIFA v2 — hero calculator · counters · scroll reveals
   Vanilla, no deps. Every animation respects prefers-reduced-motion. */
(() => {
  'use strict';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const fmt = new Intl.NumberFormat('he-IL');
  const easeOut = t => 1 - Math.pow(1 - t, 4);

  /* ── generic count-up: from current text → target ── */
  function countTo(el, target, dur = 1400, suffix = '') {
    const from = parseInt((el.dataset.from ?? el.textContent).replace(/\D/g, ''), 10) || 0;
    if (RM || dur === 0) { el.textContent = fmt.format(target) + suffix; return; }
    const t0 = performance.now();
    let done = false;
    const step = now => {
      if (done) return;
      const p = Math.min(1, (now - t0) / dur);
      el.textContent = fmt.format(Math.round(from + (target - from) * easeOut(p))) + suffix;
      if (p < 1) requestAnimationFrame(step); else done = true;
    };
    requestAnimationFrame(step);
    // rAF pauses in background tabs — guarantee the final value lands regardless
    setTimeout(() => { if (!done) { done = true; el.textContent = fmt.format(target) + suffix; } }, dur + 150);
  }

  /* ── hero calculator ──
     Model: typical gap between a bank's opening offer and the rate reached after
     parallel negotiation across 3–4 banks. Base rate tracks prime (4.75 today)
     plus the spread a bank quotes on an un-negotiated blended mix. */
  const BASE = 5.10, NEGOTIATED = 4.30;
  const pmt = (P, r, y) => { r = r / 100 / 12; const n = y * 12; return P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1); };

  const amt = $('#hv2-amt'), yrs = $('#hv2-yrs');
  const amtOut = $('#hv2-amt-out'), yrsOut = $('#hv2-yrs-out');
  const big = $('#hv2-big'), sub = $('#hv2-sub');
  let last = 0, bumpT;

  function paintRange(inp) {
    const p = (inp.value - inp.min) / (inp.max - inp.min) * 100;
    inp.style.setProperty('--p', p + '%');
  }
  function recalc(animate = true) {
    const P = +amt.value, Y = +yrs.value;
    amtOut.textContent = '₪' + fmt.format(P);
    yrsOut.textContent = Y + ' שנה';
    paintRange(amt); paintRange(yrs);
    const diffMo = pmt(P, BASE, Y) - pmt(P, NEGOTIATED, Y);
    const total = Math.round(diffMo * Y * 12 / 100) * 100;
    big.dataset.from = last;
    countTo(big, total, animate ? 700 : 0);
    sub.innerHTML = `<b>₪${fmt.format(Math.round(diffMo))}</b> פחות בכל חודש · לאורך ${Y} שנים`;
    if (animate && !RM) { big.classList.remove('bump'); void big.offsetWidth; big.classList.add('bump'); }
    last = total;
  }
  if (amt && yrs) {
    amt.addEventListener('input', () => recalc(true));
    yrs.addEventListener('input', () => recalc(true));
    // first paint: settle sliders, then let the number climb from 0
    paintRange(amt); paintRange(yrs);
    amtOut.textContent = '₪' + fmt.format(+amt.value);
    yrsOut.textContent = yrs.value + ' שנה';
    setTimeout(() => recalc(true), 650);
  }

  /* ── hero headline stat (180,000) ── */
  const heroStat = $('#hv2-stat-num');
  if (heroStat) setTimeout(() => countTo(heroStat, +heroStat.dataset.target, 1600), 400);

  /* ── scroll reveals: ledger rows stagger, photo lifts, counters fire once ── */
  const targets = document.querySelectorAll('.ledger-row, .tamir-photo, [data-count]');
  if (!('IntersectionObserver' in window)) {
    // ancient browser: show everything, set final numbers, no motion
    targets.forEach(el => { el.classList.add('in'); if (el.dataset.count) el.textContent = fmt.format(+el.dataset.count) + (el.dataset.suffix || ''); });
    return;
  }
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      if (el.classList.contains('ledger-row')) {
        const i = [...el.parentElement.querySelectorAll('.ledger-row')].indexOf(el);
        setTimeout(() => el.classList.add('in'), RM ? 0 : i * 110);
      } else if (el.classList.contains('tamir-photo')) {
        el.classList.add('in');
      } else if (el.dataset.count) {
        countTo(el, +el.dataset.count, 1300, el.dataset.suffix || '');
      }
      io.unobserve(el);
    });
  }, { threshold: 0.25, rootMargin: '0px 0px -8% 0px' });

  document.querySelectorAll('.ledger-row, .tamir-photo, [data-count]').forEach(el => io.observe(el));
})();
