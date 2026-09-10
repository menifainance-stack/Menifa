# סיכום יומי — קבוצות וואטסאפ של יועצי משכנתאות

**המטרה:** כל בוקר 08:30, מייל (ו/או הודעת וואטסאפ קצרה) עם: המקרים שיועצים העלו אתמול
ואיך פתרו, חידושים בבנקים ורגולציה, שאלות שנשארו פתוחות, ורעיונות לתוכן.

**עודכן:** 10/09/2026. כל מה שכתוב כאן אומת מול מקורות חיים באותו יום.

---

## 1. סריקת כל האופציות הקיימות (מאומת)

אין דרך רשמית. ה-Groups API של Meta (יוני 2026) עובד רק על קבוצות שהעסק יוצר, עד 8
משתתפים — לא קבוצות קיימות ([Meta](https://developers.facebook.com/documentation/business-messaging/whatsapp/groups),
[Unipile](https://www.unipile.com/whatsapp-group-api/)). לכן כל פתרון בעולם משתמש באחת מ-5 הטכניקות:

| # | טכניקה | מימושים מאומתים | עלות | סיכון חסימה | מאמץ | ציון |
|---|---|---|---|---|---|---|
| **A** | **Linked device בקוד פתוח** — השרת מתחזה למחשב מקושר ומקבל כל הודעה | [WAHA](https://github.com/devlikeapro/waha) (Apache-2.0, **כל הפיצ'רים חינם מ-2026.6.1**), [Evolution API](https://github.com/evolution-foundation/evolution-api) (Baileys, דורש Postgres+Redis), ספריות: [Baileys](https://www.npmjs.com/package/@whiskeysockets/baileys), [whatsmeow](https://github.com/tulir/whatsmeow), [whatsapp-web.js](https://docs.wwebjs.dev/) | ₪0 תוכנה + VPS ~€4.35 ([Hetzner CX22](https://www.hetzner.com/pressroom/new-cx-plans/)) או Oracle Always-Free | **בינוני.** מנוגד ל-ToS. גל אזהרות "Your account may be at risk" במאי 2025 פגע גם במשתמשי קריאה-בלבד ([whatsmeow #810](https://github.com/tulir/whatsmeow/issues/810)) | שעה הקמה, אפס תחזוקה שוטפת | **9/10 עם SIM נפרד** |
| **B** | **אותה טכניקה, מנוהלת** — מישהו אחר מריץ את השרת | [Whapi.Cloud](https://support.whapi.cloud/help-desk/getting-started/pricing) $35/חודש, [GREEN-API](https://green-api.com/en/docs/about-tariffs/) — **תוכנית Developer חינמית עד 3 צ'אטים כולל קבוצות**, [Periskope](https://periskope.app/pricing) $20/מושב | ₪0–$35 | זהה ל-A | 20 דקות | 8/10 (GREEN חינמי אם ≤3 קבוצות) |
| **C** | **קריאת התראות באנדרואיד** — אפליקציה קוראת את ההתראות של וואטסאפ ושולחת ל-webhook. לא נוגעת בוואטסאפ עצמו | קוד פתוח: [NotificationForwarder](https://github.com/ItsAzni/NotificationForwarder), [NotificationWebhookApp](https://github.com/BigShoots/NotificationWebhookApp), [Message Mirror](https://github.com/Dragon-Born/message-mirror); מסחרי: MacroDroid / Tasker+AutoNotification | ₪0 | **אפס** — אין כלי צד ג' בחשבון | 30 דקות | 6/10: מפספס קבוצות מושתקות והתראות מקובצות ("5 הודעות חדשות"), תלוי שהטלפון דלוק |
| **D** | **פענוח הגיבוי המקומי** — אנדרואיד שומר `msgstore.db.crypt15` כל לילה; עם המפתח בן 64 הספרות של "גיבוי מוצפן מקצה לקצה" מפענחים ומייצאים | [wa-crypt-tools](https://github.com/ElDavoo/wa-crypt-tools), [WhatsApp-Chat-Exporter](https://github.com/KnugiHK/Whatsapp-Chat-Exporter) (JSON/HTML, crypt12–15) | ₪0 | **אפס** — זה הנתונים שלך, בלי חיבור | סנכרון קובץ יומי מהטלפון (FolderSync/Syncthing) + סקריפט | 7/10: אמין ולגיטימי, אבל מסורבל ורק אנדרואיד |
| **E** | **ייצוא ידני** — "ייצוא צ'אט" מהאפליקציה → Drive → סקריפט | הכלי שלנו `tools/whatsapp_digest.py` | ₪0 | אפס | 10 שניות לקבוצה, כל יום | 5/10: תלוי במשמעת |

**מה לא מצאנו:** שירות ישראלי שעושה בדיוק את זה. הכתבה ב-[גיקטיים](https://www.geektime.co.il/ai-agents-can-manage-your-whatsapp-groups/)
על "Group Assistant" של אילן בנבורים היא בוט ניהול קבוצות (קוד פתוח), לא סיכום יומי מקצועי.
פרויקטים דומים בעולם ([firstlinkai](https://github.com/firstlinkai/Daily-WhatsApp-Group-Summary) — n8n + Evolution API + Sheets,
[תבנית n8n 8442](https://n8n.io/workflows/8442-automated-daily-ai-summaries-from-whatsapp-groups/)) כולם בנויים על טכניקה A.
הסיכום המובנה של Meta AI ([TheVerifier](https://theverifier.co.il/73263/whatsapp-private-message-summaries-meta-ai/)) לא זמין בעברית ולא בישראל.

**מסקנה:** כולם הגיעו לאותו מקום — Linked device (A) עם LLM. ההבדל שלנו: הקולקטור לא נעול לספק,
ואפשר להריץ C או D **במקביל** כגיבוי חינמי עם אפס סיכון.

---

## 2. הארכיטקטורה שנבנתה (`services/wa-collector/`)

```
 ┌── WAHA (Docker, SIM משני) ──┐
 ├── GREEN-API (חינם ≤3 קב') ──┤    webhook     ┌──────────────┐   08:30   ┌─────────┐   ┌────────────┐
 ├── Whapi ($35) ──────────────┼───────────────►│ wa-collector │──────────►│ Claude  │──►│ מייל/וואטסאפ│
 ├── אפליקציית התראות אנדרואיד ─┤  /hook/<src>   │  SQLite      │  אתמול    │ opus-5  │   │ + MD/HTML   │
 └── ייצוא ידני → digest.py ───┘                └──────────────┘           └─────────┘   └────────────┘
```

- **`collector.py serve`** — שרת HTTP (stdlib בלבד) עם 4 מנרמלים: `/hook/waha`, `/hook/greenapi`,
  `/hook/whapi`, `/hook/android`. כל payload נשמר **גם גולמי** (`raw_events`) — אם ספק משנה פורמט,
  שום הודעה לא הולכת לאיבוד. דה-דופליקציה לפי `msg_id`. רק קבוצות (`@g.us`), רק טקסט, לא `fromMe`.
- **אבטחה:** `WA_HOOK_SECRET` — מאמת HMAC-SHA512 של WAHA (`X-Webhook-Hmac`, נבדק מול הדוגמה
  הרשמית) או header `X-Hook-Secret` לספקים אחרים.
- **מתזמן פנימי** — ב-`DIGEST_HOUR:DIGEST_MINUTE` (שעון ישראל) מסכם את אתמול, פעם אחת ליום.
- **סיכום** — משתמש בקוד של `tools/whatsapp_digest.py`: אנונימיזציה ("יועץ 1"), שרשורים, Claude.
- **מסירה** — Resend (המפתח כבר קיים ב-GitHub Secrets) או Gmail SMTP; אופציונלי: "השורה התחתונה"
  כהודעת וואטסאפ מהמספר המשני לתמיר (הודעה אחת ביום, פרופיל סיכון מינימלי).
- **בדיקות:** 8 בדיקות לקולקטור (מנרמלים, HTTP, HMAC, דה-דופ, digest) + 6 לפרסר. `docker build` לא
  אומת בסביבה הזו (אין Docker daemon) — ה-Dockerfile סטנדרטי אבל חייב ריצת ניסיון ראשונה.

---

## 3. Runbook — הקמה על VPS (מסלול A, המומלץ)

**דרישות:** SIM נפרד (פריפייד ~₪20) שמצטרף לקבוצות כקורא בלבד. **לא** המספר העסקי.

1. **שרת:** Hetzner CX22 (€4.35) עם Ubuntu 24.04, או Oracle Always-Free ARM. להתקין Docker:
   `curl -fsSL https://get.docker.com | sh`
2. **קוד:** `git clone https://github.com/menifainance-stack/Menifa && cd Menifa/services/wa-collector`
3. **סודות:** `cp .env.example .env` ולמלא. מפתחות אקראיים: `openssl rand -hex 24`.
4. **הפעלה:** `docker compose up -d --build`
5. **חיבור המספר:** לפתוח `http://<IP>:3000/dashboard` → Start session "default" → לסרוק QR
   מהטלפון עם ה-SIM המשני (מכשירים מקושרים → קישור מכשיר).
6. **אימות:** `docker compose exec collector python3 collector.py stats` — אחרי כמה הודעות בקבוצות
   אמורות להופיע שורות. `curl localhost:8080/health` (מתוך השרת).
7. **סיכום ידני ראשון:** `docker compose exec collector python3 collector.py digest --days 1`
8. מכאן — אוטומטי כל יום 08:30.

**להוסיף מקור נוסף:** לפתוח `ports: ["8080:8080"]` בקומפוז, לשים את השרת מאחורי HTTPS
(Caddy/Cloudflare Tunnel), ולכוון את הספק/האפליקציה ל-`https://<host>/hook/<source>` עם header
`X-Hook-Secret: <WA_HOOK_SECRET>`.

**ניסיון בלי שרת בכלל (5 דקות):** GREEN-API Developer (חינם, 3 קבוצות) → webhook ל-collector
שרץ על המחשב של תמיר דרך `cloudflared tunnel`. טוב לבדיקת ערך לפני שקונים SIM ושרת.

---

## 4. שני כללי ברזל

1. **הריפו ציבורי.** תמלילים גולמיים לא נכנסים אליו לעולם. `inbox/` ו-`services/wa-collector/data/`
   ב-`.gitignore`. גם הסיכומים המאונמים נשמרים על השרת/במייל, לא כאן.
2. **המספר העסקי של תמיר לא מתחבר לשום כלי צד ג'.** רק ה-SIM המשני. אם הוא נחסם — מחליפים SIM,
   הקולקטור והדאטה לא נפגעים.

---

## 5. סטטוס

- [x] פרסר ייצוא + אנונימיזציה + שרשורים + דוח (6 בדיקות)
- [x] סריקת שוק מלאה עם מקורות — 5 טכניקות, 12 מימושים
- [x] wa-collector: 4 מנרמלים, HMAC, SQLite, מתזמן, מסירה (8 בדיקות, smoke-test חי על HTTP)
- [x] Dockerfile + docker-compose (WAHA + collector) + .env.example
- [ ] `docker build` בפועל — אין Docker daemon בסביבת הפיתוח
- [ ] הרצה מלאה עם Claude — אין ANTHROPIC_API_KEY בסביבת הפיתוח
- [ ] אימות מבנה ה-payload מול הודעה אמיתית ראשונה מכל ספק (raw_events שומר הכל בינתיים)
- [ ] תמיר: SIM משני + VPS, או ניסיון GREEN-API חינמי קודם
