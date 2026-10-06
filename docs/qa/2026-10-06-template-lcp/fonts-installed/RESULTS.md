# Slow 4G with the Hebrew webfonts installed — 2026-10-06

Lighthouse 12.8.2, `--throttling-method=devtools`, mobile 412×823 deviceScaleFactor 1.75, 4× CPU, fresh Chrome profile each run (no `menifa-consent`, so the cookie banner is shown by the inline reveal script), `*make.com*` blocked. make.com requests: 0. No forms submitted.

The families Assistant, David Libre, IBM Plex Sans Hebrew, Frank Ruhl Libre and Cormorant Garamond were installed from the Google Fonts TTFs in `~/.fonts`.

- **A** uses the normal fontconfig, so Noto Hebrew is present as well.
- **B** sets `FONTCONFIG_FILE` to reject Noto Sans Hebrew, Noto Serif Hebrew and Noto Rashi Hebrew. The five families above stay installed.

Median, then the three runs in order. Times in ms.

## Condition A — five families installed, Noto Hebrew present

| Page | Live LCP | Preview LCP | Live CLS | Preview CLS |
|---|---|---|---|---|
| `/` | 2756 (2843, 2698, 2756) | 2819 (2816, 2919, 2819) | 0.216 (0.216, 0.216, 0.215) | 0.000 (0.000, 0.001, 0.000) |
| `/ishur-ekroni.html` | 1509 (1509, 1496, 1516) | 912 (915, 909, 912) | 0.150 (0.140, 0.151, 0.150) | 0.001 (0.001, 0.001, 0.001) |
| `/yoetz-mashkantaot.html` | 1504 (1504, 1512, 1487) | 919 (919, 924, 912) | 0.458 (0.458, 0.458, 0.459) | 0.001 (0.001, 0.001, 0.001) |
| `/blog/ישיבת-ריבית-21-אוקטובר-2026.html` | 1537 (1545, 1510, 1537) | 947 (948, 947, 939) | 0.269 (0.269, 0.269, 0.308) | 0.001 (0.001, 0.001, 0.001) |
| `/lp/ihud/` | 1511 (1500, 1527, 1511) | 1452 (1445, 1452, 1454) | 0.235 (0.235, 0.236, 0.234) | 0.000 (0.000, 0.000, 0.000) |

## Condition B — five families installed, Noto Hebrew rejected

| Page | Live LCP | Preview LCP | Live CLS | Preview CLS |
|---|---|---|---|---|
| `/` | 2755 (2739, 2764, 2755) | 2836 (2817, 2941, 2836) | 0.217 (0.217, 0.215, 0.340) | 0.000 (0.000, 0.001, 0.000) |
| `/ishur-ekroni.html` | 1511 (1489, 1609, 1511) | 908 (909, 899, 908) | 0.150 (0.150, 0.163, 0.150) | 0.001 (0.001, 0.001, 0.001) |
| `/yoetz-mashkantaot.html` | 1493 (1493, 1495, 1489) | 905 (900, 905, 920) | 0.459 (0.458, 0.459, 0.459) | 0.001 (0.001, 0.001, 0.001) |
| `/blog/ישיבת-ריבית-21-אוקטובר-2026.html` | 1515 (1515, 1524, 1506) | 928 (939, 924, 928) | 0.317 (0.305, 0.317, 0.319) | 0.001 (0.001, 0.001, 0.001) |
| `/lp/ihud/` | 1515 (1492, 1515, 1530) | 1442 (1446, 1442, 1442) | 0.235 (0.234, 0.241, 0.235) | 0.000 (0.000, 0.000, 0.000) |

Preview CLS median is under 0.1 and under live on every page in both conditions.

Preview LCP median is under live on ishur, yoetz, the 21.10 blog and `/lp/ihud/` in both conditions. Home is the exception: preview median is 2819 vs live 2756 in A, and 2836 vs 2755 in B. Preview first contentful paint on `/` is about 970ms and live is about 1550ms. The home LCP node is still `p.lead.rise.d4`. On preview the LCP time sits at the end of that fade (about 1.85s after first paint). On live the gap from first paint to LCP is about 1.2s. The fade keyframes were not changed. An interleaved rerun of home only (`*-home-pair-*.json`) shows the same gap on every pair.

Files named `*-home-pair-*` are that extra home check, not part of the three-run table above.
