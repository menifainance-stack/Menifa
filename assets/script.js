/* ═══════════════════════════════════════════════════════════════
   UTILS
   ═══════════════════════════════════════════════════════════════ */
const fmt = n => '₪' + Math.round(n).toLocaleString('he-IL');
const fmtShort = n => {
  const abs = Math.abs(n);
  if (abs >= 1000000) return '₪' + (n / 1000000).toFixed(2) + 'M';
  if (abs >= 1000) return '₪' + Math.round(n / 1000) + 'K';
  return '₪' + Math.round(n).toLocaleString('he-IL');
};
const monthlyPayment = (principal, annualRate, years) => {
  const r = annualRate / 100 / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
};

/* ═══════════════════════════════════════════════════════════════
   FINANCIAL DATA — ריבית בנק ישראל ומדד
   Attempts live fetch, falls back to last-known values
   ═══════════════════════════════════════════════════════════════ */
const MARKET_FALLBACK = {
  boi: 3.50,         // ריבית בנק ישראל (יולי 2026)
  prime: 5.00,       // פריים = BoI + 1.5
  cpiMonthly: -0.3,  // % שינוי חודשי (מאי 2026)
  cpiYearly: 1.9,    // % שינוי שנתי (12 חודשים אחרונים)
  updateDate: 'יולי 2026'
};

function setMarketData(data) {
  const fmt = n => (n > 0 ? '+' : '') + n.toFixed(1) + '%';
  const fmtRate = n => n.toFixed(2) + '%';
  document.getElementById('m-boi').textContent = fmtRate(data.boi);
  document.getElementById('m-prime').textContent = fmtRate(data.prime);
  document.getElementById('m-cpi-m').textContent = fmt(data.cpiMonthly);
  document.getElementById('m-cpi-y').textContent = data.cpiYearly.toFixed(1) + '%';
  document.getElementById('m-update').textContent = data.updateDate;

  const mc = document.getElementById('m-cpi-m-chg');
  mc.className = 'chg ' + (data.cpiMonthly >= 0 ? 'up' : 'down');
  mc.textContent = data.cpiMonthly >= 0 ? '↑ ע. אחרון' : '↓ ע. אחרון';

  const yc = document.getElementById('m-cpi-y-chg');
  yc.className = 'chg ' + (data.cpiYearly >= 2 ? 'up' : 'down');
  yc.textContent = '12 חודשים';
}

async function fetchMarketData() {
  setMarketData(MARKET_FALLBACK);
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 4000);
    const r = await fetch('https://boi.org.il/PublicApi/GetInterest', { signal: ctrl.signal });
    if (r.ok) {
      const j = await r.json();
      if (j && j.currentInterest != null) {
        const live = { ...MARKET_FALLBACK, boi: parseFloat(j.currentInterest), prime: parseFloat(j.currentInterest) + 1.5, updateDate: 'עכשיו' };
        setMarketData(live);
      }
    }
  } catch (e) { /* keep fallback, expected when CORS blocks */ }
}
fetchMarketData();

/* ═══════════════════════════════════════════════════════════════
   SCROLL EFFECTS
   ═══════════════════════════════════════════════════════════════ */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  const y = window.scrollY;
  if (y > 30) navbar.classList.add('scrolled');
  else navbar.classList.remove('scrolled');
}, { passive: true });

