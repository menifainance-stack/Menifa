# Menifa live QA — 2026-09-15

**Site:** https://menifa.org  
**Scope kept:** CRO P0 (hero / עלות WhatsApp / Einav thank-you) + organic pillars 1–12  
**This file:** `/workspace/mortgage-ops/deliverables/website-landing/2026-09-15-menifa-full-qa.md`  
**Mirror:** `docs/website-landing/2026-09-15-menifa-full-qa.md`

## Bugs found live → fixed in preview PR (do not merge)

| # | Bug | Live symptom | Fix |
|---|-----|----------------|-----|
| 1 | Footer privacy + terms | `href="#"` + `data-article` modal intercept; `privacy.html` / `terms.html` exist | Real `privacy.html` / `terms.html` on homepage and shared chrome (about, contact, blog, calculators). JS no longer traps those clicks. |
| 2 | Homepage `#calculator` CTA | Hash target does not exist on `index.html` → dead | Links go to `/calculators.html` (refinance CTAs to `#calc-refinance`). |
| 3 | Bare `/madrich` | 404 | All in-repo links already used `madrich-mashkanta.html`. Added redirects: `/madrich.html` and `/madrich/` → `/madrich-mashkanta.html`. |

## CRO P0 still in place

- Homepage H1: ייעוץ משכנתאות שבודק גם את הביטוח — לא רק את הריבית
- Primary CTA → `alut-mashkanta-kolel-bituach.html`
- WhatsApp prefill: שלום, אשמח לשיחת בדיקת עלות כוללת (משכנתא+ביטוח) on hero + FAB
- Instant Form + Einav thank-you on the alut page (`assets/tco-lead.js`)

## Pillars (expected 200 after Pages deploy)

1. `/alut-mashkanta-kolel-bituach.html` (+ alias `/alut-kolelet-mashkanta-bituach.html`)
2. `/lifnei-shehotmim-mashkanta.html`
3. `/hashvaat-hatzaot-mashkanta.html`
4. `/ihud-halvaot-lemashkanta.html`
5. `/mihzur-mashkanta.html`
6. `/masurvei-bankim.html`
7. `/ishur-ekroni.html`
8. `/mashkanta-dira-rishona.html`
9. `/yoetz-mashkantaot.html`
10. `/mashkanta-bneiya-atzmit.html`
11. `/mashkanta-kablan.html`
12. `/tamhil-mashkanta-prime-madad.html`

## Pass notes

- Viewport + one H1 on new pillars: pass
- No `github.io` on new pillars: pass
- Canonical `https://menifa.org/<slug>`: pass
- sitemap-pages.xml includes all 12 organic pillars (alias is noindex redirect, not in sitemap)

## Remaining (not this ticket)

- Bottom-of-page chrome on some older articles still uses shared footer patterns; privacy/terms on about/contact/blog/calculators were included because they ship the same footer as homepage.
- GitHub Pages `/madrich` without slash may 301 to `/madrich/` then redirect; `/madrich.html` is the reliable alias.
