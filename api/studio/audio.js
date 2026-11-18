const { guard, gh, readJson, PLAN_DIR, BRANCH } = require("./_lib");
module.exports = async (req, res) => {
  if (!guard(req, res)) return;
  const date = String((req.query && req.query.date) || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).end();
  let d;
  try { d = (await readJson(`${PLAN_DIR}/${date}.json`)).data; } catch (e) { return res.status(404).end(); }
  if (!d.audio_path || !/^scripts\/voice\/out\/[\w.-]+\.mp3$/.test(d.audio_path)) return res.status(404).end();
  const r = await gh(`contents/${d.audio_path}?ref=${encodeURIComponent(BRANCH)}`, { headers: { Accept: "application/vnd.github.raw" } });
  if (!r.ok) return res.status(502).end();
  const buf = Buffer.from(await r.arrayBuffer());
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Cache-Control", "private, max-age=600");
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || "");
  if (m) {
    const start = m[1] ? parseInt(m[1], 10) : Math.max(0, buf.length - parseInt(m[2], 10));
    const end = m[1] && m[2] ? Math.min(parseInt(m[2], 10), buf.length - 1) : buf.length - 1;
    if (start >= buf.length || start > end) { res.setHeader("Content-Range", `bytes */${buf.length}`); return res.status(416).end(); }
    res.setHeader("Content-Range", `bytes ${start}-${end}/${buf.length}`);
    res.setHeader("Content-Length", end - start + 1);
    return res.status(206).end(buf.subarray(start, end + 1));
  }
  res.setHeader("Content-Length", buf.length);
  res.status(200).end(buf);
};
