/* ═══════════════════════════════════════════════════════════════
   Measurement config — PREVIEW ONLY
   ───────────────────────────────────────────────────────────────
   GTM never loads while MENIFA_MEASUREMENT_PREVIEW is false,
   or while MENIFA_GTM_ID is the placeholder GTM-XXXXXXX (REPLACE_ME).

   This file is safe to ship: the loader no-ops on live.
   Replace the ID and flip the flag ONLY after Tamir supplies a
   real container ID and approves going live.
   NEVER invent a real G- or GTM- production ID.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (typeof window.MENIFA_MEASUREMENT_PREVIEW === 'undefined') {
    window.MENIFA_MEASUREMENT_PREVIEW = false;
  }
  if (typeof window.MENIFA_GTM_ID === 'undefined') {
    /* REPLACE_ME — placeholder, not a real container */
    window.MENIFA_GTM_ID = 'GTM-XXXXXXX';
  }
  if (typeof window.MENIFA_GA4_MEASUREMENT_ID === 'undefined') {
    /* REPLACE_ME — placeholder; GA4 loads via GTM only, never invent G- IDs */
    window.MENIFA_GA4_MEASUREMENT_ID = 'G-XXXXXXXX';
  }
})();
