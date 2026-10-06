#!/usr/bin/env python3
"""Style existing bold-lead paragraphs and lists as homepage rows. No new text."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGES = [
    "yoetz-mashkantaot.html",
    "mashkanta-kablan.html",
    "yoetz-mashkantaot-merkaz.html",
    "ishur-ekroni.html",
]
P_RE = re.compile(r"<p(\s[^>]*)?>(.*?)</p>", re.S)
CARD_LIST = re.compile(
    r'<div class="card">\s*(<(ul|ol)\b([^>]*)>(.*?)</\2>)\s*</div>',
    re.S,
)


def dress_p(match):
    attrs = match.group(1) or ""
    inner = match.group(2)
    if "class=" in attrs:
        return match.group(0)
    plain = re.sub(r"<[^>]+>", "", inner)
    if plain.strip().startswith("מידע כללי"):
        return f'<p class="lp-note">{inner.strip()}</p>'
    lead = re.match(r"\s*<strong>(.*?)</strong>(.*)$", inner, re.S)
    if not lead:
        return match.group(0)
    lead_html, rest = lead.group(1), lead.group(2)
    lead_text = re.sub(r"<[^>]+>", "", lead_html)
    if "הערה משפטית" in lead_text:
        return f"<p class=\"lp-note\"><strong>{lead_html}</strong>{rest}</p>"
    if not re.sub(r"<[^>]+>", "", rest).strip():
        return match.group(0)
    return (
        '<p class="lp-row">'
        f'<span class="lp-row-t"><strong>{lead_html}</strong></span>'
        f'<span class="lp-row-d">{rest}</span></p>'
    )


def link_only(list_html):
    items = re.findall(r"<li>(.*?)</li>", list_html, re.S)
    if not items:
        return False
    for item in items:
        if not re.fullmatch(r"\s*<a\b[^>]*>.*?</a>\s*", item, re.S):
            return False
    return True


def dress_step_list(tag, attrs, body):
    def li(match):
        inner = match.group(1)
        if "<" in inner:
            return f'<li class="lp-step">{inner}</li>'
        split = re.match(r"(.{2,42}?:)(\s*\S.*)$", inner, re.S)
        if split:
            return (
                '<li class="lp-step split">'
                f'<span class="lp-row-t">{split.group(1)}</span>'
                f'<span class="lp-row-d">{split.group(2)}</span></li>'
            )
        return f'<li class="lp-step">{inner}</li>'

    body = re.sub(r"<li>(.*?)</li>", li, body, flags=re.S)
    return f'<{tag} class="lp-steps"{attrs}>{body}</{tag}>'


def dress_lists(html):
    def repl(match):
        whole, tag, attrs, body = match.group(0), match.group(2), match.group(3), match.group(4)
        start = match.start()
        sec = html.rfind("<section", 0, start)
        end = html.find("</section>", start)
        in_form = "id=\"form\"" in html[sec:end]
        list_html = match.group(1)
        if link_only(list_html):
            klass = "lp-pills" if in_form else "lp-linkrows"
            return f"<{tag} class=\"{klass}\"{attrs}>{body}</{tag}>"
        if in_form:
            return whole
        return dress_step_list(tag, attrs, body)

    return CARD_LIST.sub(repl, html)


def mark_contact(html):
    parts = re.split(r"(?=<section\b)", html)
    out = []
    for part in parts:
        if part.startswith("<section") and 'id="form"' in part.split("</section>", 1)[0]:
            part, n = re.subn(
                r'<div class="stack" style="gap:20px">(\s*)<div class="sec-head">',
                r'<div class="stack lp-contact" style="gap:20px">\1<div class="sec-head">',
                part,
                count=1,
            )
            if n != 1:
                raise SystemExit("contact stack not found")
            part = part.replace(
                '<h2 class="h-xl">יצירת קשר</h2>',
                '<h2 class="h-xl">יצירת <span class="g">קשר</span></h2>',
                1,
            )
            head, tail = part.split("</section>", 1)
            head = head.replace("<hr/>", "").replace("<hr>", "")
            part = head + "</section>" + tail
        out.append(part)
    return "".join(out)


def main():
    for name in PAGES:
        path = ROOT / name
        html = path.read_text(encoding="utf-8")
        html = P_RE.sub(dress_p, html)
        html = dress_lists(html)
        html = mark_contact(html)
        path.write_text(html, encoding="utf-8")
        print(name, "rows", html.count("lp-row"), "steps", html.count("lp-step"), "pills", html.count("lp-pills"), "notes", html.count("lp-note"))


if __name__ == "__main__":
    main()
