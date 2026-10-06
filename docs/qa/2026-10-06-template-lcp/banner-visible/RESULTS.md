# Slow 4G, banner visible — 2026-10-06

Lighthouse 12, `--throttling-method=devtools`, mobile 412×823 deviceScaleFactor 1.75, 4× CPU, fresh Chrome profile each run (no `menifa-consent`), `*make.com*` blocked. make.com requests: 0. No forms submitted.

`FONTCONFIG_FILE` rejected Noto Sans Hebrew, Noto Serif Hebrew, and Noto Rashi Hebrew, so the metric `local()` fallbacks could not hide the swap. The cookie banner was on screen: `div#cookie > p` ("פרטיות ועוגיות") is a layout-shift node in the preview JSON for every page.

The earlier `summary.jsonl` in the parent folder (CLS 0.001–0.06) used the same viewport, throttling, and a fresh profile — the banner was visible there too (`div#cookie > p` scored 0.001 on preview yoetz). This machine has Noto Hebrew installed, and those `local()` fallbacks absorbed the swap. These runs turn that off.

Median, then the three runs. Times in ms.

| Page | Live LCP | Preview LCP | Live CLS | Preview CLS |
|---|---|---|---|---|
| `/` | 2851 (2916, 2851, 2786) | 2805 (2805, 2775, 2828) | 0.158 (0.158, 0.158, 0.158) | 0.011 (0.011, 0.011, 0.011) |
| `/ishur-ekroni.html` | 1534 (1527, 1534, 1540) | 910 (913, 910, 897) | 0.109 (0.109, 0.108, 0.109) | 0.011 (0.011, 0.011, 0.011) |
| `/yoetz-mashkantaot.html` | 1516 (1516, 1519, 1513) | 929 (942, 929, 924) | 0.102 (0.102, 0.101, 0.102) | 0.011 (0.011, 0.011, 0.011) |
| `/blog/ישיבת-ריבית-21-אוקטובר-2026.html` | 1524 (1519, 1526, 1524) | 935 (935, 935, 926) | 0.141 (0.140, 0.142, 0.141) | 0.023 (0.023, 0.023, 0.023) |
| `/lp/ihud/` | 1508 (1507, 1508, 1514) | 1447 (1445, 1459, 1447) | 0.152 (0.152, 0.151, 0.153) | 0.007 (0.007, 0.007, 0.007) |

LCP element: home `p.lead` on both; ishur and yoetz the first prose `p` on both; blog the `h1` on both; `/lp/ihud/` the cookie `p` on both.
