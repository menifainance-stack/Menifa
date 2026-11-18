// Shared helpers for Tamir's reels studio (menifa.org/studio). Data lives in the private repo, read/written with GH_TOKEN.
const crypto = require("crypto");
const REPO = process.env.STUDIO_REPO || "menifainance-stack/Menifa-Private";
const BRANCH = process.env.STUDIO_BRANCH || "voice/elevenlabs";
const PLAN_DIR = "content/reels/plan";
const COOKIE = "menifa_studio";

function secret() { return (process.env.STUDIO_PASSWORD || "") + "|menifa-studio-v1"; }
function sign(exp) { return crypto.createHmac("sha256", secret()).update(String(exp)).digest("hex"); }
function cookieValue() { const exp = Date.now() + 60 * 864e5; return `${exp}.${sign(exp)}`; }
function authed(req) {
  if (!process.env.STUDIO_PASSWORD) return false;
  const m = (req.headers.cookie || "").match(new RegExp(COOKIE + "=([0-9]+)\\.([a-f0-9]+)"));
  if (!m || Number(m[1]) < Date.now()) return false;
  const a = Buffer.from(m[2]), b = Buffer.from(sign(m[1]));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function guard(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  if (!process.env.GH_TOKEN || !process.env.STUDIO_PASSWORD) { res.status(500).json({ error: "setup" }); return false; }
  if (!authed(req)) { res.status(401).json({ error: "login" }); return false; }
  return true;
}
async function gh(path, opts = {}) {
  const r = await fetch(`https://api.github.com/repos/${REPO}/${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${process.env.GH_TOKEN}`, "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "menifa-studio", ...(opts.headers || {}) },
  });
  return r;
}
async function readJson(path) {
  const r = await gh(`contents/${encodeURI(path)}?ref=${encodeURIComponent(BRANCH)}`);
  if (!r.ok) throw new Error(`read ${path}: ${r.status}`);
  const j = await r.json();
  return { data: JSON.parse(Buffer.from(j.content, "base64").toString("utf8")), sha: j.sha };
}
async function writeJson(path, data, sha, message) {
  const body = { message, branch: BRANCH, content: Buffer.from(JSON.stringify(data, null, 1), "utf8").toString("base64"), sha,
    committer: { name: "menifa-studio", email: "studio@menifa.org" } };
  return gh(`contents/${encodeURI(path)}`, { method: "PUT", body: JSON.stringify(body), headers: { "content-type": "application/json" } });
}
function body(req) {
  if (req.body && typeof req.body === "object") return req.body;
  try { return JSON.parse(req.body || "{}"); } catch (e) { return {}; }
}
module.exports = { REPO, BRANCH, PLAN_DIR, COOKIE, cookieValue, guard, gh, readJson, writeJson, body };
