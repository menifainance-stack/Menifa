# תוכנית עבודה יומית אוטונומית — SEO menifa.org

**מטרה:** דירוג האתר במקומות הראשונים בגוגל על "יועץ משכנתאות" ומונחים קשורים.

**מיושם:** 2 ביולי 2026
**עדכון תקופתי:** אחת לשבועיים

---

## 🎯 היעד המרכזי

הופעה ב-**top 10** של Google.co.il על 5 קווי מפתח:
1. `יועץ משכנתאות` — generic, תחרות גבוהה
2. `יועץ משכנתאות בישראל 2026` — long-tail
3. `מיחזור משכנתא 2026` — high-intent
4. `מסמכים למשכנתא` — high-intent
5. `תמיר גרמה` — brand

---

## ⚙️ פעולות אוטומטיות יומיות (7:03 בוקר)

CronCreate מפעיל את התוכנית מדי יום:

### שלב 1 — Content Freshness (2 דקות)
- **rotating: מאמר אחד ליום**, לפי הרשימה:
  - א׳: art-1, art-8, art-15, art-22, art-29, art-36
  - ב׳: art-2, art-9, art-16, art-23, art-30, art-37
  - ג׳: art-3, art-10, art-17, art-24, art-31, art-38
  - ד׳: art-4, art-11, art-18, art-25, art-32, art-39
  - ה׳: art-5, art-12, art-19, art-26, art-33, art-40
  - ו׳: art-6, art-13, art-20, art-27, art-34, art-41
  - שבת: art-7, art-14, art-21, art-28, art-35, art-42
- מבצע:
  - עדכון `dateModified` בschema.org
  - עדכון `og:updated_time`
  - Commit + Push

### שלב 2 — IndexNow POST (30 שניות)
- POST ל-api.indexnow.org עם 3-5 URLs מעודכנים
- שולח signal ל-Bing/Yandex/Seznam/Naver
- מקסימום 100 URLs/יום לפי rate limit

### שלב 3 — Performance Check (2 דקות)
- WebSearch על 5 קווי מפתח מרכזיים
- זיהוי שינויים ב-cache "עיצוב גרפי"
- קריאה של impressions/clicks מ-GSC (דרך Chrome MCP)

### שלב 4 — Actionable Report (1 דקה)
- סיכום שינויים ב-24h
- הודעה על כל dashboard update
- זיהוי דפים שירדו/עלו בdirtsp

---

## 📝 פעולות שבועיות

### יום ראשון בבוקר: **מאמר חדש**
- נושא: high-intent gap שזוהה בdata של השבוע
- 1,200-2,000 מילים
- Schema: Article + BreadcrumbList + FAQPage + HowTo (אם רלוונטי)
- 6+ קישורים פנימיים
- אחרי פרסום: IndexNow POST + Request Indexing ב-GSC (ידני של תמיר)

### יום רביעי: **עדכון תוכן ריכוזי**
- מדריך משכנתאות (madrich-mashkanta.html) — הוספת סעיף חדש
- FAQ — הוספת 2-3 שאלות נפוצות
- Calculators — בדיקת דיוק הנתונים

### יום שישי: **סיכום שבועי**
- ניתוח דירוגים
- הוצאה של רשימת keyword opportunities לשבוע הבא
- שידור לתמיר בטלגרם (אם מוגדר)

---

## 📅 פעולות חד-פעמיות (רק לתמיר)

**חובה — פעולות ידניות של תמיר** (עצרתי בOAuth grant בסשן הקודם):

1. **Bing Webmaster Tools** — 30 שניות
   - `bing.com/webmasters` → Sign In → Google (menifainance@gmail.com)
   - Continue במסך OAuth
   - Add site → menifa.org → Import from GSC
   - Submit sitemap-index.xml

2. **Google Business Profile** — 5 דקות (הכי חשוב!)
   - `google.com/business/`
   - Category: Mortgage Broker
   - Phone: 052-4502821
   - Verify (SMS)

3. **Yandex Webmaster** — 2 דקות (שוק רוסי)
4. **Directory registrations** (למחר):
   - midrag.co.il
   - pro.co.il
   - bizreviews.co.il

---

## 🎁 חבילת התוצאות המצופה

| Timeline | תוצאה |
|----------|-------|
| **תוך 3 ימים** | Dashboard מציג 37/2 (מ-33/6) |
| **תוך שבוע** | Cache "עיצוב גרפי" מתחלף למטאדאטה החדשה |
| **תוך שבועיים** | brand search "תמיר גרמה" מדורג top 3 |
| **תוך חודש** | Position ממוצע 36→25 |
| **תוך 90 יום** | דירוג ל-long-tail (מסמכים למשכנתא, מיחזור וכו') top 10 |
| **תוך 6 חודשים** | "יועץ משכנתאות" — page 2 |
| **תוך 12 חודשים** | "יועץ משכנתאות" — page 1, top 10 |

---

## 🔥 KPIs שאני עוקב אחריהם

- **Indexed pages** (GSC dashboard) — יעד: 37+
- **Impressions** (רבעון) — התחלה: 632 → יעד: 5,000
- **Clicks** (רבעון) — התחלה: 20 → יעד: 200
- **Position ממוצע** — התחלה: 36 → יעד: 15
- **Brand visibility** — WebSearch "תמיר גרמה" מציג menifa.org

---

**Log:** כל פעולה יומית מתועדת ב-`SEO_LOG.md` (נוצר אוטומטית).
