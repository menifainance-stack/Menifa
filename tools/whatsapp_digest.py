#!/usr/bin/env python3
"""
whatsapp_digest.py — סיכום יומי של קבוצות וואטסאפ של יועצי משכנתאות.

קלט:  קבצי ייצוא של וואטסאפ ("ייצוא צ'אט" → ללא מדיה), Android או iPhone,
       עברית או אנגלית. אפשר להעביר כמה קבצים / תיקייה.
פלט:  קובץ Markdown ב-docs/whatsapp-digests/YYYY-MM-DD.md עם:
       1. סטטיסטיקה (הודעות, משתתפים, שרשורים)
       2. סיכום Claude: מקרים + פתרונות, חידושים רגולטוריים/בנקאיים,
          שאלות פתוחות, רעיונות לתוכן
       3. נספח: השרשורים הגולמיים (מאונמים) לאימות

שימוש:
    python3 tools/whatsapp_digest.py inbox/whatsapp/            # אתמול+היום
    python3 tools/whatsapp_digest.py chat.txt --days 3           # 3 ימים אחורה
    python3 tools/whatsapp_digest.py chat.txt --no-llm           # בלי קריאה ל-Claude
    python3 tools/whatsapp_digest.py chat.txt --keep-names       # בלי אנונימיזציה

דורש ANTHROPIC_API_KEY (או פרופיל `ant auth login`) אלא אם --no-llm.
"""

from __future__ import annotations

import argparse
import datetime as dt
import html
import json
import os
import re
import sys
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable

# ---------------------------------------------------------------------------
# פרסור ייצוא וואטסאפ
# ---------------------------------------------------------------------------

# תווים בלתי נראים שוואטסאפ מזריק (LRM/RLM, פורמט, NBSP וכו')
_INVISIBLE = re.compile(r"[‎‏‪-‮⁦-⁩﻿ ]")

# תחילת הודעה. תומך ב:
#   Android:  10/09/2026, 08:15 - שם: הודעה
#   Android:  10.9.2026, 8:15 - שם: הודעה
#   iOS:      [10/09/2026, 08:15:32] שם: הודעה
#   12h:      10/09/2026, 8:15 PM - שם: הודעה   (או ‏AM/PM עם רווח)
_HEADER = re.compile(
    r"^\[?"
    r"(?P<d>\d{1,2})[./](?P<m>\d{1,2})[./](?P<y>\d{2,4})"
    r",?\s+"
    r"(?P<H>\d{1,2}):(?P<M>\d{2})(?::(?P<S>\d{2}))?"
    r"\s*(?P<ampm>[AaPp][Mm])?"
    r"\]?\s*[-–]?\s*"
    r"(?P<rest>.*)$"
)

# הודעות מערכת/מדיה שאין טעם לסכם
_SKIP_PATTERNS = [
    r"^<Media omitted>$",
    r"^<המדיה לא נכללה>$",
    r"^המדיה לא נכללה$",
    r"^image omitted$",
    r"^video omitted$",
    r"^audio omitted$",
    r"^sticker omitted$",
    r"^GIF omitted$",
    r"^document omitted$",
    r"^This message was deleted$",
    r"^You deleted this message$",
    r"^הודעה זו נמחקה$",
    r"^מחקת את ההודעה הזו$",
    r"^Messages and calls are end-to-end encrypted",
    r"^ההודעות והשיחות מוצפנות מקצה לקצה",
    r"^Missed voice call$",
    r"^Missed video call$",
    r"שיחה קולית שלא נענתה$",
    r"^null$",
]
_SKIP = re.compile("|".join(f"(?:{p})" for p in _SKIP_PATTERNS), re.IGNORECASE)

# הודעות מערכת על הצטרפות/עזיבה וכו' — אין להן "שם: " ולכן rest בלי נקודתיים
_SYSTEM_HINTS = re.compile(
    r"(joined using|left$|added|removed|changed the subject|changed this group|"
    r"created group|הצטרף|הצטרפה|עזב|עזבה|הוסיף|הוסיפה|הסיר|הסירה|שינה את|שינתה את|"
    r"יצר את הקבוצה|יצרה את הקבוצה|security code changed|קוד האבטחה)",
    re.IGNORECASE,
)


@dataclass
class Message:
    ts: dt.datetime
    sender: str
    text: str
    source: str  # שם הקובץ (=שם הקבוצה)

    def append(self, line: str) -> None:
        self.text = f"{self.text}\n{line}" if self.text else line


def _clean(line: str) -> str:
    return _INVISIBLE.sub("", line).rstrip("\r\n")


