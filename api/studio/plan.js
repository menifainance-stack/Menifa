const { guard, gh, readJson, PLAN_DIR, BRANCH } = require("./_lib");
module.exports = async (req, res) => {
  if (!guard(req, res)) return;
  try {
    const r = await gh(`contents/${PLAN_DIR}?ref=${encodeURIComponent(BRANCH)}`);
    if (!r.ok) return res.status(502).json({ error: "list " + r.status });
    const files = (await r.json()).filter(f => f.name.endsWith(".json"));
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
    const wanted = files.filter(f => f.name.slice(0, 10) >= today);
    const plan = await Promise.all(wanted.map(f => readJson(`${PLAN_DIR}/${f.name}`).then(x => x.data)));
    let meta = {};
    try { meta = (await readJson("content/reels/meta.json")).data; } catch (e) {}
    res.status(200).json({ plan, meta });
  } catch (e) { res.status(502).json({ error: String(e.message || e) }); }
};
