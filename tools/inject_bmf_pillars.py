#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""One-shot injector: proof blocks + blog funnels on the 12 live pillars.
Run from repo root. Verifies blog files exist before linking."""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WA = ("https://wa.me/972524502821?text="
      "%D7%A9%D7%9C%D7%95%D7%9D%2C%20%D7%90%D7%A9%D7%9E%D7%97%20"
      "%D7%9C%D7%AA%D7%99%D7%90%D7%95%D7%9D%20%D7%A9%D7%99%D7%97%D7%94")
WA_BTN = (
    f'<a href="{WA}" target="_blank" rel="noopener" class="btn btn-primary">'
    "וואטסאפ — לתיאום שיחה</a>"
)

BLOCKS = {
    1: {
        "title": "אותו «החזר» — חודש אחר לגמרי",
        "paras": [
            "זוג הגיע עם שתי הצעות. באחת ההחזר נראה נמוך יותר בכמה מאות שקלים. אחרי ששמנו ליד זה גם את ביטוח החיים והמבנה — התמונה התהפכה. ההצעה «הזולה» על הנייר יצאה יקרה יותר בחודש.",
            "<strong>לדוגמה, במקרה שטיפלנו:</strong> הפער בין «החזר בלבד» ל«החזר + ביטוחים» היה מספיק משמעותי כדי לשנות בחירה של בנק.",
        ],
        "caveat": "לא כל תיק נראה ככה. בלי לראות את המספרים שלכם — אין דרך לדעת. דוגמה להמחשה · לא התחייבות.",
        "micro": "נחזור אליכם בהקדם לתיאום.",
    },
    2: {
        "title": "שלושה חיובים בחודש — ואז אחד שנושם יותר",
        "paras": [
            "משפחה עם משכנתא + שתי הלוואות צרכניות. כל חודש יצאו כמה חיובים, והתזרים היה על הקצה. במקרים המתאימים, איחוד חלק מהחוב לתוך המשכנתא מוריד לחץ חודשי — לפעמים בצורה מורגשת.",
            "<strong>לדוגמה, במקרים שטיפלנו:</strong> אחרי איחוד מדוד, ההחזרים הצרכניים הגבוהים ירדו מהשולחן, והתזרים החודשי נעשה יציב יותר. זה לא קורה לכל אחד, ותלוי ביחס החזר, בטוחות ואישור הבנק.",
        ],
        "caveat": "אין הבטחת חיסכון מראש. יש בדיקה. דוגמה להמחשה · לא התחייבות.",
        "micro": "נחזור אליכם בהקדם לתיאום.",
    },
    3: {
        "title": "מיחזרתם ריבית. הביטוח נשאר מאחור",
        "paras": [
            "לקוחות מיחזרו כי הריבית זזה. ההחזר השתפר. בבדיקה גילינו שהפוליסה נשארה על תנאים ישנים — בלי פתיחה מחדש של השוק.",
            "<strong>לדוגמה, במקרה שטיפלנו:</strong> אחרי עדכון בדיקת הביטוח לצד המיחזור, העלות החודשית הכוללת ירדה מעבר למה שהמיחזור לבד עשה. לא תמיד יש פער כזה; לפעמים הביטוח כבר מסודר.",
        ],
        "caveat": "מיחזור חכם = תמהיל <strong>וגם</strong> מבט על הביטוחים. דוגמה להמחשה · לא התחייבות.",
        "micro": "נחזור אליכם בהקדם לתיאום.",
    },
    4: {
        "title": "ריבית נמוכה יותר — לא תמיד הכיס מרוויח",
        "paras": [
            "שני בנקים. באחד ריבית שנשמעת טוב יותר. בשני — תמהיל אחר וביטוח אחר. בלי טבלה מלאה, קל לבחור לפי אינסטינקט.",
            "<strong>לדוגמה, במקרים שטיפלנו:</strong> אחרי השוואה שורה־מול־שורה (החזר + ביטוחים + עמלות רלוונטיות), הלקוחות בחרו הצעה שלא הייתה «המנצחת» בריבית לבד — כי בחודש היא יצאה נכונה יותר לתזרים שלהם.",
        ],
        "caveat": "המספרים משתנים מתיק לתיק. דוגמה להמחשה · לא התחייבות.",
        "micro": "נחזור אליכם בהקדם לתיאום.",
    },
    5: {
        "title": "עצרנו שבוע — וחסכנו טעות יקרה",
        "paras": [
            "זוג היה יום לפני חתימה. הלחץ מהמוכר היה חזק. עצרנו, בנינו תמונת החזר אמיתית (כולל מה שמסביב למשכנתא), וגילינו שהתכנון שלהם לא מחזיק אם המסלול הזז קצת.",
            "<strong>לדוגמה, במקרה שטיפלנו:</strong> השינוי בתמהיל ובתכנון לפני החתימה מנע מצב שבו ההחזר היה «בסדר» רק על הנייר. לא תמיד צריך לעצור עסקה — לפעמים רק ליישר ציפיות.",
        ],
        "caveat": "עדיף שיחה לפני החתימה מאשר תיקון אחריה. דוגמה להמחשה · לא התחייבות.",
        "micro": "נחזור אליכם בהקדם לתיאום.",
    },
    6: {
        "title": "סירוב אחד — לא אומר לשלם כל מחיר בפתרון הבא",
        "paras": [
            "לקוח נדחה בבנק. הפחד דחף אותו לפתרון יקר «רק שיאשרו». במקום לחתום מפחד, בנינו מחדש את התיק ובדקנו גם מה העלות הכוללת של כל חלופה.",
            "<strong>לדוגמה, במקרים שטיפלנו:</strong> אחרי סירוב, המסלול שנבחר בסוף לא היה הכי מהיר — אבל היה ברור יותר בתזרים ובעלויות מסביב, כולל ביטוחים. אין אחוזי אישור ואין הבטחה ש«תמיד אפשר».",
        ],
        "caveat": "סירוב ≠ סוף. גם לא סיבה לחתום על הכל. דוגמה להמחשה · לא התחייבות.",
        "micro": "נחזור אליכם בהקדם לתיאום.",
    },
}

FUNNELS = {
    "alut-mashkanta-kolel-bituach.html": {
        "block": 1,
        "links": [
            ("blog/art-7.html", "ביטוחי משכנתא — מה חובה ומה מיותר"),
            ("blog/art-33.html", "ביטוח משכנתא 2026 — מה הבנק לא אומר"),
            ("blog/art-56.html", "ביטוח משכנתא — כמה אתם משלמים יותר ממה שצריך"),
            ("blog/art-73.html", "כמה באמת עולה דירה — הוצאות נסתרות"),
        ],
    },
    "lifnei-shehotmim-mashkanta.html": {
        "block": 5,
        "links": [
            ("blog/art-36.html", "10 מלכודות בחוזה משכנתא — לפני שחותמים"),
            ("blog/art-1.html", "7 טעויות יקרות במשכנתא ראשונה"),
            ("blog/art-59.html", "הפרשי ריבית בין הבנקים — לפני חתימה"),
            ("blog/art-35.html", "מסמכים למשכנתא — הרשימה שהבנק ידרוש"),
        ],
    },
    "hashvaat-hatzaot-mashkanta.html": {
        "block": 4,
        "links": [
            ("blog/art-59.html", "הפרשי ריבית בין הבנקים 2026"),
            ("blog/art-18.html", "דירוג ריביות משכנתא — השוואה בין בנקים"),
            ("blog/art-68.html", "תמהיל משכנתא — קבועה, פריים או צמודה"),
            ("blog/art-44.html", "תמהיל משכנתא — כמה פריים, כמה קבועה"),
        ],
    },
    "ihud-halvaot-lemashkanta.html": {
        "block": 2,
        "links": [
            ("blog/art-16.html", "כושר החזר משכנתא — איך מחשבים DTI"),
            ("blog/art-17.html", "משכנתא חוץ בנקאית — למי, איך, וכמה זה עולה"),
            ("blog/art-15.html", "משבר המשכנתאות — האם אתם בסיכון"),
            ("blog/art-3.html", "מתי כדאי למחזר משכנתא"),
        ],
    },
    "mihzur-mashkanta.html": {
        "block": 3,
        "links": [
            ("blog/art-3.html", "מתי כדאי למחזר משכנתא ב-2026"),
            ("blog/art-67.html", "האם הגיע הזמן למחזר את המשכנתא"),
            ("blog/art-55.html", "ריבית 3.5% — האם למחזר עכשיו"),
            ("blog/art-64.html", "3 הפחתות ריבית ב-2026 — ומה לעשות אם לא חסכתם"),
        ],
    },
    "masurvei-bankim.html": {
        "block": 6,
        "links": [
            ("blog/art-19.html", "מסורבי משכנתא — 7 דרכים לקבל אישור אחרי סירוב"),
            ("blog/art-17.html", "משכנתא חוץ בנקאית 2026"),
            ("blog/art-71.html", "בדיקת לחץ חובה — כמה משכנתא תוכלו לקבל"),
            ("blog/art-16.html", "כושר החזר ו-DTI"),
        ],
    },
    "ishur-ekroni.html": {
        "block": 1,
        "links": [
            ("blog/art-57.html", "אישור עקרוני למשכנתא — מה הבנק בודק"),
            ("blog/art-71.html", "בדיקת לחץ חובה 2026"),
            ("blog/art-69.html", "מהפכת ה-PTI — יחס ההחזר החדש"),
            ("blog/art-23.html", "כמה משכנתא אפשר לקבל לפי המשכורת"),
        ],
    },
    "mashkanta-dira-rishona.html": {
        "block": 5,
        "links": [
            ("8-sheelot-dira-rishona.html", "8 השאלות שכמעט כל רוכש דירה ראשונה שואל"),
            ("blog/art-1.html", "7 טעויות יקרות במשכנתא ראשונה"),
            ("blog/art-22.html", "משכנתא לזוג צעיר 2026"),
            ("blog/art-73.html", "כמה באמת עולה דירה ב-2026"),
            ("blog/art-25.html", "דיור בהישג יד — זכאות ומשכנתא"),
        ],
    },
    "yoetz-mashkantaot.html": {
        "block": 4,
        "links": [
            ("blog/art-10.html", "איך לבחור יועץ משכנתאות — 8 שאלות"),
            ("blog/art-38.html", "כמה עולה יועץ משכנתאות בישראל"),
            ("blog/art-13.html", "8 שנים כאנליסט BI — למה זה משנה בייעוץ"),
            ("blog/art-42.html", "תמיר גרמה — יועץ משכנתאות מוסמך"),
        ],
    },
    "mashkanta-bneiya-atzmit.html": {
        "block": 1,
        "links": [
            ("blog/art-28.html", "משכנתא לדירה מקבלן — 7 הבדלים"),
            ("blog/art-61.html", "מבצעי 20/80 בנדל״ן — מה שהקבלנים לא אומרים"),
            ("blog/art-53.html", "פינוי בינוי — מה קורה למשכנתא"),
            ("blog/art-65.html", "הלוואת גישור — לקנות לפני שמכרתם"),
        ],
    },
    "mashkanta-kablan.html": {
        "block": 5,
        "links": [
            ("blog/art-28.html", "משכנתא לדירה מקבלן — 7 הבדלים קריטיים"),
            ("blog/art-61.html", "מבצעי 20/80 — מה שבנק ישראל כבר הבין"),
            ("blog/art-73.html", "8 הוצאות נסתרות ברכישת דירה"),
            ("blog/art-36.html", "10 מלכודות בחוזה משכנתא"),
        ],
    },
    "tamhil-mashkanta-prime-madad.html": {
        "block": 4,
        "links": [
            ("blog/art-6.html", "תמהיל משכנתא 2026 — 4 מודלים"),
            ("blog/art-68.html", "קבועה, פריים או צמודה?"),
            ("blog/art-44.html", "כמה פריים, כמה קבועה ומה עם הצמוד"),
            ("blog/art-20.html", "משכנתא ל-25 או 30 שנה"),
            ("calculators.html#calc-mix", "השוואת תמהילים — מחשבון"),
        ],
    },
}


def proof_html(n):
    b = BLOCKS[n]
    paras = "".join(f"<p>{p}</p>\n" for p in b["paras"])
    return (
        f'<section class="proof-block" id="hovachot" aria-labelledby="hovachot-title">\n'
        f'  <p class="proof-block__kicker">הוכחות חיסכון · דוגמה ממקרים שטיפלנו</p>\n'
        f'  <h2 id="hovachot-title">{b["title"]}</h2>\n'
        f'  {paras}'
        f'  <p class="proof-block__caveat">{b["caveat"]}</p>\n'
        f'  <p>{WA_BTN}</p>\n'
        f'  <p class="proof-block__micro">{b["micro"]}</p>\n'
        f'</section>\n'
    )


def funnel_html(links):
    items = []
    for href, label in links:
        path = href.split("#")[0]
        full = os.path.join(ROOT, path)
        if not os.path.isfile(full):
            print(f"  skip missing {href}", file=sys.stderr)
            continue
        items.append(f'<li><a href="{href}">{label}</a></li>')
    if not items:
        return ""
    return (
        '<section class="seo-funnel" aria-label="קריאה מומלצת מהבלוג">\n'
        "  <h2>מהבלוג — להעמיק לפני שחותמים</h2>\n"
        f'  <ul>\n    {chr(10).join("    " + i for i in items)}\n  </ul>\n'
        "</section>\n"
    )


def main():
    marker_proof = "<!--BMF-PROOF-->"
    marker_funnel = "<!--BMF-FUNNEL-->"
    for fname, cfg in FUNNELS.items():
        path = os.path.join(ROOT, fname)
        with open(path, encoding="utf-8") as fh:
            html = fh.read()
        if marker_proof in html:
            print(f"  already injected: {fname}")
            continue
        proof = marker_proof + "\n" + proof_html(cfg["block"])
        funnel = marker_funnel + "\n" + funnel_html(cfg["links"])
        if '<section class="article-faq"' not in html:
            raise SystemExit(f"no FAQ marker in {fname}")
        html = html.replace(
            '  <section class="article-faq"',
            proof + '  <section class="article-faq"',
            1,
        )
        if '  <aside class="tco-related"' not in html:
            raise SystemExit(f"no related marker in {fname}")
        html = html.replace(
            '  <aside class="tco-related"',
            funnel + '  <aside class="tco-related"',
            1,
        )
        html = html.replace(
            'href="assets/style.css?v=2026-07-10"',
            'href="assets/style.css?v=2026-09-16-bmf"',
        )
        html = html.replace('"dateModified": "2026-09-15"', '"dateModified": "2026-09-16"')
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(html)
        print(f"  ok {fname} block={cfg['block']} links={len(cfg['links'])}")


if __name__ == "__main__":
    main()
