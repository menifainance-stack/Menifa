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
  boi: 3.75,         // ריבית בנק ישראל (מאי 2026)
  prime: 5.25,       // פריים = BoI + 1.5
  cpiMonthly: 1.2,   // % שינוי חודשי (אפריל 2026)
  cpiYearly: 1.9,    // % שינוי שנתי (12 חודשים אחרונים)
  updateDate: 'אפריל 2026'
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
   CALCULATOR TABS
   ═══════════════════════════════════════════════════════════════ */
document.querySelectorAll('.calc-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.target;
    document.querySelectorAll('.calc-tab').forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    document.querySelectorAll('.calc-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    document.getElementById(target).classList.add('active');
  });
});

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
['m1-loan','m1-rate','m1-years'].forEach(id => document.getElementById(id).addEventListener('input', calc1));
calc1();

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
['m2-lump','m2-month','m2-years','m2-yield'].forEach(id => document.getElementById(id).addEventListener('input', calc2));
calc2();

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
  if (dti <= 40) { panel.classList.add('safe'); status.textContent = 'מצוין'; }
  else if (dti <= 50) { panel.classList.add('caution'); status.textContent = 'סביר — בגבול'; }
  else { panel.classList.add('danger'); status.textContent = 'חורג מהגבול'; }

  // Update meter indicator (clamp at 50% — the regulatory ceiling)
  const indicator = document.getElementById('m3-indicator');
  const clamped = Math.min(dti, 50);
  // direction:ltr inside .dti-meter-track means "right: 0%" is the right edge (0%)
  // and "right: 100%" is the left edge (50%). Map DTI 0-50% to right 0-100%.
  indicator.style.right = (clamped / 50 * 100) + '%';
  indicator.dataset.value = dti.toFixed(1) + '%';
}
['m3-income','m3-mortgage','m3-loans'].forEach(id => document.getElementById(id).addEventListener('input', calc3));
calc3();

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
['m4-balance','m4-cur-rate','m4-new-rate','m4-years'].forEach(id => document.getElementById(id).addEventListener('input', calc4));
calc4();

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
['m5-price','m5-have','m5-monthly'].forEach(id => document.getElementById(id).addEventListener('input', calc5));
calc5();

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
['m6-loan','m6-rate','m6-cpi','m6-years'].forEach(id => document.getElementById(id).addEventListener('input', calc6));
calc6();

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
['m7-gross','m7-expenses','m7-pension'].forEach(id => document.getElementById(id).addEventListener('input', calc7));
calc7();

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

articleModal.addEventListener('click', (e) => {
  if (e.target === articleModal) closeArticle();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && articleModal.classList.contains('open')) closeArticle();
});

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
   MOBILE MENU (simple show/hide)
   ═══════════════════════════════════════════════════════════════ */
document.getElementById('menuToggle')?.addEventListener('click', () => {
  const links = document.querySelector('.nav-links');
  if (links.style.display === 'flex') {
    links.style.display = '';
  } else {
    links.style.display = 'flex';
    links.style.position = 'absolute';
    links.style.top = '100%';
    links.style.right = '0';
    links.style.left = '0';
    links.style.flexDirection = 'column';
    links.style.background = 'var(--bg)';
    links.style.padding = '1.5rem 2rem';
    links.style.boxShadow = 'var(--shadow-md)';
    links.style.borderTop = '1px solid var(--gray-soft)';
  }
});
