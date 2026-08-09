/**
 * enrich-articles.js — מזריק לכל מאמר:
 *   1. אילוסטרציית SVG בראש (לפי נושא)
 *   2. רובריקת שאלות ותשובות גלויה (נגזרת מה-FAQPage schema הקיים)
 *
 * הרעיון: ה-FAQ הוויזואלי נבנה מתוך ה-schema עצמו — כך שגוגל רואה
 * התאמה מושלמת בין הנתונים המובנים לתוכן שעל המסך.
 *
 * שימוש:  node tools/enrich-articles.js [--dry] [--only art-5,art-6]
 */

const fs = require('fs');
const path = require('path');

const BLOG_DIR = path.join(__dirname, '..', 'blog');
const DRY = process.argv.includes('--dry');
const onlyArg = process.argv.find(a => a.startsWith('--only'));
const ONLY = onlyArg ? onlyArg.split('=')[1].split(',') : null;

/* ═══════════════ ספריית אילוסטרציות ═══════════════ */
/* כל אילוסטרציה: viewBox 800x260, משתמשת בצבעי המותג */

const C = {
  navy: '#0E3C5C', navyLight: '#2D6F95', sky: '#5BAFD8',
  skySoft: '#E8F4FA', mint: '#3D8B6E', mintLight: '#7DC9A3',
  coral: '#E08866', white: '#FFFFFF', grid: 'rgba(45,111,149,0.14)'
};

function wrap(inner) {
  return `<svg viewBox="0 0 800 260" xmlns="http://www.w3.org/2000/svg" role="img" preserveAspectRatio="xMidYMid meet">${inner}</svg>`;
}