def _parse_ts(m: re.Match) -> dt.datetime | None:
    y = int(m["y"])
    if y < 100:
        y += 2000
    H = int(m["H"])
    ampm = (m["ampm"] or "").upper()
    if ampm == "PM" and H < 12:
        H += 12
    if ampm == "AM" and H == 12:
        H = 0
    try:
        return dt.datetime(y, int(m["m"]), int(m["d"]), H, int(m["M"]), int(m["S"] or 0))
    except ValueError:
        return None


def parse_export(path: Path) -> list[Message]:
    """מפרסר קובץ ייצוא אחד. הודעות מרובות-שורות מודבקות להודעה שקדמה להן."""
    group = path.stem
    msgs: list[Message] = []
    current: Message | None = None

    with path.open(encoding="utf-8", errors="replace") as fh:
        for raw in fh:
            line = _clean(raw)
            m = _HEADER.match(line)
            if m and (ts := _parse_ts(m)) is not None:
                rest = m["rest"].strip()
                # "שם: טקסט"  — הנקודתיים הראשונות מפרידות שולח מתוכן.
                # הודעות מערכת (הצטרף/עזב) אין להן שולח → מדלגים.
                sender, sep, text = rest.partition(": ")
                if not sep:
                    if rest.endswith(":"):
                        sender, text = rest[:-1], ""
                    else:
                        current = None
                        continue
                if _SYSTEM_HINTS.search(sender) and not text:
                    current = None
                    continue
                current = Message(ts=ts, sender=sender.strip(), text=text.strip(), source=group)
                msgs.append(current)
            elif current is not None and line.strip():
                current.append(line)

    # סינון מדיה/מחיקות אחרי ההרכבה (כדי לא לשבור המשכיות שורות)
    return [m for m in msgs if m.text and not _SKIP.search(m.text.strip())]


def collect_files(inputs: Iterable[str]) -> list[Path]:
    files: list[Path] = []
    for item in inputs:
        p = Path(item)
        if p.is_dir():
            files.extend(sorted(q for q in p.rglob("*.txt") if q.is_file()))
        elif p.is_file():
            files.append(p)
        else:
            print(f"⚠️  לא נמצא: {item}", file=sys.stderr)
    return files


# ---------------------------------------------------------------------------
# חלון זמן, אנונימיזציה, שרשורים
# ---------------------------------------------------------------------------


def window(msgs: list[Message], since: dt.datetime, until: dt.datetime) -> list[Message]:
    return [m for m in msgs if since <= m.ts < until]


def anonymize(msgs: list[Message]) -> dict[str, str]:
    """מחליף שמות משתתפים ב-'יועץ 1', 'יועץ 2'… לפי סדר הופעה. מחזיר מיפוי."""
    mapping: dict[str, str] = {}
    for m in msgs:
        if m.sender not in mapping:
            mapping[m.sender] = f"יועץ {len(mapping) + 1}"
    for m in msgs:
        m.sender = mapping[m.sender]
    # גם אזכורים בטקסט (@שם או שם מלא)
    if mapping:
        names = sorted(mapping, key=len, reverse=True)
        pat = re.compile("|".join(re.escape(n) for n in names))
        for m in msgs:
            m.text = pat.sub(lambda mm: mapping[mm.group(0)], m.text)
    return mapping


@dataclass
class Thread:
    group: str
    messages: list[Message] = field(default_factory=list)

    @property
    def start(self) -> dt.datetime:
        return self.messages[0].ts

    @property
    def participants(self) -> set[str]:
        return {m.sender for m in self.messages}

    def render(self) -> str:
        out = []
        for m in self.messages:
            t = m.ts.strftime("%H:%M")
            body = m.text.replace("\n", "\n    ")
            out.append(f"[{t}] {m.sender}: {body}")
        return "\n".join(out)


def split_threads(msgs: list[Message], gap_minutes: int = 90) -> list[Thread]:
    """שרשור = רצף הודעות באותה קבוצה בלי שקט של gap_minutes ביניהן."""
    threads: list[Thread] = []
    by_group: dict[str, list[Message]] = {}
    for m in msgs:
        by_group.setdefault(m.source, []).append(m)
    gap = dt.timedelta(minutes=gap_minutes)
    for group, gmsgs in by_group.items():
        gmsgs.sort(key=lambda m: m.ts)
        cur: Thread | None = None
        for m in gmsgs:
            if cur is None or m.ts - cur.messages[-1].ts > gap:
                cur = Thread(group=group)
                threads.append(cur)
            cur.messages.append(m)
    threads.sort(key=lambda t: t.start)
    return threads


