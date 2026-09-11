# tools/video — מסרטון סלולרי לרילס בעברית בפקודה אחת

```bash
pip install -r tools/video/requirements.txt          # פעם אחת (Mac/Linux/Windows)
python3 tools/video/reel.py ~/Movies/tamir_042.mp4    # → tamir_042_reel.mp4 + .srt + .txt
```

| שלב | ספרייה | מה קורה |
|---|---|---|
| 1 | [auto-editor](https://github.com/WyattBlue/auto-editor) | מוריד שקטים (סף 4%, שוליים 0.2 שנ'). 3 דקות צילום → ~1:40 |
| 2 | [faster-whisper](https://github.com/SYSTRAN/faster-whisper) + [ivrit-ai/faster-whisper-v2-d4](https://huggingface.co/ivrit-ai/faster-whisper-v2-d4) | תמלול עברית עם זמן לכל מילה. ~1.5GB הורדה בפעם הראשונה |
| 3 | ASS + libass (בתוך ffmpeg) | כתוביות מילה-מילה: 68px, לבן עם קו שחור, המילה הפעילה בזהב מניפה, 3 מילים בשורה |
| 4 | ffmpeg (מגיע עם imageio-ffmpeg) | 1080×1920: חיתוך מרכז לוידאו אופקי, ריפוד לוידאו צר. H.264, faststart |

**פלט:** `<שם>_reel.mp4` (מוכן ל-Instagram/TikTok/YouTube), `<שם>.srt` (להעלאה כקובץ כתוביות),
`<שם>.txt` (התמלול — הבסיס לפוסט/כיתוב), `<שם>.words.json` (לתיקון ידני של מילים ולריצה חוזרת עם `--transcript`).

**תיקון תמלול:** לערוך את `.words.json` (מילים שגויות, מספרים) ולהריץ שוב עם
`--transcript <שם>.words.json --no-cut` על הקובץ החתוך (`.<שם>_work/<שם>_cut.mp4`).
חשוב: הזמנים ב-JSON מתייחסים לוידאו **אחרי** החיתוך.

**פונט:** Heebo (Google Fonts, חינם). אם לא מותקן: `--fonts-dir ~/fonts` עם קובץ ה-TTF, או `--font "Arial"`.

**מה נבדק (11/09/2026):** סרטון סינתטי 8 שנ' → חיתוך ל-4.6 שנ' → 9 מילים בעברית → 1080×1920, 9 אירועי כתוביות.
**מה לא נבדק:** תמלול אמיתי עם מודל ivrit-ai (אין GPU/מודל בסביבת הפיתוח) — ההרצה הראשונה של תמיר היא הבדיקה.

**עוד לא בצינור (P1):** [pycaps](https://github.com/francozanardi/pycaps) לאנימציות מילים מתקדמות,
[clippyme](https://github.com/fralapo/clippyme) לפיצול הרצאה ארוכה לקליפים, [Postiz](https://github.com/gitroomhq/postiz-app) לפרסום אוטומטי.
