# קטלוג הספריות — מה כל אחת עושה לעסק של תמיר (מאומת 10–11/09/2026)

לכל ספרייה: **מה זה** בשפה פשוטה · **מה זה עושה לנו** בפועל · **סטטוס** (בנוי / מוכן להקמה / רעיון) · עלות.
"בנוי" = יש קוד בריפו הזה שמשתמש בה. קישור לגיטהאב לכל אחת. מספרי כוכבים — כפי שדווחו במקור, לא נספרו ידנית.

---

## א. סרטונים — תמיר מצלם את עצמו, המחשב עורך

| # | ספרייה | מה זה | מה זה עושה לעסק | סטטוס |
|---|---|---|---|---|
| 1 | [auto-editor](https://github.com/WyattBlue/auto-editor) | כלי שורת פקודה שמזהה שקטים בסאונד וחותך אותם | תמיר מצלם 3 דקות עם "אממ" והפסקות, מקבל 1:40 קצבי בלי לגעת בעורך. חוסך 20 דק' עריכה לסרטון | **בנוי** — `tools/video/reel.py` שלב 1 |
| 2 | [faster-whisper](https://github.com/SYSTRAN/faster-whisper) | מנוע תמלול מהיר על בסיס Whisper של OpenAI, רץ מקומית | הבסיס לכתוביות ולתמלול שיחות. רץ על המחשב, שום הקלטה לא עולה לענן | **בנוי** — שלב 2 |
| 3 | [ivrit-ai/faster-whisper-v2-d4](https://huggingface.co/ivrit-ai/faster-whisper-v2-d4) · [whisper-large-v3](https://huggingface.co/ivrit-ai/whisper-large-v3) | מודלי Whisper שכוונו לעברית על 350 שעות דיבור ישראלי, פרויקט מתנדבים | ההבדל בין כתוביות שמביכות ("משכנתא" → "משך נתה") לכתוביות נכונות. גם שיחות המתאם יתומללו נכון | **בנוי** — מודל ברירת המחדל |
| 4 | ffmpeg via [imageio-ffmpeg](https://github.com/imageio/imageio-ffmpeg) | ffmpeg (סכין הצבאי של הוידאו) כחבילת פייתון, בלי התקנה | חיתוך ל-9:16, צריבת כתוביות, דחיסה לאינסטגרם. עובד על Mac/Windows בלי להתקין כלום | **בנוי** — שלבים 3–4 |
| 5 | [pycaps](https://github.com/francozanardi/pycaps) | כתוביות מעוצבות ב-CSS עם אנימציות (פופ, טייפרייטר, אימוג'י) | הרמה הבאה של כתוביות: "המילה קופצת" כמו ביוטיוברים. כשהבסיס עובד — מחליף את ה-ASS שבנינו | מוכן להקמה (P1) |
| 6 | [WhisperX](https://github.com/m-bain/whisperx) | Whisper + יישור מילים מדויק + זיהוי מי מדבר (pyannote) | לשיחות המתאם: "המתאם אמר / הלקוח אמר". בלי זה אי אפשר לנקד תסריט | מוכן להקמה (P1) |
| 7 | [OpenCut](https://github.com/opencut-app/opencut) | עורך וידאו חינמי בדפדפן, "CapCut בקוד פתוח", MIT | כשצריך יד אנושית: לחתוך קטע, להוסיף לוגו. הסרטונים לא עוזבים את המחשב (פרטיות לקוחות בהקלטות) | להתקין כשצריך |
| 8 | [clippyme](https://github.com/fralapo/clippyme) · [openshorts](https://github.com/mutonby/openshorts) | סרטון ארוך → קליפים 9:16 עם זיהוי "רגעים ויראליים", מעקב פנים, כתוביות | הרצאה/וובינר/זום של 40 דקות → 8 רילס. כל שיחת ייעוץ מוקלטת (בהסכמה) = חומר גלם | מוכן להקמה (P1) |
| 9 | [subsai](https://github.com/absadiki/subsai) | ממשק גרפי לכתוביות עם כל וריאנטי Whisper | לאיש צוות שלא רוצה שורת פקודה | חלופה (P2) |
| 10 | [Remotion](https://github.com/remotion-dev/remotion) | יצירת וידאו מקוד React. **לא OSI** — חינם עד 3 עובדים ([רישיון](https://www.remotion.dev/docs/license/faq)) | כרטיס וידאו אוטומטי "ריבית ב"י ירדה ל-X" בכל שינוי ב-`DATA_SOURCE_OF_TRUTH.md`, בלי לצלם | רעיון (P2) |

## ב. האתר — לדעת כל שבוע מה שבור, לפני גוגל

| # | ספרייה | מה זה | מה זה עושה לעסק | סטטוס |
|---|---|---|---|---|
| 11 | [Lighthouse](https://github.com/GoogleChrome/lighthouse) | הכלי של גוגל לציון עמוד: מהירות, SEO, נגישות | אותו ציון שגוגל מסתכל עליו. עמוד איטי = דירוג נמוך = פחות לידים | **בנוי** — דרך Unlighthouse |
| 12 | [Unlighthouse](https://github.com/harlan-zw/unlighthouse) | מריץ Lighthouse על **כל** האתר מה-sitemap, דשבורד אחד | 79 עמודים, ציון לכל אחד, כל יום ראשון. מאמר שנפל מ-90 ל-60 מתגלה השבוע, לא בעוד חצי שנה | **בנוי** — `.github/workflows/site-audit.yml` |
| 13 | [pa11y-ci](https://github.com/pa11y/pa11y-ci) | בודק נגישות WCAG 2.1 AA אוטומטי | האתר מצהיר AA. בישראל זו חובה חוקית לאתרים עסקיים (תקנות הנגישות). הדוח השבועי הוא ההוכחה והביטוח | **בנוי** — אותו workflow |
| 14 | [lychee](https://github.com/lycheeverse/lychee) | בודק קישורים שבורים, מהיר מאוד (Rust), יש לו GitHub Action | 70 מאמרים מקשרים לבנקים ולבנק ישראל, והם משנים כתובות. קישור שבור = חוויית לקוח גרועה + פגיעה ב-SEO | **בנוי** — אותו workflow |
| 15 | [Umami](https://github.com/umami-software/umami) | אנליטיקס בלי קוקיז, self-hosted, MIT | לדעת איזה מאמר מייצר לידים בלי לאסוף מידע אישי (תיקון 13). מחליף Google Analytics | מוכן להקמה (P1) |
| 16 | [Formbricks](https://github.com/formbricks/formbricks) | סקרים, NPS וטפסים באתר ובלינק, AGPL | סקר NPS אחרי תביעה = הרגע לבקש הפניה. "מה חסר במאמר?" = תוכן הבא | מוכן להקמה (P1) |
| 17 | [Chatwoot](https://github.com/chatwoot/chatwoot) | תיבת שירות אחת: צ'אט באתר + וואטסאפ + מייל, MIT | היום כל CTA באתר = "תתקשר". צ'אט תופס את מי שגולש ב-23:00 ולא יתקשר | P2 |
| — | Playwright (כבר בשימוש) | בדיקות דפדפן אוטומטיות | 36 בדיקות על טפסי הלידים | קיים |

## ג. משכנתאות — המקצוע עצמו, כקוד

| # | ספרייה | מה זה | מה זה עושה לעסק | סטטוס |
|---|---|---|---|---|
| 18 | [numpy-financial](https://github.com/numpy/numpy-financial) | פונקציות פיננסיות (PMT, IPMT, NPV) של קהילת NumPy | הבסיס המתמטי המקובל. מעליו כתבנו את **הישראלי**: מדד, פריים, משתנה, עמלות | **בנוי** — `tools/mortgage_engine/` (17 בדיקות) |
| 19 | [amortize](https://github.com/ahmetpia/amortize) | לוחות סילוקין + השוואת מיחזור + ייצוא Excel | ייצוא ה-דוח כדאיות לאקסל ללקוח שאוהב אקסל | P1 |
| 20 | [israeli-mortgage-calculator](https://github.com/aaron-a-d/israeli-mortgage-calculator) | ניסיון של מפתח יחיד (Streamlit) למסלולים ישראליים. 0 כוכבים, בלי רישיון | רק כדי לראות שמישהו ניסה. **המנוע שלנו כבר עושה יותר** | רפרנס בלבד |
| — | Bank of Israel SDMX API | נתונים רשמיים במבנה סטנדרטי | להזין ריבית ב"י ל-`DATA_SOURCE_OF_TRUTH.md` אוטומטית דרך Actions (הסביבה כאן חסומה ל-boi) | P1 |

**מה בנינו שלא קיים בשום מקום:** `tools/mortgage_engine` — קל"צ / ק"צ / פריים / משתנה, הצמדה למדד, נקודות שינוי,
עמלות פירעון מוקדם לפי צו הבנקאות (תפעולית, אי-הודעה, היוון עם הנחות 20%/30%, מדד ממוצע), השוואת מחזור עם
פסק-דין בשלוש דרגות, ודוח כדאיות בעמוד אחד. `python3 tools/mortgage_engine/cli.py demo`.

## ד. מכירות, שירות ותפעול — עמדת המתאם

| # | ספרייה | מה זה | מה זה עושה לעסק | סטטוס |
|---|---|---|---|---|
| 21 | [Cal.com](https://github.com/calcom/cal.com) · [cal.diy](https://github.com/calcom/cal.diy) | קביעת פגישות בקישור, כמו Calendly, בקוד פתוח | המתאם שולח קישור "בדיקת משכנתא 20 דק'", הלקוח בוחר שעה, נכנס ליומן של תמיר, תזכורות אוטומטיות, webhook ל-Make | **בנוי** — `services/referral-desk/` |
| 22 | [Twenty](https://github.com/twentyhq/twenty) | CRM מודרני בקוד פתוח, AGPL | CRM **לתהליך ההפניה בלבד**: שיחה → הסכמה → הפניה → פגישה → פסק-דין. בלי לגעת בנתוני הפוליסות של הסוכנות | **בנוי** — אותו compose + מודל נתונים |
| 23 | [Postiz](https://github.com/gitroomhq/postiz-app) | תזמון פוסטים ל-30+ רשתות, AI לכיתובים, self-hosted, AGPL | סרטון אחד מהצינור → אינסטגרם, טיקטוק, פייסבוק, יוטיוב, לינקדאין בלחיצה. מחליף 20 דק' ביום | מוכן להקמה (P1) |
| 24 | [Documenso](https://github.com/documenso/documenso) | חתימה דיגיטלית, self-hosted, AGPL | הסכם ייעוץ משכנתא + **טופס הסכמה לשיווק** חתום ומתועד = ההגנה מול תיקון 13 וחוק הספאם | P1 |
| 25 | [n8n](https://github.com/n8n-io/n8n) | אוטומציה כמו Make, self-hosted, Sustainable Use License | חלופה ל-Make אם החשבון גדל. **לא עכשיו** — Make עובד ומחובר לכל דבר | P2 |
| 26 | [WAHA](https://github.com/devlikeapro/waha) | WhatsApp HTTP API, Apache-2.0, חינם | כבר בתוכנית הסיכום היומי; גם המנוע של Chatwoot-וואטסאפ | **בנוי** — `services/wa-collector/` |
| 27 | [GREEN-API](https://green-api.com/en) (שירות, לא קוד פתוח) | WhatsApp API מנוהל, חינם עד 3 צ'אטים | המסלול הפעיל לסיכום קבוצות היועצים בלי שרת | **בנוי** — `tools/wa_pull.py` |

---

## מה בנוי היום (11/09/2026) ואיך מפעילים

| מה | פקודה / מקום | דורש מתמיר |
|---|---|---|
| צינור סרטונים | `python3 tools/video/reel.py clip.mp4` | `pip install -r tools/video/requirements.txt`, פונט Heebo |
| ביקורת אתר שבועית | Actions → "אתר — ביקורת שבועית" → Run | כלום. רץ לבד כל יום ראשון |
| מנוע משכנתא | `python3 tools/mortgage_engine/cli.py demo` | לאמת עמלות מול דף פירעון אמיתי אחד |
| עמדת המתאם | `services/referral-desk/docker compose up -d` | שרת (Hetzner) או Cal.com Cloud + Sheet כחלופה |
