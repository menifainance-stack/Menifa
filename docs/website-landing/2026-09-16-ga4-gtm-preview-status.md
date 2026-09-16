# STATUS — GA4/GTM preview install (placeholders)

**תאריך:** 2026-09-16 · Asia/Jerusalem  
**בעלות:** אתר ודפי נחיתה (ביצוע) · אנליטיקה (מפרט) · אישור לייב: תמיר בלבד  
**PR:** draft only — **Do not merge to main.**

## מצב
- **Preview בלבד** — אין לייב, אין merge ל־`main`
- מזהים: **PLACEHOLDERS בלבד** (`REPLACE_ME`) — **לא הומצאו IDs אמיתיים**

| שדה | ערך נוכחי |
|-----|-----------|
| GTM Container ID | `GTM-XXXXXXX` (**REPLACE_ME**) |
| GA4 Measurement ID | `G-XXXXXXXX` (**REPLACE_ME**; דרך GTM בלבד — לא נטען ישירות) |

אין בריפו שום `G-` / `GTM-` production ID. אל תמציאו אחד.

## מה בקוד
1. **GTM head + noscript** כ־HTML comment עם `GTM-XXXXXXX /* REPLACE_ME */` **בכל דף ציבורי** (דף הבית, מחשבונים, עמודי שירות/פילר, בלוג `art-*`, FAQ, אודות, פרטיות, תנאי שימוש). דפי preview/mockup ודפי redirect לא נכללים. העתק לשימוש: `assets/gtm-snippet.commented.html`.
2. **שער כפול שלא טוען לייב:**
   - `MENIFA_MEASUREMENT_PREVIEW = false` ב־`assets/measurement-config.js`
   - `assets/gtm-loader.js` מסרב ל־`GTM-XXXXXXX` / כל ID עם `XXX` / כל ערך שאינו `GTM-[A-Z0-9]+`
3. `assets/attribution.js` — UTM / gclid / fbclid → `sessionStorage` **first-touch** (אין overwrite). שומר גם `menifa_landing_page_path`.
4. **dataLayer (בלי PII):**
   - `form_submit_success` — אחרי `res.ok` בלבד (`lead-capture.js`, `tco-lead.js`)
   - `whatsapp_click` — קליק `wa.me` / `api.whatsapp.com` / `window.open` (`wa-track.js`; מוריד `?text=`)
   - שדות קנוניים: `landing_page_path` + `session_source` / `session_medium` / `session_campaign` (מה־first-touch store). אין name / phone / email / amount / note.

## Definition of Done — כשמגיעים IDs אמיתיים
1. תמיר יוצר GA4 + GTM וממלא IDs אמיתיים (החלפת כל `REPLACE_ME` / `GTM-XXXXXXX` / `G-XXXXXXXX`).
2. ב־GTM: Google Tag + אירועי Custom Event לשני השמות הקנוניים (`form_submit_success`, `whatsapp_click`) עם `landing_page_path`, `session_source`, `session_medium`, `session_campaign`.
3. QA Preview / DebugView: `page_view`, שליחת טופס אמיתית, קליק וואטסאפ, UTM first-touch, honeypot / מילוי מהיר **לא** יורים `form_submit_success`.
4. אישור מפורש של תמיר למיזוג ל־`main` (GitHub Pages).

**אסור:** merge ל־main · פרסום container · סימון Key events לפני QA · המצאת G-/GTM- IDs.