/* ═══════════════════════════════════════════════════════════════
   REVEAL ON SCROLL (IntersectionObserver)
   ═══════════════════════════════════════════════════════════════ */
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      observer.unobserve(e.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

/* ═══════════════════════════════════════════════════════════════
   NUMBER COUNT-UP
   ═══════════════════════════════════════════════════════════════ */
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const els = e.target.querySelectorAll('[data-count]');
      els.forEach(el => {
        const target = parseInt(el.dataset.count);
        const dur = 1800;
        const start = performance.now();
        const step = (now) => {
          const progress = Math.min((now - start) / dur, 1);
          const ease = 1 - Math.pow(1 - progress, 3);
          const val = Math.floor(target * ease);
          el.firstChild ? el.firstChild.nodeValue = val : el.textContent = val;
          // Handle elements with mixed content (units)
          if (el.childNodes.length > 0 && el.childNodes[el.childNodes.length - 1].nodeType === 3) {
            el.childNodes[el.childNodes.length - 1].nodeValue = val;
          } else {
            el.textContent = val;
          }
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
      counterObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.4 });

document.querySelectorAll('.stats-grid').forEach(el => counterObserver.observe(el));

/* ═══════════════════════════════════════════════════════════════
   CALCULATOR TABS (+ deep-link support via URL hash)
   ═══════════════════════════════════════════════════════════════ */
function activateCalcTab(targetId) {
  const tab = document.querySelector(`.calc-tab[data-target="${targetId}"]`);
  const panel = document.getElementById(targetId);
  if (!tab || !panel) return false;
  document.querySelectorAll('.calc-tab').forEach(t => {
    t.classList.remove('active');
    t.setAttribute('aria-selected', 'false');
  });
  document.querySelectorAll('.calc-panel').forEach(p => p.classList.remove('active'));
  tab.classList.add('active');
  tab.setAttribute('aria-selected', 'true');
  panel.classList.add('active');
  // Smooth-scroll to the calculator panel so the user sees it
  setTimeout(() => panel.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  return true;
}

document.querySelectorAll('.calc-tab').forEach(tab => {
  tab.addEventListener('click', () => activateCalcTab(tab.dataset.target));
});

// On page load: if URL contains #calc-XXX hash, activate that tab
if (window.location.hash && window.location.hash.startsWith('#calc-')) {
  const targetId = window.location.hash.slice(1);
  // Wait briefly for layout, then activate
  setTimeout(() => activateCalcTab(targetId), 150);
}

/* ═══════════════════════════════════════════════════════════════
   CALCULATOR 1 — MORTGAGE
   ═══════════════════════════════════════════════════════════════ */
function calc1() {
  const loan = +document.getElementById('m1-loan').value;
  const rate = +document.getElementById('m1-rate').value;
  const years = +document.getElementById('m1-years').value;
  document.getElementById('m1-loan-val').textContent = fmt(loan);
  document.getElementById('m1-rate-val').textContent = rate.toFixed(1) + '%';
  document.getElementById('m1-years-val').textContent = years;
  const mo = monthlyPayment(loan, rate, years);
  document.getElementById('m1-out').textContent = fmt(mo) + ' / חודש';
  document.getElementById('m1-total').textContent = fmt(mo * years * 12);
}
if (document.getElementById('m1-loan')) ['m1-loan','m1-rate','m1-years'].forEach(id => document.getElementById(id).addEventListener('input', calc1));
if (document.getElementById('m1-loan')) calc1();

/* ═══════════════════════════════════════════════════════════════
   CALCULATOR 2 — PROVIDENT FUND (with one-time deposit)
   ═══════════════════════════════════════════════════════════════ */
function calc2() {
  const lump = +document.getElementById('m2-lump').value;
  const monthly = +document.getElementById('m2-month').value;
  const years = +document.getElementById('m2-years').value;
  const yieldR = +document.getElementById('m2-yield').value;
  document.getElementById('m2-lump-val').textContent = fmt(lump);
  document.getElementById('m2-month-val').textContent = fmt(monthly);
  document.getElementById('m2-years-val').textContent = years + ' שנים';
  document.getElementById('m2-yield-val').textContent = yieldR.toFixed(1) + '%';
  // FV total = FV_lump * (1+r)^n + PMT * (((1+r)^n - 1) / r)
  const r = yieldR / 100 / 12;
  const n = years * 12;
  const growth = Math.pow(1 + r, n);
  const fvLump = lump * growth;
  const fvMonthly = r === 0 ? monthly * n : monthly * (growth - 1) / r;
  const total = fvLump + fvMonthly;
  const totalDeposits = lump + monthly * n;
  const profit = total - totalDeposits;
  document.getElementById('m2-out').textContent = fmt(total);
  document.getElementById('m2-deposits').textContent = fmt(totalDeposits);
  document.getElementById('m2-profit').textContent = fmt(profit);
}
if (document.getElementById('m2-lump')) ['m2-lump','m2-month','m2-years','m2-yield'].forEach(id => document.getElementById(id).addEventListener('input', calc2));
if (document.getElementById('m2-lump')) calc2();

// Yield preset buttons (gemel.net 5-year averages)
document.querySelectorAll('.yield-preset').forEach(btn => {
  btn.addEventListener('click', () => {
    const targetYield = parseFloat(btn.dataset.yield);
    const slider = document.getElementById('m2-yield');
    if (!slider) return;
    slider.value = targetYield;
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    // Visual feedback — briefly highlight the chosen preset
    document.querySelectorAll('.yield-preset').forEach(b => b.style.borderColor = '');
    btn.style.borderColor = 'var(--gold)';
    btn.style.background = 'rgba(201, 168, 118, 0.1)';
    setTimeout(() => { btn.style.background = ''; }, 1500);
  });
});

/* ═══════════════════════════════════════════════════════════════
   CALCULATOR 3 — DTI (dynamic green/red)
   ═══════════════════════════════════════════════════════════════ */
function calc3() {
  const income = +document.getElementById('m3-income').value;
  const mort = +document.getElementById('m3-mortgage').value;
  const loans = +document.getElementById('m3-loans').value;
  document.getElementById('m3-income-val').textContent = fmt(income);
  document.getElementById('m3-mortgage-val').textContent = fmt(mort);
  document.getElementById('m3-loans-val').textContent = fmt(loans);
  const total = mort + loans;
  const dti = income > 0 ? (total / income) * 100 : 0;
  document.getElementById('m3-out').textContent = dti.toFixed(1) + '%';
  document.getElementById('m3-total').textContent = fmt(total);

  const panel = document.getElementById('calc-dti');
  const status = document.getElementById('m3-status');
  panel.classList.remove('safe', 'caution', 'danger');
  if (dti <= 40) { panel.classList.add('safe'); status.textContent = 'מתאים לבנק'; }
  else if (dti <= 50) { panel.classList.add('caution'); status.textContent = 'חוץ-בנקאי בלבד'; }
  else { panel.classList.add('danger'); status.textContent = 'גבוה — מסוכן'; }

  // Update meter indicator (clamp at 50% — the regulatory ceiling)
  const indicator = document.getElementById('m3-indicator');
  const clamped = Math.min(dti, 50);
  // direction:ltr inside .dti-meter-track means "right: 0%" is the right edge (0%)
  // and "right: 100%" is the left edge (50%). Map DTI 0-50% to right 0-100%.
  indicator.style.right = (clamped / 50 * 100) + '%';
  indicator.dataset.value = dti.toFixed(1) + '%';
}
if (document.getElementById('m3-income')) ['m3-income','m3-mortgage','m3-loans'].forEach(id => document.getElementById(id).addEventListener('input', calc3));
if (document.getElementById('m3-income')) calc3();

/* ═══════════════════════════════════════════════════════════════
   CALCULATOR 4 — REFINANCE SAVINGS
   ═══════════════════════════════════════════════════════════════ */
function calc4() {
  const bal = +document.getElementById('m4-balance').value;
  const cur = +document.getElementById('m4-cur-rate').value;
  const nw = +document.getElementById('m4-new-rate').value;
  const years = +document.getElementById('m4-years').value;
  document.getElementById('m4-balance-val').textContent = fmt(bal);
  document.getElementById('m4-cur-rate-val').textContent = cur.toFixed(1) + '%';
  document.getElementById('m4-new-rate-val').textContent = nw.toFixed(1) + '%';
  document.getElementById('m4-years-val').textContent = years;
  const curMo = monthlyPayment(bal, cur, years);
  const newMo = monthlyPayment(bal, nw, years);
  const monthlySaving = Math.max(0, curMo - newMo);
  document.getElementById('m4-out').textContent = fmt(monthlySaving) + ' / חודש';
  document.getElementById('m4-total').textContent = fmt(monthlySaving * years * 12);
}
if (document.getElementById('m4-balance')) ['m4-balance','m4-cur-rate','m4-new-rate','m4-years'].forEach(id => document.getElementById(id).addEventListener('input', calc4));
if (document.getElementById('m4-balance')) calc4();

/* ═══════════════════════════════════════════════════════════════
   CALCULATOR 5 — EQUITY TIME-TO-GOAL
   ═══════════════════════════════════════════════════════════════ */
function calc5() {
  const price = +document.getElementById('m5-price').value;
  const have = +document.getElementById('m5-have').value;
  const monthly = +document.getElementById('m5-monthly').value;
  document.getElementById('m5-price-val').textContent = fmt(price);
  document.getElementById('m5-have-val').textContent = fmt(have);
  document.getElementById('m5-monthly-val').textContent = fmt(monthly);
  const target = price * 0.25;
  const remaining = Math.max(0, target - have);
  document.getElementById('m5-target').textContent = fmt(target);
  if (remaining === 0) {
    document.getElementById('m5-out').textContent = 'יש לכם! 🎉';
    return;
  }
  const months = Math.ceil(remaining / monthly);
  const yrs = Math.floor(months / 12);
  const mons = months % 12;
  let text = '';
  if (yrs > 0) text += yrs + ' שנים';
  if (yrs > 0 && mons > 0) text += ', ';
  if (mons > 0) text += mons + ' חודשים';
  document.getElementById('m5-out').textContent = text || '< חודש';
}
if (document.getElementById('m5-price')) ['m5-price','m5-have','m5-monthly'].forEach(id => document.getElementById(id).addEventListener('input', calc5));
if (document.getElementById('m5-price')) calc5();

/* ═══════════════════════════════════════════════════════════════
   CALCULATOR 6 — CPI IMPACT
   ═══════════════════════════════════════════════════════════════ */
function calc6() {
  const loan = +document.getElementById('m6-loan').value;
  const rate = +document.getElementById('m6-rate').value;
  const cpi = +document.getElementById('m6-cpi').value;
  const years = +document.getElementById('m6-years').value;
  document.getElementById('m6-loan-val').textContent = fmt(loan);
  document.getElementById('m6-rate-val').textContent = rate.toFixed(1) + '%';
  document.getElementById('m6-cpi-val').textContent = cpi.toFixed(1) + '%';
  document.getElementById('m6-years-val').textContent = years;
  // Effective rate = (1+rate)*(1+cpi) - 1 (approximation for linked mortgages)
  const effective = ((1 + rate / 100) * (1 + cpi / 100) - 1) * 100;
  const mo = monthlyPayment(loan, effective, years);
  const total = mo * years * 12;
  const nominalMo = monthlyPayment(loan, rate, years);
  const nominalTotal = nominalMo * years * 12;
  const extra = Math.max(0, total - nominalTotal);
  document.getElementById('m6-out').textContent = fmt(total);
  document.getElementById('m6-extra').textContent = fmt(extra);
}
if (document.getElementById('m6-loan')) ['m6-loan','m6-rate','m6-cpi','m6-years'].forEach(id => document.getElementById(id).addEventListener('input', calc6));
if (document.getElementById('m6-loan')) calc6();

/* ═══════════════════════════════════════════════════════════════
   CALCULATOR 7 — NET FOR SELF-EMPLOYED (approx. 2026 Israel)
   ═══════════════════════════════════════════════════════════════ */
function calc7() {
  const gross = +document.getElementById('m7-gross').value;
  const expenses = +document.getElementById('m7-expenses').value;
  const pension = +document.getElementById('m7-pension').value;
  document.getElementById('m7-gross-val').textContent = fmt(gross);
  document.getElementById('m7-expenses-val').textContent = fmt(expenses);
  document.getElementById('m7-pension-val').textContent = fmt(pension);

  // Taxable income
  const taxable = Math.max(0, gross - expenses - pension);

  // Simplified Israel income tax brackets 2026 (approximations)
  // 0-84K: 10%, 84-120K: 14%, 120-193K: 20%, 193-269K: 31%, 269-560K: 35%, 560K+: 47%
  const brackets = [
    { up: 84120, rate: 0.10 },
    { up: 120720, rate: 0.14 },
    { up: 193800, rate: 0.20 },
    { up: 269280, rate: 0.31 },
    { up: 560280, rate: 0.35 },
    { up: Infinity, rate: 0.47 }
  ];
  let tax = 0, last = 0;
  for (const b of brackets) {
    if (taxable <= last) break;
    const chunk = Math.min(taxable, b.up) - last;
    tax += chunk * b.rate;
    last = b.up;
    if (taxable <= b.up) break;
  }

  // Bituach Leumi + Bituach Briut for self-employed (approx 11.79% up to ceiling ~534K)
  const bituachBase = Math.min(taxable, 534000);
  const bituach = bituachBase * 0.1179;

  const net = gross - expenses - tax - bituach;
  document.getElementById('m7-out').textContent = fmt(net);
  document.getElementById('m7-monthly').textContent = fmt(net / 12);
}
if (document.getElementById('m7-gross')) ['m7-gross','m7-expenses','m7-pension'].forEach(id => document.getElementById(id).addEventListener('input', calc7));
if (document.getElementById('m7-gross')) calc7();

/* ═══════════════════════════════════════════════════════════════
   ARTICLE MODAL
   ═══════════════════════════════════════════════════════════════ */
const articleModal = document.getElementById('articleModal');
const articleContent = document.getElementById('articleContent');
let lastFocused = null;

function openArticle(id) {
  const src = document.getElementById(id);
  if (!src) return;
  const tone = src.dataset.tone || 't-turquoise';
  const tag = src.dataset.tag || '';
  const read = src.dataset.readtime || '';
  const innerHTML = src.innerHTML;

  articleContent.innerHTML = `
    <div class="article-hero ${tone}">
      <button class="article-close" onclick="closeArticle()" aria-label="סגור מאמר">
        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" d="M6 6l12 12M6 18L18 6"/></svg>
      </button>
    </div>
    <div class="article-body">
      <div class="article-meta">
        <span class="article-tag">${tag}</span>
        <span>•</span>
        <span>${read}</span>
      </div>
      ${innerHTML}
    </div>
  `;
  lastFocused = document.activeElement;
  articleModal.classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => articleContent.querySelector('.article-close')?.focus(), 100);
}

function closeArticle() {
  articleModal.classList.remove('open');
  document.body.style.overflow = '';
  if (lastFocused) lastFocused.focus();
}

document.querySelectorAll('[data-article]').forEach(card => {
  const openHandler = (e) => {
    if (e) {
      // If a nested link (different from the card itself) was clicked — don't intercept
      const innerLink = e.target.closest('a[href]');
      if (innerLink && innerLink !== card) return;
      // For card-itself links (like footer policy links), prevent default # scroll
      e.preventDefault();
    }
    openArticle(card.dataset.article);
  };
  card.addEventListener('click', openHandler);
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openHandler(e); }
  });
});