const ILLUS = {
  /* ריבית יורדת — קו שיורד עם נקודות */
  rateDown: (label) => wrap(`
    <defs><linearGradient id="rd" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${C.sky}" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="${C.sky}" stop-opacity="0"/>
    </linearGradient></defs>
    ${[60,110,160,210].map(y=>`<line x1="70" y1="${y}" x2="740" y2="${y}" stroke="${C.grid}" stroke-width="1"/>`).join('')}
    <path d="M90 70 L230 95 L370 130 L510 165 L650 195 L710 205 L710 220 L90 220 Z" fill="url(#rd)"/>
    <path d="M90 70 L230 95 L370 130 L510 165 L650 195 L710 205" fill="none" stroke="${C.sky}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
    ${[[90,70],[230,95],[370,130],[510,165],[650,195],[710,205]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="6" fill="${C.white}" stroke="${C.navy}" stroke-width="3"/>`).join('')}
    <text x="90" y="48" font-family="Heebo,sans-serif" font-size="19" font-weight="700" fill="${C.navy}">4.50%</text>
    <text x="672" y="238" font-family="Heebo,sans-serif" font-size="19" font-weight="700" fill="${C.mint}">3.50%</text>
    
  `),

  /* מסמכים — ערימת דפים עם וי */
  documents: (label) => wrap(`
    ${[0,1,2].map(i=>`<rect x="${250+i*14}" y="${52+i*10}" width="200" height="150" rx="10" fill="${C.white}" stroke="${C.sky}" stroke-width="2" opacity="${0.4+i*0.3}"/>`).join('')}
    ${[0,1,2,3].map(i=>`<rect x="300" y="${96+i*22}" width="${120-i*18}" height="7" rx="3.5" fill="${C.skySoft}"/>`).join('')}
    <circle cx="520" cy="185" r="34" fill="${C.mint}"/>
    <path d="M505 185 l11 11 l20 -23" fill="none" stroke="${C.white}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    
  `),

  /* בית / נדל"ן */
  house: (label) => wrap(`
    <path d="M400 55 L560 155 L560 215 L240 215 L240 155 Z" fill="${C.skySoft}" stroke="${C.navy}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M215 162 L400 42 L585 162" fill="none" stroke="${C.sky}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="368" y="160" width="64" height="55" rx="4" fill="${C.navy}"/>
    <rect x="278" y="122" width="42" height="42" rx="4" fill="${C.white}" stroke="${C.navyLight}" stroke-width="2"/>
    <rect x="480" y="122" width="42" height="42" rx="4" fill="${C.white}" stroke="${C.navyLight}" stroke-width="2"/>
    ${[130,105,80].map((y,i)=>`<circle cx="${648+i*0}" cy="${y}" r="${5-i}" fill="${C.mintLight}" opacity="${0.9-i*0.2}"/>`).join('')}
    
  `),

  /* תמהיל — טבעת מחולקת */
  mix: (label) => wrap(`
    <g transform="translate(400,132)">
      <circle r="72" fill="none" stroke="${C.skySoft}" stroke-width="34"/>
      <circle r="72" fill="none" stroke="${C.sky}" stroke-width="34" stroke-dasharray="150 302" transform="rotate(-90)"/>
      <circle r="72" fill="none" stroke="${C.navy}" stroke-width="34" stroke-dasharray="120 332" transform="rotate(43)"/>
      <circle r="72" fill="none" stroke="${C.mint}" stroke-width="34" stroke-dasharray="90 362" transform="rotate(150)"/>
      <text y="7" text-anchor="middle" font-family="Heebo,sans-serif" font-size="17" font-weight="700" fill="${C.navy}">תמהיל</text>
    </g>
    ${[['פריים',C.sky],['קל"צ',C.navy],['צמודה',C.mint]].map(([t,c],i)=>`
      <circle cx="596" cy="${88+i*36}" r="7" fill="${c}"/>
      <text x="614" y="${94+i*36}" font-family="Heebo,sans-serif" font-size="14" fill="${C.navy}">${t}</text>`).join('')}
    
  `),

  /* מגן — ביטוח / הגנה */
  shield: (label) => wrap(`
    <path d="M400 40 L500 74 L500 145 Q500 196 400 224 Q300 196 300 145 L300 74 Z" fill="${C.skySoft}" stroke="${C.navy}" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M362 132 l26 27 l52 -58" fill="none" stroke="${C.mint}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
    ${[[228,100],[572,100],[248,168],[552,168]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="4.5" fill="${C.sky}" opacity="0.55"/>`).join('')}
    
  `),

  /* אזהרה — משולש עם סימני קריאה */
  warning: (label) => wrap(`
    <path d="M400 48 L528 208 L272 208 Z" fill="${C.white}" stroke="${C.coral}" stroke-width="4" stroke-linejoin="round"/>
    <rect x="393" y="106" width="14" height="52" rx="7" fill="${C.coral}"/>
    <circle cx="400" cy="178" r="8.5" fill="${C.coral}"/>
    ${[[196,120],[604,120],[224,186],[576,186]].map(([x,y],i)=>`
      <g transform="translate(${x},${y})" opacity="0.42">
        <path d="M0 -13 L13 9 L-13 9 Z" fill="none" stroke="${C.coral}" stroke-width="2.5" stroke-linejoin="round"/>
      </g>`).join('')}
    
  `),

  /* שעון — זמן / תקופה */
  clock: (label) => wrap(`
    <circle cx="400" cy="130" r="80" fill="${C.white}" stroke="${C.navy}" stroke-width="4"/>
    <circle cx="400" cy="130" r="80" fill="none" stroke="${C.sky}" stroke-width="4" stroke-dasharray="340 163" stroke-linecap="round" transform="rotate(-90 400 130)"/>
    ${Array.from({length:12},(_,i)=>{const a=i*30*Math.PI/180;return `<line x1="${400+Math.sin(a)*66}" y1="${130-Math.cos(a)*66}" x2="${400+Math.sin(a)*73}" y2="${130-Math.cos(a)*73}" stroke="${C.navyLight}" stroke-width="${i%3===0?3:1.5}" stroke-linecap="round"/>`}).join('')}
    <line x1="400" y1="130" x2="400" y2="84" stroke="${C.navy}" stroke-width="5" stroke-linecap="round"/>
    <line x1="400" y1="130" x2="443" y2="152" stroke="${C.mint}" stroke-width="4" stroke-linecap="round"/>
    <circle cx="400" cy="130" r="7" fill="${C.navy}"/>
    
  `),

  /* מטבעות — חיסכון / כסף */
  savings: (label) => wrap(`
    ${[[300,60],[400,110],[500,145]].map(([x,h],i)=>`
      <g transform="translate(${x},${208-h})">
        ${Array.from({length:Math.round(h/22)},(_,j)=>`
          <ellipse cx="0" cy="${h-j*22-8}" rx="42" ry="12" fill="${j%2?C.sky:C.navyLight}" stroke="${C.navy}" stroke-width="1.5"/>`).join('')}
      </g>`).join('')}
    <path d="M300 90 Q400 40 505 62" fill="none" stroke="${C.mint}" stroke-width="3.5" stroke-dasharray="7 6" stroke-linecap="round"/>
    <path d="M496 52 L508 62 L497 73" fill="none" stroke="${C.mint}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
    
  `),

  /* אנשים — זוג / משפחה / לקוחות */
  people: (label) => wrap(`
    ${[[318,C.navy],[400,C.sky],[482,C.mint]].map(([x,c],i)=>`
      <g transform="translate(${x},${i===1?116:130})">
        <circle cy="-22" r="${i===1?27:23}" fill="${c}"/>
        <path d="M${i===1?-38:-33} ${i===1?62:56} a${i===1?38:33} ${i===1?42:37} 0 0 1 ${i===1?76:66} 0 Z" fill="${c}" opacity="0.88"/>
      </g>`).join('')}
    
  `),

  /* מאזניים — השוואה / החלטה */
  scales: (label) => wrap(`
    <line x1="400" y1="58" x2="400" y2="196" stroke="${C.navy}" stroke-width="5" stroke-linecap="round"/>
    <line x1="252" y1="72" x2="548" y2="72" stroke="${C.navy}" stroke-width="5" stroke-linecap="round"/>
    <path d="M340 196 L460 196" stroke="${C.navy}" stroke-width="6" stroke-linecap="round"/>
    <circle cx="400" cy="58" r="9" fill="${C.navy}"/>
    <g><line x1="252" y1="72" x2="252" y2="112" stroke="${C.navyLight}" stroke-width="2.5"/>
      <path d="M204 112 L300 112 L282 154 L222 154 Z" fill="${C.sky}" opacity="0.9" stroke="${C.navy}" stroke-width="2"/></g>
    <g><line x1="548" y1="72" x2="548" y2="128" stroke="${C.navyLight}" stroke-width="2.5"/>
      <path d="M500 128 L596 128 L578 170 L518 170 Z" fill="${C.mint}" opacity="0.9" stroke="${C.navy}" stroke-width="2"/></g>
    
  `),

  /* גרף עמודות — נתונים / השוואת בנקים */
  bars: (label) => wrap(`
    <line x1="120" y1="212" x2="690" y2="212" stroke="${C.navy}" stroke-width="2.5"/>
    ${[[170,88],[262,124],[354,66],[446,142],[538,100],[630,78]].map(([x,h],i)=>`
      <rect x="${x}" y="${212-h}" width="56" height="${h}" rx="6" fill="${i%2?C.sky:C.navyLight}"/>
      <text x="${x+28}" y="${206-h}" text-anchor="middle" font-family="DM Mono,monospace" font-size="12" fill="${C.navy}">${(3.2+i*0.28).toFixed(1)}%</text>`).join('')}
    
  `),

  /* חישוב — מחשבון / נוסחה */
  calc: (label) => wrap(`
    <rect x="296" y="48" width="208" height="168" rx="16" fill="${C.white}" stroke="${C.navy}" stroke-width="3.5"/>
    <rect x="318" y="68" width="164" height="40" rx="7" fill="${C.navy}"/>
    <text x="466" y="96" text-anchor="end" font-family="DM Mono,monospace" font-size="20" fill="${C.white}">₪1,200,000</text>
    ${Array.from({length:12},(_,i)=>`<rect x="${318+(i%4)*42}" y="${122+Math.floor(i/4)*30}" width="34" height="23" rx="5" fill="${i===11?C.mint:C.skySoft}" stroke="${C.navyLight}" stroke-width="1"/>`).join('')}
    ${[[228,96],[572,96],[248,166],[552,166]].map(([x,y],i)=>`<text x="${x}" y="${y}" font-family="Heebo,sans-serif" font-size="26" font-weight="700" fill="${C.sky}" opacity="0.5">${['+','−','×','%'][i]}</text>`).join('')}
    
  `)
};

