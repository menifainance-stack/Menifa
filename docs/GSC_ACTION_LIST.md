# רשימת פעולות Google Search Console — 06/09/2026

## שלב 1: הגשת Sitemap (30 שניות, הכי חשוב)

GSC → Sitemaps → Add a new sitemap → הדבק:

```
sitemap-index.xml
```

זה מכסה את שני קבצי המשנה: 9 דפים ראשיים + 70 מאמרים = **79 כתובות**.
לפני התיקון של היום, 9 מהמאמרים לא היו בו בכלל.

---

## שלב 2: Request Indexing על 10 המאמרים

GSC → URL Inspection → הדבק כתובת → Request Indexing.
גוגל מגביל לכ-10-12 בקשות ביום, ולכן זו בדיוק מנה אחת.

```
https://menifa.org/blog/art-70.html
https://menifa.org/blog/art-69.html
https://menifa.org/blog/art-68.html
https://menifa.org/blog/art-67.html
https://menifa.org/blog/art-66.html
https://menifa.org/blog/art-65.html
https://menifa.org/blog/art-64.html
https://menifa.org/blog/art-63.html
https://menifa.org/blog/art-62.html
https://menifa.org/blog/art-61.html
```

**סדר עדיפות אם נגמרה המכסה:** art-70 (החדש), art-69 (PTI), art-68 (תמהיל).
אלה הנושאים עם נפח החיפוש הגבוה ביותר.

---

## שלב 3: אימות שהתיקון עלה

אחרי הפריסה (כ-2 דקות מהדחיפה ל-main), פתח:
`https://menifa.org/sitemap.xml` — חפש `art-70`. אם הוא שם, התיקון באוויר.

---

## מה כבר אוטומטי מכאן והלאה

מרגע שה-workflow על main, כל מאמר חדש:
1. נכנס אוטומטית ל-sitemap, RSS, llms.txt ולסכמה של דף הבית
2. נדחף אוטומטית ל-IndexNow → Bing, Yandex, Seznam, Naver

**מה שנשאר ידני:** רק Request Indexing בגוגל. לגוגל אין API פתוח לזה,
וה-endpoint הישן של ping הוסר ב-2023. זו הפעולה היחידה שדורשת אותך.
