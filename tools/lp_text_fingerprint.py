#!/usr/bin/env python3
"""Extract visible text, head tags, alts, and data-wa / wa.me links for LP copy lock."""
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

PAGES = [
    "yoetz-mashkantaot.html",
    "mashkanta-kablan.html",
    "yoetz-mashkantaot-merkaz.html",
    "ishur-ekroni.html",
]


class Visible(HTMLParser):
    SKIP = {"script", "style", "svg", "noscript"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.skip = 0
        self.hidden = 0
        self.parts = []
        self.alts = []
        self.data_wa = []
        self.wa_hrefs = []
        self.form = []

    def handle_starttag(self, tag, attrs):
        ad = dict(attrs)
        if tag in self.SKIP:
            self.skip += 1
            return
        if self.skip:
            return
        if ad.get("aria-hidden") == "true" or "hidden" in ad:
            self.hidden += 1
        if self.hidden:
            return
        if tag == "img" and ad.get("alt") is not None:
            self.alts.append(ad.get("alt"))
        if "data-wa" in ad:
            self.data_wa.append(ad.get("data-wa"))
        href = ad.get("href") or ""
        if "wa.me" in href or "api.whatsapp.com" in href:
            self.wa_hrefs.append(href)
        if tag == "form":
            self.form.append({"data-lead": ad.get("data-lead"), "fields": []})
        if tag in {"input", "select", "textarea"} and self.form:
            self.form[-1]["fields"].append({
                "tag": tag,
                "type": ad.get("type"),
                "name": ad.get("name"),
                "id": ad.get("id"),
            })
        if tag in {"p", "h1", "h2", "h3", "h4", "li", "button", "summary", "td", "th", "figcaption"}:
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag in self.SKIP and self.skip:
            self.skip -= 1
            return
        if self.skip:
            return
        if self.hidden:
            # endtag of the hidden element is ambiguous; decrement on any end while hidden
            # only decrement when leaving an element that opened hidden. Track stack instead.
            pass
        if tag in {"p", "h1", "h2", "h3", "h4", "li", "div", "section", "tr"}:
            self.parts.append("\n")

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

    def handle_data(self, data):
        if self.skip or self.hidden:
            return
        if data.strip():
            self.parts.append(data)


class HiddenStack(HTMLParser):
    SKIP = {"script", "style", "svg", "noscript"}
    VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.skip = 0
        self.stack = []
        self.parts = []
        self.alts = []
        self.data_wa = []
        self.wa_hrefs = []
        self.form = []

    def _hidden(self):
        return any(self.stack)

    def handle_starttag(self, tag, attrs):
        ad = dict(attrs)
        if tag in self.SKIP:
            self.skip += 1
            self.stack.append(False)
            return
        if tag == "head":
            self.skip += 1
        hidden = ad.get("aria-hidden") == "true" or ("hidden" in ad and ad.get("hidden") != "until-found")
        self.stack.append(bool(hidden))
        if self.skip or self._hidden():
            return
        if tag == "img" and "alt" in ad:
            self.alts.append(ad.get("alt"))
        if "data-wa" in ad:
            self.data_wa.append(ad.get("data-wa") or "")
        href = ad.get("href") or ""
        if "wa.me" in href or "api.whatsapp.com" in href:
            self.wa_hrefs.append(href)
        if tag == "form":
            self.form.append({"data-lead": ad.get("data-lead"), "fields": []})
        if tag in {"input", "select", "textarea"} and self.form:
            self.form[-1]["fields"].append({
                "tag": tag, "type": ad.get("type"), "name": ad.get("name"), "id": ad.get("id"),
            })
        if tag in {"p", "h1", "h2", "h3", "h4", "li", "button", "summary", "td", "th", "option"}:
            self.parts.append("\n")
        if tag in self.VOID and self.stack:
            self.stack.pop()
            if tag in self.SKIP and self.skip:
                self.skip -= 1

    def handle_endtag(self, tag):
        if self.stack:
            self.stack.pop()
        if tag in self.SKIP and self.skip:
            self.skip -= 1
        if tag == "head" and self.skip:
            self.skip -= 1

    def handle_data(self, data):
        if self.skip or self._hidden():
            return
        if data.strip():
            self.parts.append(data)

    def text(self):
        raw = "".join(self.parts)
        lines = [re.sub(r"[ \t]+", " ", ln).strip() for ln in raw.splitlines()]
        lines = [ln for ln in lines if ln]
        return "\n".join(lines)


def head_pack(html):
    m = re.search(r"<head[^>]*>(.*)</head>", html, re.I | re.S)
    head = m.group(1) if m else ""
    def grab(pattern):
        return re.findall(pattern, head, re.I | re.S)
    title = grab(r"<title[^>]*>(.*?)</title>")
    metas = grab(r"<meta\b[^>]*>")
    canonical = grab(r"<link\b[^>]*rel=[\"']canonical[\"'][^>]*>")
    ld = grab(r"<script\b[^>]*type=[\"']application/ld\+json[\"'][^>]*>.*?</script>")
    robots = [x for x in metas if re.search(r"name=[\"']robots[\"']", x, re.I)]
    desc = [x for x in metas if re.search(r"name=[\"']description[\"']", x, re.I)]
    return {
        "title": title,
        "description": desc,
        "robots": robots,
        "canonical": canonical,
        "meta": metas,
        "jsonld": [re.sub(r"\s+", "", x) for x in ld],
    }


def fingerprint(path: Path):
    html = path.read_text(encoding="utf-8")
    vis = HiddenStack()
    vis.feed(html)
    alts = re.findall(r"\balt=\"([^\"]*)\"", html)
    data_wa = re.findall(r"\bdata-wa=\"([^\"]*)\"", html)
    wa_hrefs = re.findall(r"\bhref=\"([^\"]*wa\.me[^\"]*)\"", html)
    angles = []
    for i, line in enumerate(vis.text().splitlines(), 1):
        if "<<" in line or ">>" in line:
            angles.append({"line": i, "text": line})
    return {
        "file": path.name,
        "head": head_pack(html),
        "visible_text": vis.text(),
        "alts": alts,
        "data_wa": data_wa,
        "wa_hrefs": wa_hrefs,
        "forms": vis.form,
        "visible_angle_brackets": angles,
    }


def main():
    root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".")
    out = {}
    for name in PAGES:
        out[name] = fingerprint(root / name)
    dest = Path(sys.argv[2]) if len(sys.argv) > 2 else None
    blob = json.dumps(out, ensure_ascii=False, indent=2)
    if dest:
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(blob + "\n", encoding="utf-8")
    else:
        sys.stdout.write(blob)


if __name__ == "__main__":
    main()
