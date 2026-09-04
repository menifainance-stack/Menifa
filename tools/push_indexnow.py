#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
push_indexnow.py — דוחף את כל כתובות ה-sitemap לפרוטוקול IndexNow.

IndexNow הוא ה-ping המיידי היחיד שעדיין עובד ב-2026:
Bing, Yandex, Seznam ו-Naver סורקים תוך שעות. גוגל לא חבר בפרוטוקול,
אבל אינדוקס מהיר בבינג מייצר לעיתים spillover של גילוי קישורים לגוגל.

נקודת ה-endpoint api.indexnow.org מפיצה לכל המנועים החברים בבת אחת;
שאר ה-endpoints משמשים כגיבוי אם הראשי לא זמין.

הרצה: python3 tools/push_indexnow.py
"""

import json
import os
import re
import sys
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HOST = "menifa.org"
KEY = "menifa-indexnow-2026070100"
KEY_LOCATION = f"https://{HOST}/{KEY}.txt"

# api.indexnow.org מפיץ לכולם. השאר הם גיבוי בלבד.
PRIMARY = "https://api.indexnow.org/indexnow"
FALLBACKS = ["https://www.bing.com/indexnow", "https://yandex.com/indexnow"]

# IndexNow מגביל ל-10,000 כתובות לבקשה.
BATCH = 10000


def sitemap_urls():
    path = os.path.join(ROOT, "sitemap.xml")
    with open(path, encoding="utf-8") as fh:
        return re.findall(r"<loc>([^<]+)</loc>", fh.read())


def submit(endpoint, urls):
    """מחזיר את קוד ה-HTTP, או None אם הבקשה נכשלה ברמת הרשת."""
    payload = json.dumps({
        "host": HOST, "key": KEY,
        "keyLocation": KEY_LOCATION, "urlList": urls,
    }).encode("utf-8")
    req = urllib.request.Request(endpoint, data=payload, headers={
        "Content-Type": "application/json; charset=utf-8",
        "User-Agent": "Menifa-IndexNow/1.0 (+https://menifa.org)",
    })
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            print(f"  {endpoint} -> HTTP {resp.status} {resp.reason}")
            return resp.status
    except urllib.error.HTTPError as exc:
        detail = exc.read()[:300].decode("utf-8", "replace")
        print(f"  {endpoint} -> HTTP {exc.code} {exc.reason} | {detail}")
        return exc.code
    except Exception as exc:
        print(f"  {endpoint} -> {type(exc).__name__}: {exc}")
        return None


def main():
    urls = sitemap_urls()
    if not urls:
        sys.exit("לא נמצאו כתובות ב-sitemap.xml — עוצר.")
    print(f"נשלחות {len(urls)} כתובות ל-IndexNow (host={HOST})")

    ok = False
    for start in range(0, len(urls), BATCH):
        chunk = urls[start:start + BATCH]
        status = submit(PRIMARY, chunk)
        # 200 = התקבל, 202 = התקבל וממתין לאימות המפתח. שניהם הצלחה.
        if status in (200, 202):
            ok = True
            continue
        print("  ה-endpoint הראשי לא אישר — מנסה גיבויים")
        for endpoint in FALLBACKS:
            if submit(endpoint, chunk) in (200, 202):
                ok = True
                break

    if not ok:
        # לא מפילים את ה-workflow: הפידים כבר עודכנו וזה העיקר.
        print("\nאזהרה: אף endpoint של IndexNow לא אישר את הבקשה.")
        print("בדוק שקובץ המפתח נגיש: " + KEY_LOCATION)
        return

    print("\nהדחיפה אושרה. Bing/Yandex/Seznam/Naver יסרקו תוך 24 שעות.")


if __name__ == "__main__":
    main()
