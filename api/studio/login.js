const crypto = require("crypto");
const { COOKIE, cookieValue, body } = require("./_lib");
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "method" });
  const pw = String(body(req).password || "");
  const want = process.env.STUDIO_PASSWORD || "";
  if (!want || !process.env.GH_TOKEN) return res.status(503).json({ error: "setup" });
  const a = crypto.createHash("sha256").update(pw).digest(), b = crypto.createHash("sha256").update(want).digest();
  if (!want || !crypto.timingSafeEqual(a, b)) { await new Promise(r => setTimeout(r, 800)); return res.status(403).json({ error: "bad" }); }
  res.setHeader("Set-Cookie", `${COOKIE}=${cookieValue()}; Path=/; Max-Age=${60 * 86400}; HttpOnly; Secure; SameSite=Lax`);
  res.status(200).json({ ok: true });
};
