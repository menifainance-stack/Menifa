# Luski clone lab — STATUS (2026-09-16 IDT)

**Mode:** INTERNAL CLONE LAB · full source identity (names/logos/claims/copy) · **no menifa.org merge**  
**claim_100:** false on all three (raw SSIM ≠ 1.0)

## Open tonight
| what | path / URL |
|------|------------|
| Folder | `/workspace/mortgage-ops/deliverables/website-landing/luski-clone-lab/` |
| Server | `http://127.0.0.1:8770/` |
| Compare (3 sources) | `http://127.0.0.1:8770/compare.html` |
| financeb | `http://127.0.0.1:8770/index.html` |
| byhdf | `http://127.0.0.1:8770/byhdf.html` |
| groupbeyahad | `http://127.0.0.1:8770/groupbeyahad.html` |
| SSIM report | `ssim/report.md` |

## SSIM table (official script, same WxH, no stretch)

| page | frame | raw SSIM | masked SSIM | claim_100 |
|------|-------|----------|-------------|-----------|
| financeb | 1280×656 | **0.6523** | **0.6611** | false |
| byhdf | 1280×656 | **0.6041** | **0.6020** | false |
| groupbeyahad | 1280×800 | **0.6239** | **0.7134** | false |

## Done this pass
- financeb: exact man-in-office hero (`hero-frame`), H1 pure white + shadow, real WhatsApp glyph
- byhdf: meeting hero matching source gold, heavier blue overlay, cookie kept for SSIM, stats DOM order fixed; couch kept as `byhdf-hero-couch.jpg` alternate
- groupbeyahad: evidence channel-marks strip + video thumb from evidence
- Re-ran `factory/ssim_compare.py` → updated `ssim/report.md`

## Honest remaining gaps
See `ssim/report.md`. Top blockers to 1.0: phone handset icons, font raster, hero overlay grade, Wistia/motion, computed CSS dump.
