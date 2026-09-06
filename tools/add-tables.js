/**
 * add-tables.js — מזריק טבלאות נתונים למאמרים שמתאימים להן.
 *
 * כלל ברזל: כל מספר בטבלה חייב להופיע כבר בגוף המאמר.
 * הטבלה מארגנת מידע קיים — לא מוסיפה נתונים חדשים.
 *
 * שימוש:  node tools/add-tables.js [--dry] [--only=art-29]
 */

const fs = require('fs');
const path = require('path');

const BLOG = path.join(__dirname, '..', 'blog');
const DRY = process.argv.includes('--dry');
const onlyArg = process.argv.find(a => a.startsWith('--only'));
const ONLY = onlyArg ? onlyArg.split('=')[1].split(',') : null;

/** בונה טבלה. anchor = טקסט בעמוד שאחרי הפסקה שלו תיכנס הטבלה */
const T = (caption, headers, rows, note) => `
<div class="table-wrap">
  <table class="data-table">
    <caption>${caption}</caption>
    <thead><tr>${headers.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead>
    <tbody>
${rows.map(r => `      <tr>${r.map((c, i) => i === 0 ? `<th scope="row" style="font-weight:600;text-align:right;padding:0.78rem 1rem;border-bottom:1px solid rgba(91,175,216,0.12);">${c}</th>` : `<td${/^[\d₪%.,\s–-]+$/.test(String(c).replace(/<[^>]*>/g,'')) ? ' class="num"' : ''}>${c}</td>`).join('')}</tr>`).join('\n')}
    </tbody>
  </table>
</div>${note ? `\n<p class="table-note">${note}</p>` : ''}
`;

/* ═══════════ הגדרות טבלה לכל מאמר ═══════════ */
const TABLES = {

  'art-29': [{
    after: /8%<\/strong>\s*—\s*מעל 17,800,000 ₪<\/li>\s*<\/ul>|מעל 17,800,000 ₪<\/li>\s*<\/ul>/,
    html: T(
      'מדרגות מס רכישה 2026 — דירה יחידה',
      ['מדרגת שווי', 'שיעור המס', 'מס מצטבר בקצה המדרגה'],
      [
        ['עד 1,978,745 ₪', '0%', '0 ₪'],
        ['1,978,745 – 5,340,425 ₪', '3.5%', '117,659 ₪'],
        ['5,340,425 – 17,800,000 ₪', '5%', '740,638 ₪'],
        ['מעל 17,800,000 ₪', '8%', 'לפי שווי'],
      ],
      'המדרגות הוקפאו ב-2026 ולא הוצמדו למדד. לדירה שנייה ומעלה — 8% מהשקל הראשון, ללא מדרגות.'
    )
  }, {
    after: /דוגמה מספרית[^<]*<\/p>/,
    html: T(
      'דוגמה: מס רכישה על דירה ב-2.5 מיליון ₪',
      ['סטטוס הרוכש', 'אופן החישוב', 'מס רכישה'],
      [
        ['דירה יחידה', '0% על 1,978,745 ₪ + 3.5% על 521,255 ₪', '<strong>18,244 ₪</strong>'],
        ['דירה שנייה ומעלה', '8% מהשקל הראשון', '<strong>200,000 ₪</strong>'],
      ],
      'הפער: 181,756 ₪ על אותה דירה בדיוק. מס הרכישה משולם מהכיס ולא ניתן לממן אותו במשכנתא.'
    )
  }],

  'art-38': [{
    after: /תיק חריג[^<]*<\/li>\s*<\/ul>|₪8,000 – ₪20,000\+<\/li>\s*<\/ul>/,
    html: T(
      'טווחי שכר טרחה לייעוץ משכנתאות — 2026',
      ['סוג התיק', 'טווח שכר טרחה', 'מורכבות'],
      [
        ['מיחזור משכנתא קיימת', '₪3,000 – ₪8,000', 'נמוכה'],
        ['רכישת דירה ראשונה', '₪4,000 – ₪12,000', 'בינונית'],
        ['רכישת דירה שנייה / השקעה', '₪5,000 – ₪15,000', 'בינונית-גבוהה'],
        ['איחוד הלוואות למשכנתא', '₪5,000 – ₪15,000', 'גבוהה'],
        ['תיק חריג — מסורבים, חוץ בנקאי', '₪8,000 – ₪20,000+', 'גבוהה מאוד'],
      ],
      'שיחת אבחון ראשונית של 30 דקות ניתנת ללא עלות, לפני כל התחייבות.'
    )
  }, {
    after: /חיסכון בריבית של 0\.5%:<\/strong>[^<]*<\/li>/,
    html: T(
      'תשואה על ההשקעה בייעוץ — משכנתא של ₪1,000,000 ל-25 שנה',
      ['שיפור בריבית', 'חיסכון מצטבר', 'מול שכר טרחה של ₪8,000'],
      [
        ['0.3%', 'כ-₪80,000', '<span class="pos">פי 10</span>'],
        ['0.5%', 'כ-₪140,000', '<span class="pos">פי 17.5</span>'],
      ],
      'החישוב מניח משכנתא טיפוסית ל-25 שנה. התשואה בפועל תלויה בגובה ההלוואה, בתמהיל ובפער הריבית שהושג.'
    )
  }],

  'art-6': [{
    after: /34%<\/strong> משתנה לא צמודה[^<]*<\/li>\s*<\/ul>/,
    html: T(
      'תמהיל מומלץ ביולי 2026 — ריבית בנק ישראל 3.50%',
      ['מסלול', 'משקל בתמהיל', 'מה זה נותן'],
      [
        ['פריים', '33%', 'נהנה מירידות ריבית נוספות'],
        ['קל"צ ל-15 שנה', '33%', 'יציבות מלאה — הריבית לא זזה'],
        ['משתנה לא צמודה ל-5 שנים', '34%', 'איזון בין השניים'],
      ],
      'התמהיל מתאים לשונא סיכון בינוני. פרופיל שמרן יגדיל את חלק הקל"צ; מי שמאמין בהמשך ירידת הריבית יגדיל את הפריים.'
    )
  }, {
    after: /קל"צ ב-4\.7%[^<]*<\/li>/,
    html: T(
      'החזר חודשי לפי מסלול — משכנתא של ₪1,500,000 ל-25 שנה',
      ['מסלול', 'ריבית', 'החזר חודשי'],
      [
        ['פריים', '5.00%', '₪9,224'],
        ['קל"צ', '4.7%', '₪8,499'],
      ],
      'ההפרש החודשי בין המסלולים אינו התמונה המלאה — הפריים עשוי לרדת עוד, והקל"צ נעול לכל התקופה.'
    )
  }],

  /* art-16 כבר מכיל טבלת DTI משלו — לא נוגעים */
};

