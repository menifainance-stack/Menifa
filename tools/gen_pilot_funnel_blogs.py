#!/usr/bin/env python3
"""Convert the 5 funnel-support markdown briefs into RTL blog HTML (pilot only)."""
from __future__ import annotations

import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = Path("/home/ubuntu/.cursor/projects/workspace/uploads")
WA = (
    "https://wa.me/972524502821?text="
    "%D7%A9%D7%9C%D7%95%D7%9D%2C%20%D7%90%D7%A9%D7%9E%D7%97%20%D7%9C%D7%A9%D7%99%D7%97%D7%AA%20"
    "%D7%91%D7%93%D7%99%D7%A7%D7%AA%20%D7%A2%D7%9C%D7%95%D7%AA%20%D7%9B%D7%95%D7%9C%D7%9C%D7%AA%20"
    "%28%D7%9E%D7%A9%D7%9B%D7%A0%D7%AA%D7%90%2B%D7%91%D7%99%D7%98%D7%95%D7%97%29"
)
WA_ICON = (
    '<svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">'
    '<path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>'
)

ARTICLES = [
    {
        "src": "2026-09-16-blog-ihud-halvaot-matei-ken-lo_7712.md",
        "slug": "ihud-halvaot-matei-ken-lo.html",
        "title": "מתי כן ומתי לא לאחד הלוואות למשכנתא",
        "tag": "איחוד הלוואות",
        "tone": "t-blue",
        "desc": "מתי כן ומתי לא לאחד הלוואות למשכנתא — איך מחליטים לפי תזרים, תקופה וסיכון, בלי להסתמך רק על «החודשי ירד». מניפה פיננסית.",
        "related": [
            ("../ihud-halvaot-lemashkanta.html", "איחוד", "איחוד הלוואות למשכנתא", "המדריך המלא לאיחוד"),
            ("../alut-mashkanta-kolel-bituach.html", "עלות כוללת", "עלות משכנתא כולל ביטוח", "לראות את כל השורות"),
            ("../lifnei-shehotmim-mashkanta.html", "לפני חתימה", "לפני שחותמים משכנתא", "לפני שמשנים מבנה"),
        ],
        "faqs": [
            ("האם איחוד תמיד משפר מצב?", "לא. הוא יכול לשחרר תזרים — ויכול להאריך חוב. תלוי במספרים ובמה שקורה אחרי החתימה."),
            ("מה הסיכון הכי שכיח?", "לחזור למסגרות אשראי ברגע שיש אוויר. אז האיחוד לא תיקן הרגל — רק הגדיל משכנתא."),
            ("אפשר לבדוק בלי להתחייב?", "כן. בדיוק בשביל זה קיימת שיחת ייעוץ ראשונה — להבין אם בכלל רלוונטי."),
        ],
    },
    {
        "src": "2026-09-16-blog-mihzur-mashkanta-bituach_4cc8.md",
        "slug": "mihzur-mashkanta-bituach.html",
        "title": "מיחזור משכנתא וביטוח — מה קורה לפוליסה כשממחזרים",
        "tag": "מיחזור · ביטוח",
        "tone": "t-turquoise",
        "desc": "מיחזור משכנתא וביטוח — למה אחרי ריבית טובה יותר ההחזר כמעט לא זז, מה קורה לפוליסה, ואיך בודקים לפני שממחזרים. מניפה פיננסית.",
        "related": [
            ("../mihzur-mashkanta.html", "מיחזור", "מיחזור משכנתא", "מתי ואיך בודקים מיחזור"),
            ("../alut-mashkanta-kolel-bituach.html", "עלות כוללת", "עלות משכנתא כולל ביטוח", "החזר פלוס ביטוחים"),
            ("bituach-mashkanta-mul-bank.html", "ביטוח", "ביטוח משכנתא מול בנק", "חובה ביטוח, לא תמיד פוליסת הבנק"),
        ],
        "faqs": [
            ("חייבים להחליף פוליסה במיחזור?", "לא תמיד. לפעמים עדכון מספיק. לפעמים נדרש כיסוי שעומד בדרישות חדשות."),
            ("למה לא לסגור קודם ריבית ואחר כך ביטוח?", "כי אז מגיעים לסגירה תחת לחץ, בלי השוואה, עם שורה שלא הייתה בתכנון."),
            ("מיחזור תמיד חוסך?", "לא. בודקים תמונה מלאה — לא מבטיחים מראש."),
        ],
    },
    {
        "src": "2026-09-16-blog-bituach-mashkanta-mul-bank_4907.md",
        "slug": "bituach-mashkanta-mul-bank.html",
        "title": "ביטוח משכנתא מול בנק — חובה ביטוח, לא תמיד חובה פוליסת הבנק",
        "tag": "ביטוח משכנתא",
        "tone": "t-copper",
        "desc": "ביטוח משכנתא מול בנק — חובה ביטוח חיים ומבנה, לא תמיד חובה פוליסת הבנק. מה להשוות לפני שסוגרים. מניפה פיננסית.",
        "related": [
            ("../alut-mashkanta-kolel-bituach.html", "עלות כוללת", "עלות משכנתא כולל ביטוח", "למה ההחזר מהבנק אינו כל הסיפור"),
            ("mihzur-mashkanta-bituach.html", "מיחזור", "מיחזור משכנתא וביטוח", "מה קורה לפוליסה כשממחזרים"),
            ("../lifnei-shehotmim-mashkanta.html", "לפני חתימה", "לפני שחותמים משכנתא", "לפני שנועלים פוליסה"),
        ],
        "faqs": [
            ("הבנק יכול לסרב לפוליסה מבחוץ?", "הוא יכול לדרוש עמידה בתנאים שלו. פוליסה שלא עומדת — לא תתקבל. לכן משווים מול הדרישות, לא מול כותרת."),
            ("מתי הכי נכון לבדוק?", "לפני סגירת המשכנתא — או לפחות לפני שננעלים תחת לחץ. גם במיחזור זה רגע טבעי."),
            ("«יש ביטוח» מספיק?", "לא. השאלה היא איזה כיסוי, באילו תנאים, ובאיזו עלות שוטפת ליד ההחזר."),
        ],
    },
    {
        "src": "2026-09-16-blog-hon-atzmi-dira-rishona_ed1f.md",
        "slug": "hon-atzmi-dira-rishona.html",
        "title": "הון עצמי לדירה ראשונה — טווחים ועקרונות (בלי סכומי ₪ מוחלטים)",
        "tag": "דירה ראשונה",
        "tone": "t-green",
        "desc": "הון עצמי לדירה ראשונה — טווחים ועקרונות בלי סכומי ₪ מוחלטים. מה באמת נחשב «מספיק», ואיך לא לבנות חיפוש על מספר שגוי. מניפה פיננסית.",
        "related": [
            ("../mashkanta-dira-rishona.html", "דירה ראשונה", "משכנתא לדירה ראשונה", "החזר אמיתי לפני חתימה"),
            ("../8-sheelot-dira-rishona.html", "8 שאלות", "8 שאלות לרוכשי דירה ראשונה", "השאלות שכמעט כולם שואלים"),
            ("../ishur-ekroni.html", "עקרוני", "אישור עקרוני", "מה העקרוני כן ולא אומר"),
        ],
        "faqs": [
            ("אפשר לקנות בלי הון?", "ברוב המקרים לדירה ראשונה נדרש הון עצמי משמעותי לפי מדיניות. אל תבנו תוכנית על חריגים ששמעתם עליהם ברשת בלי בדיקה אישית."),
            ("עזרה מההורים נחשבת?", "אם היא באמת מועברת ומוכחת כנדרש — כן, כחלק מהתמונה. אם היא הבטחה בעל־פה בלבד — תייגו כמותנה."),
            ("מה עושים אם באמת חסר?", "לשנות טווח מחיר, לדחות, לבנות תוכנית חיסכון, לבדוק מסלולים רלוונטיים לזכאים — לפי המצב. אין קיצור דרך אחד."),
        ],
    },
    {
        "src": "2026-09-16-blog-ishur-ekroni-lifnei-choze_4a26.md",
        "slug": "ishur-ekroni-lifnei-choze.html",
        "title": "אישור עקרוני לפני חוזה — מה זה כן אומר ומה לא",
        "tag": "אישור עקרוני",
        "tone": "t-purple",
        "desc": "אישור עקרוני לפני חוזה — מה הוא כן אומר, מה הוא לא, ולמה פחד לחתום בלי בהירות הוא סימן טוב ולא חולשה. מניפה פיננסית.",
        "related": [
            ("../ishur-ekroni.html", "עקרוני", "אישור עקרוני למשכנתא", "מה בודקים בשלב העקרוני"),
            ("../mashkanta-dira-rishona.html", "דירה ראשונה", "משכנתא לדירה ראשונה", "לפני שמתחייבים לדירה ראשונה"),
            ("../8-sheelot-dira-rishona.html", "8 שאלות", "8 שאלות לרוכשי דירה ראשונה", "שאלות לפני חוזה"),
            ("../lifnei-shehotmim-mashkanta.html", "לפני חתימה", "לפני שחותמים משכנתא", "לפני חתימה סופית"),
        ],
        "faqs": [
            ("חייבים עקרוני לפני כל חוזה?", "לא תמיד חובה פורמלית — אבל לפני התחייבות גדולה, בהירות מימונית היא הגנה על עצמכם. במיוחד בדירה ראשונה."),
            ("יש עקרוני = אפשר לחתום בראש שקט?", "יש כיוון. לא אור ירוק סופי. קראו מה כלול ומה לא, ובדקו תוקף מול המסמך שלכם."),
            ("מה אם המוכר לא מחכה?", "לחץ אמיתי. עדיין עדיף לא להחליף בדיקה בפחד מהחמצה. לפעמים מנהלים מו״מ על לוחות זמנים; לפעמים העסקה הזו פשוט לא מתאימה לקצב שלכם."),
        ],
    },
]


