# Menifa — הנחיות לסוכן

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

## סטטוס נוכחי (עודכן 10/06/2026 — לאחר 23 commits של SEO push)

### ✅ שלם — קוד באוויר (סך 67+ commits עד 10/06/2026):
- **30 דפי תוכן באתר** (אינדקס, FAQ, מדריך, 5 דפים, **25 מאמרי בלוג**)
- 11 סוגי Schema.org מקיפים על דפים ראשיים — Organization, LocalBusiness, FinancialService, Person/ProfilePage, FAQPage, Service, WebSite, SpeakableSpecification, BreadcrumbList, HowTo, NewsArticle, CollectionPage, ContactPage, Blog
- robots.txt עם 14 בוטי AI search מורשים
- llms.txt + llms-full.txt — סינכרון מלא ל-25 מאמרים + ניסיון נכון (10 שנים)
- hreflang he-IL בכל **25 המאמרים** + 7 הדפים הראשיים
- Sitemap עם priorities + hreflang annotations + lastmod 2026-06-10 (30 URLs)
- מאמרים חדשים מ-10/06: art-21, art-22, art-23, art-24 (ריבית יוני 2026), **art-25 (דיור בהישג יד 2026)**
- כל 25 המאמרים: Article schema עם image + dateModified + author + publisher + breadcrumbList
- **10 מאמרים** עם FAQPage schema (art-3, 6, 10, 16, 17, 21, 22, 23, 24, 25) ל-rich results
- Pillar Page של 4,500 מילים: `/madrich-mashkanta.html` (Article+HowTo+FAQPage+BreadcrumbList)
- FAQ Page עם 20 שאלות: `/faq.html`
- **דף הבית — Title מוביל ב-"מניפה פיננסית"** + 6 קישורים פנימיים למאמרים החדשים
- about.html + contact.html + calculators.html + blog.html — כולם עם schema מלא (נוסף 10/06)
- מחשבונים עם אינדיקטורי בנק ישראל + למ"ס (מחשבון 04 מיחזור, מחשבון 06 מדד, מחשבון 02 קופת גמל)
- PageRank distribution: art-1, art-3, art-6, art-10 מקשרים גם ל-art-17/18/19/22/23/24/25

### ⏳ ממתין לפעולה ידנית של תמיר (אני לא יכול לעשות):
1. **Google Search Console — Request Indexing** על דפים מרכזיים (כולל החדשים: art-21, art-22, art-23, art-24)
2. **Submit Sitemap** מחדש ב-GSC
3. **יצירת Google Business Profile** (קטגוריה: Mortgage Broker)
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

### ❌ מה לא עובד יותר (בדקתי 09/06/2026):
- `google.com/ping?sitemap=...` — מחזיר 404 (Google deprecated)
- `bing.com/ping?sitemap=...` — מחזיר 410 Gone

### 🛑 סטופ הוק SEO:
המשתמש הגדיר goal "אתר במקום ראשון בגוגל". זה תוצאה שתלויה ב:
1. תמיר עושה Request Indexing (פעולה ידנית בלעדית שלו)
2. גוגל מחדש את ה-Cache (24-72 שעות)
3. גוגל מדרג מחדש לפי האותות החדשים (7-30 יום)
**אי אפשר לסגור את הסטופ הוק בסשן אחד.** דרושה פעולה שלו + זמן.
