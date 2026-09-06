# Menifa — הנחיות לסוכן

## תובנת פייסבוק יומית (חלק מהמייל היומי)

בכל עדכון יומי, לאחר טבלת הנתונים במייל, יש להוסיף בלוק HTML עם **תובנה מקצועית קצרה** (3-5 משפטים בעברית) שתמיר יכול להעתיק ולפרסם בפייסבוק.

**כללים לתובנה:**
- כותרת מסקרנת + תוכן מעשי שנוגע ישירות ללווי משכנתאות
- מבוסס על הנתונים של אותו יום (ריבית, מדד, שינויים)
- מנקודת מבט של יועץ — לא "הבנק אמר", אלא "מה זה אומר לכם בפועל"
- מסתיים עם CTA עדין (כגון: "שאלות? DM תמיר גרמה — מניפה פיננסית")
- טון: מקצועי אבל חם, כמו ייעוץ של חבר שמבין בתחום
- בין 80-120 מילים בעברית

**פורמט HTML בלוק למייל:**
```html
<div style='margin-top:24px;background:#fff;border-radius:12px;padding:20px;border-right:4px solid #B89259'>
  <p style='color:#B89259;font-weight:700;margin:0 0 8px'>💡 תובנה לפייסבוק — העתק ושתף:</p>
  <p style='color:#2E363F;line-height:1.7;margin:0;white-space:pre-line'>INSIGHT_TEXT</p>
</div>
```

---

## כלל עבודה בסיסי

אם אתה לא בטוח במשהו — אל תענה. אמור "אני לא בטוח, אבדוק" או שאל את תמיר.
אל תנחש, אל תשער, אל תאבחן על סמך מידע חלקי.
רק עובדות מאומתות — לא ניחושים.

## בדיקת תקינות האתר

WebFetch ו-curl מהסביבה הזו מחזירים 403 עבור menifa.org גם כשהאתר חי לגמרי.
**אל תאבחן את האתר כשבור על סמך שגיאות כלים בלבד.**

מקורות מהימנים בלבד לבדיקת סטטוס האתר:
1. צילומי מסך מ-Google Search Console שהמשתמש שולח
2. תוצאות `WebSearch("site:menifa.org")`
3. אישור מפורש מהמשתמש

אם כלי מחזיר שגיאה — אמור "הכלי לא מצליח לגשת" ואל תסיק מסקנות על האתר עצמו.

### WebSearch אינו מקור אמין למצב הדירוג

**מאומת 06/09/2026 — כשל שקרה בפועל:**
WebSearch על "תמיר גרמה" החזיר תמיר גל, תמיר בר, ומילון עברי.
בגוגל האמיתי (צילום מסך של תמיר) התוצאות היו:
1. menifa.org — מקום ראשון
2. hfca.org.il — פרופיל בהתאחדות יועצי המשכנתאות
3. Facebook — תמיר גרמה משכנתאות ופיננסים (1.2K עוקבים)
4. menifa.org/blog/art-42

**הכלל:** WebSearch מחזיר תוצאות שונות מגוגל של המשתמש. אסור לבנות
עליו אבחנה על דירוג, על נוכחות, או על קיום ישות.

אם WebSearch מחזיר תוצאות שנראות לא רלוונטיות — זו בעיה בכלי, לא באתר.
אמור "הכלי לא מחזיר תוצאות אמינות" ובקש צילום מסך מגוגל.

**מה שכן אמין:** צילומי מסך של תמיר · Google Search Console · אישור מפורש שלו.

## סטטוס נוכחי (עודכן 01/07/2026 — לאחר 13 commits בסשן /loop)