if (articleModal) {
  articleModal.addEventListener('click', (e) => {
    if (e.target === articleModal) closeArticle();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && articleModal.classList.contains('open')) closeArticle();
  });
}

/* ═══════════════════════════════════════════════════════════════
   ACCESSIBILITY WIDGET
   ═══════════════════════════════════════════════════════════════ */
const a11yToggle = document.getElementById('a11yToggle');
const a11yPanel = document.getElementById('a11yPanel');
const a11yClose = document.getElementById('a11yClose');
const a11yReset = document.getElementById('a11yReset');

const A11Y_TEXT_CLASSES = ['a11y-large-text', 'a11y-larger-text', 'a11y-largest-text'];
const A11Y_TOGGLES = ['contrast', 'readable-font', 'highlight-headings', 'underline-links', 'no-animations', 'cursor'];

function loadA11ySettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('manifa-a11y') || '{}');
    // Text size
    A11Y_TEXT_CLASSES.forEach(c => document.body.classList.remove(c));
    if (saved.text && saved.text !== 'normal') {
      document.body.classList.add('a11y-' + saved.text + '-text');
      const btn = document.querySelector(`[data-a11y="text-${saved.text}"]`);
      if (btn) btn.classList.add('active');
    } else {
      const normalBtn = document.querySelector('[data-a11y="text-normal"]');
      if (normalBtn) normalBtn.classList.add('active');
    }
    // Toggles
    A11Y_TOGGLES.forEach(t => {
      const cls = 'a11y-' + t;
      if (saved[t]) {
        document.body.classList.add(cls);
        const btn = document.querySelector(`[data-a11y="${t}"]`);
        if (btn) btn.classList.add('active');
      }
    });
  } catch (e) { /* ignore */ }
}

