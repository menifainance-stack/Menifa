# עדכון ממוצעי ריבית משכנתא — בנק ישראל

**מקור אמת למסלולים:** `assets/data/boi-mortgage-averages.json`  
**ריבית מדיניות / פריים (fallback):** `MARKET_FALLBACK` ב־`assets/script.js` (שליפה חיה: `GetInterest`)  
**תצוגה:** פאנל «ממוצעי ריבית» ב־`calculators.html` (`#boi-averages-panel`)

אין להקשיח חודש ישן בכותרת הפאנל. אחרי כל פרסום BOI — לעדכן JSON, לפרוס, ולוודא שהחודש בכותרת תואם ל־`periodLabelHe`.

## מתי לעדכן

בנק ישראל מפרסם ממוצעי ריבית להלוואות חדשות בפיגור של כחודש–חודשיים אחרי חודש הדיווח.  
ריבית המדיניות (החלטת ריבית) מתעדכנת בתאריך ההחלטה — זה **לא** אותו נתון כמו ממוצע קל״צ/צמוד.

| נתון | איפה | מקור |
|------|------|------|
| ריבית בנק ישראל + פריים | `MARKET_FALLBACK` + `GetInterest` | `https://www.boi.org.il/PublicApi/GetInterest` |
| ממוצעי מסלולים (קל״צ, צמוד, וכו׳) | JSON `mortgageAverages` | [ריביות משכנתא — BOI](https://www.boi.org.il/information/interestrates/mortgage/) |

**התראת סוכן יומי:** אם `mortgageAverages.periodMonth` ישן מ־**45 יום** ביחס להיום — להתריע לתמיר שעדיין מוצג חודש דיווח ישן (ייתכן שטרם פורסם פירוט חדש; לא להמציא מספרים).

## צ׳ק־ליסט אחרי פרסום ממוצעים חדשים

1. לפתוח את [דף ריביות המשכנתא של בנק ישראל](https://www.boi.org.il/information/interestrates/mortgage/) ולאמת את **חודש הדיווח** ואת הממוצעים לפי מסלול.
2. לעדכן ב־`assets/data/boi-mortgage-averages.json`:
   - `periodMonth` (`YYYY-MM`) ו־`periodLabelHe` (למשל `יולי 2026`)
   - `tracks.klacApproxPercent`, `tracks.cpiLinkedApproxPercent`, `tracks.primeTrackPercent`
   - `tracks.variable5yApproxPercent` — **רק אם יש מספר מאומת**. אחרת להשאיר `null` (הפאנל מציג «ראו פרסום BOI», בלי להמציא).
   - `checkedAt` להיום; `notesHe` אם השתנה הניסוח.
3. אם השתנתה **ריבית המדיניות**: לעדכן `policyRate` ב־JSON **וגם** `MARKET_FALLBACK` ב־`assets/script.js` (`boi`, `prime` = BoI+1.5, `updateDate`). לא לגעת ב־`GetInterest` — השליפה החיה נשארת.
4. בפאנל `calculators.html`: ערכי ברירת־מחדל ב־HTML (noscript/לפני הטעינה) חייבים להתאים ל־JSON. הכותרת נטענת מ־`periodLabelHe`. ברירת המחדל של סליידר המיחזור: **ממוצע קל״צ + 0.2% מרווח שמרני** (מעוגל לתצוגה, כיום ≈4.9%).
5. אם יש דוגמת מיחזור ב־`calculators.html` שמצטטת ממוצעי BOI — לעדכן חודש + מסלולים. **לא** לשכתב מאמרי בלוג היסטוריים באותו הוטפיקס.
6. קומיט + דחיפה ל־`main` (דף סטטי; הפריסה ל־menifa.org תוך דקות).
7. אימות חי: [calculators.html](https://menifa.org/calculators.html) — כותרת הפאנל מציגה את `periodLabelHe` החדש, **לא** חודש ישן.

## מה אסור

- להמציא מסלול ש־BOI לא פרסם לפירוט (`null` ≠ ניחוש).
- להחליף ממוצע מסלולים בריבית מדיניות, או להפך.
- לעדכן רק את ה־HTML בלי את ה־JSON (או להפך) — הם חייבים להיות מסונכרנים.
