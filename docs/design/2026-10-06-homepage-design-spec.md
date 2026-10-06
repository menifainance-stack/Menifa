# Homepage design spec — 2026-10-06

Source of truth: `index.html`, `assets/site.css`, `assets/site.js`.
This is the redesign that shipped on 05.10.2026 (PR #93 / #94). Paid landing pages in phase 1 reuse these classes and tokens. They do not introduce a second palette.

`assets/site.js` always applies `data-palette="privatebank"` and `class="fx-refined"` on load. That is the live look. The HTML attribute is the same value, so a no-JS paint matches.

## Color tokens

Defined on `:root` and overridden per `html[data-palette]`. Components must use the variables, not copied hex.

### Surfaces (dark stage, default / private bank)

| Token | Default (`:root`, emerald) | Private Bank (live) | Role |
| --- | --- | --- | --- |
| `--em-950` | `#06150F` | `#070F1C` | Page base, footer |
| `--em-920` | `#071812` | `#081120` | Deep stage |
| `--em-900` | `#081B15` | `#0A1426` | Section base, cards |
| `--em-850` | `#0A2019` | `#0C182C` | |
| `--em-800` | `#0B231C` | `#0E1B31` | Hero end, dark buttons |
| `--em-700` | `#0F2E25` | `#13243F` | Raised panels |
| `--em-650` | `#12372D` | `#162A48` | Hero glow |
| `--em-600` … `--em-500` | `#154036` / `#1B4A3C` | `#1A3152` / `#253F66` | Radial highlights |

RGB twins (`--em-950-rgb`, `--em-900-rgb`, `--em-800-rgb`, `--em-700-rgb`, `--panel-rgb`) are used in `rgb(var(--…-rgb) / alpha)` overlays.

### Text on the dark stage

| Token | Default | Private Bank | Use |
| --- | --- | --- | --- |
| `--ivory` | `#F4EEE1` | `#F4EEE1` | Body, headings, form text |
| `--muted` | `#CFD8CC` | `#CBD3DF` | Leads, labels, secondary |
| `--muted-2` | `#A9B8AE` | `#A0ABBC` | Meta, footer links |
| `--muted-3` / `--muted-4` | softer | softer | Disclaimer, strike-through |

### Metal

| Token | Default | Private Bank |
| --- | --- | --- |
| `--gold` | `#C9A96E` | `#B08D57` |
| `--gold-hi` | `#E6C980` | `#CDAE7A` |
| `--gold-pale` | `#F4E2B0` | `#EADBC0` |
| `--gold-deep` | `#A8864A` | `#8C6E40` |
| `--g-1` / `--g-2` | `#B8955A` / `#D9BB78` | `#9C7B4A` / `#C6A56F` |
| `--on-gold` | `#0B231C` | `#0B231C` (not overridden) |
| `--gold-ink` | `#7A5A22` | same |
| `--gold-ink-dark` | `#4A3A1C` | same |

### Paper (reading slab — homepage uses it for one section only)

| Token | Value |
| --- | --- |
| `--paper` | `#F7F1E4` |
| `--paper-2` | `#EFE6D2` |
| `--ink` | `#14241E` |
| `--ink-soft` | `#3F4F47` |
| `--paper-line-rgb` | `140 108 56` |

### Oxblood note

`--ox` `#45111F`, `--ox-900` `#2A0912`, `--ox-glow` `#6A1C2C`. Testimonials (`.bg-ox`) only. Private Bank retints oxblood toward navy: `--ox` `#1B2A40`.

### Light palettes (`html.light`)

`ivory`, `white`, `royal`, `sand` (and `atelier`) flip the stage tokens to light surfaces and flip `--ivory` to dark text. `site.js` adds `class="light"` for those names.

| Palette | Stage `--em-950` | Text `--ivory` | Metal `--gold` / `--gold-hi` | `--on-gold` |
| --- | --- | --- | --- | --- |
| ivory | `#F7F3EA` | `#0F1E35` | `#A8843F` / `#8C6B2C` | `#1A1408` |
| white | `#FFFFFF` | `#111111` | `#A8843F` / `#8C6B2C` | `#111111` |
| royal | `#F4F7FD` | `#0B1B3F` | `#2B4FD1` / `#1E3FB0` | `#FFFFFF` |
| sand | `#EFE7DB` | `#2B2724` | `#A5643A` / `#8E522C` | `#FFFFFF` |

Dark islands stay dark on light palettes: `.site-foot`, `.aside-card`, `.mnav`, `.nav-dd .menu`, `.bg-ox`. Those selectors reset `--ivory` to `#F4EEE1` and restore a dark `--em-*` ramp plus a champagne or royal metal. Do not paint long reading on `--em-700` while that token is also the fill; that is the 1.0:1 form-heading bug.

Other dark palettes exist (`navy`, `onyx`, `bordeaux`, `petrol`, `sapphire`, `maison`) and only retint the same tokens. Phase 1 QA measures default, privatebank, ivory, white, royal, sand.

## Type

Loaded from Google Fonts on the homepage (and on the landing pages):

- Display: `Frank Ruhl Libre` (`--f-display`), then David Libre, Georgia
- Body: `IBM Plex Sans Hebrew` (`--f-body`), then Assistant, Segoe UI, Arial
- Numbers: `Cormorant Garamond` (`--f-num`), class `.num`

| Role | Rule |
| --- | --- |
| Body | `font-size: calc(16px * var(--fs))`, weight 300, line-height 1.7, color `--ivory` |
| Headings | `--f-display`, weight 400 (hero 300), line-height 1.15, `text-wrap: balance` |
| `.h-xl` | `clamp(2.4rem, 5vw, 4.75rem)`, line-height 1.03, weight 300. `<em>` and `.g` are weight 500, color `--gold-hi` |
| `.h-hero` | `clamp(3rem, 8.4vw, 8.4rem)`, line-height 0.98, weight 300 |
| Page H1 | `.page-hero h1`: `clamp(2.2rem, 5.2vw, 4.6rem)`, weight 300, max-width 20ch |
| Eyebrow | `.eyebrow`: 0.75rem, tracking 0.32em, `--gold`, weight 500, 40px hairline via `::before` |
| Lead | `.lead`: `clamp(1.05rem, 1.4vw, 1.25rem)`, line-height 1.8, `--muted`, max-width 60ch |
| Small label | `.lbl-sm`: 0.75rem, tracking 0.28em, `--gold` |

`--fs` is the accessibility text scale (default 1).

## Space, radius, shadow

- Wrap: `--wrap: 1320px`, padding-inline `clamp(16px, 4vw, 56px)`
- Section: `.sec-pad` padding-block `clamp(72px, 10vw, 128px)`. Inner pages: `.article-sec` `clamp(48px, 7vw, 96px)`, `.page-hero` bottom `clamp(56px, 8vw, 104px)`
- Section head: `.sec-head` column gap 20px, margin-bottom 56px, max-width 880px
- Radius: `--radius: 4px` on cards, panels, inputs, tables. Pills (`.btn`, `.chip`) are `999px`. Popovers, cookie, modal use 12px
- Card padding: 34px, 26px under 680px
- Form gap: 16px. Inputs min-height 50px, padding 10px 14px
- Shadows (do not invent new ones):
  - Primary button: `0 8px 30px rgb(var(--gold-rgb) / .28)`
  - Card hover (`.fx-refined`): `0 24px 50px rgba(0,0,0,.28)` plus a gold hairline
  - Light cards: `0 10px 30px rgba(20,20,30,.06)`
  - Menus / popovers: `0 24px 60px rgba(0,0,0,.45)`
  - Portrait: `0 30px 70px rgba(0,0,0,.35)`

## Backgrounds (continuous, not flat slabs)

`.sec` is `position: relative; overflow: hidden`. Texture sits in the background or in `.layer` (absolute, `pointer-events: none`).

| Class | Treatment |
| --- | --- |
| `.bg-hero` | Two emerald/navy radials over a vertical `--em-800` → `--em-900` gradient. Optional `.rays`, `.sweep`, `.dust` |
| `.bg-gold` | Horizontal metal gradient. Ticker only |
| `.bg-guil` | Guilloche rings plus a bottom radial |
| `.bg-pin` | 22px gold pinstripe over `--em-700` → `--em-920` |
| `.bg-grid` | 120px gold grid, corner radial, `--em-800` |
| `.bg-ox` | Oxblood/navy radial. Testimonials |
| `.bg-ivory` | Scalloped paper. One homepage reading section, dark `--ink` text |
| `.bg-cta` | Champagne (or palette metal) radial plus diagonal gradient, text `--on-gold` |
| `.gold-rule` | 1px fade through `--gold` / `--gold-pale` |

Homepage order: hero → guilloche (banks) → pinstripe (calculator) → `--em-900` services → paper stories → grid (why) → oxblood testimonials → `--em-900` blog → hero contact → gold CTA → footer.

The two `--em-900` bands are flat. Phase 1 landing pages do **not** copy those flat bands. `main.lp-flow` stacks the hero radial, guilloche, pinstripe and grid on one vertical gradient from `--em-900` (so it meets the hero) through `--em-800` back to `--em-920`. No solid mid-page fill.

`.fx-refined` adds a fixed film-grain overlay (opacity 0.06), a slow ambient shift on `.bg-hero`, a gold hairline under `.sec-head`, and a sheen on `.btn`. `prefers-reduced-motion` and `.a11y-nomotion` stop the motion.

## Cards, buttons, forms

**Card** (`.card`): 1px `--line-soft`, radius `--radius`, padding 34px, fill `rgb(var(--em-900-rgb) / .72)`, column gap 16px.

**Panel** (`.panel`): diagonal translucent fill, `--line-strong` border, inner frame at `inset: 8px` in `rgb(var(--gold-hi-rgb) / .18)`. The landing-page form card (`.lp-form-card`) uses that inner frame on the existing `linear-gradient(160deg, var(--em-700), var(--em-900))`.

**Aside card** (`.aside-card`): same gradient language, gold border, inner frame, sticky in `.article-grid` (340px column, 56px gap).

**Buttons** (`.btn`): inline-flex, min-height 54px, padding 0 30px, pill, weight 500.

| Class | Fill | Text |
| --- | --- | --- |
| `.btn-a` | Metal gradient `--g-1` → `--gold-pale` → `--g-2` | `--em-800` on the homepage |
| `.btn-g` | Transparent, 1px `--line-strong` | `--ivory` |
| `.btn-dark` | `--em-800` (light palettes pin a dark literal) | `--gold-hi` |
| `.btn-wa` | `#1F6F4A` | `#fff` |

On `body.lp-redesign`, `.btn-a` is a solid `--gold` with `--on-gold` text. The homepage gradient’s darkest stop falls under 4.5:1 against both `--em-800` and `--on-gold`. The solid token keeps the metal button and clears 4.5:1 on every measured palette.

**Inputs** (`.lead-form`): label `--muted`, 0.88rem, tracking 0.03em. Fields: `--ivory` on `rgb(var(--em-950-rgb) / .6)`, 1px `--line`, radius `--radius`, focus ring `0 0 0 3px rgb(var(--gold-hi-rgb) / .2)`. Two-column `.row` collapses under 680px.

**Form contrast rule (no `:has()`):**

```css
body.lp-redesign #form h3 { color: var(--ivory); }
body.lp-redesign #form,
body.lp-redesign #form .lead-form label,
body.lp-redesign #form .form-ok,
body.lp-redesign #form .form-ok b { color: var(--ivory); }
```

`--ivory` is light on dark palettes and dark on light palettes, and the card fill uses the same `--em-700` / `--em-900` ramp, so the pair stays above 4.5:1. The color is the same token as `#form h3 { color: var(--ivory) }` in PR #105. The selector is scoped to `body.lp-redesign` so other pages are left alone. Do not set the heading to `--em-700`: that token is the top of the card gradient (1.0:1).

## Header and footer

- Ticker: `.ticker.bg-gold`, 0.75rem, tracking 0.14em, `--on-gold`. Duplicate track is `aria-hidden`.
- Header: `.site-head` / `.head-row`, brand wordmark `--f-display` 1.6rem, latin `.brand-name span` in `--f-num` tracking 0.38em `--gold`.
- Nav links: `--muted`, 0.9rem, hover and current `--gold-hi`. Dropdown panel `--em-800`, radius `--radius`.
- Burger under 1020px. `.mnav` is a full-screen `--em-900` sheet. Display links 1.5rem.
- Footer: `.site-foot` on `--em-950`, top hairline `--line-soft`, 4-column `.foot-grid`, disclaimer `--muted-3`.

## Landing-page application (phase 1)

Pages: `yoetz-mashkantaot.html`, `mashkanta-kablan.html`, `yoetz-mashkantaot-merkaz.html`, `ishur-ekroni.html`.

- `body.lp-redesign` plus `main.lp-flow` replace `main.bg-ivory`.
- Hero (`.sec.bg-hero.page-hero`), ticker, header, gold CTA and footer stay the shared markup.
- Article type, tables, FAQ (`.dark-faq`) and the form card read with the tokens above.
- No new sentences. Eyebrows and other empty homepage slots are listed in `docs/design/2026-10-06-lp-copy-slots.md`.
