# Menifa × Luski design parity audit (independent)

**Date:** 2026-09-16 · Asia/Jerusalem (IDT, UTC+3)  
**Scope:** Analysis only — no repo edits, no deploy.  
**Subject:** PR [#23](https://github.com/menifainance-stack/Menifa/pull/23) · branch `cursor/luski-polish-homepage-e010` · head `7e4212d` · draft → `pilot/bmf-staging`  
**Benchmark:** Or Luski / Beyahad Finance craft (financeb · byhdf · byhd)  
**Rules:** Menifa super-skill (A+B+J) · motion checklist · site-build brief · chapter J replication cards  
**Brand lock:** Menifa ink/sky only (`#0E3C5C` / `#5BAFD8`); mortgage-first hero; no Luski logo/name/copy/claims; insurance = secondary closer only.

---

## 0) Verdict

PR #23 implements the **checklist mechanics** (tokens, overlay HEX, card shadow, hover ~220ms, reveal once, quiz 4-step, no pulse/count-from-0, insurance out of H1).  
It does **not** yet reach Luski/Beyahad **visual craft**: hero is CSS-mesh, not photo-led; mid-page depth/rhythm still light; review preview path is weak. Tamir’s “too light” judgment is confirmed.

| Gate | Result |
|------|--------|
| Mechanical checklist (`check_luski_polish.py` class) | **Pass** (tokens/hierarchy/anti-pulse) |
| Craft parity vs financeb/byhdf archive cards | **Fail — below target** |
| Ready to promote past pilot | **No** until P0 closed + reviewable staging preview |

---

## 1) Sources inspected (read-only)

| Source | Role |
|--------|------|
| `competitor-intel/2026-09-16-luski-style-system-extraction.md` | Luski tokens / structure |
| `competitor-intel/2026-09-16-menifa-org-luski-motion-checklist.md` | Mandatory Menifa motion/hero/cards params |
| `competitor-intel/2026-09-16-menifa-site-build-brief-from-competitors.md` | Home IA + Menifa tokens |
| Archive cards `beyachad-luski-01/02` + images/screenshots | Chapter J visual targets |
| Super-skill `2026-09-16-menifa-design-edit-unified.md` (§A brand, §J cards) | Design rules |
| PR #23 body + patch + raw `index.html` / `assets/style.css` / `assets/script.js` / `tools/check_luski_polish.py` | Actual polish implementation |
| Live `menifa.org` CSS/HTML | Baseline before polish |
| raw.githack preview URL | Accessibility note (HTML/CSS/JS 200; relative assets brittle for visual review) |

**Not cloned.** No code modified.

---

## 2) Side-by-side parity matrix

| Parameter | Luski / Beyahad target (craft) | Menifa target (brand-safe) | PR #23 actual | Gap |
|-----------|--------------------------------|----------------------------|---------------|-----|
| **Hero / background** | Photo/video office-lifestyle + dark 135° navy overlay; depth & bokeh | Same structure with Menifa overlay `linear-gradient(135deg, #0A2F48cc, #0E3C5C99)` + optional approved photo/video (not Luski asset) | CSS multi-layer gradient + SVG plexus only; **no photo/video** | **P0** — reads template/raw vs photo craft |
| **Graphics / mesh** | Soft photo grain; gold accents; no purple SaaS mesh | Low-depth sky plexus **behind** copy; CTA gradient `#5BAFD8→#2D6F95`; cream/white/ink bands | SVG plexus present; CTA gradient OK; leftover `#B89259` chevron stroke in CSS | **P1** — mesh OK; stray trust-gold stroke; still no photo texture |
| **Animation timings** | CSS reveals; hover ~200–250ms ease; no loops | Hover 200–250ms; CTA no pulse; particles off | `--transition: 0.22s`; CTA hover lift 2px; pulses disabled; particle keyframes remain but `animation: none` | **P2** — timing OK; dead keyframes clutter |
| **Scroll reveals** | Once-per-entry fade/slide; no heavy parallax | `opacity` + `translateY` once; no count-from-0 | `.reveal`: 16px / **0.45s** ease; IO threshold 0.12; unobserve once; counters static | **P1** — duration slightly soft/long vs 200–250ms UI feel; coverage uneven across heavy blocks |
| **Hover** | Card lift 2–4px + deeper shadow; gold deepen | Lift 2–4px; shadow deepen; border accent optional; CTA `#5BAFD8→#2D6F95/#7BC1E0` | Cards ~3px / deeper shadow; CTA 2px + deep sky | **OK / P2** — meets band; unify lift to 3px |
| **Sticky nav / CTA** | Sticky header + single strong gold CTA; WA float | Sticky header + **one** primary WA CTA; mobile: header CTA **or** bottom bar — not two heavy; cookie must not cover CTA | Fixed nav + WA CTA; mobile hides phone; WA FAB + phone FAB + a11y + cookie | **P1** — multi-float stack; no dedicated sticky **bottom** CTA bar; cookie at `bottom: 88px` still risk |
| **Typography** | Heebo scale; H1 clamp ~2.25–4rem; one accent word in gold | Frank Ruhl H1 900 `clamp(2.05→3.2rem)` + Heebo UI; **one** accent word in `#5BAFD8` | Matches Menifa scale; accent `לוחץ`; eyebrow ~0.78rem / tracking | **OK** (brand-correct; not Heebo-clone) |
| **Palette** | Navy `#163259/#0B3064` + gold `#DAAF2E/#D3B682` | Ink `#0E3C5C` · sky `#5BAFD8` · cream `#F0F7FB` · text `#232932` · **forbid** Luski gold/navy identity | Tokens correct; checker bans `#DAAF2E/#163259` | **OK** |
| **Spacing** | Section 64–96px desktop; 40–64 / 16–20 mobile; container ~1120–1280 | Same rhythm; home IA breathing room | `section: clamp(4–7rem)`; container 1280; mobile section 4rem | **P1** — numbers close; mid-page still denser/flatter than Luski alternating navy/white bands |
| **Radii** | `0.75rem` (~12px) buttons/cards | Cards 12–16px; buttons 12px; xl 20px OK | `--radius-md/lg/xl: 12/16/20`; hero-tool/quiz 16; quiz options 12 | **OK** |
| **Shadows** | Rest `0 4px 24px -4px` @ ~8% navy; hover deeper; gold CTA glow | Same with Menifa ink rgba; sky CTA glow | `--shadow-md` exact; service hover `--shadow-lg`; CTA sky glow | **OK** |
| **Media** | Real photography (office/home/founder); reviews chrome; video optional | Real Tamir/office assets; anti-AI; no competitor photos | Founder photo mid-page; **hero has no media**; partner logos OK | **P0** — hero media missing |
| **Mobile** | Stack; full-width CTAs; WA float; header compress; quiz full-width | Same; sticky single CTA; cookie/a11y clear of CTA; H1 shrink | Hero stacks; quiz 48px targets; ticker hidden; dual FAB + a11y | **P1** — conversion chrome crowded; first-screen craft still thin without photo |
| **Quiz** | financeb 10Q (do not copy); motion RTL + progress | 3–5Q; «שלב x מתוך y»; 44–48px; name+phone→WA; insurance ≠ Q1 | 4Q RTL + progress + 48px + form→WA | **OK** |
| **Anti-copy / claims** | N/A (their claims) | No ₪ savings promises; no “הכי זול”; insurance not hero | Hero clean; **testimonial still cites ₪2,800/mo**; JSON-LD/blog blurbs still heavy on savings language | **P1** (visible social proof) / **P2** (schema/blog meta) |

---

## 3) Ranked remaining gaps

### P0 — block craft acceptance

1. **Hero media depth** — Replace pure CSS/SVG hero with approved Menifa photo or short muted video under the existing 135° overlay; keep calculator ATF and mortgage-first H1. Without this, page cannot match Luski “premium finance” first impression.  
2. **Section craft / elevation rhythm** — Add Luski-like alternating ink/cream/white bands, stronger founder early treatment, and card/media depth so mid-scroll does not feel flat/template. Keep Menifa copy/IA (no Beyahad clone).  
3. **Reviewable preview** — raw.githack is brittle for side-by-side visual QA (relative assets / review friction). Ship a stable staging URL (Vercel preview / Pages / authenticated pilot host) before asking Tamir to re-judge.

### P1 — conversion & polish debt

4. **Mobile sticky conversion chrome** — Collapse to **one** sticky primary (nav CTA **or** bottom bar) + single WA float; ensure cookie/a11y never cover primary CTA at 375px.  
5. **Claims hygiene on homepage surface** — Remove or rephrase testimonial line with fixed ₪2,800 savings; keep “no promise” tone.  
6. **Reveal timing / coverage** — Prefer ~280–350ms ease (closer to UI 220ms band) with consistent `.reveal` on major section heads/grids; keep once-only.  
7. **Graphics cleanup** — Remove leftover `#B89259` stroke asset; ensure no Luski-gold residue outside optional trust-gold range if used deliberately (prefer sky).

### P2 — niceties

8. Dead `@keyframes` (`hero-particle-rise`, `float-pulse`, `ring`, `pulse-dot`) — delete if unused.  
9. Unify hover lift to **3px** across cards/buttons.  
10. Schema/blog meta savings language — not homepage chrome, but scrub when touching content.  
11. Optional: subtle real texture/grain under hero overlay (not AI purple mesh).

---

## 4) Objective acceptance checks

Run on **staging preview** (not raw.githack alone), desktop 1280 and mobile 375.

### A. Brand / anti-copy (must all pass)

- [ ] No `#DAAF2E`, `#163259`, `*3976`, AbsoluticaCon, Beyahad/Luski logo or name anywhere in homepage chrome.  
- [ ] H1 + eyebrow contain **no** `ביטוח`.  
- [ ] Primary CTA remains single action: «וואטסאפ — לתיאום שיחה».  
- [ ] No homepage testimonial/stat with fixed ₪ savings promise.  
- [ ] `python3 tools/check_luski_polish.py` exits 0.

### B. Craft parity (must all pass)

- [ ] Hero uses **real photo or video** + overlay tokens `#0A2F48cc → #0E3C5C99` (or equivalent Menifa pair); plexus stays behind text if present.  
- [ ] Side-by-side vs `images/beyachad-luski__02_financeb_full.png` / `01_byhdf*.png`: first-screen depth judged **≥ Luski craft** while colors stay Menifa (subjective gate: Tamir + one independent reviewer).  
- [ ] H1 `clamp(2.05rem–3.2rem)` / weight 900 / **one** `#5BAFD8` accent word.  
- [ ] Card rest shadow includes `0 4px 24px -4px` @ ~8% ink; hover lift 2–4px in 200–250ms.  
- [ ] Scroll reveals fire **once**; no count-from-0; no CTA/FAB pulse.  
- [ ] Section backgrounds alternate cream `#F0F7FB` / white / ink trust band (not one flat white page).  
- [ ] Radii cards/buttons in 12–16px band (20px max on large shells).

### C. Motion / sticky / mobile

- [ ] Sticky header keeps **one** readable primary CTA while scrolling.  
- [ ] At 375px: ≤1 floating contact control besides optional a11y; cookie does not cover primary CTA (screenshot proof).  
- [ ] Quiz: 3–5 steps, progress «שלב x מתוך y», options ≥44px, RTL slide, ends in name+phone or WA.  
- [ ] Hero calculator ATF shows non-zero estimate after interaction (QC note: ₪6,670 path still valid).

### D. Process

- [ ] Stable staging URL linked on PR (not only raw.githack).  
- [ ] Desktop + mobile hero stills attached for Tamir.  
- [ ] No merge to `main` / live menifa.org until P0 + acceptance A–C pass.

---

## 5) What PR #23 already got right

- Menifa token swap complete (ink/sky; CTA gradient; overlay HEX).  
- Mortgage-first H1 + pain bullets + calculator ATF; insurance deferred to soft closer.  
- Card shadow token, radii band, quiz shell, sticky nav CTA, pulse removal, static trust numbers.  
- Anti-AI / agent-jargon scrub in visible hero/calc teaser (`האומדן בראש העמוד`).  
- Mechanical QC script present and aligned with checklist.

These are necessary but **not sufficient** for Luski-level craft.

---

## 6) Recommended next build order (handoff — do not execute here)

1. Hero photo/video under existing overlay (P0).  
2. Mid-page elevation rhythm + founder early craft (P0).  
3. Staging preview URL (P0 process).  
4. Mobile chrome collapse + claims scrub (P1).  
5. Reveal timing/cleanup (P1/P2).  
6. Re-run this matrix + Tamir visual gate.

---

## 7) Top 5 gaps (executive)

1. **P0 — Hero lacks real media** (CSS/SVG only vs Luski photo+overlay craft).  
2. **P0 — Mid-page still “light/flat”** vs Luski depth, alternating bands, founder/media weight.  
3. **P0 — No stable visual preview** for Tamir (raw.githack insufficient for parity review).  
4. **P1 — Mobile CTA/float/cookie stacking** dilutes sticky conversion craft.  
5. **P1 — Homepage testimonial ₪2,800 claim** breaks no-promise / anti-copy surface hygiene.

**Path:** `/workspace/mortgage-ops/deliverables/website-landing/2026-09-16-menifa-luski-parity-audit.md`
