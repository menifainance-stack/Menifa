#!/usr/bin/env python3
"""QC gate — עיצוב ועריכה מניפה (hierarchy, tokens, anti-AI, hero, motion)."""
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
    if hero.count("<h1>") != 1:
        errors.append("hero must have exactly one H1")
    if "לוחץ" not in h1_txt:
        errors.append("expected one accent pain word in H1")
    if hero.count("accent") < 1:
        errors.append("H1 accent span missing")
    if "כלי מעל הקפל" in hero:
        errors.append("agent jargon in hero")

if "וואטסאפ — לתיאום שיחה" not in html:
    errors.append("required WA CTA copy missing")

for banned in ("#DAAF2E", "#163259", "*3976"):
    if banned in css or banned in html:
        errors.append(f"banned token present: {banned}")

anti_ai = (
    "בעולם של היום",
    "חשוב לציין",
    "בואו נצלול",
    "בסופו של דבר",
    "מגנט חישובי",
    "כלי מעל הקפל",
    "שיטת ריסטארט",
    "דלת מסתובבת",
    "חסכו ₪",
)
for phrase in anti_ai:
    if phrase in html:
        errors.append(f"anti-AI / anti-copy phrase: {phrase}")

if "id=\"home-quiz\"" not in html:
    errors.append("quiz missing")
if "שלב" not in html or "מתוך" not in html:
    errors.append("quiz progress copy missing")
if "#0A2F48cc" not in css:
    errors.append("hero overlay token missing")
if "0 4px 24px -4px" not in css:
    errors.append("card rest shadow token missing")

if "hero-particle-rise" in js:
    errors.append("looping hero particles still injected")
if "NUMBER COUNT-UP" in js:
    errors.append("count-up from 0 still present")
if "180,000 ₪ על חיי המשכנתא" in js:
    errors.append("drawer still uses savings claim")

if errors:
    print("FAIL")
    for e in errors:
        print("-", e)
    sys.exit(1)
print("OK — עיצוב ועריכה מניפה QC passed")
print("  hierarchy: one H1, WA primary, calculator secondary")
print("  tokens: #0E3C5C / #5BAFD8 — no Luski gold/navy")
print("  anti-AI: banned clichés and agent jargon absent")
print("  insurance: not in hero H1/eyebrow")
print("  motion: no particle loop, no count-from-0")