/* ═══════════════ מיפוי נושא → אילוסטרציה ═══════════════ */
/* סדר חשוב — הכלל הראשון שמתאים מנצח. הספציפי לפני הכללי. */
const RULES = [
  { re: /מסמכים|טפסים|אישור עקרוני|רשימה מלאה/,             ill: 'documents', cap: 'המסמכים שהבנק דורש' },
  { re: /טעויות|מלכודות|אזהרה|משבר|פיגור|סעיפים בחוזה/,    ill: 'warning',  cap: 'נקודות סיכון שחשוב להכיר' },
  { re: /תקציב|לחסוך|חיסכון|כמה עולה|מחיר|עלות|שכר טרחה/,  ill: 'savings',  cap: 'פוטנציאל החיסכון' },
  { re: /תמהיל|חלוקת מסלולים|פרופורצי/,                     ill: 'mix',      cap: 'חלוקת תמהיל המשכנתא' },
  { re: /ביטוח|מסורב|סירוב|ערבים|בטחונות/,                  ill: 'shield',   cap: 'הגנות ובטחונות' },
  { re: /דירוג ריביות|השוואה בין הבנקים|טבלת ריביות/,       ill: 'bars',     cap: 'השוואת ריביות בין הבנקים' },
  { re: /DTI|יחס החזר|כושר החזר|מחשבון|כמה משכנתא/,        ill: 'calc',     cap: 'איך מחשבים' },
  { re: /\d+ שנה|\d+ שנים|לוח סילוקין|אורך התקופה/,         ill: 'clock',    cap: 'השפעת אורך התקופה' },
  { re: /זוג צעיר|משפחה|חיילים|תושבי חוץ|עולים|גיל השלישי|מי אני|תמיר גרמה/, ill: 'people', cap: 'למי זה מתאים' },
  { re: /ריבית|בנק ישראל|פריים|הורדת/,                      ill: 'rateDown', cap: 'מסלול הריבית של בנק ישראל' },
  { re: /לעומת| או | מול |כדאי|בחירה|השוואה/,               ill: 'scales',   cap: 'השוואה בין האפשרויות' },
  { re: /דירה|נדל|בית|שוק הדיור|קבלן|רכישה|השקעה|מס /,     ill: 'house',    cap: 'שוק הדיור בישראל' }
];