def href_fix(url: str) -> str:
    if url.startswith("/blog/"):
        return url.split("/")[-1]
    if url.startswith("/"):
        return ".." + url
    return url


def inline(text: str) -> str:
    text = html.escape(text)
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", lambda m: f'<a href="{href_fix(m.group(2))}">{m.group(1)}</a>', text)
    # unescape the href we just wrote — wait, html.escape already escaped the whole string including markdown.
    # Better to apply links before escape on captured groups.
    return text


def inline_md(text: str) -> str:
    parts = []
    i = 0
    pattern = re.compile(r"\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`")
    for m in pattern.finditer(text):
        parts.append(html.escape(text[i:m.start()]))
        if m.group(1) is not None:
            parts.append(f'<a href="{html.escape(href_fix(m.group(2)), quote=True)}">{html.escape(m.group(1))}</a>')
        elif m.group(3) is not None:
            parts.append(f"<strong>{html.escape(m.group(3))}</strong>")
        elif m.group(4) is not None:
            parts.append(f"<em>{html.escape(m.group(4))}</em>")
        else:
            parts.append(f"<code>{html.escape(m.group(5))}</code>")
        i = m.end()
    parts.append(html.escape(text[i:]))
    return "".join(parts)


def md_body_to_html(raw: str) -> str:
    # Drop frontmatter-ish header until the second --- after title block
    chunks = raw.split("\n---\n")
    # 0 = title/meta, 1 = article body, later chunks = CTA / internal links
    body = chunks[1] if len(chunks) >= 2 else raw
    # Cut internal-links / editor notes
    body = re.split(r"\n---\n\n### קישורים פנימיים", body)[0]
    body = re.split(r"\n## שאלות קצרות\n", body)[0]
    # Drop trailing CTA brand block (we inject professional CTAs)
    body = re.split(r"\nאם ההחזרים הצרכניים|\nאם מיחזרתם|\nאם אתם לפני סגירה|\nאם המשפט|\nאם אתם לפני חוזה", body)[0]
    lines = body.strip().splitlines()
    out = []
    i = 0
    while i < len(lines):
        line = lines[i].rstrip()
        if not line.strip():
            i += 1
            continue
        if line.startswith("## "):
            out.append(f"<h2>{inline_md(line[3:].strip())}</h2>")
            i += 1
            continue
        if line.startswith("### "):
            out.append(f"<h3>{inline_md(line[4:].strip())}</h3>")
            i += 1
            continue
        if line.startswith("|") and i + 1 < len(lines) and re.match(r"^\|?\s*-+", lines[i + 1]):
            rows = []
            while i < len(lines) and lines[i].startswith("|"):
                rows.append([c.strip() for c in lines[i].strip().strip("|").split("|")])
                i += 1
            header, body_rows = rows[0], rows[2:]
            thead = "<thead><tr>" + "".join(f"<th>{inline_md(c)}</th>" for c in header) + "</tr></thead>"
            tbody = "<tbody>" + "".join(
                "<tr>" + "".join(f"<td>{inline_md(c)}</td>" for c in r) + "</tr>" for r in body_rows
            ) + "</tbody>"
            out.append(f'<div class="table-wrap"><table class="data-table">{thead}{tbody}</table></div>')
            continue
        if line.startswith("- "):
            items = []
            while i < len(lines) and lines[i].startswith("- "):
                items.append(f"<li>{inline_md(lines[i][2:].strip())}</li>")
                i += 1
            out.append("<ul>" + "".join(items) + "</ul>")
            continue
        if re.match(r"^\d+\.\s", line):
            items = []
            while i < len(lines) and re.match(r"^\d+\.\s", lines[i]):
                items.append(f"<li>{inline_md(lines[i].split(". ", 1)[-1].strip())}</li>")
                i += 1
            out.append("<ol>" + "".join(items) + "</ol>")
            continue
        # paragraph — gather until blank
        para = [line]
        i += 1
        while i < len(lines) and lines[i].strip() and not lines[i].startswith(("#", "-", "|")) and not re.match(r"^\d+\.\s", lines[i]):
            para.append(lines[i].rstrip())
            i += 1
        out.append(f"<p>{inline_md(' '.join(para))}</p>")
    return "\n".join(out)


