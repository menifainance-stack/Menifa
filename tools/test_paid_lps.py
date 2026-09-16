#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Guardrails for paid conversion LPs under /lp/ (pilot only)."""
import os
import re
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LPS = [
    "lp/ihud-halvaot.html",
    "lp/mihzur-mashkanta.html",
    "lp/pikdonot-300k.html",
]
ORGANIC = [
    "ihud-halvaot-lemashkanta.html",
    "mihzur-mashkanta.html",
]
FORBIDDEN = [
    r"180\s*K",
    r"180,?000",
    r"₪\s*180",
    r"98\s*%",
    r"הכי זול",
    r"עינב",
    r"Einav",
    r"[Ll]andbot",
    r"כתבו עלות",
]
UTM_NAMES = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]
failures = []


def fail(msg):
    failures.append(msg)
    print("FAIL:", msg)


def ok(msg):
    print("OK  :", msg)


def read(rel):
    path = os.path.join(ROOT, rel)
    with open(path, encoding="utf-8") as fh:
        return fh.read()


def test_files_exist():
    for rel in LPS + ["assets/lp-paid.css", "assets/lp-lead.js", "bmf-hub.html"]:
        if not os.path.isfile(os.path.join(ROOT, rel)):
            fail(f"missing {rel}")
        else:
            ok(f"exists {rel}")


def test_organic_untouched_content():
    for rel in ORGANIC:
        html = read(rel)
        if f'canonical" href="https://menifa.org/{rel}"' not in html and f"https://menifa.org/{rel}" not in html:
            fail(f"organic canonical missing on {rel}")
        else:
            ok(f"organic pillar still at root {rel}")
        if 'name="robots" content="index, follow' not in html:
            fail(f"organic {rel} should remain indexable")


def test_lp_pages():
    for rel in LPS:
        html = read(rel)
        if "noindex" not in html:
            fail(f"{rel} missing noindex")
        else:
            ok(f"{rel} noindex")
        if html.count("וואטסאפ — לתיאום שיחה") < 2:
            fail(f"{rel} needs repeated CTA label, found {html.count('וואטסאפ — לתיאום שיחה')}")
        else:
            ok(f"{rel} CTA label present")
        for name in UTM_NAMES:
            if f'name="{name}"' not in html:
                fail(f"{rel} missing hidden {name}")
        if 'name="name"' not in html or 'name="phone"' not in html:
            fail(f"{rel} missing short form fields")
        if "data-wa-prefill=" not in html:
            fail(f"{rel} missing WhatsApp prefill")
        prefill = re.search(r'data-wa-prefill="([^"]+)"', html)
        if prefill:
            text = prefill.group(1)
            if "עלות כוללת" in text or "כתבו עלות" in text:
                fail(f"{rel} WA prefill must be consult, not עלות: {text}")
            else:
                ok(f"{rel} WA prefill: {text}")
        for pat in FORBIDDEN:
            if re.search(pat, html):
                fail(f"{rel} contains forbidden pattern {pat}")
        if "lp-lead.js" not in html:
            fail(f"{rel} missing lp-lead.js")
        if rel != "lp/pikdonot-300k.html" and "ייעוץ משכנתא" not in html:
            fail(f"{rel} should position mortgage consult")


def test_draft():
    html = read("lp/pikdonot-300k.html")
    for needle in ("טיוטה", "ממתין לאישור מוצר", "lp-draft-watermark", "lp-draft-banner"):
        if needle not in html:
            fail(f"draft page missing {needle}")
    ok("draft watermark + product-pending copy")
    if "ביטוח" in html:
        fail("draft page should omit insurance")
    if "תשואה מובטחת" in html or "הכי משתלם" in html:
        fail("draft page has hard product claim")


def test_hub_and_robots():
    hub = read("bmf-hub.html")
    if "דפי נחיתה ממומנים — פיילוט" not in hub:
        fail("hub missing paid LP section")
    for rel in LPS:
        if rel not in hub:
            fail(f"hub missing link to {rel}")
    ok("hub links all 3 LPs")
    pilot = read("pilot/index.html")
    if "../lp/ihud-halvaot.html" not in pilot:
        fail("pilot/index.html missing LP links")
    robots = read("robots.txt")
    if "Disallow: /lp/" not in robots:
        fail("robots.txt should Disallow /lp/")
    else:
        ok("robots Disallow /lp/")
    sitemap = read("sitemap-pages.xml")
    if "/lp/" in sitemap:
        fail("paid LPs must not appear in sitemap-pages.xml")
    else:
        ok("sitemap does not list /lp/")


def test_js_payload_contract():
    js = read("assets/lp-lead.js")
    for key in ("page:", "name:", "phone:", "amount:", "note:", "ts:"):
        if key not in js:
            fail(f"lp-lead.js missing payload key {key}")
    if "עינב" in js:
        fail("lp-lead.js must not name coordinators")
    if "utm_source" not in js:
        fail("lp-lead.js missing UTM handling")
    ok("lp-lead.js webhook field contract")


def test_http(base):
    paths = [
        "/lp/ihud-halvaot.html",
        "/lp/mihzur-mashkanta.html",
        "/lp/pikdonot-300k.html",
        "/bmf-hub.html",
        "/ihud-halvaot-lemashkanta.html",
        "/mihzur-mashkanta.html",
    ]
    for path in paths:
        url = base.rstrip("/") + path
        try:
            with urllib.request.urlopen(url, timeout=5) as resp:
                code = resp.getcode()
                body = resp.read(200)
        except Exception as exc:
            fail(f"HTTP {path}: {exc}")
            continue
        if code != 200:
            fail(f"HTTP {path} -> {code}")
        else:
            ok(f"HTTP {path} -> 200 ({len(body)}+ bytes)")


def main():
    test_files_exist()
    test_organic_untouched_content()
    test_lp_pages()
    test_draft()
    test_hub_and_robots()
    test_js_payload_contract()
    if len(sys.argv) > 1:
        test_http(sys.argv[1])
    if failures:
        print(f"\n{len(failures)} failure(s)")
        return 1
    print("\nAll paid-LP guardrails passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