function pickIllustration(title) {
  for (const r of RULES) if (r.re.test(title)) return r;
  return { ill: 'house', cap: 'ייעוץ משכנתאות — מניפה פיננסית' };
}

/* ═══════════════ עזרי HTML ═══════════════ */
const esc = s => String(s)
  .replace(/&(?!(amp|lt|gt|quot|#\d+);)/g, '&amp;')
  .replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** ממיר טקסט תשובה לפסקאות + רשימה אם יש מונים (1) (2) */
function answerToHtml(text) {
  const t = String(text).trim();
  const listMatch = t.match(/\((\d)\)/g);
  if (listMatch && listMatch.length >= 3) {
    const idx = t.indexOf('(1)');
    const lead = t.slice(0, idx).trim().replace(/[:—-]\s*$/, '');
    const items = t.slice(idx).split(/\((?=\d\))/).map(s => s.replace(/^\d\)\s*/, '').trim()).filter(Boolean);
    return (lead ? `<p>${esc(lead)}</p>` : '') +
           `<ul>${items.map(i => `<li>${esc(i.replace(/[;.]$/, ''))}</li>`).join('')}</ul>`;
  }
  return t.split(/\n{2,}/).map(p => `<p>${esc(p.trim())}</p>`).join('');
}

/* ═══════════════ עיבוד קובץ ═══════════════ */
function processFile(file) {
  const slug = path.basename(file, '.html');
  const full = path.join(BLOG_DIR, file);
  let html = fs.readFileSync(full, 'utf8');
  const before = html;
  const actions = [];

  const titleMatch = html.match(/<title>(.*?)<\/title>/s);
  const title = titleMatch ? titleMatch[1].replace(/\s*\|.*$/, '').trim() : slug;

  /* ── 1. אילוסטרציה ── */
  if (!html.includes('article-illustration')) {
    const { ill, cap } = pickIllustration(title);
    const svg = ILLUS[ill](cap);
    const fig = `<figure class="article-illustration" aria-label="${esc(cap)}">${svg}<figcaption>${esc(cap)}</figcaption></figure>\n`;

    // עוגן ראשי: אחרי ה-byline (תומך גם בכתיב צמוד וגם רב-שורתי)
    let at = -1;
    const bylineRe = /<div class="article-byline">[\s\S]*?<\/div>\s*<\/div>/;
    const bm = html.match(bylineRe);
    if (bm) at = html.indexOf(bm[0]) + bm[0].length;
    if (at === -1) {
      // גיבוי — פתיחת ה-container הראשי אחרי ה-hero
      const m = html.match(/<div class="container"[^>]*max-width:780px[^>]*>/);
      if (m) at = html.indexOf(m[0]) + m[0].length;
    }
    if (at !== -1) {
      html = html.slice(0, at) + '\n' + fig + html.slice(at);
      actions.push(`illustration:${ill}`);
    }
  }

  /* ── 2. רובריקת שאלות ותשובות (מה-schema) ── */
  if (!html.includes('article-faq')) {
    // תומך גם ב-FAQPage עצמאי וגם בתוך @graph
    const allSchemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
      .map(m => { try { return JSON.parse(m[1]); } catch { return null; } })
      .filter(Boolean)
      .flatMap(d => Array.isArray(d['@graph']) ? d['@graph'] : [d]);
    const faqBlock = allSchemas.find(d => {
      const t = d['@type'];
      return t === 'FAQPage' || (Array.isArray(t) && t.includes('FAQPage'));
    });

    if (faqBlock && Array.isArray(faqBlock.mainEntity) && faqBlock.mainEntity.length) {
      const qas = faqBlock.mainEntity.map(q => {
        const a = q.acceptedAnswer && q.acceptedAnswer.text ? q.acceptedAnswer.text : '';
        return `    <div class="faq-qa">
      <h3>${esc(q.name)}</h3>
      ${answerToHtml(a)}
    </div>`;
      }).join('\n');

      const section = `
  <section class="article-faq" aria-labelledby="faq-h-${slug}">
    <h2 id="faq-h-${slug}">שאלות ותשובות</h2>
    <p class="faq-intro">התשובות לשאלות שהכי חוזרות אצל לקוחות בנושא הזה.</p>
${qas}
  </section>
`;
      // עוגן ראשי: לפני ה-CTA. גיבוי: לפני סגירת ה-article
      let ctaAt = html.indexOf('<div class="article-cta">');
      if (ctaAt === -1) ctaAt = html.indexOf('</article>');
      if (ctaAt !== -1) {
        html = html.slice(0, ctaAt) + section + '\n    ' + html.slice(ctaAt);
        actions.push(`faq:${faqBlock.mainEntity.length}`);
      }
    }
  }

  if (html !== before && !DRY) fs.writeFileSync(full, html, 'utf8');
  return { slug, actions, changed: html !== before };
}

/* ═══════════════ ריצה ═══════════════ */
const files = fs.readdirSync(BLOG_DIR)
  .filter(f => /^art-\d+\.html$/.test(f))
  .filter(f => !ONLY || ONLY.includes(path.basename(f, '.html')))
  .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]));

let changed = 0, illus = 0, faqs = 0;
for (const f of files) {
  const r = processFile(f);
  if (r.changed) {
    changed++;
    r.actions.forEach(a => { if (a.startsWith('illustration')) illus++; if (a.startsWith('faq')) faqs++; });
    console.log(`  ✓ ${r.slug.padEnd(8)} ${r.actions.join('  ')}`);
  } else {
    console.log(`  · ${r.slug.padEnd(8)} (כבר מועשר)`);
  }
}
console.log(`\n${DRY ? '[DRY RUN] ' : ''}סה"כ: ${changed}/${files.length} קבצים · ${illus} אילוסטרציות · ${faqs} רובריקות FAQ`);
