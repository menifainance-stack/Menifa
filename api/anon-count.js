/* Same-origin sink for form_start and bot_step1 from assets/js/anon-counter.js.
   Acknowledges the beacon and stores nothing. No cookies, no log of the body.
   TODO: Tamir can point ANON_COUNTER_URL at a Make webhook instead. */
module.exports = function (req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.status(204).end();
};
