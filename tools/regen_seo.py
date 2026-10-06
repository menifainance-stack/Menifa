#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
regen_seo.py — מחולל SEO אוטומטי ל-menifa.org

מייצר מחדש מתוך קבצי ה-HTML עצמם:
  sitemap.xml, sitemap-pages.xml, sitemap-index.xml, rss.xml
ומסנכרן את רשימת המאמרים ב-llms.txt.

הרעיון: המקור היחיד לאמת הוא הקבצים בתיקייה. שום מאמר לא יכול
"ליפול בין הכיסאות" יותר — כל blog/*.html נכנס אוטומטית לכל הפידים.

המאמרים יושבים בכתובות עבריות. art-N.html הישנים מופנים ב-301 דרך
vercel.json, ו-redirects.csv ממפה ביניהם — קובץ שהוא מקור של הפניה
לא נכנס לפידים.

הרצה:  python3 tools/regen_seo.py
"""

import re
import subprocess
import sys
import json
import glob
import os
from datetime import datetime, timezone, timedelta
from urllib.parse import quote

_TOOLS = os.path.dirname(os.path.abspath(__file__))
if _TOOLS not in sys.path:
    sys.path.insert(0, _TOOLS)
from site_url import SITE, redirect_map

ROOT = os.path.dirname(_TOOLS)
IL_TZ = timezone(timedelta(hours=3))

# דפים ראשיים: (נתיב, priority, changefreq)
PAGES = [
    ("/",                       "1.0",  "daily"),
    ("/madrich-mashkanta.html", "0.98", "weekly"),
    ("/faq.html",               "0.95", "weekly"),
    ("/calculators.html",       "0.95", "weekly"),
    ("/blog.html",              "0.93", "daily"),
    ("/about.html",             "0.90", "monthly"),
    ("/contact.html",           "0.90", "monthly"),
    ("/alut-mashkanta-kolel-bituach.html", "0.97", "weekly"),
    ("/lifnei-shehotmim-mashkanta.html", "0.88", "weekly"),
    ("/hashvaat-hatzaot-mashkanta.html", "0.88", "weekly"),
    ("/ihud-halvaot-lemashkanta.html", "0.88", "weekly"),
    ("/lp/ihud/", "0.80", "weekly"),
    ("/lp/mihzur/", "0.80", "weekly"),
    ("/mihzur-mashkanta.html", "0.88", "weekly"),
    ("/masurvei-bankim.html", "0.86", "weekly"),
    ("/ishur-ekroni.html", "0.86", "weekly"),
    ("/sirov-mashkanta-ma-osim.html", "0.86", "weekly"),
    ("/mashkanta-dira-rishona.html", "0.88", "weekly"),
    ("/mashkanta-yad-shniya.html", "0.88", "weekly"),
    ("/yoetz-mashkantaot.html", "0.86", "weekly"),
    ("/yoetz-mashkantaot-online.html", "0.86", "weekly"),
    ("/yoetz-mashkantaot-rosh-haayin.html", "0.86", "weekly"),
    ("/yoetz-mashkantaot-merkaz.html", "0.86", "weekly"),
    ("/kama-ole-yoetz-mashkantaot.html", "0.86", "weekly"),
    ("/mashkanta-bneiya-atzmit.html", "0.86", "weekly"),
    ("/mashkanta-kablan.html", "0.86", "weekly"),
    ("/mashkanta-dchufa.html", "0.86", "weekly"),
    ("/mashkanta-leatzmaim.html", "0.86", "weekly"),
    ("/mashkanta-lemiluim.html", "0.86", "weekly"),
    ("/tamhil-mashkanta-prime-madad.html", "0.86", "weekly"),
    ("/accessibility.html",     "0.30", "yearly"),
    ("/cookies.html",           "0.30", "yearly"),
    ("/privacy.html",           "0.30", "yearly"),
    ("/terms.html",             "0.30", "yearly"),
]

HE_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
             "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def xml_escape(s):
    return (s.replace("&", "&amp;").replace("<", "&lt;")
             .replace(">", "&gt;").replace('"', "&quot;"))


def first(pattern, text, group=1, default=""):
    m = re.search(pattern, text, re.S)
    return m.group(group).strip() if m else default


def read_article(path, num=0):
    """שולף מטא-דאטה ממאמר בודד. מחזיר None אם חסרים שדות קריטיים."""
    with open(path, encoding="utf-8") as fh:
        html = fh.read()

    slug = os.path.basename(path)
    title = first(r"<title>(.*?)</title>", html)
    # מסירים את סיומת המותג מהכותרת לשימוש בפידים
    title = re.sub(r"\s*\|\s*מניפה(?: פיננסית)?\s*$", "", title).strip()

    desc = first(r'<meta\s+name="description"\s+content="(.*?)"', html)
    pub = first(r'"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})', html)
    mod = first(r'"dateModified"\s*:\s*"(\d{4}-\d{2}-\d{2})', html) or pub

    if not (title and pub):
        print(f"  ! דילוג על {slug}: חסרה כותרת או datePublished", file=sys.stderr)
        return None

    # קטגוריה ל-RSS — נגזרת מהכותרת, ברירת מחדל "משכנתא"
    cat = "משכנתא"
    for key, name in [("ריבית", "ריבית"), ("מחזור", "מחזור"),
                      ("תמהיל", "תמהיל"), ("מדד", "מדד"),
                      ("דיור", "שוק הדיור"), ("נדל", "שוק הדיור"),
                      ("איחוד", "איחוד הלוואות")]:
        if key in title:
            cat = name
            break

    return {"slug": slug, "url": f"{SITE}/blog/{quote(slug)}", "title": title,
            "desc": desc, "pub": pub, "mod": mod, "cat": cat,
            "num": num}


def load_articles():
    redirects = redirect_map(ROOT)
    # מספר art-N המקורי של כל כתובת עברית — לשבירת שוויון במיון
    art_num = {}
    for old, new in redirects.items():
        m = re.fullmatch(r"/blog/art-(\d+)\.html", old)
        if m:
            art_num[new.rsplit("/", 1)[-1]] = int(m.group(1))
    paths = []
    for p in sorted(glob.glob(os.path.join(ROOT, "blog", "*.html"))):
        name = os.path.basename(p)
        # blog/index.html הוא דף הפניה; קבצים שמופנים ב-301 אינם מפורסמים
        if name == "index.html" or "/blog/" + name in redirects:
            continue
        paths.append(p)
    arts = [a for a in (read_article(p, art_num.get(os.path.basename(p), 0))
                        for p in paths)
            if a]
    # החדש ביותר ראשון — לפי תאריך פרסום, ואז לפי מספר המאמר
    arts.sort(key=lambda a: (a["pub"], a["num"]), reverse=True)
    return arts


def url_block(loc, lastmod, changefreq, priority, x_default=False):
    alt = f'    <xhtml:link rel="alternate" hreflang="he-IL" href="{loc}"/>\n'
    if x_default:
        alt += f'    <xhtml:link rel="alternate" hreflang="x-default" href="{loc}"/>\n'
    return (f"  <url>\n    <loc>{loc}</loc>\n{alt}"
            f"    <lastmod>{lastmod}</lastmod>\n"
            f"    <changefreq>{changefreq}</changefreq>\n"
            f"    <priority>{priority}</priority>\n  </url>\n")


def article_priority(rank):
    """המאמרים החדשים מקבלים עדיפות גבוהה יותר — אות טריות לזחלנים."""
    if rank < 5:
        return "0.92"
    if rank < 15:
        return "0.88"
    if rank < 30:
        return "0.85"
    return "0.80"


def build_sitemap(arts, today):
    newest = arts[0]["mod"] if arts else today
    out = ['<?xml version="1.0" encoding="UTF-8"?>\n'
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n'
           '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n\n']
    for path, prio, freq in PAGES:
        out.append(url_block(SITE + path, newest, freq, prio,
                             x_default=(path == "/")))
    out.append("\n")
    for rank, a in enumerate(arts):
        out.append(url_block(a["url"], a["mod"], "weekly", article_priority(rank)))
    out.append("</urlset>\n")
    return "".join(out)


def build_sitemap_pages(newest):
    out = ['<?xml version="1.0" encoding="UTF-8"?>\n'
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n'
           '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n\n']
    for path, prio, freq in PAGES:
        out.append(url_block(SITE + path, newest, freq, prio,
                             x_default=(path == "/")))
    out.append("</urlset>\n")
    return "".join(out)


def build_sitemap_index(newest):
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
            f'  <sitemap>\n    <loc>{SITE}/sitemap-pages.xml</loc>\n'
            f'    <lastmod>{newest}</lastmod>\n  </sitemap>\n'
            f'  <sitemap>\n    <loc>{SITE}/sitemap.xml</loc>\n'
            f'    <lastmod>{newest}</lastmod>\n  </sitemap>\n'
            '</sitemapindex>\n')


def rfc822(datestr, hour=12):
    d = datetime.strptime(datestr, "%Y-%m-%d").replace(
        hour=hour, tzinfo=IL_TZ)
    return (f"{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][d.weekday()]}, "
            f"{d.day:02d} {HE_MONTHS[d.month - 1]} {d.year} "
            f"{d:%H:%M:%S} +0300")


def build_rss(arts, limit=30):
    items = arts[:limit]
    build = rfc822(items[0]["pub"]) if items else rfc822(
        datetime.now(IL_TZ).strftime("%Y-%m-%d"))
    out = ['<?xml version="1.0" encoding="UTF-8"?>\n'
           '<rss version="2.0"\n'
           '     xmlns:atom="http://www.w3.org/2005/Atom"\n'
           '     xmlns:dc="http://purl.org/dc/elements/1.1/"\n'
           '     xmlns:content="http://purl.org/rss/1.0/modules/content/">\n'
           '  <channel>\n'
           '    <title>מניפה פיננסית — בלוג משכנתאות</title>\n'
           f'    <link>{SITE}/blog.html</link>\n'
           f'    <atom:link href="{SITE}/rss.xml" rel="self" type="application/rss+xml"/>\n'
           '    <description>מאמרים מעודכנים על משכנתאות בישראל — ריביות, מחזור, '
           'תמהיל, מסלולים, שוק הדיור. תמיר גרמה, יועץ משכנתאות מוסמך.</description>\n'
           '    <language>he-IL</language>\n'
           '    <copyright>© מניפה פיננסית — תמיר גרמה</copyright>\n'
           '    <managingEditor>menifainance@gmail.com (תמיר גרמה)</managingEditor>\n'
           '    <webMaster>menifainance@gmail.com (תמיר גרמה)</webMaster>\n'
           f'    <lastBuildDate>{build}</lastBuildDate>\n'
           '    <generator>Menifa Editorial</generator>\n'
           '    <image>\n'
           f'      <url>{SITE}/assets/images/tamir-og.jpg</url>\n'
           '      <title>מניפה פיננסית</title>\n'
           f'      <link>{SITE}/</link>\n'
           '    </image>\n\n']
    for a in items:
        out.append(
            "    <item>\n"
            f"      <title>{xml_escape(a['title'])}</title>\n"
            f"      <link>{a['url']}</link>\n"
            f"      <guid isPermaLink=\"true\">{a['url']}</guid>\n"
            f"      <description>{xml_escape(a['desc'])}</description>\n"
            f"      <pubDate>{rfc822(a['pub'])}</pubDate>\n"
            "      <dc:creator>תמיר גרמה</dc:creator>\n"
            f"      <category>{xml_escape(a['cat'])}</category>\n"
            "    </item>\n")
    out.append("  </channel>\n</rss>\n")
    return "".join(out)


def sync_llms(arts, top=20):
    """מעדכן את רשימת המאמרים ורישום הכמות בקובץ llms.txt."""
    path = os.path.join(ROOT, "llms.txt")
    with open(path, encoding="utf-8") as fh:
        text = fh.read()

    total = len(arts)
    listing = "\n".join(f"- [{a['title']}]({a['url']}) — {a['pub']}"
                        for a in arts[:top])
    new_section = (f"### מאמרים מובילים ({total} מאמרים — "
                   f"{top} החדשים ביותר)\n{listing}\n")

    text, n = re.subn(r"### מאמרים מובילים \(.*?\)\n(?:- \[.*\n)+",
                      new_section, text)
    if not n:
        print("  ! לא נמצאה סקציית 'מאמרים מובילים' ב-llms.txt", file=sys.stderr)
        return False

    # מסנכרנים גם את ספירת המאמרים בשורת קישור הבלוג
    text = re.sub(r"(blog\.html\)): \d+ מאמרי עומק",
                  rf"\1: {total} מאמרי עומק", text)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(text)
    return True


# Homepage Blog schema only. Article <title> / meta description stay as published.
# Soft A2 (Tamir YES, 2026-09-30): these two homepage JSON-LD fields must not
# carry the «עד 40%» savings hook. RSS, llms.txt, and the articles themselves
# are unchanged.
HOME_BLOGPOST_OVERRIDE = {
    "ביטוח-משכנתא-2026-מה-הבנק-לא-אומר.html": {  # art-33
        "title": "חותמים על המשכנתא — והביטוח נסגר בלי בדיקה",
        "desc": (
            "אחרי הריבית וההחזר נשארת שורה חודשית: ביטוח חיים וביטוח מבנה. "
            "מה בודקים לפני שחותמים על פוליסת הבנק — בלי הבטחת אחוז חיסכון."
        ),
    },
    "ביטוחי-משכנתא-2026-מה-חובה.html": {  # art-7
        "title": "ביטוח חיים ומבנה במשכנתא — מה חובה ומה בודקים מול הבנק",
        "desc": (
            "הבנק דורש ביטוח חיים וביטוח מבנה. אפשר להשוות מחוץ לבנק על אותו "
            "סכום ואותה תקופה — בלי הבטחה שתמיד יוצא זול יותר, ובלי מספר אישי."
        ),
    },
}


def _for_home_blogpost(a):
    over = HOME_BLOGPOST_OVERRIDE.get(a["slug"])
    if not over:
        return a
    copied = dict(a)
    copied["title"] = over["title"]
    copied["desc"] = over["desc"]
    return copied


def _blogpost_json(a, indent=8):
    """בונה אובייקט BlogPosting יחיד ל-schema של דף הבית."""
    pad = " " * indent
    inner = " " * (indent + 2)
    return (f'{pad}{{\n'
            f'{inner}"@type": "BlogPosting",\n'
            f'{inner}"@id": "{a["url"]}#article",\n'
            f'{inner}"url": "{a["url"]}",\n'
            f'{inner}"headline": {json.dumps(a["title"], ensure_ascii=False)},\n'
            f'{inner}"description": {json.dumps(a["desc"], ensure_ascii=False)},\n'
            f'{inner}"datePublished": "{a["pub"]}",\n'
            f'{inner}"dateModified": "{a["mod"]}",\n'
            f'{inner}"inLanguage": "he-IL",\n'
            f'{inner}"author": {{\n'
            f'{inner}  "@type": "Person",\n'
            f'{inner}  "name": "תמיר גרמה",\n'
            f'{inner}  "url": "{SITE}/about.html"\n'
            f'{inner}}},\n'
            f'{inner}"articleSection": {json.dumps(a["cat"], ensure_ascii=False)}\n'
            f'{pad}}}')


def sync_index(arts):
    """מסנכרן את מערך blogPost ב-Blog schema שבדף הבית מול המאמרים בפועל."""
    path = os.path.join(ROOT, "index.html")
    with open(path, encoding="utf-8") as fh:
        html = fh.read()

    anchor = html.find('"@id": "%s/#blog"' % SITE)
    start = html.find('"blogPost": [', anchor)
    if anchor == -1 or start == -1:
        print("  ! לא נמצא Blog schema ב-index.html", file=sys.stderr)
        return False

    # איתור הסוגר התואם של המערך
    open_idx = html.index("[", start)
    depth, end = 0, None
    for i in range(open_idx, len(html)):
        if html[i] == "[":
            depth += 1
        elif html[i] == "]":
            depth -= 1
            if depth == 0:
                end = i
                break
    if end is None:
        print("  ! מערך blogPost פגום ב-index.html", file=sys.stderr)
        return False

    body = ",\n".join(_blogpost_json(_for_home_blogpost(a)) for a in arts)
    html = html[:open_idx] + "[\n" + body + "\n      " + html[end:]

    # מסנכרנים את ספירת המאמרים בשם ובתיאור של הבלוג
    total = len(arts)
    html = re.sub(r"בלוג מניפה פיננסית — \d+ מאמרים",
                  f"בלוג מניפה פיננסית — {total} מאמרים", html)
    html = re.sub(r"\d+ מאמרים מקצועיים ומעודכנים",
                  f"{total} מאמרים מקצועיים ומעודכנים", html)

    with open(path, "w", encoding="utf-8") as fh:
        fh.write(html)
    return True


def write(name, content):
    with open(os.path.join(ROOT, name), "w", encoding="utf-8") as fh:
        fh.write(content)
    print(f"  ✓ {name}")


def main():
    today = datetime.now(IL_TZ).strftime("%Y-%m-%d")
    # Tag check only. Sitemap membership is enforced by check_public_urls.py
    # in CI; running that half here would refuse to write the sitemap entry
    # the generator is about to add.
    guard = os.path.join(_TOOLS, "check_public_urls.py")
    tag_check = subprocess.call([sys.executable, guard, "--tags-only"])
    if tag_check != 0:
        sys.exit(tag_check)
    arts = load_articles()
    if not arts:
        sys.exit("לא נמצאו מאמרים בתיקיית blog/ — עוצר.")
    newest = arts[0]["mod"]

    print(f"נמצאו {len(arts)} מאמרים. המאמר החדש ביותר: "
          f"{arts[0]['slug']} ({newest})")
    write("sitemap.xml", build_sitemap(arts, today))
    write("sitemap-pages.xml", build_sitemap_pages(newest))
    write("sitemap-index.xml", build_sitemap_index(newest))
    write("rss.xml", build_rss(arts))
    if sync_llms(arts):
        print("  ✓ llms.txt")
    if sync_index(arts):
        print("  ✓ index.html (Blog schema)")

    print(f"\nסה\"כ ב-sitemap: {len(PAGES) + len(arts)} כתובות")


if __name__ == "__main__":
    main()
