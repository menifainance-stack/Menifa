/* Same-origin sink for assets/js/anon-counter.js.
   Acknowledges the beacon and stores nothing. No cookies, no log of the body.
   TODO: Tamir can point ANON_COUNTER_URL at a Make webhook instead. */
module.exports = function (req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.status(204).end();
};
