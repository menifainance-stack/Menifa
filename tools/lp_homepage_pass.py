#!/usr/bin/env python3
"""Restructure the four paid LPs into homepage section bands. No new visible text."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGES = {
    "yoetz-mashkantaot.html": "מול מה השוויתם אותה?",
    "mashkanta-kablan.html": "ולוח התשלומים כבר רץ",
    "yoetz-mashkantaot-merkaz.html": "לפני שהקבלן והבנק המלווה מחליטים בשבילכם",
    "ishur-ekroni.html": "ומה עדיין יכול ליפול אחריו",
}
BANDS = ["bg-guil", "bg-pin", "bg-grid"]


def balanced_from(html, start):
    """Return (end_exclusive) of the element that starts at `start` (a '<' )."""
    assert html[start] == "<"
    gt = html.find(">", start)
    tag = re.match(r"<([a-zA-Z0-9]+)", html[start:gt + 1]).group(1)
    void = tag.lower() in {"img", "br", "hr", "input", "meta", "link", "source"}
    if html[gt - 1] == "/" or void:
        return gt + 1
    depth = 1
    i = gt + 1
    open_re = re.compile(rf"<{tag}\b|</{tag}>", re.I)
    while depth:
        m = open_re.search(html, i)
        if not m:
            raise SystemExit(f"unbalanced <{tag}> from {start}")
        if m.group(0).startswith("</"):
            depth -= 1
            if depth == 0:
                return m.end()
        else:
            # self-closing?
            nxt = html.find(">", m.end())
            if html[nxt - 1] == "/":
                pass
            else:
                depth += 1
        i = m.end()
    raise SystemExit("balance failed")


def wrap_lists(html):
    out = []
    i = 0
    while True:
        m = re.search(r"<(ul|ol)\b", html[i:])
        if not m:
            out.append(html[i:])
            break
        start = i + m.start()
        end = balanced_from(html, start)
        out.append(html[i:start])
        out.append('<div class="card">' + html[start:end] + "</div>")
        i = end
    return "".join(out)


def dress(fragment):
    fragment = fragment.replace('class="table-wrap"', 'class="table-wrap card"', 1) if 'class="table-wrap"' in fragment else fragment
    # all table-wraps
    fragment = fragment.replace('class="table-wrap"', 'class="table-wrap card"')
    fragment = fragment.replace('class="faq-list dark-faq"', 'class="faq-list dark-faq card"')
    fragment = fragment.replace('class="faq-list"', 'class="faq-list card"')
    return wrap_lists(fragment)


def split_form(body):
    i = body.find("lp-form-card")
    if i < 0:
        return body, None
    start = body.rfind("<div", 0, i)
    end = balanced_from(body, start)
    card = body[start:end]
    card = card.replace(
        'class="card lp-form-card" style="margin-top:56px;background:linear-gradient(160deg,var(--em-700),var(--em-900));border-color:rgb(var(--gold-hi-rgb) / .3)"',
        'class="card" style="padding:36px"',
    )
    return body[:start] + body[end:], card


def section(bg, inner, form=None, rays=False):
    layer = ""
    if rays:
        layer = '<div class="layer" aria-hidden="true"><div class="rays center"></div><div class="sweep"></div></div>'
    if form:
        return (
            f'<section class="sec {bg} sec-pad">{layer}'
            f'<div class="wrap"><div class="article-grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:center">'
            f'<div class="stack" style="gap:20px">{inner}</div>{form}'
            f"</div></div></section>"
        )
    return f'<section class="sec {bg} sec-pad"><div class="wrap">{inner}</div></section>'


def build_main(article, aside):
    parts = re.split(r"(?=<h2>)", article)
    chunks = []
    bi = 0
    for part in parts:
        if not part.strip():
            continue
        m = re.match(r"<h2>(.*?)</h2>(.*)\Z", part, re.S)
        if m:
            title, body = m.group(1), m.group(2)
            head = f'<div class="sec-head"><h2 class="h-xl">{title}</h2></div>'
        else:
            head, body = "", part
        body, form = split_form(body)
        body = dress(body)
        prose = f'<div class="prose">{body}</div>' if body.strip() else ""
        inner = head + prose
        if form:
            chunks.append(section("bg-hero", inner, form=form, rays=True))
        else:
            bg = BANDS[bi % len(BANDS)]
            bi += 1
            chunks.append(section(bg, inner))
    # services / author stay after the article text, full width, dark glass rows
    aside = aside.replace("<h4>", '<div class="sec-head"><h4 class="h-xl">', 1)
    aside = aside.replace("</h4>", "</h4></div>", 1)
    chunks.append(
        '<section class="sec bg-pin sec-pad"><div class="wrap">'
        f'<aside class="aside" aria-label="פנייה לתמיר">{aside}</aside>'
        "</div></section>"
    )
    return '<main id="main">' + "".join(chunks) + "</main>"


def gold_h1(html, phrase):
    m = re.search(r"<h1>(.*?)</h1>", html)
    if not m:
        raise SystemExit("no h1")
    inner = m.group(1)
    if inner.count(phrase) != 1:
        raise SystemExit(f"gold phrase not unique in h1: {phrase!r} / {inner!r}")
    i = inner.index(phrase)
    new = inner[:i] + f'<span class="g" style="display:block">{phrase}</span>' + inner[i + len(phrase):]
    return html[: m.start()] + f'<h1 class="h-hero">{new}</h1>' + html[m.end() :]


def hero_stack(html):
    needle = '<div class="wrap" style="padding-top:44px">'
    i = html.find(needle)
    if i < 0:
        raise SystemExit("hero wrap missing")
    html = html[:i] + '<div class="wrap" style="padding-top:56px"><div class="stack" style="gap:32px">' + html[i + len(needle) :]
    j = html.find("</section>", i)
    html = html[:j] + "</div>" + html[j:]
    html = html.replace(
        'class="sec bg-hero page-hero"',
        'class="sec bg-hero" style="padding-bottom:72px"',
        1,
    )
    return html


def transform(name, phrase):
    path = ROOT / name
    html = path.read_text(encoding="utf-8")
    html = gold_h1(html, phrase)
    html = hero_stack(html)
    m = re.search(
        r'<main id="main" class="sec lp-flow article-sec">.*?<article class="prose">(.*?)</article><aside class="aside" aria-label="פנייה לתמיר">(.*?)</aside>\s*</div></div></main>',
        html,
        re.S,
    )
    if not m:
        raise SystemExit(f"main block not found in {name}")
    html = html[: m.start()] + build_main(m.group(1), m.group(2)) + html[m.end() :]
    path.write_text(html, encoding="utf-8")
    print(name, "ok", len(html))


def main():
    for name, phrase in PAGES.items():
        transform(name, phrase)


if __name__ == "__main__":
    main()
