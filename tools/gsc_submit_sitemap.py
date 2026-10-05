#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gsc_submit_sitemap.py — מגיש את sitemap-index.xml ל-Google Search Console.

זה הצעד האוטומטי היחיד שגוגל מאפשר לאתר רגיל: Search Console API
(sitemaps.submit). "Request Indexing" לכתובת בודדת קיים רק בממשק הידני,
ו-Indexing API של גוגל מיועד רשמית רק לדפי משרות ושידורים חיים.

הגדרה חד-פעמית:
  1. ב-Google Cloud: פרויקט, להפעיל "Google Search Console API",
     ליצור Service Account ולהוריד מפתח JSON.
  2. ב-Search Console: Settings > Users and permissions > Add user,
     עם כתובת המייל של ה-Service Account והרשאת Owner.
  3. ב-GitHub: Settings > Secrets and variables > Actions > New secret
     בשם GSC_SERVICE_ACCOUNT_JSON, ובתוכו כל תוכן קובץ ה-JSON.

בלי הסוד הסקריפט מדלג ויוצא ב-0, כדי לא להפיל את הריצה היומית.

הרצה:  GSC_SERVICE_ACCOUNT_JSON='{...}' python3 tools/gsc_submit_sitemap.py
"""

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

_TOOLS = os.path.dirname(os.path.abspath(__file__))
if _TOOLS not in sys.path:
    sys.path.insert(0, _TOOLS)
from site_url import SITE

HOST = SITE.removeprefix("https://")
SITEMAPS = [f"{SITE}/sitemap-index.xml"]
SCOPE = "https://www.googleapis.com/auth/webmasters"
API = "https://www.googleapis.com/webmasters/v3"


def access_token(info):
    from google.oauth2 import service_account
    from google.auth.transport.requests import Request

    creds = service_account.Credentials.from_service_account_info(
        info, scopes=[SCOPE])
    creds.refresh(Request())
    return creds.token


def call(method, url, token):
    req = urllib.request.Request(
        url, method=method, headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        body = resp.read().decode("utf-8")
        return resp.status, json.loads(body) if body else {}


def find_property(token):
    """נכס Domain (sc-domain:) או נכס URL-prefix, מה שה-Service Account רואה."""
    _, data = call("GET", f"{API}/sites", token)
    sites = [s["siteUrl"] for s in data.get("siteEntry", [])]
    for candidate in (f"sc-domain:{HOST}", f"{SITE}/", f"https://www.{HOST}/"):
        if candidate in sites:
            return candidate
    sys.exit("ה-Service Account לא רואה את הנכס %s ב-Search Console. "
             "נכסים זמינים: %s" % (HOST, sites or "אין"))


def main():
    raw = os.environ.get("GSC_SERVICE_ACCOUNT_JSON", "").strip()
    if not raw:
        print("GSC_SERVICE_ACCOUNT_JSON לא מוגדר — מדלג על הגשה ל-Search Console.")
        return 0
    token = access_token(json.loads(raw))
    prop = find_property(token)
    enc_prop = urllib.parse.quote(prop, safe="")
    for sitemap in SITEMAPS:
        enc_map = urllib.parse.quote(sitemap, safe="")
        try:
            status, _ = call("PUT", f"{API}/sites/{enc_prop}/sitemaps/{enc_map}", token)
        except urllib.error.HTTPError as err:
            sys.exit(f"הגשת {sitemap} נכשלה: HTTP {err.code} {err.read()[:300]!r}")
        print(f"✓ {sitemap} הוגש ל-Search Console ({prop}), HTTP {status}")
        _, info = call("GET", f"{API}/sites/{enc_prop}/sitemaps/{enc_map}", token)
        print("  lastSubmitted=%s lastDownloaded=%s errors=%s warnings=%s" % (
            info.get("lastSubmitted"), info.get("lastDownloaded"),
            info.get("errors"), info.get("warnings")))
    return 0


if __name__ == "__main__":
    sys.exit(main())
