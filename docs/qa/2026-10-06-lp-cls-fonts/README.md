# CLS אחרי גופני גיבוי מדודים

Head של #107: `45805da8cf675596ecfa8fe0d92ebef9720f987a`

מיזוג מקומי בלבד, לא נדחף: `45805da` + `origin/preview/template-lcp-fonts-css-2026-10-06` ב-`5ef3a65`. בעותק הזמני ה-H1 מצביע על `Frank Ruhl Libre Web`, המשפחה שה-preload של #106 טוען. ב-#107 עצמו המשפחה הראשונה נשארת `Frank Ruhl Libre` של Google Fonts.

שיטה: חציון של 3 ריצות Lighthouse קרות, `--throttling-method=devtools`, `--form-factor=mobile`, פרופיל Chrome חדש בכל ריצה, באנר העוגיות גלוי. לא simulated.

תנאי A: מותקנים Assistant, David Libre, IBM Plex Sans Hebrew, Frank Ruhl Libre, Cormorant. Noto Sans/Serif Hebrew של המערכת נשארים.

תנאי B: אותו דבר, ו-fontconfig דוחה כל קובץ Noto.

צמתי הגיבור שבבעלות דפי הנחיתה (`h1.h-hero`, `span.g`, `.rays`) קיבלו 0 ב-#107 לבד, בשני התנאים. ה-CLS הכולל שם הוא באנר העוגיות והטיקר, תבנית משותפת.

## #107 לבד

| דף | CLS A | CLS B | צמתי גיבור | LCP A | LCP B |
| --- | --- | --- | --- | --- | --- |
| yoetz-mashkantaot | 0.1541 | 0.1539 | 0 | 1982 ms | 1986 ms |
| mashkanta-kablan | 0.1538 | 0.1538 | 0 | 2009 ms | 2024 ms |
| yoetz-mashkantaot-merkaz | 0.1520 | 0.1512 | 0 | 2019 ms | 2018 ms |
| ishur-ekroni | 0.1491 | 0.1387 | 0 | 1994 ms | 1990 ms |

הצומת הגדול הוא `div#cookie` (כ-0.134) ואחריו קישור בתוך הבאנר. לא נגענו ב-`#cookie`, ב-`.rays`, ב-`ol.crumbs` או באסימוני `--f-*`.

## #107 + #106 מקומי

יעד: CLS מתחת ל-0.1, ו-LCP לא מעל המדידה החיה (יועץ כ-1772 ms, מקבלן כ-1760 ms).

| דף | CLS A | CLS B | h1 | `.rays` A | LCP A | LCP B |
| --- | --- | --- | --- | --- | --- | --- |
| yoetz-mashkantaot | 0.0763 | 0.0763 | 0 | 0.0758 | 1001 ms | 999 ms |
| mashkanta-kablan | 0.0466 | 0.0459 | 0 | 0.0461 | 995 ms | 992 ms |
| yoetz-mashkantaot-merkaz | 0.0178 | 0.0166 | 0 | 0.0172 | 1008 ms | 1005 ms |
| ishur-ekroni | 0.0005 | 0.0005 | 0 | 0 | 985 ms | 983 ms |

ארבעת הדפים מתחת ל-0.1 בשני התנאים. השארית היא `div.rays` בלי URL של פונט. מיקום `.rays` לא שונה ב-#107.

## תפר הרקע

ב-390 התפר הקשיח בין קרני הגיבור לרשת הגיליוש היה בתחתית מקטע הגיבור (כ-791px במקבלן, לא ב-y≈525). המקטע הבא עולה 64px על הריפוד הריק ונכנס במסכת גרדיאנט. אותו כלל על שאר חיבורי המקטעים. נבדק בארבעת הדפים ב-390 וב-1440: אין קפיצת צבע חדה במרזבים מעבר לקווי הרשת עצמם. `left` / `bottom` / `transform` של `.rays` לא זזו.

טביעת הטקסט מול `7cef99c` ריקה. אין שינוי צבע. בקשות ל-make.com על דף היועץ: 0, בלי שליחת טופס.

הקבצים הגולמיים: `107-A/`, `107-B/`, `merge-A/`, `merge-B/`, ו-`summary.json`.
