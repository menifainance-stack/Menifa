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

## סטטוס נוכחי (עודכן 09/06/2026 — אחרי SEO Push מקיף)

### ✅ שלם — קוד באוויר (10 commits ב-09/06/2026):
- 20 דפי תוכן באתר (אינדקס, FAQ, מדריך, 5 דפים, 18 מאמרי בלוג)
- 9 סוגי Schema.org מקיפים (Org, LocalBusiness, FinancialService, Person, FAQPage, Service, WebSite, Speakable, BreadcrumbList, HowTo)
- robots.txt עם 14 בוטי AI search מורשים
- llms.txt + llms-full.txt (תקן 2024-2025 ל-AI search)
- hreflang he-IL בכל הדפים הראשיים
- Sitemap עם priorities + hreflang annotations + lastmod 2026-06-09
- 5 מאמרי SEO חדשים: art-16 (DTI), art-17 (חוץ בנקאית), art-18 (השוואת ריביות), art-19 (מסורבי בנק), art-20 (25 vs 30 שנה)
- Pillar Page של 4,500 מילים: `/madrich-mashkanta.html`
- FAQ Page עם 20 שאלות: `/faq.html`
- SEO_ACTION_PLAN.md עם תוכנית פעולה ידנית לתמיר
- מסמכי mockups (3 סקיצות עיצוב + 9 פלטות צבע)

### ⏳ ממתין לפעולה ידנית של תמיר (אני לא יכול לעשות):
1. **Google Search Console — Request Indexing** על 6 דפים מרכזיים
2. **Submit Sitemap** מחדש ב-GSC
3. **יצירת Google Business Profile** (קטגוריה: Mortgage Broker)
4. **רישום ב-4 ספריות:** midrag.co.il, pro.co.il, bizreviews.co.il, moti.org.il
5. **חוות דעת מלקוחות** ב-Google + מידרג

### ⚠️ מצב בגוגל (לפי live WebSearch 09/06/2026):
- `site:menifa.org` מציג רק תוצאה אחת: "מניפה | עיצוב גרפי" — **Cache ישן!**
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
