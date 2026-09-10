#!/data/data/com.termux/files/usr/bin/bash
# ===========================================================================
# מסלול D — אפס סיכון חסימה: פענוח הגיבוי המקומי של וואטסאפ על מכשיר האנדרואיד
# הייעודי (Termux), ייצוא ל-JSON, וסיכום עם Claude. בלי שרת, בלי חיבור צד ג'.
#
# ⚠️ לא נבדק בסביבת הפיתוח (אין מכשיר אנדרואיד). כל שלב מבוסס על תיעוד
#    wa-crypt-tools ו-WhatsApp-Chat-Exporter. הריצה הראשונה צריכה עין אנושית.
#
# דרישות חד-פעמיות על המכשיר:
#   1. Termux מ-F-Droid (לא מ-Play Store) + Termux:Boot (להרצה אוטומטית)
#   2. בוואטסאפ: הגדרות → צ'אטים → גיבוי → גיבוי מוצפן מקצה לקצה → מפתח 64 ספרות → לשמור אותו
#   3. pkg install python git termux-api cronie ; termux-setup-storage
#      ואז: הגדרות אנדרואיד → אפליקציות → Termux → הרשאות → קבצים → "גישה לכל הקבצים"
#   4. pip install wa-crypt-tools whatsapp-chat-exporter anthropic
#   5. ~/.wa_env :  WA_KEY_HEX=<64 ספרות>  ANTHROPIC_API_KEY=...  RESEND_API_KEY=...  DIGEST_EMAIL_TO=...
#   6. crontab -e :  30 7 * * * ~/Menifa/tools/android/termux_backup_digest.sh >> ~/wa_digest.log 2>&1
#      (וואטסאפ יוצר את הגיבוי המקומי סביב 02:00; 07:30 משאיר מרווח)
# ===========================================================================
set -euo pipefail
source "$HOME/.wa_env"

DB_DIR="/sdcard/Android/media/com.whatsapp/WhatsApp/Databases"
WORK="$HOME/wa_work"; mkdir -p "$WORK"
REPO="$HOME/Menifa"

CRYPT="$(ls -t "$DB_DIR"/msgstore*.db.crypt15 2>/dev/null | head -1)"
[ -n "$CRYPT" ] || { echo "❌ לא נמצא msgstore.db.crypt15 ב-$DB_DIR — לבדוק הרשאת 'גישה לכל הקבצים'"; exit 1; }
echo "📦 גיבוי: $CRYPT ($(date -r "$CRYPT" '+%d/%m %H:%M'))"

# 1. פענוח (wa-crypt-tools). המפתח = 64 ספרות hex של הגיבוי המוצפן.
wadecrypt "$WA_KEY_HEX" "$CRYPT" "$WORK/msgstore.db"

# 2. ייצוא ל-JSON (WhatsApp-Chat-Exporter). -a אנדרואיד, -d מסד הנתונים, --json פלט, --no-html
wtsexporter -a -d "$WORK/msgstore.db" -o "$WORK/export" --json "$WORK/export/chats.json" --no-html --per-chat 2>/dev/null || \
wtsexporter -a -d "$WORK/msgstore.db" -o "$WORK/export" --json "$WORK/export/chats.json" --no-html

# 3. JSON → ייצוא-טקסט בפורמט וואטסאפ (כדי להשתמש בפרסר הקיים), רק קבוצות, רק 24 שעות
python3 - "$WORK/export" "$WORK/txt" <<'PY'
import json, sys, glob, os, datetime as dt
src, dst = sys.argv[1], sys.argv[2]; os.makedirs(dst, exist_ok=True)
since = dt.datetime.now() - dt.timedelta(hours=30)
files = glob.glob(os.path.join(src, "**", "*.json"), recursive=True)
n = 0
for f in files:
    try: data = json.load(open(f, encoding="utf-8"))
    except Exception: continue
    chats = data.values() if isinstance(data, dict) else data
    for chat in chats:
        if not isinstance(chat, dict): continue
        cid = str(chat.get("id") or chat.get("jid") or "")
        if "@g.us" not in cid and not chat.get("is_group"): continue
        name = chat.get("name") or cid
        msgs = chat.get("messages") or {}
        rows = msgs.values() if isinstance(msgs, dict) else msgs
        lines = []
        for m in rows:
            if not isinstance(m, dict) or m.get("from_me") or not m.get("data"): continue
            ts = m.get("timestamp") or m.get("time")
            try: t = dt.datetime.fromtimestamp(float(ts) / (1000 if float(ts) > 1e11 else 1))
            except Exception: continue
            if t < since: continue
            sender = m.get("sender") or m.get("sender_name") or "?"
            lines.append(f"{t:%d/%m/%Y, %H:%M} - {sender}: {m['data']}")
        if lines:
            safe = "".join(c for c in name if c not in '/\\:*?"<>|')[:60]
            open(os.path.join(dst, f"{safe}.txt"), "w", encoding="utf-8").write("\n".join(lines) + "\n"); n += len(lines)
print(f"📝 {n} הודעות קבוצה נכתבו ל-{dst}")
PY

# 4. סיכום + מייל (הכלי הקיים). --days 1 = אתמול+היום.
cd "$REPO" && python3 tools/whatsapp_digest.py "$WORK/txt" --days 1 --out "$WORK/digest.md" --html "$WORK/digest.html"
python3 - "$WORK/digest.md" "$WORK/digest.html" <<'PY'
import os, sys, json, urllib.request, datetime as dt
md, html = open(sys.argv[1], encoding="utf-8").read(), open(sys.argv[2], encoding="utf-8").read()
to, key = os.environ.get("DIGEST_EMAIL_TO"), os.environ.get("RESEND_API_KEY")
if to and key:
    req = urllib.request.Request("https://api.resend.com/emails", data=json.dumps({"from": "Menifa Bot <onboarding@resend.dev>", "to": [to],
        "subject": f"📱 סיכום קבוצות יועצים — {dt.date.today():%d/%m/%Y}", "html": html, "text": md}).encode(),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
    print("📧", urllib.request.urlopen(req, timeout=30).status)
PY

# 5. ניקוי — לא משאירים מסד מפוענח על המכשיר
rm -rf "$WORK/msgstore.db" "$WORK/export" "$WORK/txt"
echo "✅ $(date '+%d/%m %H:%M') הסתיים"
