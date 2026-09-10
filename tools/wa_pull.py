#!/usr/bin/env python3
"""
wa_pull.py — מושך את הודעות הקבוצות של ה-24 שעות האחרונות ישירות מהספק (בלי webhook,
בלי שרת), מסכם עם Claude, ושולח במייל. מיועד לרוץ מ-GitHub Actions פעם ביום.

ספקים:
    greenapi   GREEN-API  (GREEN_API_ID_INSTANCE, GREEN_API_TOKEN, [GREEN_API_HOST])
               משתמש ב-lastIncomingMessages?minutes=N — קריאה אחת, כל הקבוצות.
    waha       WAHA        (WAHA_URL, WAHA_API_KEY, [WAHA_SESSION])
               GET /api/{session}/groups → לכל קבוצה GET .../chats/{id}/messages?filter.timestamp.gte=

שימוש:
    python3 tools/wa_pull.py greenapi                # 24 שעות אחורה, סיכום, מייל
    python3 tools/wa_pull.py greenapi --hours 72 --no-llm --out /tmp/x.md
    python3 tools/wa_pull.py waha --dump raw.json    # לשמור את הגולמי לניפוי

שום דבר לא נשמר בריפו. הפלט הולך למייל (RESEND_API_KEY + DIGEST_EMAIL_TO) ולקובץ --out בלבד.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path
from zoneinfo import ZoneInfo

sys.path.insert(0, str(Path(__file__).resolve().parent))
import whatsapp_digest as wd  # noqa: E402

TZ = ZoneInfo(os.environ.get("TZ", "Asia/Jerusalem"))


def _get(url: str, headers: dict | None = None, timeout: int = 60):
    req = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8") or "null")


# ---------------------------------------------------------------------------
# GREEN-API
# ---------------------------------------------------------------------------


def pull_greenapi(hours: int) -> tuple[list[dict], list]:
    inst = os.environ["GREEN_API_ID_INSTANCE"]
    token = os.environ["GREEN_API_TOKEN"]
    host = os.environ.get("GREEN_API_HOST", "https://api.green-api.com").rstrip("/")
    url = f"{host}/waInstance{inst}/lastIncomingMessages/{token}?minutes={hours * 60}"
    raw = _get(url) or []
    out = []
    for m in raw:
        chat = m.get("chatId") or ""
        if not chat.endswith("@g.us"):
            continue
        text = m.get("textMessage") or (m.get("extendedTextMessage") or {}).get("text") or ""
        if not text.strip():
            continue
        out.append({
            "msg_id": m.get("idMessage"), "chat_id": chat, "chat_name": m.get("chatName") or chat,
            "sender_name": m.get("senderName") or m.get("senderContactName") or m.get("senderId") or "?",
            "ts": int(m.get("timestamp") or time.time()), "text": text.strip(),
        })
    return out, raw


# ---------------------------------------------------------------------------
# WAHA
# ---------------------------------------------------------------------------


def pull_waha(hours: int) -> tuple[list[dict], list]:
    base = os.environ["WAHA_URL"].rstrip("/")
    session = os.environ.get("WAHA_SESSION", "default")
    headers = {"X-Api-Key": os.environ.get("WAHA_API_KEY", "")}
    since = int(time.time()) - hours * 3600
    groups = _get(f"{base}/api/{session}/groups", headers) or []
    out, raw_all = [], []
    for g in groups:
        gid = (g.get("id") or {}).get("_serialized") if isinstance(g.get("id"), dict) else g.get("id")
        if not gid:
            continue
        name = g.get("name") or g.get("subject") or gid
        q = urllib.parse.urlencode({"limit": 500, "downloadMedia": "false", "filter.timestamp.gte": since, "filter.fromMe": "false"})
        msgs = _get(f"{base}/api/{session}/chats/{urllib.parse.quote(gid)}/messages?{q}", headers) or []
        raw_all.append({"group": gid, "name": name, "messages": msgs})
        for m in msgs:
            body = (m.get("body") or "").strip()
            if not body or m.get("fromMe"):
                continue
            data = m.get("_data") or {}
            sender = data.get("notifyName") or (data.get("Info") or {}).get("PushName") or m.get("participant") or "?"
            out.append({"msg_id": m.get("id"), "chat_id": gid, "chat_name": name, "sender_name": sender,
                        "ts": int(m.get("timestamp") or time.time()), "text": body})
    return out, raw_all


PROVIDERS = {"greenapi": pull_greenapi, "waha": pull_waha}


# ---------------------------------------------------------------------------
# סיכום + מסירה
# ---------------------------------------------------------------------------


def to_messages(rows: list[dict]) -> list[wd.Message]:
    seen, msgs = set(), []
    for r in sorted(rows, key=lambda r: r["ts"]):
        key = r.get("msg_id") or (r["chat_id"], r["ts"], r["text"])
        if key in seen:
            continue
        seen.add(key)
        msgs.append(wd.Message(ts=dt.datetime.fromtimestamp(r["ts"], TZ).replace(tzinfo=None), sender=r["sender_name"], text=r["text"], source=r["chat_name"]))
    return msgs


def send_resend(subject: str, html_body: str, text_md: str) -> None:
    to, key = os.environ.get("DIGEST_EMAIL_TO"), os.environ.get("RESEND_API_KEY")
    if not (to and key):
        print("ℹ️ אין DIGEST_EMAIL_TO/RESEND_API_KEY — לא נשלח מייל", file=sys.stderr)
        return
    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=json.dumps({"from": os.environ.get("DIGEST_EMAIL_FROM", "Menifa Bot <onboarding@resend.dev>"),
                         "to": [to], "subject": subject, "html": html_body, "text": text_md}).encode(),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        print(f"📧 Resend: {r.status}", file=sys.stderr)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("provider", choices=PROVIDERS)
    ap.add_argument("--hours", type=int, default=24)
    ap.add_argument("--no-llm", action="store_true")
    ap.add_argument("--keep-names", action="store_true")
    ap.add_argument("--out", help="קובץ Markdown (ברירת מחדל: לא נשמר, רק מייל)")
    ap.add_argument("--dump", help="לשמור את התגובה הגולמית של הספק (JSON) — לניפוי בלבד, לא לקומיט")
    ap.add_argument("--no-email", action="store_true")
    a = ap.parse_args(argv)

    rows, raw = PROVIDERS[a.provider](a.hours)
    if a.dump:
        Path(a.dump).write_text(json.dumps(raw, ensure_ascii=False, indent=2), encoding="utf-8")
    msgs = to_messages(rows)
    print(f"📥 {a.provider}: {len(rows)} הודעות קבוצה ב-{a.hours} שעות ({len({m.source for m in msgs})} קבוצות)", file=sys.stderr)

    now = dt.datetime.now(TZ).replace(tzinfo=None)
    since = now - dt.timedelta(hours=a.hours)
    mapping = None if a.keep_names else wd.anonymize(msgs)
    threads = wd.split_threads(msgs)
    summary = None
    if not a.no_llm:
        summary = wd.summarize_with_claude(threads, f"{since:%d/%m/%Y %H:%M}–{now:%d/%m/%Y %H:%M}") if threads \
            else "## סיכום\n\n_לא נאספו הודעות מקצועיות בחלון הזמן — אין מה לסכם._"
    report = wd.build_report(threads, msgs, since, now, summary, mapping)
    html_body = wd.report_to_html(report)

    if a.out:
        Path(a.out).parent.mkdir(parents=True, exist_ok=True)
        Path(a.out).write_text(report, encoding="utf-8")
        print(f"✅ {a.out}", file=sys.stderr)
    if not a.no_email:
        send_resend(f"📱 סיכום קבוצות יועצים — {now:%d/%m/%Y} ({len(msgs)} הודעות)", html_body, report)
    return 0


if __name__ == "__main__":
    sys.exit(main())