def page_html(meta: dict, body: str) -> str:
    slug = meta["slug"]
    url = f"https://menifa.org/blog/{slug}"
    faqs = meta["faqs"]
    faq_ld = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}}
            for q, a in faqs
        ],
    }
    faq_html = "".join(
        f'<div class="faq-qa"><h3>{html.escape(q)}</h3><p>{html.escape(a)}</p></div>' for q, a in faqs
    )
    related = "".join(
        f'''<a href="{href}" class="related-card">
      <span class="related-tag">{html.escape(tag)}</span>
      <h4>{html.escape(title)}</h4>
      <p>{html.escape(sub)}</p>
      <span class="related-card-link">קראו ←</span>
    </a>'''
        for href, tag, title, sub in meta["related"]
    )
    return f"""<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
<meta name="theme-color" content="#0E3C5C">
<meta name="robots" content="noindex, nofollow">
<link rel="icon" type="image/png" sizes="32x32" href="../assets/images/favicon-32x32.png">
<title>{html.escape(meta['title'])} | מניפה פיננסית</title>
<meta name="description" content="{html.escape(meta['desc'])}">
<meta name="author" content="תמיר גרמה — מניפה פיננסית">
<link rel="canonical" href="{url}">
<link rel="alternate" hreflang="he-IL" href="{url}">
<meta property="og:type" content="article">
<meta property="og:locale" content="he_IL">
<meta property="og:title" content="{html.escape(meta['title'])}">
<meta property="og:description" content="{html.escape(meta['desc'])}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="https://menifa.org/assets/images/tamir-og.jpg">
<link rel="stylesheet" href="../assets/style.css?v=2026-09-16-pilot-blogs">
<script type="application/ld+json">
{json.dumps({
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": meta["title"],
  "description": meta["desc"],
  "datePublished": "2026-09-16",
  "dateModified": "2026-09-16",
  "inLanguage": "he-IL",
  "author": {"@type": "Person", "name": "תמיר גרמה", "url": "https://menifa.org/about.html"},
  "publisher": {"@type": "Organization", "name": "מניפה פיננסית", "url": "https://menifa.org/"},
  "mainEntityOfPage": url
}, ensure_ascii=False, indent=2)}
</script>
<script type="application/ld+json">
{json.dumps(faq_ld, ensure_ascii=False, indent=2)}
</script>
</head>
<body class="has-ticker">
<a href="#main-content" class="skip-link">דלגו לתוכן הראשי</a>
<nav class="navbar" id="navbar">
  <div class="nav-inner">
    <a href="../index.html" class="logo">
      <img src="../assets/images/logo-nav.png" alt="מניפה פיננסית" class="logo-img">
      <span class="logo-tagline-only">תמיר גרמה</span>
    </a>
    <ul class="nav-links">
      <li><a href="../index.html">דף הבית</a></li>
      <li><a href="../calculators.html">מחשבונים</a></li>
      <li><a href="../blog.html" aria-current="page" class="active">בלוג</a></li>
      <li><a href="../faq.html">שאלות נפוצות</a></li>
      <li><a href="../about.html">עליי</a></li>
      <li><a href="../contact.html">צור קשר</a></li>
    </ul>
    <div class="nav-actions">
      <a href="tel:052-4502821" class="nav-phone">052-4502821</a>
      <a href="{WA}" target="_blank" rel="noopener" class="btn btn-primary nav-cta">וואטסאפ — לתיאום שיחה</a>
      <button class="menu-toggle" id="menuToggle" aria-label="תפריט">
        <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
      </button>
    </div>
  </div>
</nav>
<main id="main-content">
<article class="article-page">
<div class="article-hero {meta['tone']}">
  <div class="container" style="padding-top:8rem;padding-bottom:3rem;text-align:right;">
    <a href="../blog.html" style="color:rgba(255,255,255,.9);">← חזרה לבלוג</a>
    <div class="blog-meta" style="color:rgba(255,255,255,.85);margin-top:.6rem;">
      <span class="blog-tag" style="color:#fff;">{html.escape(meta['tag'])}</span>
      <span>•</span><span>16 בספטמבר 2026</span>
    </div>
    <h1 style="color:#fff;font-size:clamp(1.6rem,3.2vw,2.45rem);margin-top:.5rem;max-width:820px;line-height:1.28;">{html.escape(meta['title'])}</h1>
    <div class="tco-cta__btns" style="display:flex;flex-wrap:wrap;gap:.8rem;margin-top:1.3rem;">
      <a class="btn btn-primary btn-large" href="{WA}" target="_blank" rel="noopener">{WA_ICON} וואטסאפ — לתיאום שיחה</a>
      <a class="btn btn-ghost btn-large" href="../alut-mashkanta-kolel-bituach.html#form">קביעת שיחת בדיקת עלות כוללת</a>
    </div>
  </div>
</div>
<div class="container container-narrow article-body" style="max-width:820px;padding-top:2.4rem;padding-bottom:3rem;">
  <div class="article-byline">
    <img src="../assets/images/tamir-small.jpg" alt="תמיר גרמה — יועץ משכנתאות מוסמך" width="56" height="56">
    <div class="article-byline-info">
      <span class="by-label">נכתב ע״י</span>
      <span class="by-name">תמיר גרמה</span>
      <span class="by-role">יועץ משכנתאות מוסמך · מניפה פיננסית</span>
    </div>
  </div>
{body}
  <section class="article-faq" id="faq">
    <h2>שאלות קצרות</h2>
    {faq_html}
  </section>
  <div class="article-cta tco-cta" id="cta">
    <p><strong>וואטסאפ — לתיאום שיחה</strong> · נחזור אליכם בהקדם לתיאום · ייעוץ ראשון חינם</p>
    <div style="display:flex;flex-wrap:wrap;gap:.8rem;justify-content:center;margin-top:1rem;">
      <a class="btn btn-primary btn-large" href="{WA}" target="_blank" rel="noopener">{WA_ICON} וואטסאפ — לתיאום שיחה</a>
      <a class="btn btn-ghost btn-large" href="../contact.html">קביעת שיחת ייעוץ</a>
    </div>
  </div>
  <p style="font-size:.82rem;color:var(--gray-light);margin-top:2rem;">מידע כללי להחלטה מושכלת. אינו ייעוץ ביטוחי או משפטי מורשה ואינו הבטחת תנאים, אישור או חיסכון.</p>
</div>
</article>
<section class="related-articles">
  <h2 class="related-articles-title">המשך קריאה</h2>
  <p class="related-articles-subtitle">פילרים ומאמרים שסוגרים את המשפך — לא פרסומת.</p>
  <div class="related-grid">
    {related}
  </div>
</section>
</main>
<footer>
  <div class="container">
    <div class="footer-bottom">
      <div>© 2026 מניפה פיננסית | תמיר גרמה · <a href="../index.html">דף הבית</a> · <a href="../blog.html">בלוג</a> · <a href="../contact.html">צור קשר</a></div>
    </div>
  </div>
</footer>
<div class="fab-group" role="navigation" aria-label="כפתורי יצירת קשר">
  <a href="tel:052-4502821" class="fab fab-phone" aria-label="התקשרו 052-4502821"></a>
  <a href="{WA}" target="_blank" rel="noopener" class="fab fab-whatsapp" aria-label="וואטסאפ — לתיאום שיחה"><span class="fab-tooltip">וואטסאפ — לתיאום שיחה</span></a>
</div>
<script src="../assets/script.js?v=2026-09-16-pilot-blogs"></script>
</body>
</html>
"""


def main() -> None:
    out_dir = ROOT / "blog"
    for meta in ARTICLES:
        src = SRC / meta["src"]
        raw = src.read_text(encoding="utf-8")
        body = md_body_to_html(raw)
        dest = out_dir / meta["slug"]
        dest.write_text(page_html(meta, body), encoding="utf-8")
        print("wrote", dest.relative_to(ROOT), "chars", dest.stat().st_size)


if __name__ == "__main__":
    main()