/* ═══════════ ריצה ═══════════ */
let done = 0, added = 0;
for (const [slug, specs] of Object.entries(TABLES)) {
  if (ONLY && !ONLY.includes(slug)) continue;
  const file = path.join(BLOG, slug + '.html');
  if (!fs.existsSync(file)) { console.log(`  ✗ ${slug} — קובץ לא נמצא`); continue; }

  let html = fs.readFileSync(file, 'utf8');
  const before = html;
  let placed = 0;

  for (const spec of specs) {
    if (html.includes(spec.html.trim().slice(0, 80))) continue; // כבר קיים

    // חשוב: מחפשים עוגן רק בתוך גוף המאמר — לא בניווט, לא ב-head.
    // גבול תחתון: אחרי ה-byline (או אחרי <main> אם אין). גבול עליון: לפני ה-related.
    const bodyStart = (() => {
      const b = html.search(/<div class="article-byline">/);
      if (b !== -1) { const e = html.indexOf('</div>', html.indexOf('</div>', b) + 6); return e + 6; }
      const m2 = html.search(/<main[\s>]/); return m2 !== -1 ? m2 : 0;
    })();
    const bodyEnd = (() => {
      for (const marker of ['<section class="related-articles"', '<div class="article-cta"', '</article>']) {
        const i = html.indexOf(marker); if (i !== -1) return i;
      }
      return html.length;
    })();

    const body = html.slice(bodyStart, bodyEnd);
    const m = body.match(spec.after);
    if (!m) { console.log(`  ⚠ ${slug} — עוגן לא נמצא בגוף המאמר: ${String(spec.after).slice(0, 45)}`); continue; }
    const at = bodyStart + body.indexOf(m[0]) + m[0].length;
    html = html.slice(0, at) + '\n' + spec.html + html.slice(at);
    placed++;
  }

  if (html !== before) {
    if (!DRY) fs.writeFileSync(file, html, 'utf8');
    done++; added += placed;
    console.log(`  ✓ ${slug.padEnd(8)} ${placed} טבלאות`);
  } else {
    console.log(`  · ${slug.padEnd(8)} ללא שינוי`);
  }
}
console.log(`\n${DRY ? '[DRY RUN] ' : ''}סה"כ: ${done} מאמרים · ${added} טבלאות`);
