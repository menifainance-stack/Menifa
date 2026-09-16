# Mortgage-first homepage — 2026-09-16

**Directive:** Menifa is a mortgage site. Insurance is not the lead message on site entry.

Live problem: homepage H1 was `ייעוץ משכנתאות שבודק גם את הביטוח — לא רק את הריבית` — insurance co-lead.

## Before / after

| Surface | Before | After |
|---|---|---|
| Badge | בדיקת עלות כוללת — משכנתא + ביטוח | ייעוץ משכנתאות מוסמך — שיחת היכרות |
| H1 | ייעוץ משכנתאות שבודק גם את הביטוח — לא רק את הריבית | ייעוץ משכנתאות. בצד שלכם, לא של הבנק. |
| Subhead | ריבית נראית טובה על הנייר. כמה באמת תשלמו כל חודש אחרי ביטוח חיים ומבנה? + בודקים ריבית, החזר, וכל הביטוחים | דירה ראשונה, מחזור, או הצעה שכבר מחכה מהבנק? בודקים החזר חודשי, תמהיל והשוואת הצעות — לפני שחותמים. |
| First CTA | וואטסאפ — לתיאום שיחה (prefill: בדיקת עלות כוללת משכנתא+ביטוח) | וואטסאפ — לתיאום שיחה (prefill: שלום, אשמח לתיאום שיחה) |
| Second CTA | קביעת שיחת בדיקה → TCO form | שיחת ייעוץ משכנתא → contact.html |
| Nav CTA | שיחת בדיקה → TCO form | ייעוץ חינם → contact.html |
| Services row | 4th card: עלות כוללת כולל ביטוח | 4th card: השוואת הצעות; TCO kept in text links + closer |
| Mega-nav / drawer tools | TCO 2nd in tools | TCO last in tools |

## Insurance remains (not deleted)

- TCO pillar `alut-mashkanta-kolel-bituach.html` untouched
- art-7 / insurance blog articles untouched
- Homepage secondary closer after blog, before final CTA (`#alut-kolelet`)
- Footer / extra service links still point to the pillar
- Person schema: 8 years BI in insurance companies (bio); `knowsAbout` «ביטוחי משכנתא» moved to end of list — not sold as homepage product
- PR #14 (`cursor/unify-wa-alot-prefill-9627`) not touched

## SEO (homepage)

- `<title>`, meta description, `og:*`, Twitter: already mortgage-led — unchanged
- Organization `hasOfferCatalog`: mortgage services only — unchanged
- No separate mobile H1/CTA (same markup)

## Verify live

- https://menifa.org/ — H1/sub/first CTA/services entry have no lead «ביטוח»
- Mobile: same hero markup
- https://menifa.org/alut-mashkanta-kolel-bituach.html still 200