function saveA11ySettings() {
  const settings = {};
  // Determine text size
  for (const size of ['largest', 'larger', 'large']) {
    if (document.body.classList.contains('a11y-' + size + '-text')) {
      settings.text = size;
      break;
    }
  }
  if (!settings.text) settings.text = 'normal';
  // Toggles
  A11Y_TOGGLES.forEach(t => {
    if (document.body.classList.contains('a11y-' + t)) settings[t] = true;
  });
  try { localStorage.setItem('manifa-a11y', JSON.stringify(settings)); } catch (e) {}
}

if (a11yToggle) {
  a11yToggle.addEventListener('click', () => {
    const open = a11yPanel.classList.toggle('open');
    a11yToggle.setAttribute('aria-expanded', open);
  });
}
if (a11yClose) {
  a11yClose.addEventListener('click', () => {
    a11yPanel.classList.remove('open');
    a11yToggle.setAttribute('aria-expanded', 'false');
    a11yToggle.focus();
  });
}

// Wire up all a11y buttons
document.querySelectorAll('.a11y-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const action = btn.dataset.a11y;
    const group = btn.dataset.group;
    if (group === 'text') {
      // Exclusive: remove all text classes, add the selected one
      A11Y_TEXT_CLASSES.forEach(c => document.body.classList.remove(c));
      document.querySelectorAll('[data-group="text"]').forEach(b => b.classList.remove('active'));
      if (action !== 'text-normal') {
        const size = action.replace('text-', '');
        document.body.classList.add('a11y-' + size + '-text');
      }
      btn.classList.add('active');
    } else {
      // Toggle
      const cls = 'a11y-' + action;
      const isActive = document.body.classList.toggle(cls);
      btn.classList.toggle('active', isActive);
    }
    saveA11ySettings();
  });
});

