/* ═══════════════════════════════════════════════════════════════
   Measurement config — PREVIEW ONLY
   ───────────────────────────────────────────────────────────────
   GTM never loads while MENIFA_MEASUREMENT_PREVIEW is false,
   or while MENIFA_GTM_ID is the placeholder GTM-XXXXXXX.

   This file is safe to ship: the loader no-ops on live.
   Replace the ID and flip the flag ONLY after Tamir supplies a
   real container ID and approves going live.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (typeof window.MENIFA_MEASUREMENT_PREVIEW === 'undefined') {
    window.MENIFA_MEASUREMENT_PREVIEW = false;
  }
  if (typeof window.MENIFA_GTM_ID === 'undefined') {
    window.MENIFA_GTM_ID = 'GTM-XXXXXXX';
  }
})();
