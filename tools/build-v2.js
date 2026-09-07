/**
 * build-v2.js — assembles index-v2.html from index.html.
 * Keeps head/schema/nav/ticker/footer byte-identical. Replaces the hero,
 * inserts the ledger + Tamir sections after the proof bar, links v2 assets.
 * Live index.html is never touched.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

/* ── 1. assets ── */
html = html.replace(
  '<link rel="stylesheet" href="assets/style.css?v=2026-07-10">',
  '<link rel="stylesheet" href="assets/style.css?v=2026-07-10">\n<link rel="stylesheet" href="assets/v2.css?v=2">'
);
html = html.replace(/<\/body>/, '<script src="assets/v2.js?v=2" defer></script>\n</body>');
// preview-only: never let search engines index the draft
html = html.replace('<meta name="robots" content="index, follow, max-image-preview:large">', '<meta name="robots" content="noindex, nofollow">');
html = html.replace('<link rel="canonical" href="https://menifa.org/">', '<link rel="canonical" href="https://menifa.org/">\n<!-- DRAFT v2 — preview only -->');

/* ── 2. hero ── */
const HERO = `<!-- ═══ HERO v2 ═══ -->
<header class="hero-v2">
  <div class="grain" aria-hidden="true"></div>
  <div class="rules" aria-hidden="true"></div>
  <div class="container">
    <div class="hero-v2-grid">

      <div class="hv2-copy">
        <span class="hv2-kicker"><span class="pulse" aria-hidden="true"></span> פנוי לשיחת ייעוץ · ללא עלות</span>

        <h1>
          ייעוץ משכנתאות.
          <span class="line2">בצד <em>שלכם</em>, לא של הבנק.</span>
        </h1>

        <p class="hv2-sub">
          עשר שנים בבנקאות ובייעוץ פיננסי. אני לא עובד מול הבנק — אני עובד עבורכם.
          ארבעה בנקים מתחרים על התיק שלכם, ואתם חותמים רק על ההצעה שניצחה.
        </p>

        <div class="hv2-stat" aria-label="חיסכון ממוצע ללקוח">
          <div class="num"><span id="hv2-stat-num" data-target="180000">0</span><span class="cur">₪</span></div>
          <div class="lbl"><strong>חיסכון ממוצע ללקוח</strong>לאורך חיי המשכנתא, על בסיס 500+ תיקים</div>
        </div>

        <div class="hv2-ctas">
          <a href="#contact" class="btn btn-primary btn-large">
            לשיחת אבחון חינם
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          </a>
          <a href="#ledger" class="btn btn-ghost btn-large">איך זה עובד</a>
        </div>
      </div>

      <div class="calc-card" id="calculator" aria-labelledby="calc-title">
        <div class="calc-head">
          <h2 id="calc-title">כמה אתם משאירים על השולחן?</h2>
          <span class="tag">הערכה מיידית</span>
        </div>

        <div class="calc-field">
          <label for="hv2-amt">סכום המשכנתא <output id="hv2-amt-out" for="hv2-amt">₪1,300,000</output></label>
          <input type="range" id="hv2-amt" min="300000" max="4000000" step="50000" value="1300000" aria-describedby="hv2-note">
          <div class="ticks" aria-hidden="true"><span>₪300K</span><span>₪4M</span></div>
        </div>

        <div class="calc-field">
          <label for="hv2-yrs">תקופה <output id="hv2-yrs-out" for="hv2-yrs">25 שנה</output></label>
          <input type="range" id="hv2-yrs" min="10" max="30" step="1" value="25" aria-describedby="hv2-note">
          <div class="ticks" aria-hidden="true"><span>10</span><span>30</span></div>
        </div>

        <div class="calc-divider" aria-hidden="true"></div>

        <div class="calc-result" aria-live="polite">
          <div class="cap">פוטנציאל חיסכון על התיק הזה</div>
          <div class="big"><span id="hv2-big">0</span><span class="cur">₪</span></div>
          <div class="sub" id="hv2-sub">&nbsp;</div>
        </div>

        <a href="#contact" class="calc-cta">
          בואו נבדוק את המספר האמיתי
          <svg width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
        </a>
        <p class="calc-note" id="hv2-note">הערכה בלבד. מבוססת על פער טיפוסי של 0.8% בין הצעת בנק ראשונית להצעה לאחר מו״מ מקביל. התוצאה בתיק שלכם תלויה בפרופיל, בתמהיל ובשוק.</p>
      </div>

    </div>
  </div>
</header>`;

const heroStart = html.indexOf('<!-- ═══ HERO ═══ -->');
const heroEnd = html.indexOf('</header>', heroStart) + '</header>'.length;
if (heroStart === -1 || heroEnd < heroStart) throw new Error('hero anchors not found');
html = html.slice(0, heroStart) + HERO + html.slice(heroEnd);

