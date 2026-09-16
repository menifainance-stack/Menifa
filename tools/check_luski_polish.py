#!/usr/bin/env python3
"""Pilot QC: Luski-feel polish without Luski brand / insurance-in-hero."""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
html = (ROOT / "index.html").read_text(encoding="utf-8")
css = (ROOT / "assets/style.css").read_text(encoding="utf-8")
js = (ROOT / "assets/script.js").read_text(encoding="utf-8")

errors = []

def hero_block(src):
    m = re.search(r'<header class="hero">.*?</header>', src, re.S)
    return m.group(0) if m else ""

hero = hero_block(html)
if not hero:
    errors.append("hero header missing")
else:
    h1 = re.search(r"<h1>(.*?)</h1>", hero, re.S)
    eyebrow = re.search(r'class="eyebrow">(.*?)</p>', hero, re.S)
    h1_txt = re.sub(r"<[^>]+>", "", h1.group(1) if h1 else "")
    eb_txt = re.sub(r"<[^>]+>", "", eyebrow.group(1) if eyebrow else "")
    if "ביטוח" in h1_txt or "ביטוח" in eb_txt:
        errors.append("insurance in H1 or eyebrow")
    if "לוחץ" not in h1_txt:
        errors.append("expected one accent pain word in H1")
    if hero.count("accent") < 1:
        errors.append("H1 accent span missing")

if "וואטסאפ — לתיאום שיחה" not in html:
    errors.append("required WA CTA copy missing")

for banned in ("#DAAF2E", "#163259", "#C9A84C", "*3976"):
    if banned.lower() in css.lower() or banned in html:
        errors.append(f"banned token present: {banned}")

if "id=\"home-quiz\"" not in html:
    errors.append("quiz missing")
if "שלב" not in html or "מתוך" not in html:
    errors.append("quiz progress copy missing")
if "linear-gradient(135deg, #0A2F48cc" not in css and "linear-gradient(135deg, #0A2F48cc" not in css:
    if "#0A2F48cc" not in css:
        errors.append("hero overlay token missing")

if "hero-particle-rise" in js:
    errors.append("looping hero particles still injected")
if "requestAnimationFrame(step)" in js and "data-count" in js:
    # count-up loop should be gone from the counter block
    if "NUMBER COUNT-UP" in js:
        errors.append("count-up from 0 still present")

if "180,000 ₪ על חיי המשכנתא" in js:
    errors.append("drawer still uses savings claim")

if errors:
    print("FAIL")
    for e in errors:
        print("-", e)
    sys.exit(1)
print("OK — homepage polish QC passed")
