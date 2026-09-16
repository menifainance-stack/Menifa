# Luski parity closeout — homepage craft pass · 2026-09-16

**Branch:** `cursor/luski-polish-homepage-e010` · PR #23 · **not** merged to `main`  
**Gate:** independent audit `2026-09-16-menifa-luski-parity-audit.md` (attached)

## Sources available on this VM

| Asked | Found |
|-------|--------|
| Super-skill `/home/box/.../SKILL.md` + chapter J cards | **Missing** — applied named criteria + attached audit |
| `competitor-intel/2026-09-16-luski-style-system-extraction.md` | Uploads: `.../2026-09-16-luski-style-system-extraction_97ab.md` |
| Motion checklist | Uploads: `.../2026-09-16-menifa-org-luski-motion-checklist_a996.md` |
| Site-build brief | Uploads: `.../2026-09-16-menifa-site-build-brief-from-competitors_e9ab.md` |
| Visual archive `screenshots/beyachad-or-luski/` | **Not on this VM** |
| Approved media | `assets/images/tamir-og.jpg` / `tamir-large.jpg` only — no office video |

## Changed

- **P0 hero:** real Tamir photo (`tamir-og.jpg`) as `.hero-media` under overlay `linear-gradient(135deg, #0A2F48cc, #0E3C5C99)`. Homepage plexus disabled.
- **P0 mid-page:** founder block after trust; cream/white/ink bands; 16px cards + `0 4px 24px -4px` + 3px hover; classed blog cards.
- **P1 mobile:** at ≤768px hide nav CTA + dual FAB; one sticky bottom WA bar; cookie moved to top; a11y stays reachable above the bar.
- **P1 claims:** removed ₪2,800 testimonial figure.
- **P1 motion:** homepage reveals 320ms ease, once.
- **Graphics:** leftover `#B89259` drawer chevron → `#5BAFD8`.

## Verified (after push)

Fill in after Vercel + browser pass:

- [ ] Staging HTML 200 + CSS/images 200
- [ ] Desktop hero shows photo through overlay + calc ≠ ₪0
- [ ] Mobile 375: single sticky WA; cookie does not cover it
- [ ] Quiz RTL still works
- [ ] `python3 tools/check_luski_polish.py` = 0

## Still missing / honest gaps

- No office/lifestyle **video** in repo — photo is Tamir studio portrait, not Beyahad office bokeh.
- Tamir’s subjective “≥ Luski first screen” gate still his.
- Schema/blog meta savings language not scrubbed (audit P2).
- Dead unused `@keyframes` remain in shared `style.css`.
- Art-21 teaser still mentions 3.75% (article title; official rate is 3.25%).
