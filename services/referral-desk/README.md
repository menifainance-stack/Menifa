# עמדת המתאם — Referral Desk

**מה זה:** שני כלי קוד פתוח על שרת אחד, שמכסים את כל תהליך ההפניה של התוכנית העסקית:
- **Twenty CRM** (AGPL-3.0) — CRM לתהליך בלבד: לקוח שדיברנו איתו → הפניה → פגישה → בדיקת משכנתא → סטטוס.
  **לא** מחליף את מערכת הביטוח של הסוכנות. שם נשארים נתוני הפוליסות; לכאן מגיע רק מה שנדרש לתהליך.
- **Cal.com** (AGPLv3) — קישור לקביעת "בדיקת משכנתא 20 דק'" ביומן של תמיר, עם תזכורות ו-webhook ל-Make.

**חלופה בלי שרת (מומלץ להתחלה):** Cal.com Cloud בחינם ליחיד + Google Sheet במבנה שלמטה + Make. אותו תהליך,
אפס תפעול. השרת שווה את זה כשיש 2 מתאמים או כשרוצים את ניתוח השיחות בפנים.

## הקמה
```bash
cp .env.example .env   # למלא סודות (openssl rand)
docker compose up -d
# Twenty: http://<ip>:3000  → יצירת workspace → הגדרת האובייקטים למטה
# Cal.com: http://<ip>:3001 → משתמש לתמיר → חיבור Google Calendar → Event type "בדיקת משכנתא (20 דק')"
```
לא נבדק בסביבת הפיתוח (אין Docker daemon). ה-compose נגזר מהקבצים הרשמיים של שני הפרויקטים.

## מודל הנתונים ב-Twenty (Settings → Data model → Custom objects)

| אובייקט | שדות | הערות |
|---|---|---|
| **Call** (שיחה) | client_ref (מזהה בסוכנות, לא ת.ז.), segment (A/B/C/D), outcome (נענה / לא נענה / סירב / הסכים), consent_whatsapp (bool + timestamp), mortgage_check_requested (bool), notes, recording_url | **אין** פרטי פוליסה. consent_whatsapp חובה לפני כל הודעה |
| **Referral** (הפניה) | referrer (→Call), referred_first_name, context ("אח, קנה דירה 2024"), intro_sent_by_client (bool), came_back (bool), meeting (→Meeting), status: חדש / הודעת היכרות נשלחה / חזר אלינו / פגישה / לקוח / לא רלוונטי | **אין טלפון של המופנה** עד שהוא חוזר אלינו בעצמו (פרטיות + ספאם) |
| **MortgageCheck** (בדיקה) | call (→Call), cal_booking_id, scheduled_at, held (bool), verdict: מסודר / חיסכון קטן / כסף אמיתי, report_url, advisory_sold (bool), fee | verdict = הפסק-דין מהמנוע (`tools/mortgage_engine`) |
| **Coordinator KPI** (view) | תצוגות שמורות: שיחות היום, הפניות השבוע, בדיקות שנקבעו/התקיימו, יחס בדיקה→ייעוץ | Twenty views על האובייקטים, בלי אובייקט נפרד |

## Cal.com — הגדרות Event type "בדיקת משכנתא (20 דק')"
- משך 20 דק', חלונות: א'–ה' 09:00–19:00, מרווח 10 דק', מקסימום 6 ביום (תמיר צריך לנשום).
- שאלות בטופס ההזמנה: "יתרת משכנתא בערך", "באיזה בנק", "מה המטרה: תשלום נמוך / לסיים מוקדם / כסף לשיפוץ". → מגיע לתמיר לפני השיחה.
- תזכורות: מייל + SMS 24 שעות ושעה לפני (Cal.com Workflows). הודעת הכנה: "דוח יתרות מהבנק".
- **Webhook** (Settings → Developer → Webhooks) → כתובת webhook ב-Make → מעדכן MortgageCheck ב-Twenty (REST API) ושורה בגיליון הלידים הקיים.

## מה מתחבר למה
```
מתאם ──שיחה──► Twenty: Call (+consent) ──► שולח קישור Cal.com בוואטסאפ (רק אחרי consent)
                     │                                  │
                     └─► Referral (שם + הקשר)            └─► Booking → webhook → Make → Twenty: MortgageCheck
תמיר ──20 דק'──► mortgage_engine → דוח כדאיות (MD/PDF) ──► verdict ב-MortgageCheck ──► KPI
```