if (a11yReset) {
  a11yReset.addEventListener('click', () => {
    A11Y_TEXT_CLASSES.forEach(c => document.body.classList.remove(c));
    A11Y_TOGGLES.forEach(t => document.body.classList.remove('a11y-' + t));
    document.querySelectorAll('.a11y-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-a11y="text-normal"]')?.classList.add('active');
    try { localStorage.removeItem('manifa-a11y'); } catch (e) {}
  });
}

// Close panel on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && a11yPanel?.classList.contains('open')) {
    a11yPanel.classList.remove('open');
    a11yToggle?.setAttribute('aria-expanded', 'false');
    a11yToggle?.focus();
  }
});

// Load saved settings on page load
loadA11ySettings();

/* ═══════════════════════════════════════════════════════════════
   COOKIE CONSENT
   ═══════════════════════════════════════════════════════════════ */
function acceptCookies() {
  try { localStorage.setItem('manifa-cookies', 'accept'); } catch (e) {}
  document.getElementById('cookieBanner').classList.remove('visible');
}
function declineCookies() {
  try { localStorage.setItem('manifa-cookies', 'decline'); } catch (e) {}
  document.getElementById('cookieBanner').classList.remove('visible');
}
setTimeout(() => {
  try {
    if (!localStorage.getItem('manifa-cookies')) {
      document.getElementById('cookieBanner').classList.add('visible');
    }
  } catch (e) {
    document.getElementById('cookieBanner').classList.add('visible');
  }
}, 1800);