### ✅ שלם — קוד באוויר (סך 80+ commits עד 01/07/2026):
- **44 דפי תוכן באתר** (אינדקס, FAQ, מדריך, 6 דפים ראשיים + privacy/terms, **39 מאמרי בלוג**)
- 13 סוגי Schema.org מקיפים — Organization, LocalBusiness, FinancialService, Person/ProfilePage, FAQPage, Service+OfferCatalog, WebSite, SpeakableSpecification, BreadcrumbList, HowTo, NewsArticle, CollectionPage, ContactPage, Blog, WebApplication (FinanceApplication)
- robots.txt עם 14 בוטי AI search מורשים + Disallow על preview/mockup files
- llms.txt + llms-full.txt — סינכרון מלא ל-39 מאמרים (עודכן ליולי 2026)
- hreflang he-IL בכל 39 המאמרים + 9 הדפים הראשיים (כולל privacy/terms)
- **Sitemap עם 48 URLs** — priorities + hreflang annotations + lastmod 2026-07-01
- **RSS feed פעיל** (rss.xml, 14 items) + link rel=alternate מ-index/blog
- מאמרים חדשים מ-01/07/2026: art-35 (מסמכים), art-36 (מלכודות בחוזה), art-37 (משכנתא הפוכה), art-38 (כמה עולה יועץ + Service schema), art-39 (חיילים משוחררים)
- **CRITICAL bug fixes**: canonical URLs תוקנו (הצביעו ל-github.io בטעות), sitemap חסר 9 מאמרים תוקן, art-19+20 יתומים חוברו
- כל 39 המאמרים: Article schema מלא + dateModified + author + publisher + breadcrumbList
- FAQPage schema על כ-20 מאמרים
- SpeakableSpecification על index/faq/about/calculators/madrich (voice search boost)
- Pillar Page של 4,500 מילים: `/madrich-mashkanta.html`
- FAQ Page עם 20 שאלות: `/faq.html`
- **דף הבית**: 4 מאמרים חדשים מוצגים ("מאמרים חדשים"), Slogan "בצד שלכם, לא של הבנק"
- Service schema ב-art-38 עם OfferCatalog (₪0 ל-₪20K תמחור מפורש)
- מחשבונים: WebApplication schema + FinanceApplication category

### ⏳ ממתין לפעולה ידנית של תמיר (אני לא יכול לעשות):
1. **Google Search Console — Request Indexing** על המאמרים החדשים: art-35, art-36, art-37, art-38, art-39 + privacy/terms + rss.xml
2. **Submit Sitemap.xml מחדש** ב-GSC (48 URLs עכשיו, לעומת 34 בעבר)
3. **יצירת Google Business Profile** (קטגוריה: Mortgage Broker) — הכי חשוב לpresence מקומית
4. **רישום ב-4 ספריות:** midrag.co.il, pro.co.il, bizreviews.co.il, moti.org.il
5. **חוות דעת מלקוחות** ב-Google + מידרג

### ⚠️ מצב בגוגל (לפי live WebSearch 10/06/2026):
- `site:menifa.org` מציג רק תוצאה אחת: "מניפה | עיצוב גרפי" — **Cache ישן!**
- חיפוש "מניפה פיננסית תמיר גרמה" — האתר לא בעמוד הראשון
- חיפוש "תמיר גרמה יועץ משכנתאות" — האתר לא מופיע, יש מתחרים אחרים בשם תמיר (תמיר פרחי, תמיר מור)
- האתר אכן מאונדקס, אבל עם תוכן ישן (לפני המעבר לייעוץ משכנתאות)
- אחרי שתמיר יעשה Request Indexing → Cache יתעדכן תוך 24-72 שעות
- אז דירוג #1 לbranded terms ("מניפה פיננסית", "תמיר גרמה") תוך 7-14 יום
- דירוג ל-long-tail (מחזור משכנתא 2026 וכו') — 60-90 יום
- דירוג ל-generic ("יועץ משכנתאות") — 6-12 חודש (תחרות גבוהה, מדורגים directories)

### ❌ מה לא עובד יותר (מאומת 01/07/2026):
- `google.com/ping?sitemap=...` — מחזיר 404 (Google deprecated)
- `bing.com/ping?sitemap=...` — מחזיר 410 Gone

### ✅ מה כן עובד עכשיו (מאומת 01/07/2026):
- **IndexNow POST** ל-`https://api.indexnow.org/indexnow` — מחזיר **HTTP 202 Accepted** עם 51 URLs שנדחפו במעבד
- **menifa.org** נגיש 100% — HTTP 200, Last-Modified 2026-07-01, X-Cache: MISS (טרי מהמקור)
- Bing/Yandex/Seznam/Naver יסרקו את 51 ה-URLs תוך 24 שעות ⇒ אפשרות ל-Google spillover

### 🛑 סטופ הוק SEO:
המשתמש הגדיר goal "אתר במקום ראשון בגוגל". זה תוצאה שתלויה ב:
1. תמיר עושה Request Indexing (פעולה ידנית בלעדית שלו)
2. גוגל מחדש את ה-Cache (24-72 שעות)
3. גוגל מדרג מחדש לפי האותות החדשים (7-30 יום)
**אי אפשר לסגור את הסטופ הוק בסשן אחד.** דרושה פעולה שלו + זמן.
