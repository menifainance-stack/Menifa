# SSIM report — Luski clone lab (2026-09-16, Asia/Jerusalem / IDT)

**Script:** `ssim/ssim_compare.py` (= official `image-to-skill-factory/factory/ssim_compare.py`)  
**claim_100:** ONLY if raw SSIM == 1.0 exactly. **None claim 100%.**  
**Motion:** not included in pixel scores.  
**Lab:** `/workspace/mortgage-ops/deliverables/website-landing/luski-clone-lab/` · server `:8770`  
**Never merge to menifa.org.**

## Method
- Clone captures via Playwright Chromium, device_scale_factor=1, same WxH as source gold (no stretch).
- financeb / byhdf: **1280×656** (`source/*-1280.png` vs `qc/*-clone-1280x656.png`)
- groupbeyahad: **1280×800**
- Cookie: hidden on financeb/groupbeyahad (absent in source gold); **kept** on byhdf (present in source gold).
- Lab ribbon hidden for QC. Identity (names/logos/claims) **not** masked.

## Dual scores (METRICS-TWO-SCORES)

| page | viewport | raw SSIM | raw MAE | masked SSIM | masked MAE | same_size | claim_100 |
|------|----------|----------|---------|-------------|------------|-----------|-----------|
| financeb | 1280×656 | **0.6523** | 23.325 | **0.6611** | 22.830 | true | false |
| byhdf | 1280×656 | **0.6041** | 34.941 | **0.6020** | 34.762 | true | false |
| groupbeyahad | 1280×800 | **0.6239** | 41.259 | **0.7134** | 33.281 | true | false |

### Delta vs prior STATUS (honest)
| page | prior raw | now raw | note |
|------|-----------|---------|------|
| financeb | 0.0000 | **0.6523** | wrong kitchen/office hero → man-in-office `hero-frame` |
| byhdf | 0.6828 @800 | **0.6041** @656 | native-height gold; meeting hero + heavier overlay + cookie match |
| groupbeyahad | 0.6831 | **0.6239** | channel marks strip raster; video thumb from evidence |

## Artifacts
- Side-by-side: `ssim/{page}-*/side-by-side.png`
- Heatmaps: `ssim/{page}-*/diff-heatmap.png` (+ `-masked`)
- Metrics JSON: `ssim/{page}-*/metrics.json` · aggregate `ssim/metrics.json`
- QC: `qc/*-clone-1280x656.png` / `qc/groupbeyahad-clone-1280x800.png`

## Remaining gaps (why not 1.0)

### financeb
1. Hero crop/position + overlay strength still ≠ live video frame timing
2. Phone glyph in header/CTA (emoji vs white handset)
3. H1 weight / anti-aliasing (Heebo local vs source SPA)
4. Missing a11y edge tab in some captures
5. WA position/size micro-offset

### byhdf
1. Overlay / color grade still not identical to source SPA blue wash
2. Stats typography (+500 vs 500+ glyph) + spacing
3. Phone icon in gold header CTA
4. Cookie banner chrome pixel diffs even when present
5. **Couch alternate** saved as `assets/img/byhdf-hero-couch.jpg` — source gold `byhdf-1280.png` is **meeting**, not couch; using couch tanks SSIM vs this gold

### groupbeyahad
1. Channel marks are evidence strip PNG (good) but scale/spacing vs live DOM tiles
2. Video still is evidence crop ≠ Wistia poster + play chrome exactly
3. Headline line-wrap / Absolutica vs Assistant font files incomplete
4. Logo wash / header white padding
5. Motion / Wistia timing not in pixel scores

### Pack still missing (from GAPS-TO-1.0)
Computed DevTools styles · full hover PNGs · motion video pack · complete woff2 · all quiz states

## Open
- Compare: http://127.0.0.1:8770/compare.html
- Pages: http://127.0.0.1:8770/ · /byhdf.html · /groupbeyahad.html
