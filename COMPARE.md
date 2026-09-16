# A/B Compare — מחזור משכנתא LP — 2026-09-17

Job owner: website · Audience: תמיר · Goal: decide A vs B tonight

## Absolute paths
| Item | Path |
|------|------|
| Root | `/workspace/mortgage-ops/deliverables/website-landing/2026-09-17-ab-lp-refinance/` |
| Variant A | `/workspace/mortgage-ops/deliverables/website-landing/2026-09-17-ab-lp-refinance/variant-a-menifa-skill/index.html` |
| Variant B | `/workspace/mortgage-ops/deliverables/website-landing/2026-09-17-ab-lp-refinance/variant-b-chain/index.html` |
| Shared copy | `/workspace/mortgage-ops/deliverables/website-landing/2026-09-17-ab-lp-refinance/shared-copy.json` |
| Side-by-side | `/workspace/mortgage-ops/deliverables/website-landing/2026-09-17-ab-lp-refinance/compare.html` |
| This file | `/workspace/mortgage-ops/deliverables/website-landing/2026-09-17-ab-lp-refinance/COMPARE.md` |

## Local links (server on :8791)
- Compare: http://127.0.0.1:8791/compare.html
- A: http://127.0.0.1:8791/variant-a-menifa-skill/
- B: http://127.0.0.1:8791/variant-b-chain/

## Shared brief (identical in A & B)
- Product: מחזור משכנתא
- Pain-first hero (NO insurance in hero)
- CTA: «וואטסאפ — לתיאום שיחה»
- Magnet: payment calculator + short form (name + phone)
- Tokens: ink `#0E3C5C` · accent `#5BAFD8` · gold `#C4A574` · WA `#25D366` (floater; CTA uses darker WA green for contrast)
- noindex on both
- Insurance/TCO only secondary trust near bottom

## Design system differences

| | Variant A — Menifa skill | Variant B — Taste→Emil→Impeccable→Playwright |
|--|--|--|
| Skill | `skill-1789561304539` (עיצוב ועריכה מניפה) P2 pain LP | `taste-emil-impeccable-playwright` 4-step chain |
| Aesthetic | Light editorial navy-expert / cream mood, Frank Ruhl + Heebo | Dark «לוח חוב» ledger hero, warm→cool paper, Frank Ruhl + Rubik |
| Hero | Light radial mood, ink text | Solid deep `#071E2E`, light text |
| Signature | Classic Menifa form card on light | Giant payment number on deep calc-out |
| Motion | Light rise (skill default) | Emil: ease-out only, `:active scale(0.97)`, reduced-motion, hover media |
| QC | desktop-hero + mobile-hero | + desktop-cta, mobile-form, impeccable.json, playwright-report |

## Visual differences (what Tamir should notice)
1. **Mood:** A = bright/trust-office; B = pressure-relief dark ledger
2. **Above-fold hierarchy:** both pain H1 + calc/form; B makes the **number** the signature
3. **Typography:** A Heebo body; B Rubik body
4. **Trust block:** A navy band; B split card + badge «Closer משני»
5. **CTA chrome:** both WhatsApp green primary; B darker green for WCAG

## QC status
### A
- `/workspace/mortgage-ops/deliverables/website-landing/2026-09-17-ab-lp-refinance/variant-a-menifa-skill/qc/desktop-hero.png`
- `/workspace/mortgage-ops/deliverables/website-landing/2026-09-17-ab-lp-refinance/variant-a-menifa-skill/qc/mobile-hero.png`
- (+ desktop-cta / mobile-form also captured)

### B
- `…/variant-b-chain/qc/desktop-hero.png`
- `…/variant-b-chain/qc/mobile-hero.png`
- `…/variant-b-chain/qc/desktop-cta.png`
- `…/variant-b-chain/qc/mobile-form.png`
- `…/variant-b-chain/qc/impeccable.json` (path scan)
- `…/variant-b-chain/qc/impeccable-url.json` — **exit 0** (preferred live DOM; advisory em-dash only — kept for identical Hebrew copy)
- `…/variant-b-chain/qc/playwright-report.md`
- Brief/Taste/Emil docs under `variant-b-chain/docs/`

## Public preview
Vercel: skipped (no credentials; temporary deploy hung). **Local :8791 + screenshots = tonight delivery.** Both pages `noindex`.

## Do not
- Merge to menifa.org main
- Change shared Hebrew copy structure between A and B
