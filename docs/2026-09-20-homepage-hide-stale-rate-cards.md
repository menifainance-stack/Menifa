# Homepage — hide stale rate blog cards (2026-09-20)

**Branch:** `cursor/homepage-hide-stale-rate-cards`  
**Scope:** Preview/PR only — no merge until Tamir approval.

## What changed (`index.html` only)
1. **Visible cards:** replaced `blog/art-27.html` (יוני 2026) with `blog/art-53.html` (פינוי־בינוי — no stale rates in card).
2. **JSON-LD on homepage:** dropped Article/ListItem entries whose headline/description still cite 3.75% / 5.25% / יולי|יוני|מאי 2026.

## What did NOT change
- Article HTML files under `blog/` — **not deleted**.
- Live ticker (3.25% / פריים 4.75% / מדד אוגוסט) — untouched.

## Verify
- Homepage body: no 3.75% / 5.25% / יולי 2026 in visible cards.
- `/blog/art-27.html` etc. still reachable by direct URL.
