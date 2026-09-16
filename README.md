# מניפה מעל לוסקי (+2) — Internal Preview

**Date:** 2026-09-16 (Asia/Jerusalem)  
**Brand wordmark:** מניפה פיננסית · תמיר גרמה (logo slot)  
**Marketing copy:** Luski/financeb source Hebrew  
**Header chrome:** Luski/financeb sticky navy + gold  
**Rule:** NOT merged to menifa.org main · noindex

## Open
```bash
cd /workspace/mortgage-ops/deliverables/website-landing/menifa-over-luski-upgrade
python3 -m http.server 8780
```
- Homepage: http://127.0.0.1:8780/index.html  
- Compare:  http://127.0.0.1:8780/compare.html  

## Tamir feedback applied (2026-09-16 evening)
1. **Header** matches financeb: sticky navy (`#163259` / `rgba(11,27,50,.95)`), logo right, nav center, gold primary CTA «פגישת ייעוץ חינם» + gold-outline phone secondary. Height ~81px. No white invert on scroll.
2. **Copy** from `financeb-COPY.md` + `2026-09-16-luski-clone-lab-source-copy.md` §financeb — hero, pain, quiz 10Q, services, process 01–06, FAQ, form CTAs.
3. `compare.html` kept · noindex · not merged to menifa.org main.

## Pack
`/workspace/mortgage-ops/deliverables/website-landing/menifa-over-luski-upgrade.tar.gz` (~10MB)