/* ═══════════════════════════════════════════════════════════════
   LEAD FORM
   ═══════════════════════════════════════════════════════════════ */
const leadForm = document.getElementById('leadForm');
if (leadForm) {
  leadForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = leadForm.querySelector('[name="name"]').value.trim();
    const phone = leadForm.querySelector('[name="phone"]').value.trim();
    const email = leadForm.querySelector('[name="email"]').value.trim();
    if (!name || !phone || !email) return;
    // Send to WhatsApp as fallback (until backend wired)
    const msg = encodeURIComponent('שלום תמיר, אשמח לקבל את המדריך החינמי.\nשם: ' + name + '\nטלפון: ' + phone + '\nמייל: ' + email);
    window.open('https://wa.me/972524502821?text=' + msg, '_blank');
    leadForm.innerHTML = '<div style="text-align:center; padding:1.5rem;"><div style="font-size:2.5rem; margin-bottom:0.5rem;">✓</div><h4 style="color:var(--gold-light); margin-bottom:0.5rem;">תודה! קיבלנו את פרטיכם</h4><p style="color:rgba(255,255,255,0.7); font-size:0.9rem;">המדריך נשלח אליכם, ונחזור אליכם בקרוב.</p></div>';
  });
}

/* ═══════════════════════════════════════════════════════════════
   FAQ ACCORDION
   ═══════════════════════════════════════════════════════════════ */
function toggleFaq(btn) {
  const item = btn.parentElement;
  const ans = item.querySelector('.faq-a');
  const isOpen = item.classList.contains('open');

  // Close all
  document.querySelectorAll('.faq-item').forEach(i => {
    i.classList.remove('open');
    i.querySelector('.faq-a').style.maxHeight = '0';
  });

  if (!isOpen) {
    item.classList.add('open');
    ans.style.maxHeight = ans.scrollHeight + 'px';
  }
}

/* ═══════════════════════════════════════════════════════════════
   SMOOTH SCROLL FOR ANCHORS
   ═══════════════════════════════════════════════════════════════ */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', function(e) {
    const id = this.getAttribute('href');
    if (id === '#' || id === '') return;
    const t = document.querySelector(id);
    if (t) {
      e.preventDefault();
      const top = t.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});

/* ═══════════════════════════════════════════════════════════════
   PREMIUM SIDE DRAWER — always-visible hamburger
   ═══════════════════════════════════════════════════════════════ */
