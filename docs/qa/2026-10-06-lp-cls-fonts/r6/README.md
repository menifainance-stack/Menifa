# r6 — CLS אחרי מיזוג #106 (`ff4110c`)

Head: `c0493c2bdff5ea5e81245d611447fe071240a768`

מיזוג של `preview/template-lcp-fonts-css-2026-10-06` ב-`ff4110ce6a814bfec62b1aff2ca3089aa63b0547` (הקרניים של `.page-hero` חזרו לעיגון התחתון). דפי הנחיתה לא מזיזים את הפיצוץ: `.rays` נשאר על `bottom:-10%` ו-`translate(-50%, 50%)`. גובה שורת הפירורים וקופסת ה-H1 שמורים בבלוק הקריטי.

כותרת הגיבור: `Frank Ruhl Libre Web`, ואז חזיתות ה-`local()` של #106. `yoetz-mashkantaot-merkaz.html` מקבל את אותו ראש כמו שלושת הדפים האחרים (preload, CSS קריטי, `site.css` אסינכרוני). אין Google Fonts.

שלוש ריצות Lighthouse קרות, מובייל, DevTools Slow 4G, פרופיל חדש, באנר העוגיות גלוי. תנאי A: פונטים עבריים מותקנים, כולל Noto. תנאי B: אותם פונטים, ו-Noto נדחה.

`div.rays` ו-`h1.h-hero` לא מופיעים ברשימת ההזזות. השארית היא הטיקר (כ-0.0005).

| דף | CLS A | CLS B | LCP A | LCP B |
| --- | --- | --- | --- | --- |
| yoetz-mashkantaot | 0.0005 | 0.0005 | 1035 ms | 1023 ms |
| mashkanta-kablan | 0.0005 | 0.0005 | 1031 ms | 1025 ms |
| yoetz-mashkantaot-merkaz | 0.0005 | 0.0005 | 1021 ms | 1019 ms |
| ishur-ekroni | 0.0005 | 0.0005 | 1010 ms | 1007 ms |

ה-LCP נמוך מהמדידה החיה (יועץ כ-1772 ms, מקבלן כ-1760 ms).

טביעת הטקסט מול `7cef99c` ריקה. בקשות ל-make.com: 0. לא נשלח טופס.

ה-JSON הגולמי: `A/` ו-`B/`. החציון המדויק ב-`summary.json`.