# ---------------------------------------------------------------------------
# סיכום עם Claude
# ---------------------------------------------------------------------------

MODEL = os.environ.get("DIGEST_MODEL", "claude-opus-5")

SYSTEM_PROMPT = """אתה אנליסט בכיר בתחום המשכנתאות בישראל, עובד עבור תמיר גרמה ("מניפה פיננסית"),
יועץ משכנתאות. אתה מקבל תמלילי שיחות מקבוצות וואטסאפ מקצועיות של יועצי משכנתאות
ומחלץ מהן ידע מקצועי בלבד.

כללי ברזל:
- אל תמציא. כל מקרה, פתרון או חידוש חייב להופיע בתמליל. אם משהו לא ברור — כתוב "לא ברור מהשיחה".
- שמות המשתתפים כבר מאונמים ("יועץ 3"). אל תנסה לזהות אנשים. אל תצטט מספרי טלפון או שמות לקוחות אם הופיעו.
- התעלם מברכות, בדיחות, פרסום עצמי, ומהודעות שאינן מקצועיות.
- ריבית בנק ישראל היא 3.25% ופריים 4.75% (ספטמבר 2026). אם בשיחה מופיע נתון אחר — ציין את הפער, אל "תתקן" אותו בשקט.
- כתוב בעברית מקצועית, תמציתית, מנקודת מבט של יועץ. לא "הבנק אמר" — אלא "מה זה אומר ליועץ בפועל".

מבנה הפלט (Markdown, בדיוק הכותרות האלה):

## 🔥 השורה התחתונה
3-5 נקודות: הדברים הכי חשובים שיועץ צריך לדעת מהיום הזה.

## 📁 מקרים ופתרונות
לכל מקרה שנדון (רק מקרים שיש בהם תוכן מקצועי):
### מקרה N — כותרת קצרה
- **הסיטואציה:** (פרופיל הלקוח / הבעיה, בלי פרטים מזהים)
- **מה נשאל:**
- **פתרונות שהוצעו:** (מי הציע = "יועץ X", מה הציע, ומה הנימוק)
- **הסכמה/מחלוקת:** (אם היועצים חלקו — ציין את שתי הגישות)
- **טייק-אוויי ליועץ:** משפט אחד.

## 🆕 חידושים ועדכונים
נהלים בנקאיים חדשים, שינויי רגולציה, מוצרים חדשים, שינויי ריבית/מרווח, התנהגות של בנק ספציפי
("בנק X מאשר/מסרב/דורש…"). לכל פריט: מה, איזה בנק/גוף, מי דיווח ("יועץ X"), רמת ודאות (דיווח יחיד / אושר ע"י כמה יועצים).

## ❓ שאלות שנשארו פתוחות
שאלות שנשאלו ולא קיבלו תשובה ברורה — הזדמנות לתמיר להיות זה שעונה.

## 🎬 רעיונות לתוכן
2-4 רעיונות לסרטונים/פוסטים שנולדו מהשיחות. לכל אחד: הוק פותח (3 שניות) + מה הנקודה. סמן אם נוגע ללקוח קצה (B2C) או ליועצים (B2B).

אם ביום הזה לא היה תוכן מקצועי — כתוב זאת בכנות במקום למלא."""


def summarize_with_claude(threads: list[Thread], date_label: str) -> str:
    import anthropic  # מיובא כאן כדי ש---no-llm יעבוד גם בלי SDK

    client = anthropic.Anthropic()
    transcript = "\n\n".join(
        f"=== קבוצה: {t.group} | התחלה {t.start:%d/%m %H:%M} | {len(t.messages)} הודעות ===\n{t.render()}"
        for t in threads
    )
    user = (
        f"תאריך הסיכום: {date_label}\n"
        f"מספר שרשורים: {len(threads)}\n\n"
        f"<transcripts>\n{transcript}\n</transcripts>\n\n"
        "הפק את הסיכום לפי המבנה שהוגדר."
    )
    with client.messages.stream(
        model=MODEL,
        max_tokens=16000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user}],
    ) as stream:
        response = stream.get_final_message()

    if response.stop_reason == "refusal":
        return "_Claude סירב לסכם את התוכן הזה._"
    return "".join(b.text for b in response.content if b.type == "text").strip()


# ---------------------------------------------------------------------------
# בניית הדוח
# ---------------------------------------------------------------------------