(function() {
  // Determine path prefix (root vs blog/ subdirectory)
  const pathPrefix = location.pathname.includes('/blog/') ? '../' : '';

  // Build drawer HTML
  const drawerHTML = `
    <div class="drawer-overlay" id="drawerOverlay"></div>
    <aside class="side-drawer" id="sideDrawer" role="dialog" aria-modal="true" aria-label="תפריט ראשי">

      <div class="drawer-header">
        <a href="${pathPrefix}index.html" class="drawer-brand">
          <img src="${pathPrefix}assets/images/logo-nav.png" alt="מניפה פיננסית">
          <div class="drawer-brand-text">
            <div class="name">מניפה פיננסית</div>
            <div class="tag">תמיר גרמה</div>
          </div>
        </a>
        <button class="drawer-close" id="drawerClose" aria-label="סגור תפריט">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <div class="drawer-hero-cta">
        <div class="eyebrow">פנוי עכשיו</div>
        <h3>שיחת ייעוץ — חינם וללא התחייבות</h3>
        <p>30 דקות שיכולות לחסוך לכם 180,000 ₪ על חיי המשכנתא</p>
        <div class="btn-row">
          <a href="tel:052-4502821">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h2.28a1 1 0 01.95.68l1.5 4.49a1 1 0 01-.27 1.06l-2 1.69a11 11 0 005.62 5.62l1.69-2a1 1 0 011.06-.27l4.49 1.5a1 1 0 01.68.95V19a2 2 0 01-2 2h-1C9.72 21 3 14.28 3 6V5z"/></svg>
            052-4502821
          </a>
          <a href="https://wa.me/972524502821?text=שלום%20תמיר,%20אשמח%20לייעוץ" target="_blank" rel="noopener" class="alt">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448L.057 24z"/></svg>
            וואטסאפ
          </a>
        </div>
      </div>

      <div class="drawer-nav">
        <div class="drawer-section-label">ניווט</div>
        <ul class="drawer-nav-list">
          <li><a href="${pathPrefix}index.html">
            <span class="icon-box"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3"/></svg></span>
            <span class="nav-text"><span class="title">דף הבית</span><span class="desc">הכרות עם השירות</span></span>
          </a></li>
          <li><a href="${pathPrefix}calculators.html">
            <span class="icon-box"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg></span>
            <span class="nav-text"><span class="title">מחשבונים</span><span class="desc">7 מחשבונים פיננסיים</span></span>
          </a></li>
          <li><a href="${pathPrefix}madrich-mashkanta.html">
            <span class="icon-box"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg></span>
            <span class="nav-text"><span class="title">מדריך משכנתא 2026</span><span class="desc">4500 מילים — הכל מא' עד ת'</span></span>
          </a></li>
          <li><a href="${pathPrefix}blog.html">
            <span class="icon-box"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/></svg></span>
            <span class="nav-text"><span class="title">בלוג</span><span class="desc">20+ מאמרים פיננסיים</span></span>
          </a></li>
          <li><a href="${pathPrefix}faq.html">
            <span class="icon-box"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></span>
            <span class="nav-text"><span class="title">שאלות נפוצות</span><span class="desc">20 תשובות לשאלות שמטרידות</span></span>
          </a></li>
          <li><a href="${pathPrefix}about.html">
            <span class="icon-box"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg></span>
            <span class="nav-text"><span class="title">עליי</span><span class="desc">10 שנות ניסיון בנקאי</span></span>
          </a></li>
          <li><a href="${pathPrefix}contact.html">
            <span class="icon-box"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg></span>
            <span class="nav-text"><span class="title">צור קשר</span><span class="desc">טלפון · וואטסאפ · אימייל</span></span>
          </a></li>
        </ul>
      </div>

      <div class="drawer-quick">
        <div class="drawer-section-label">קשר מהיר</div>
        <div class="drawer-quick-row">
          <a href="tel:052-4502821" class="drawer-quick-card">
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h2.28a1 1 0 01.95.68l1.5 4.49a1 1 0 01-.27 1.06l-2 1.69a11 11 0 005.62 5.62l1.69-2a1 1 0 011.06-.27l4.49 1.5a1 1 0 01.68.95V19a2 2 0 01-2 2h-1C9.72 21 3 14.28 3 6V5z"/></svg>
            <span class="lab">טלפון</span>
            <span class="val">052-4502821</span>
          </a>
          <a href="https://wa.me/972524502821" target="_blank" rel="noopener" class="drawer-quick-card">
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448L.057 24z"/></svg>
            <span class="lab">וואטסאפ</span>
            <span class="val">מענה מיידי</span>
          </a>
        </div>
      </div>

      <div class="drawer-articles">
        <div class="drawer-section-label">מאמרים מומלצים</div>
        <a href="${pathPrefix}blog/art-15.html" class="drawer-article-card">
          <span class="article-tag">ניתוח שוק</span>
          <div class="article-title">משבר המשכנתאות 2026 — 4.28 מיליארד ₪ בפיגורים</div>
        </a>
        <a href="${pathPrefix}blog/art-14.html" class="drawer-article-card">
          <span class="article-tag">ריבית</span>
          <div class="article-title">הורדת ריבית נוספת בדרך ל-3.5% — מה לעשות?</div>
        </a>
        <a href="${pathPrefix}blog/art-3.html" class="drawer-article-card">
          <span class="article-tag">מחזור</span>
          <div class="article-title">מתי באמת כדאי למחזר משכנתא? המדריך המקצועי</div>
        </a>
      </div>

      <div class="drawer-footer">
        <p style="font-family: var(--font-display); font-size: 1rem; color: #fff; font-weight: 600;">מניפה פיננסית · תמיר גרמה</p>
        <p>יועץ משכנתאות מוסמך · 10 שנות ניסיון</p>
        <div class="drawer-social">
          <a href="mailto:menifainance@gmail.com" aria-label="אימייל">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
          </a>
          <a href="https://wa.me/972524502821" target="_blank" rel="noopener" aria-label="וואטסאפ">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448L.057 24z"/></svg>
          </a>
          <a href="tel:052-4502821" aria-label="טלפון">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h2.28a1 1 0 01.95.68l1.5 4.49a1 1 0 01-.27 1.06l-2 1.69a11 11 0 005.62 5.62l1.69-2a1 1 0 011.06-.27l4.49 1.5a1 1 0 01.68.95V19a2 2 0 01-2 2h-1C9.72 21 3 14.28 3 6V5z"/></svg>
          </a>
        </div>
        <p class="small">© 2026 מניפה פיננסית · כל הזכויות שמורות</p>
      </div>
    </aside>
  `;

  // Robust init — runs whether DOM is loading or already ready
  function initDrawer() {
    // Avoid double-initialization (cache + DOMContentLoaded both firing)
    if (document.getElementById('sideDrawer')) return;
    if (!document.body) { setTimeout(initDrawer, 50); return; }

    // Inject drawer into body
    document.body.insertAdjacentHTML('beforeend', drawerHTML);

    const drawer = document.getElementById('sideDrawer');
    const overlay = document.getElementById('drawerOverlay');
    const closeBtn = document.getElementById('drawerClose');
    const toggleBtn = document.getElementById('menuToggle');

    if (!drawer || !toggleBtn) {
      console.warn('[Drawer] missing elements', { drawer: !!drawer, toggleBtn: !!toggleBtn });
      return;
    }

    function openDrawer() {
      document.body.classList.add('drawer-open');
      document.body.style.overflow = 'hidden';
      drawer.setAttribute('aria-hidden', 'false');
      try { closeBtn?.focus(); } catch(_) {}
    }
    function closeDrawer() {
      document.body.classList.remove('drawer-open');
      document.body.style.overflow = '';
      drawer.setAttribute('aria-hidden', 'true');
      try { toggleBtn?.focus(); } catch(_) {}
    }

    // Use both 'click' and 'touchend' for max mobile compatibility
    function bindOpen(el) {
      if (!el) return;
      el.addEventListener('click', (e) => { e.preventDefault(); openDrawer(); });
      el.addEventListener('touchend', (e) => { e.preventDefault(); openDrawer(); }, { passive: false });
    }
    function bindClose(el) {
      if (!el) return;
      el.addEventListener('click', (e) => { e.preventDefault(); closeDrawer(); });
      el.addEventListener('touchend', (e) => { e.preventDefault(); closeDrawer(); }, { passive: false });
    }
    bindOpen(toggleBtn);
    bindClose(closeBtn);
    bindClose(overlay);

    // Close on ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.body.classList.contains('drawer-open')) {
        closeDrawer();
      }
    });

    // Close when clicking nav links inside
    drawer.querySelectorAll('a[href]').forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href.startsWith('tel:') || href.startsWith('mailto:') || href.startsWith('https://wa.me')) return;
        setTimeout(closeDrawer, 100);
      });
    });
  }

  // Init at multiple stages to maximize reliability across browsers
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDrawer);
  } else {
    initDrawer();
  }
  // Final fallback after window load
  window.addEventListener('load', () => { if (!document.getElementById('sideDrawer')) initDrawer(); });
})();

