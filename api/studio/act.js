const { guard, readJson, writeJson, body, PLAN_DIR } = require("./_lib");
const now = () => new Date().toISOString();
module.exports = async (req, res) => {
  if (!guard(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "method" });
  const b = body(req);
  const date = String(b.date || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: "date" });
  const path = `${PLAN_DIR}/${date}.json`;
  for (let attempt = 0; attempt < 3; attempt++) {
    let cur;
    try { cur = await readJson(path); } catch (e) { return res.status(404).json({ error: "not found" }); }
    const d = cur.data;
    if (["queued", "published", "producing"].includes(d.status)) return res.status(409).json({ error: "locked", doc: d });
    let msg;
    if (b.action === "approve") {
      if (!d.audio_path) return res.status(409).json({ error: "no audio" });
      Object.assign(d, { status: "approved", decided_at: now() }); msg = `studio: approve ${date}`;
    } else if (b.action === "reject") {
      Object.assign(d, { status: "rejected", note: String(b.fix_content || "החלף נושא").slice(0, 2000), decided_at: now() }); msg = `studio: replace topic ${date}`;
    } else if (b.action === "fix") {
      const fc = String(b.fix_content || "").slice(0, 2000), fp = String(b.fix_pron || "").slice(0, 1000);
      if (!fc && !fp) return res.status(400).json({ error: "empty" });
      Object.assign(d, { status: "changes", fix_stage: "received", fix_content: fc, fix_pron: fp, fix_sent_at: now(),
        fix_error: "", fix_note: "", script_new: "", pron_map: [], decided_at: now() });
      msg = `studio: correction ${date}`;
    } else return res.status(400).json({ error: "action" });
    const w = await writeJson(path, d, cur.sha, msg);
    if (w.ok) return res.status(200).json({ ok: true, doc: d });
    if (w.status !== 409 && w.status !== 422) return res.status(502).json({ error: "write " + w.status });
  }
  res.status(409).json({ error: "busy" });
};
