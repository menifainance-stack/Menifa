# Anti-AI look checklist — website-landing · 2026-09-15

**Pass applied before go-live.** Brand: מניפה פיננסית · תמיר גרמה. Chrome reused from existing article pages (`article-hero` tints already in `style.css`, byline with Tamir photo, navy/gold, ticker, FAB). Copy source: human-edited briefs (עבר עריכת אנושי — 2026-09-15).

## Design — pass

- [x] No generic AI-SaaS layout (no centered purple/blue gradient startup hero, no identical line-icon card grid on every pillar)
- [x] Existing Menifa fonts/CSS/assets only (`assets/style.css`, `logo-nav.png`, `tamir-small.jpg` / `tamir-og.jpg`)
- [x] Hero tints rotate among existing `t-blue` / `t-copper` / `t-green` / `t-turquoise` — **not** `t-purple`
- [x] RTL article body, right-aligned hero (not a centered LP template)
- [x] Photos from `/assets/` only; Hebrew alt on Tamir (`תמיר גרמה — יועץ משכנתאות מוסמך, מניפה פיננסית`)
- [x] No VR / full 3D / stock AI-art / glossy fake photos
- [x] Homepage services: 4 existing cards + **plain text links** for the rest (no 12 identical icons)

## Copy voice — pass

- [x] Tamir/Menifa: varied sentence length, concrete, first person where the brief uses it
- [x] Banned clichés absent: «בעולם של היום», «חשוב לציין», «בואו נצלול», «בסופו של דבר»
- [x] Differentiator in plain words: check insurance costs too — not empty slogans
- [x] No «best in Israel» / fake success % on new pillars; ₪180K / 98% kept **below the fold** on homepage only (existing)

## CRO P0 — pass

- [x] Homepage H1 / subhead / promise / CTA / Einav microcopy / WhatsApp prefill
- [x] Organic alut page + Instant Form + illustration table + Einav thank-you in `tco-lead.js`
- [x] Alias `alut-kolelet-mashkanta-bituach.html` → canonical refresh
- [x] FAB on touched pages uses עלות כוללת prefill (not «ייעוץ ראשוני»)

## QA — pass

- [x] privacy.html / terms.html / calculators.html / madrich-mashkanta.html linked
- [x] Canonical `https://menifa.org/<slug>` — no github.io on new pages
- [x] One H1, viewport, FAQ JSON-LD where FAQs exist