def build_report(
    threads: list[Thread],
    all_msgs: list[Message],
    since: dt.datetime,
    until: dt.datetime,
    summary: str | None,
    mapping: dict[str, str] | None,
) -> str:
    date_label = f"{since:%d/%m/%Y}" if (until - since) <= dt.timedelta(days=1) else f"{since:%d/%m/%Y} – {(until - dt.timedelta(days=1)):%d/%m/%Y}"
    groups = Counter(m.source for m in all_msgs)
    senders = Counter(m.sender for m in all_msgs)
    active_hours = Counter(m.ts.hour for m in all_msgs)
    peak = ", ".join(f"{h:02d}:00" for h, _ in active_hours.most_common(2)) or "—"

    lines = [
        f"# 📱 סיכום קבוצות יועצי משכנתאות — {date_label}",
        "",
        f"_נוצר אוטומטית ב-{dt.datetime.now():%d/%m/%Y %H:%M} · `tools/whatsapp_digest.py`_",
        "",
        "| מדד | ערך |",
        "|---|---|",
        f"| הודעות מקצועיות (אחרי סינון מדיה/מערכת) | {len(all_msgs)} |",
        f"| קבוצות | {len(groups)} |",
        f"| משתתפים פעילים | {len(senders)} |",
        f"| שרשורי שיחה | {len(threads)} |",
        f"| שעות שיא | {peak} |",
        "",
    ]
    if groups:
        lines += ["**פעילות לפי קבוצה:**", ""]
        lines += [f"- {g}: {n} הודעות" for g, n in groups.most_common()]
        lines.append("")

    lines.append("---")
    lines.append("")
    if summary is not None:
        lines.append(summary)
    else:
        lines += [
            "## סיכום",
            "",
            "_הופעל עם `--no-llm` — אין סיכום אוטומטי. השרשורים הגולמיים למטה._",
        ]
    lines += ["", "---", "", "## 📎 נספח — השרשורים (מאונמים)", ""]
    if not threads:
        lines.append("_אין הודעות בחלון הזמן._")
    for i, t in enumerate(threads, 1):
        lines += [
            f"<details><summary>שרשור {i} · {t.group} · {t.start:%d/%m %H:%M} · {len(t.messages)} הודעות · {len(t.participants)} משתתפים</summary>",
            "",
            "```text",
            t.render(),
            "```",
            "</details>",
            "",
        ]
    if mapping:
        lines += [
            "",
            f"_אנונימיזציה: {len(mapping)} משתתפים הוחלפו ב-'יועץ N'. המיפוי לא נשמר בדוח._",
        ]
    return "\n".join(lines).rstrip() + "\n"


def report_to_html(md: str) -> str:
    """המרה מינימלית ל-HTML למייל (RTL). לא מנסה להיות Markdown מלא."""
    out = ["<div dir='rtl' style='font-family:Arial,sans-serif;text-align:right;max-width:720px;margin:auto;padding:24px;background:#FAF6EE;color:#2E363F;line-height:1.7'>"]
    in_code = False
    in_list = False
    for line in md.splitlines():
        if line.startswith("```"):
            if in_code:
                out.append("</pre>")
            else:
                out.append("<pre dir='auto' style='background:#fff;padding:12px;border-radius:8px;font-size:12px;white-space:pre-wrap'>")
            in_code = not in_code
            continue
        if in_code:
            out.append(html.escape(line))
            continue
        if line.startswith("<details") or line.startswith("</details") or line.startswith("<summary") or line.startswith("</summary"):
            out.append(line)
            continue
        if line.startswith("- "):
            if not in_list:
                out.append("<ul>")
                in_list = True
            out.append(f"<li>{_inline(line[2:])}</li>")
            continue
        if in_list:
            out.append("</ul>")
            in_list = False
        if line.startswith("### "):
            out.append(f"<h3 style='color:#2E363F;margin:18px 0 6px'>{_inline(line[4:])}</h3>")
        elif line.startswith("## "):
            out.append(f"<h2 style='color:#B89259;border-bottom:2px solid #B89259;padding-bottom:4px;margin-top:28px'>{_inline(line[3:])}</h2>")
        elif line.startswith("# "):
            out.append(f"<h1 style='color:#2E363F'>{_inline(line[2:])}</h1>")
        elif line.startswith("|"):
            cells = [c.strip() for c in line.strip("|").split("|")]
            if set("".join(cells)) <= set("-: "):
                continue
            tag = "td"
            out.append("<tr>" + "".join(f"<{tag} style='padding:4px 10px;border-bottom:1px solid #e5e0d5'>{_inline(c)}</{tag}>" for c in cells) + "</tr>")
        elif line.strip() == "---":
            out.append("<hr style='border:0;border-top:1px solid #e5e0d5;margin:24px 0'>")
        elif line.strip():
            out.append(f"<p style='margin:6px 0'>{_inline(line)}</p>")
    if in_list:
        out.append("</ul>")
    out.append("</div>")
    body = "\n".join(out)
    # עוטפים שורות טבלה בטבלה אחת
    body = re.sub(r"((?:<tr>.*?</tr>\n?)+)", r"<table style='border-collapse:collapse;background:#fff;border-radius:8px'>\1</table>", body, flags=re.S)
    return body


