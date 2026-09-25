#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fail when a published page uses github.io in public URL tags, or when a
blog article is missing from sitemap.xml.

Checked tags:
  <link rel="canonical">
  <link rel="alternate" hreflang="...">
  <meta property="og:url">
  BreadcrumbList JSON-LD item URLs

Articles that must appear in sitemap.xml:
  every blog/art-*.html file, and every article href on blog.html.

tests/ is not part of the published tree. Point --root at a fixture to
scan that tree instead.

  python3 tools/check_public_urls.py [--root DIR] [--tags-only]
"""

import argparse
import glob
import json
import os
import re
import sys
from html.parser import HTMLParser

_TOOLS = os.path.dirname(os.path.abspath(__file__))
if _TOOLS not in sys.path:
    sys.path.insert(0, _TOOLS)

from site_url import SITE  # noqa: E402

GITHUB_IO = "github.io"
SKIP_DIRS = {"tests", "node_modules", ".git"}
REPO_ROOT = os.path.dirname(_TOOLS)


class _UrlParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.findings = []
        self._capture = False
        self._buf = []

    def handle_starttag(self, tag, attrs):
        ad = {}
        for key, value in attrs:
            if key:
                ad[key.lower()] = value or ""
        if tag == "link":
            rels = ad.get("rel", "").lower().split()
            href = ad.get("href", "")
            if "canonical" in rels and GITHUB_IO in href:
                self.findings.append(
                    ('<link rel="canonical"> contains %s: %s' % (GITHUB_IO, href))
                )
            if "alternate" in rels and ad.get("hreflang") and GITHUB_IO in href:
                self.findings.append(
                    ('<link rel="alternate" hreflang="%s"> contains %s: %s'
                     % (ad.get("hreflang"), GITHUB_IO, href))
                )
        elif tag == "meta":
            prop = ad.get("property", "").lower()
            content = ad.get("content", "")
            if prop == "og:url" and GITHUB_IO in content:
                self.findings.append(
                    ('<meta property="og:url"> contains %s: %s' % (GITHUB_IO, content))
                )
        elif tag == "script" and ad.get("type", "").lower() == "application/ld+json":
            self._capture = True
            self._buf = []

    def handle_data(self, data):
        if self._capture:
            self._buf.append(data)

    def handle_endtag(self, tag):
        if tag == "script" and self._capture:
            self._capture = False
            self.findings.extend(_breadcrumb_findings("".join(self._buf)))


def _types(node):
    raw = node.get("@type")
    if isinstance(raw, str):
        return {raw}
    if isinstance(raw, list):
        return {x for x in raw if isinstance(x, str)}
    return set()


def _walk_breadcrumbs(node, found):
    if isinstance(node, list):
        for item in node:
            _walk_breadcrumbs(item, found)
        return
    if not isinstance(node, dict):
        return
    if "BreadcrumbList" in _types(node):
        for element in node.get("itemListElement") or []:
            if not isinstance(element, dict):
                continue
            item = element.get("item")
            url = ""
            if isinstance(item, str):
                url = item
            elif isinstance(item, dict):
                url = item.get("@id") or item.get("url") or ""
                if not isinstance(url, str):
                    url = ""
            if GITHUB_IO in url:
                found.append(url)
    for value in node.values():
        if isinstance(value, (dict, list)):
            _walk_breadcrumbs(value, found)


def _breadcrumb_findings(raw):
    text = raw.strip()
    if "BreadcrumbList" not in text:
        return []
    urls = []
    try:
        _walk_breadcrumbs(json.loads(text), urls)
    except json.JSONDecodeError:
        for match in re.finditer(
            r'"item"\s*:\s*(?:"([^"]+)"|\{[^}]*"(?:@id|url)"\s*:\s*"([^"]+)")',
            text,
        ):
            url = match.group(1) or match.group(2) or ""
            if GITHUB_IO in url:
                urls.append(url)
    return [
        ("BreadcrumbList item URL contains %s: %s" % (GITHUB_IO, url))
        for url in urls
    ]


def _iter_html(root):
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [name for name in dirnames if name not in SKIP_DIRS]
        for name in filenames:
            if name.lower().endswith(".html"):
                yield os.path.join(dirpath, name)


def _rel(root, path):
    return os.path.relpath(path, root).replace(os.sep, "/")


def check_tags(root):
    errors = []
    pages = 0
    for path in sorted(_iter_html(root)):
        pages += 1
        with open(path, encoding="utf-8") as fh:
            parser = _UrlParser()
            try:
                parser.feed(fh.read())
            except Exception as exc:  # malformed HTML still has to be reported
                errors.append("%s: HTML parse error: %s" % (_rel(root, path), exc))
                continue
            for finding in parser.findings:
                errors.append("%s: %s" % (_rel(root, path), finding))
    return pages, errors


def _article_href(href):
    href = href.split("#", 1)[0].split("?", 1)[0].strip()
    if not href or href.startswith(("mailto:", "tel:", "javascript:")):
        return None
    match = re.match(r"https?://[^/]+(?P<path>/.*)$", href, re.I)
    path = match.group("path") if match else href
    if not path.startswith("/"):
        path = "/" + path
    path = re.sub(r"/{2,}", "/", path)
    if re.fullmatch(r"/blog/(?!index\.html$).+\.html", path):
        return path
    return None


def required_articles(root):
    required = set()
    for path in glob.glob(os.path.join(root, "blog", "art-*.html")):
        required.add("/blog/" + os.path.basename(path))
    index = os.path.join(root, "blog.html")
    if os.path.isfile(index):
        with open(index, encoding="utf-8") as fh:
            html = fh.read()
        for href in re.findall(r"""href\s*=\s*["']([^"']+)["']""", html, re.I):
            article = _article_href(href)
            if article:
                required.add(article)
    return required


def sitemap_paths(root):
    path = os.path.join(root, "sitemap.xml")
    if not os.path.isfile(path):
        return None
    with open(path, encoding="utf-8") as fh:
        text = fh.read()
    found = set()
    for loc in re.findall(r"<loc>\s*([^<]+?)\s*</loc>", text):
        match = re.match(r"https?://[^/]+(?P<path>/.*)$", loc.strip(), re.I)
        url_path = match.group("path") if match else loc.strip()
        if not url_path.startswith("/"):
            url_path = "/" + url_path
        found.add(re.sub(r"/{2,}", "/", url_path))
    return found


def check_sitemap(root):
    required = required_articles(root)
    present = sitemap_paths(root)
    if present is None:
        return [
            "sitemap.xml is missing; %d article(s) have no <loc>" % len(required)
        ]
    errors = []
    for article in sorted(required):
        if article not in present:
            errors.append("sitemap.xml is missing %s" % article)
    return errors


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--root",
        default=REPO_ROOT,
        help="site root to scan (default: repository root)",
    )
    parser.add_argument(
        "--tags-only",
        action="store_true",
        help="check canonical/hreflang/og:url/BreadcrumbList only",
    )
    args = parser.parse_args(argv)
    root = os.path.abspath(args.root)
    if not os.path.isdir(root):
        sys.exit("public URL guard: root is not a directory: %s" % root)

    pages, errors = check_tags(root)
    if not args.tags_only:
        errors.extend(check_sitemap(root))

    if errors:
        print("FAIL public URL guard (%s)" % root)
        print("public origin is %s" % SITE)
        for error in errors:
            print("- %s" % error)
        return 1

    print("OK public URL guard: %d HTML page(s) under %s; public origin %s"
          % (pages, root, SITE))
    return 0


if __name__ == "__main__":
    sys.exit(main())