/* ── 3. ledger + tamir, inserted before SERVICES ── */
const LEDGER = `<!-- ═══ LEDGER — same mortgage, two readings ═══ -->
<section class="ledger" id="ledger" aria-labelledby="ledger-h">
  <div class="container">
    <div class="ledger-head">
      <span class="eyebrow">אותה משכנתא. שני מבטים.</span>
      <h2 id="ledger-h">הבנק רואה תיק.<br>אני רואה משפחה עם תוכנית לעשרים וחמש שנה.</h2>
      <p>ההבדל בין ייעוץ לבין מכירה הוא מי יושב באיזה צד של השולחן.</p>
    </div>

    <div class="ledger-table">
      <div class="ledger-cols" aria-hidden="true"><span class="them">מה שהבנק רואה</span><span class="us">מה שאני רואה</span></div>

      <div class="ledger-row">
        <div class="them">לקוח</div>
        <div class="us">משפחה עם תזרים חודשי שצריך לנשום<small>גם בשנה שבה הריבית עולה, גם כשמישהו מחליף עבודה</small></div>
      </div>
      <div class="ledger-row">
        <div class="them">מסלול ברירת מחדל</div>
        <div class="us">תמהיל שנבנה על הפרופיל שלכם<small>פריים, קל״צ, צמודה — לפי סיכון שאתם יכולים לשאת, לא לפי מה שנוח לבנק</small></div>
      </div>
      <div class="ledger-row">
        <div class="them">״ריבית מיוחדת״</div>
        <div class="us">הריבית שנשארה אחרי שארבעה בנקים התחרו<small>אותו תיק נשלח במקביל. הבנק שרוצה אתכם מוריד מחיר</small></div>
      </div>
      <div class="ledger-row">
        <div class="them">עמלה על כל שינוי</div>
        <div class="us">חוזה שנקרא סעיף־סעיף לפני החתימה<small>פירעון מוקדם, שינוי מסלול, ערבים — הכל ידוע מראש</small></div>
      </div>
      <div class="ledger-row">
        <div class="them">חתימה</div>
        <div class="us">התחלה של ליווי<small>עדכון כשהריבית זזה, בדיקת מיחזור כשזה משתלם</small></div>
      </div>
    </div>
  </div>
</section>

<!-- ═══ TAMIR ═══ -->
<section class="tamir-v2" aria-labelledby="tamir-h">
  <div class="grain" aria-hidden="true"></div>
  <div class="container">
    <div class="tamir-grid">

      <div class="tamir-photo">
        <img src="assets/images/tamir-large.jpg" alt="תמיר גרמה — יועץ משכנתאות מוסמך" width="800" height="826" loading="lazy" decoding="async">
        <div class="badge"><b><span data-count="500" data-suffix="+">0</span></b>תיקים שטופלו</div>
      </div>

      <div class="tamir-copy">
        <span class="eyebrow">מי עומד מאחורי המספרים</span>
        <h2 id="tamir-h">תמיר גרמה.<br><em>עשר שנים. צד אחד.</em></h2>
        <p class="lead">
          שמונה שנים כאנליסט BI בחברות ביטוח לימדו אותי לקרוא תיק מספרי לפני שקוראים את הסיפור. היום אני מביא את אותה עין לתיק המשכנתא שלכם — כל תרחיש מחושב, כל סעיף נקרא, כל הצעה מושווית.
        </p>
        <blockquote class="tamir-quote">
          משכנתא היא ההלוואה הכי גדולה בחיים שלכם. מגיע לכם מישהו שמסתכל עליה כמו על שלו.
        </blockquote>
        <div class="cred-row">
          <span class="cred verified">יועץ משכנתאות מוסמך</span>
          <a class="cred verified" href="https://hfca.org.il/userprofile/?id=1863" target="_blank" rel="noopener">חבר התאחדות יועצי המשכנתאות</a>
          <a class="cred" href="https://www.facebook.com/tamir.grama" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.3l-.5 3.5h-2.8v8.4A12 12 0 0 0 24 12z"/></svg>
            פייסבוק · 1.2K עוקבים
          </a>
          <a class="cred" href="https://www.linkedin.com/in/tamir-garma" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.4 20.5h-3.6v-5.6c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9v5.7H9.4V9h3.4v1.6c.5-.9 1.7-1.8 3.4-1.8 3.6 0 4.3 2.4 4.3 5.5v6.2zM5.3 7.4a2.1 2.1 0 1 1 0-4.2 2.1 2.1 0 0 1 0 4.2zM7.1 20.5H3.6V9h3.5v11.5zM22.2 0H1.8C.8 0 0 .8 0 1.7v20.6c0 .9.8 1.7 1.8 1.7h20.4c1 0 1.8-.8 1.8-1.7V1.7C24 .8 23.2 0 22.2 0z"/></svg>
            לינקדאין
          </a>
        </div>
      </div>

    </div>
  </div>
</section>

`;
html = html.replace('<!-- ═══ SERVICES ═══ -->', LEDGER + '<!-- ═══ SERVICES ═══ -->');

/* ── 4. write ── */
const out = path.join(ROOT, 'index-v2.html');
fs.writeFileSync(out, html, 'utf8');
console.log('index-v2.html נכתב · ' + (html.length / 1024).toFixed(0) + ' KB');
console.log('v2.css: ' + (fs.statSync(path.join(ROOT, 'assets/v2.css')).size / 1024).toFixed(1) + ' KB');
console.log('v2.js:  ' + (fs.statSync(path.join(ROOT, 'assets/v2.js')).size / 1024).toFixed(1) + ' KB');
