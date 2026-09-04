# רשימת פעולות Google Search Console — 04/09/2026

## שלב 1: הגשת Sitemap (30 שניות, הכי חשוב)

GSC → Sitemaps → Add a new sitemap → הדבק:

```
sitemap-index.xml
```

זה מכסה את שני קבצי המשנה: 9 דפים ראשיים + 69 מאמרים = **78 כתובות**.
לפני התיקון של היום, 9 מהמאמרים לא היו בו בכלל.

---

## שלב 2: Request Indexing על 9 המאמרים שהיו מנותקים

GSC → URL Inspection → הדבק כתובת → Request Indexing.
גוגל מגביל לכ-10-12 בקשות ביום, ולכן זו בדיוק מנה אחת.

```
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

**סדר עדיפות אם נגמרה המכסה:** art-69 (PTI), art-68 (תמהיל), art-67 (מחזור).
אלה שלושת הנושאים עם נפח החיפוש הגבוה ביותר מבין התשעה.

---

## שלב 3: אימות שהתיקון עלה

אחרי המיזוג ל-main והפריסה (כ-2 דקות), פתח:
`https://menifa.org/sitemap.xml` — חפש `art-69`. אם הוא שם, התיקון באוויר.

---

## מה כבר אוטומטי מכאן והלאה

מרגע שה-workflow על main, כל מאמר חדש:
1. נכנס אוטומטית ל-sitemap, RSS, llms.txt ולסכמה של דף הבית
2. נדחף אוטומטית ל-IndexNow → Bing, Yandex, Seznam, Naver

**מה שנשאר ידני:** רק Request Indexing בגוגל. לגוגל אין API פתוח לזה,
וה-endpoint הישן של ping הוסר ב-2023. זו הפעולה היחידה שדורשת אותך.