/* ═══════════════════════════════════════════════════════════════
   HERO PREMIUM EFFECTS — 3D tilt on advisor card + floating particles
   ═══════════════════════════════════════════════════════════════ */
(function() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(pointer: fine)').matches;

  function initHeroEffects() {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    // Inject particles container (only on hero pages)
    if (!reduced && !hero.querySelector('.hero-particles')) {
      const particlesEl = document.createElement('div');
      particlesEl.className = 'hero-particles';
      particlesEl.setAttribute('aria-hidden', 'true');
      const count = 16;
      for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'hero-particle ' + (i % 2 === 0 ? 'sky' : 'mint');
        const size = 2 + Math.random() * 3;
        p.style.cssText = `
          left: ${Math.random() * 100}%;
          bottom: -10px;
          width: ${size}px; height: ${size}px;
          animation-duration: ${14 + Math.random() * 20}s;
          animation-delay: ${-Math.random() * 28}s;
          opacity: ${0.4 + Math.random() * 0.4};
        `;
        particlesEl.appendChild(p);
      }
      hero.insertBefore(particlesEl, hero.firstChild);
    }

    // 3D tilt on the advisor card
    if (!reduced && fine) {
      const card = document.querySelector('.advisor-card');
      if (card) {
        card.addEventListener('mousemove', function(e) {
          const rect = this.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width;
          const y = (e.clientY - rect.top) / rect.height;
          const rotateY = (x - 0.5) * 12;
          const rotateX = (y - 0.5) * -12;
          this.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
          this.style.setProperty('--mx', (x * 100) + '%');
          this.style.setProperty('--my', (y * 100) + '%');
        });
        card.addEventListener('mouseleave', function() {
          this.style.transform = '';
        });
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeroEffects);
  } else {
    initHeroEffects();
  }
})();