def _inline(s: str) -> str:
    s = html.escape(s, quote=False)
    s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"_(.+?)_", r"<em>\1</em>", s)
    s = re.sub(r"`(.+?)`", r"<code>\1</code>", s)
    return s


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("inputs", nargs="+", help="קבצי ייצוא .txt או תיקיות")
    ap.add_argument("--days", type=int, default=1, help="כמה ימים אחורה לכלול (ברירת מחדל: אתמול+היום)")
    ap.add_argument("--since", help="תאריך התחלה YYYY-MM-DD (גובר על --days)")
    ap.add_argument("--until", help="תאריך סיום YYYY-MM-DD, לא כולל (ברירת מחדל: מחר)")
    ap.add_argument("--gap", type=int, default=90, help="דקות שקט שמפרידות בין שרשורים (90)")
    ap.add_argument("--no-llm", action="store_true", help="בלי קריאה ל-Claude — רק פרסור ושרשורים")
    ap.add_argument("--keep-names", action="store_true", help="לא לאנמז שמות משתתפים")
    ap.add_argument("--out", help="נתיב פלט Markdown (ברירת מחדל: docs/whatsapp-digests/<תאריך>.md)")
    ap.add_argument("--html", help="לכתוב גם גרסת HTML למייל לנתיב הזה")
    ap.add_argument("--json", help="לכתוב גם JSON של השרשורים (לאוטומציה)")
    args = ap.parse_args(argv)

    today = dt.date.today()
    until = dt.datetime.combine(dt.date.fromisoformat(args.until), dt.time()) if args.until else dt.datetime.combine(today + dt.timedelta(days=1), dt.time())
    if args.since:
        since = dt.datetime.combine(dt.date.fromisoformat(args.since), dt.time())
    else:
        since = dt.datetime.combine(today - dt.timedelta(days=args.days), dt.time())

    files = collect_files(args.inputs)
    if not files:
        print("❌ לא נמצאו קבצי ייצוא (.txt)", file=sys.stderr)
        return 2

    all_msgs: list[Message] = []
    for f in files:
        parsed = parse_export(f)
        print(f"📄 {f.name}: {len(parsed)} הודעות טקסט", file=sys.stderr)
        all_msgs.extend(parsed)

    msgs = window(all_msgs, since, until)
    print(f"🕒 בחלון {since:%d/%m/%Y}–{until:%d/%m/%Y}: {len(msgs)} הודעות", file=sys.stderr)

    mapping = None if args.keep_names else anonymize(msgs)
    threads = split_threads(msgs, gap_minutes=args.gap)
    print(f"🧵 {len(threads)} שרשורים", file=sys.stderr)

    summary: str | None = None
    if not args.no_llm:
        if not threads:
            summary = "## סיכום\n\n_לא היו הודעות מקצועיות בחלון הזמן — אין מה לסכם._"
        else:
            date_label = f"{since:%d/%m/%Y}" if (until - since) <= dt.timedelta(days=1) else f"{since:%d/%m/%Y}–{(until - dt.timedelta(days=1)):%d/%m/%Y}"
            print(f"🤖 שולח {sum(len(t.messages) for t in threads)} הודעות ל-{MODEL}…", file=sys.stderr)
            summary = summarize_with_claude(threads, date_label)

    report = build_report(threads, msgs, since, until, summary, mapping)

    out = Path(args.out) if args.out else Path("docs/whatsapp-digests") / f"{(until - dt.timedelta(days=1)):%Y-%m-%d}.md"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(report, encoding="utf-8")
    print(f"✅ נכתב: {out}", file=sys.stderr)

    if args.html:
        Path(args.html).write_text(report_to_html(report), encoding="utf-8")
        print(f"✅ HTML: {args.html}", file=sys.stderr)
    if args.json:
        payload = [
            {
                "group": t.group,
                "start": t.start.isoformat(),
                "participants": sorted(t.participants),
                "messages": [{"ts": m.ts.isoformat(), "sender": m.sender, "text": m.text} for m in t.messages],
            }
            for t in threads
        ]
        Path(args.json).write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"✅ JSON: {args.json}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
