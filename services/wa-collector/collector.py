#!/usr/bin/env python3
"""
wa-collector — אוסף הודעות מקבוצות וואטסאפ מכל מקור שהוא, שומר ב-SQLite,
ומריץ פעם ביום את הסיכום (tools/whatsapp_digest.py) ושולח אותו במייל / וואטסאפ.

מקורות נתמכים (כולם POST JSON):
    /hook/waha       WAHA (devlikeapro/waha)  — ברירת המחדל, קוד פתוח, חינם
    /hook/greenapi   GREEN-API                — תוכנית Developer חינמית (עד 3 צ'אטים)
    /hook/whapi      Whapi.Cloud              — $35/חודש, בלי שרת
    /hook/android    אפליקציית העברת התראות   — 0 סיכון חסימה, דורש אנדרואיד
    /hook/raw        כל JSON אחר              — נשמר גולמי בלבד (לניפוי)

כל payload נשמר גם גולמי (טבלת raw_events) — אם מבנה של ספק משתנה, שום הודעה לא הולכת לאיבוד.

הרצה:
    python3 collector.py serve            # שרת webhook + מתזמן יומי
    python3 collector.py digest           # סיכום של אתמול עכשיו (ידני)
    python3 collector.py digest --days 3  # 3 ימים אחורה
    python3 collector.py stats            # מה נאסף

משתני סביבה: ראה .env.example
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import hmac
import json
import os
import smtplib
import sqlite3
import sys
import threading
import time
import urllib.request
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from zoneinfo import ZoneInfo

# מאפשר ייבוא של הכלי הקיים גם מתוך הריפו וגם מתוך Docker (שם הוא מועתק לצד הקובץ)
_HERE = Path(__file__).resolve().parent
for cand in (_HERE, _HERE.parents[1] / "tools"):
    if (cand / "whatsapp_digest.py").exists():
        sys.path.insert(0, str(cand))
        break
import whatsapp_digest as wd  # noqa: E402

TZ = ZoneInfo(os.environ.get("TZ", "Asia/Jerusalem"))
DB_PATH = Path(os.environ.get("WA_DB", "data/wa.sqlite"))
OUT_DIR = Path(os.environ.get("WA_OUT", "data/digests"))
HOOK_SECRET = os.environ.get("WA_HOOK_SECRET", "")  # אם מוגדר — חובה header X-Hook-Secret או HMAC של WAHA
GROUP_ALLOWLIST = {g.strip() for g in os.environ.get("WA_GROUPS", "").split(",") if g.strip()}
DIGEST_HOUR = int(os.environ.get("DIGEST_HOUR", "8"))
DIGEST_MINUTE = int(os.environ.get("DIGEST_MINUTE", "30"))


# ---------------------------------------------------------------------------
# DB
# ---------------------------------------------------------------------------

SCHEMA = """
CREATE TABLE IF NOT EXISTS messages (
    msg_id      TEXT PRIMARY KEY,
    source      TEXT NOT NULL,
    chat_id     TEXT NOT NULL,
    chat_name   TEXT,
    sender_id   TEXT,
    sender_name TEXT,
    ts          INTEGER NOT NULL,       -- unix seconds (UTC)
    text        TEXT NOT NULL,
    received_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_ts ON messages(ts);
CREATE TABLE IF NOT EXISTS raw_events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    source      TEXT NOT NULL,
    received_at INTEGER NOT NULL,
    parsed      INTEGER NOT NULL DEFAULT 0,
    body        TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS digests (
    day         TEXT PRIMARY KEY,       -- YYYY-MM-DD (יום מסוכם)
    created_at  INTEGER NOT NULL,
    path        TEXT NOT NULL,
    n_messages  INTEGER NOT NULL
);
"""


def db() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.executescript(SCHEMA)
    return conn


_DB_LOCK = threading.Lock()


def store(conn: sqlite3.Connection, source: str, raw: dict, normalized: list[dict]) -> int:
    """שומר אירוע גולמי + ההודעות המנורמלות. מחזיר כמה הודעות חדשות נכנסו."""
    now = int(time.time())
    inserted = 0
    with _DB_LOCK, conn:
        conn.execute(
            "INSERT INTO raw_events(source, received_at, parsed, body) VALUES (?,?,?,?)",
            (source, now, len(normalized), json.dumps(raw, ensure_ascii=False)),
        )
        for m in normalized:
            if GROUP_ALLOWLIST and m["chat_id"] not in GROUP_ALLOWLIST and (m.get("chat_name") or "") not in GROUP_ALLOWLIST:
                continue
            cur = conn.execute(
                "INSERT OR IGNORE INTO messages(msg_id, source, chat_id, chat_name, sender_id, sender_name, ts, text, received_at)"
                " VALUES (?,?,?,?,?,?,?,?,?)",
                (m["msg_id"], source, m["chat_id"], m.get("chat_name"), m.get("sender_id"), m.get("sender_name"),
                 int(m["ts"]), m["text"], now),
            )
            inserted += cur.rowcount
    return inserted


# ---------------------------------------------------------------------------
# נרמול לפי ספק. כל פונקציה מקבלת את ה-JSON כפי שהגיע ומחזירה רשימת הודעות:
#   {msg_id, chat_id, chat_name, sender_id, sender_name, ts, text}
# רק הודעות מקבוצות (chat_id מסתיים ב-@g.us) ורק טקסט. השאר נשמר גולמי בלבד.
# מבנה ה-payload מבוסס על התיעוד הציבורי של כל ספק; ההודעה הראשונה שתגיע באמת
# תאמת אותו — ולכן raw_events קיים.
# ---------------------------------------------------------------------------


def _is_group(chat_id: str | None) -> bool:
    return bool(chat_id) and chat_id.endswith("@g.us")


def _mk(msg_id, chat_id, chat_name, sender_id, sender_name, ts, text) -> dict | None:
    text = (text or "").strip()
    if not text or not _is_group(chat_id):
        return None
    return {
        "msg_id": str(msg_id) or hashlib.sha1(f"{chat_id}{ts}{text}".encode()).hexdigest(),
        "chat_id": chat_id,
        "chat_name": chat_name or chat_id,
        "sender_id": sender_id or "",
        "sender_name": sender_name or sender_id or "?",
        "ts": int(ts),
        "text": text,
    }


def norm_waha(raw: dict) -> list[dict]:
    """WAHA: {event:'message', session, payload:{id, timestamp, from, fromMe, body, participant, _data}}"""
    if raw.get("event") not in ("message", "message.any"):
        return []
    p = raw.get("payload") or {}
    if p.get("fromMe"):
        return []
    data = p.get("_data") or {}
    notify = data.get("notifyName") or (data.get("Info") or {}).get("PushName")
    chat_name = (data.get("chat") or {}).get("name") if isinstance(data.get("chat"), dict) else None
    m = _mk(p.get("id"), p.get("from"), chat_name, p.get("participant"), notify, p.get("timestamp") or time.time(), p.get("body"))
    return [m] if m else []


def norm_greenapi(raw: dict) -> list[dict]:
    """GREEN-API: {typeWebhook:'incomingMessageReceived', timestamp, idMessage, senderData:{chatId, chatName, sender, senderName}, messageData:{typeMessage, textMessageData:{textMessage} | extendedTextMessageData:{text}}}"""
    if raw.get("typeWebhook") != "incomingMessageReceived":
        return []
    sd = raw.get("senderData") or {}
    md = raw.get("messageData") or {}
    text = (md.get("textMessageData") or {}).get("textMessage") or (md.get("extendedTextMessageData") or {}).get("text")
    m = _mk(raw.get("idMessage"), sd.get("chatId"), sd.get("chatName"), sd.get("sender"), sd.get("senderName"), raw.get("timestamp") or time.time(), text)
    return [m] if m else []


def norm_whapi(raw: dict) -> list[dict]:
    """Whapi: {messages:[{id, from_me, type, chat_id, chat_name, from, from_name, timestamp, text:{body}}]}"""
    out = []
    for msg in raw.get("messages") or []:
        if msg.get("from_me") or msg.get("type") != "text":
            continue
        m = _mk(msg.get("id"), msg.get("chat_id"), msg.get("chat_name"), msg.get("from"), msg.get("from_name"),
                msg.get("timestamp") or time.time(), (msg.get("text") or {}).get("body"))
        if m:
            out.append(m)
    return out


def norm_android(raw: dict) -> list[dict]:
    """
    אפליקציית העברת התראות (NotificationForwarder / Message Mirror וכו').
    אין פורמט תקני — מקבלים: {app|package, title, text|body, time|timestamp, [lines:[...]]}
    בהתראת קבוצה של וואטסאפ: title = "שם הקבוצה" ו-text = "שם השולח: הודעה".
    chat_id מסונתז כ-"android:<שם קבוצה>@g.us" כדי לעבור את פילטר הקבוצות.
    """
    pkg = (raw.get("package") or raw.get("app") or raw.get("packageName") or "").lower()
    if pkg and "whatsapp" not in pkg:
        return []
    title = (raw.get("title") or "").strip()
    lines = raw.get("lines") or raw.get("textLines") or []
    bodies = [b for b in ([raw.get("text") or raw.get("body")] + list(lines)) if b]
    ts_raw = raw.get("time") or raw.get("timestamp") or raw.get("postTime") or time.time()
    ts = int(ts_raw) // (1000 if int(ts_raw) > 10_000_000_000 else 1)
    out = []
    for body in dict.fromkeys(bodies):  # ייחודי, שומר סדר
        sender, sep, text = body.partition(": ")
        if not sep:  # התראה מקובצת ("5 הודעות חדשות") — אין תוכן
            continue
        # וואטסאפ בהתראות קבוצה: title="קבוצה" ; לפעמים title="שולח @ קבוצה"
        group = title.split(" @ ")[-1] if " @ " in title else title
        if not group:
            continue
        chat_id = f"android:{group}@g.us"
        msg_id = hashlib.sha1(f"{chat_id}|{sender}|{text}|{ts // 60}".encode()).hexdigest()
        m = _mk(msg_id, chat_id, group, "", sender, ts, text)
        if m:
            out.append(m)
    return out


NORMALIZERS = {
    "waha": norm_waha,
    "greenapi": norm_greenapi,
    "whapi": norm_whapi,
    "android": norm_android,
    "raw": lambda raw: [],
}


# ---------------------------------------------------------------------------
# HTTP
# ---------------------------------------------------------------------------


class Handler(BaseHTTPRequestHandler):
    conn: sqlite3.Connection  # מוזרק ב-serve()

    def log_message(self, fmt, *args):  # שקט יותר
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def _send(self, code: int, obj: dict):
        body = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            n = self.conn.execute("SELECT COUNT(*) FROM messages").fetchone()[0]
            return self._send(200, {"ok": True, "messages": n})
        return self._send(404, {"error": "not found"})

    def _authorized(self, body: bytes) -> bool:
        if not HOOK_SECRET:
            return True
        if self.headers.get("X-Hook-Secret") == HOOK_SECRET:
            return True
        # WAHA HMAC: X-Webhook-Hmac = hex(HMAC_SHA512(secret, body))
        sig = self.headers.get("X-Webhook-Hmac", "")
        if sig:
            algo = (self.headers.get("X-Webhook-Hmac-Algorithm") or "sha512").lower()
            try:
                expected = hmac.new(HOOK_SECRET.encode(), body, algo).hexdigest()
            except ValueError:
                return False
            return hmac.compare_digest(expected, sig)
        return False

    def do_POST(self):
        if not self.path.startswith("/hook/"):
            return self._send(404, {"error": "not found"})
        source = self.path[len("/hook/"):].split("?")[0].strip("/")
        if source not in NORMALIZERS:
            return self._send(404, {"error": f"unknown source {source}"})
        length = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(length) if length else b""
        if not self._authorized(body):
            return self._send(401, {"error": "unauthorized"})
        try:
            raw = json.loads(body.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            return self._send(400, {"error": "invalid json"})
        try:
            normalized = NORMALIZERS[source](raw) if isinstance(raw, dict) else []
        except Exception as e:  # לא מפילים את השרת על payload מוזר — הוא נשמר גולמי
            sys.stderr.write(f"normalize error ({source}): {e}\n")
            normalized = []
        inserted = store(self.conn, source, raw if isinstance(raw, dict) else {"_": raw}, normalized)
        self._send(200, {"ok": True, "parsed": len(normalized), "inserted": inserted})


# ---------------------------------------------------------------------------
# סיכום יומי
# ---------------------------------------------------------------------------


def load_messages(conn: sqlite3.Connection, since: dt.datetime, until: dt.datetime) -> list[wd.Message]:
    rows = conn.execute(
        "SELECT chat_name, sender_name, ts, text FROM messages WHERE ts >= ? AND ts < ? ORDER BY ts",
        (int(since.timestamp()), int(until.timestamp())),
    ).fetchall()
    return [
        wd.Message(ts=dt.datetime.fromtimestamp(ts, TZ).replace(tzinfo=None), sender=sender or "?", text=text, source=chat or "?")
        for chat, sender, ts, text in rows
    ]


def run_digest(conn: sqlite3.Connection, days: int = 1, llm: bool = True, keep_names: bool = False) -> Path | None:
    today = dt.datetime.now(TZ).date()
    until = dt.datetime.combine(today, dt.time(), TZ)          # חצות היום (לא כולל היום)
    since = until - dt.timedelta(days=days)
    msgs = load_messages(conn, since, until)
    day = (until - dt.timedelta(days=1)).strftime("%Y-%m-%d")
    print(f"🕒 {since:%d/%m}–{(until - dt.timedelta(days=1)):%d/%m}: {len(msgs)} הודעות", file=sys.stderr)

    mapping = None if keep_names else wd.anonymize(msgs)
    threads = wd.split_threads(msgs)
    since_n, until_n = since.replace(tzinfo=None), until.replace(tzinfo=None)
    summary = None
    if llm:
        if not threads:
            summary = "## סיכום\n\n_לא נאספו הודעות מקצועיות אתמול — אין מה לסכם._"
        else:
            summary = wd.summarize_with_claude(threads, f"{since:%d/%m/%Y}")
    report = wd.build_report(threads, msgs, since_n, until_n, summary, mapping)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_DIR / f"{day}.md"
    path.write_text(report, encoding="utf-8")
    (OUT_DIR / f"{day}.html").write_text(wd.report_to_html(report), encoding="utf-8")
    with _DB_LOCK, conn:
        conn.execute("INSERT OR REPLACE INTO digests(day, created_at, path, n_messages) VALUES (?,?,?,?)",
                     (day, int(time.time()), str(path), len(msgs)))
    print(f"✅ {path}", file=sys.stderr)

    subject = f"📱 סיכום קבוצות יועצים — {(until - dt.timedelta(days=1)):%d/%m/%Y} ({len(msgs)} הודעות)"
    deliver(subject, report, wd.report_to_html(report))
    return path


# ---------------------------------------------------------------------------
# מסירה: Resend / Gmail SMTP / וואטסאפ דרך WAHA (לעצמך)
# ---------------------------------------------------------------------------


def deliver(subject: str, text_md: str, html_body: str) -> None:
    to = os.environ.get("DIGEST_EMAIL_TO")
    if to and os.environ.get("RESEND_API_KEY"):
        req = urllib.request.Request(
            "https://api.resend.com/emails",
            data=json.dumps({
                "from": os.environ.get("DIGEST_EMAIL_FROM", "Menifa Bot <onboarding@resend.dev>"),
                "to": [to], "subject": subject, "html": html_body, "text": text_md,
            }).encode(),
            headers={"Authorization": f"Bearer {os.environ['RESEND_API_KEY']}", "Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=30) as r:
            print(f"📧 Resend: {r.status}", file=sys.stderr)
    elif to and os.environ.get("SMTP_USER") and os.environ.get("SMTP_PASS"):
        msg = MIMEMultipart("alternative")
        msg["Subject"], msg["From"], msg["To"] = subject, os.environ["SMTP_USER"], to
        msg.attach(MIMEText(text_md, "plain", "utf-8"))
        msg.attach(MIMEText(html_body, "html", "utf-8"))
        with smtplib.SMTP_SSL(os.environ.get("SMTP_HOST", "smtp.gmail.com"), int(os.environ.get("SMTP_PORT", "465"))) as s:
            s.login(os.environ["SMTP_USER"], os.environ["SMTP_PASS"])
            s.send_message(msg)
        print("📧 SMTP: sent", file=sys.stderr)
    elif to:
        print("⚠️ DIGEST_EMAIL_TO מוגדר אבל אין RESEND_API_KEY או SMTP_USER/SMTP_PASS — לא נשלח מייל", file=sys.stderr)

    # וואטסאפ לעצמך דרך WAHA (הודעה אחת ביום מהמספר המשני → תמיר). רק "השורה התחתונה".
    wa_to = os.environ.get("DIGEST_WA_TO")
    waha = os.environ.get("WAHA_URL")
    if wa_to and waha:
        short = _extract_section(text_md, "## 🔥 השורה התחתונה") or text_md[:1500]
        payload = {"session": os.environ.get("WAHA_SESSION", "default"), "chatId": wa_to, "text": f"*{subject}*\n\n{short}"}
        req = urllib.request.Request(f"{waha.rstrip('/')}/api/sendText", data=json.dumps(payload).encode(),
                                     headers={"Content-Type": "application/json", "X-Api-Key": os.environ.get("WAHA_API_KEY", "")})
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                print(f"💬 WAHA sendText: {r.status}", file=sys.stderr)
        except Exception as e:
            print(f"⚠️ WAHA sendText נכשל: {e}", file=sys.stderr)


def _extract_section(md: str, header: str) -> str:
    lines = md.splitlines()
    out, on = [], False
    for ln in lines:
        if ln.startswith("## "):
            if on:
                break
            on = ln.strip() == header
            continue
        if on:
            out.append(ln)
    return "\n".join(out).strip()


# ---------------------------------------------------------------------------
# מתזמן + CLI
# ---------------------------------------------------------------------------


def scheduler(conn: sqlite3.Connection, stop: threading.Event) -> None:
    """פעם ביום ב-DIGEST_HOUR:DIGEST_MINUTE (שעון ישראל). לא מריץ פעמיים לאותו יום."""
    while not stop.is_set():
        now = dt.datetime.now(TZ)
        target = now.replace(hour=DIGEST_HOUR, minute=DIGEST_MINUTE, second=0, microsecond=0)
        yesterday = (now.date() - dt.timedelta(days=1)).isoformat()
        done = conn.execute("SELECT 1 FROM digests WHERE day=?", (yesterday,)).fetchone()
        if now >= target and not done:
            try:
                run_digest(conn)
            except Exception as e:
                print(f"❌ digest failed: {e}", file=sys.stderr)
        stop.wait(60)


def serve(port: int) -> None:
    conn = db()
    Handler.conn = conn
    stop = threading.Event()
    threading.Thread(target=scheduler, args=(conn, stop), daemon=True).start()
    srv = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print(f"🚀 wa-collector על פורט {port} · DB={DB_PATH} · סיכום יומי {DIGEST_HOUR:02d}:{DIGEST_MINUTE:02d} {TZ.key}", file=sys.stderr)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        stop.set()


def stats(conn: sqlite3.Connection) -> None:
    total = conn.execute("SELECT COUNT(*) FROM messages").fetchone()[0]
    raw = conn.execute("SELECT COUNT(*), SUM(parsed=0) FROM raw_events").fetchone()
    print(f"הודעות: {total} · אירועים גולמיים: {raw[0]} (לא פורסרו: {raw[1] or 0})")
    for chat, n, last in conn.execute(
        "SELECT chat_name, COUNT(*), MAX(ts) FROM messages GROUP BY chat_id ORDER BY 2 DESC"
    ):
        print(f"  {chat}: {n} · אחרונה {dt.datetime.fromtimestamp(last, TZ):%d/%m %H:%M}")


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("serve"); s.add_argument("--port", type=int, default=int(os.environ.get("PORT", "8080")))
    d = sub.add_parser("digest"); d.add_argument("--days", type=int, default=1); d.add_argument("--no-llm", action="store_true"); d.add_argument("--keep-names", action="store_true")
    sub.add_parser("stats")
    a = ap.parse_args(argv)
    if a.cmd == "serve":
        serve(a.port)
    elif a.cmd == "digest":
        run_digest(db(), days=a.days, llm=not a.no_llm, keep_names=a.keep_names)
    elif a.cmd == "stats":
        stats(db())
    return 0


if __name__ == "__main__":
    sys.exit(main())
