# r5 — page-hero rays back on the bottom anchor — 2026-10-06

Head under test: the commit that removes `.page-hero .rays` / `spin-top`. `--f-display`, `--f-body`, `--f-num` and the `… Web` family names are unchanged.

`.page-hero .rays` had pinned the burst to `top: 0` with `translate(-50%, -16.5%)`, so the centre sat at a fixed ~603px. Live keeps `bottom: -10%` and `translate(-50%, 50%)`, which puts the centre at 1.1× the hero height. That rule is restored in `assets/site.css` and in the critical CSS of all 117 templates. No `min-height` was added on `ol.crumbs`: with the metric-matched `local()` faces, crumb and hero heights are the same before and after the webfont on the measured pages, in both font conditions.

The `local()` faces for David, Segoe, Arial and Cormorant stayed in the critical CSS. Arial and Segoe are the body fallback when the Hebrew families are absent, and Cormorant Local is the numeric face when Cormorant is installed. Moving them out is not zero-risk for first paint. The home fade (`p.lead.rise.d4`) was not changed.

## Burst centre vs live

Viewport 390×844 and 1440×900, animations frozen on `.rays`. Centre is the border-box centre of `.rays` relative to the hero top. Delta is preview minus live, in CSS pixels. Screenshots: `screenshots/`.

| Page | 390 dY | 1440 dY | 390 dX | 1440 dX |
|---|---|---|---|---|
| `/` | 0 | 0 | 0 | 0 |
| `/ishur-ekroni.html` | 0 | 0 | 0 | 0 |
| `/yoetz-mashkantaot.html` | 0 | 0 | 0 | 0 |
| `/blog/ישיבת-ריבית-21-אוקטובר-2026.html` | 0 | 0 | 0 | 0 |
| `/lp/ihud/` | 0 | 0 | 0 | 0 |
| `/blog.html` | 0 | 0 | 0 | 0 |
| `/contact.html` | 0 | 0 | 0 | 0 |
| `/about.html` | 0 | 0 | 0 | 0 |

Raw rows: `burst-centre.json`.

Shared critical CSS (the `@font-face` block, with the ihud-only `.article-grid>.stack>.h-hero{min-height:2lh}` removed) hashes to one value across all 117 templates. `spin-top` is gone.

## Slow 4G

Lighthouse 12.8.2, `--throttling-method=devtools`, mobile 412×823 at 1.75×, 4× CPU, fresh profile (no `menifa-consent`, banner visible), `*make.com*` blocked. make.com requests: 0. No forms submitted.

- **A** — Assistant, David Libre, IBM Plex Sans Hebrew, Frank Ruhl Libre and Cormorant Garamond installed, Noto Hebrew present.
- **B** — the same five families, Noto Sans Hebrew, Noto Serif Hebrew and Noto Rashi Hebrew rejected via fontconfig.

Median, then the three runs in order. Times in ms.

### A

| Page | Live LCP | Preview LCP | Live CLS | Preview CLS |
|---|---|---|---|---|
| `/` | 2779 (2835, 2779, 2727) | 2920 (3007, 2920, 2884) | 0.217 (0.363, 0.217, 0.216) | 0.001 (0.001, 0.001, 0.000) |
| `/ishur-ekroni.html` | 1523 (1542, 1515, 1523) | 930 (930, 918, 945) | 0.149 (0.141, 0.164, 0.149) | 0.001 (0.001, 0.001, 0.001) |
| `/yoetz-mashkantaot.html` | 1538 (1539, 1505, 1538) | 920 (920, 915, 933) | 0.458 (0.458, 0.458, 0.346) | 0.001 (0.001, 0.001, 0.001) |
| `/blog/ישיבת-ריבית-21-אוקטובר-2026.html` | 1511 (1511, 1508, 1558) | 955 (955, 930, 956) | 0.306 (0.306, 0.308, 0.269) | 0.001 (0.001, 0.001, 0.001) |
| `/lp/ihud/` | 1529 (1529, 1555, 1519) | 1463 (1476, 1461, 1463) | 0.241 (0.242, 0.241, 0.151) | 0.000 (0.000, 0.000, 0.000) |

### B

| Page | Live LCP | Preview LCP | Live CLS | Preview CLS |
|---|---|---|---|---|
| `/` | 2784 (2786, 2784, 2768) | 2919 (2879, 2919, 2920) | 0.217 (0.216, 0.380, 0.217) | 0.001 (0.001, 0.001, 0.001) |
| `/ishur-ekroni.html` | 1599 (1514, 1615, 1599) | 947 (943, 947, 970) | 0.163 (0.173, 0.139, 0.163) | 0.001 (0.001, 0.001, 0.001) |
| `/yoetz-mashkantaot.html` | 1533 (1557, 1531, 1533) | 980 (980, 920, 980) | 0.458 (0.459, 0.346, 0.458) | 0.001 (0.001, 0.001, 0.001) |
| `/blog/ישיבת-ריבית-21-אוקטובר-2026.html` | 1578 (1553, 1579, 1578) | 993 (1036, 993, 953) | 0.308 (0.307, 0.308, 0.308) | 0.001 (0.001, 0.001, 0.001) |
| `/lp/ihud/` | 1544 (1544, 1564, 1543) | 1466 (1466, 1481, 1464) | 0.241 (0.241, 0.233, 0.242) | 0.000 (0.000, 0.000, 0.000) |

Preview CLS median is under 0.1 and under live on every page in both conditions. Preview LCP median is under live on ishur, yoetz, the 21.10 blog and `/lp/ihud/` in both conditions.

Home is over live in both conditions: preview 2920 vs live 2779 in A, and 2919 vs 2784 in B. Every preview run is slower than every live run in that condition. Preview first contentful paint on `/` is about 1000ms and live is about 1500ms. The LCP node is still `p.lead.rise.d4`. On preview the gap from first paint to LCP is about 1.9s (the fade delay plus the fade). On live the gap is about 1.2–1.4s. The fade was not changed.
