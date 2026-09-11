"""
מניפה סטודיו — הצינור: סרטון ארוך → תמלול → תכנון קליפים (Claude) → רינדור רילס 9:16 עם כתוביות עברית.

שלבים:
  1. extract_audio   ffmpeg → mp3 מונו 16kHz 32kbps (שעה ≈ 14MB, מתאים ל-API)
  2. transcribe      backend לפי STT_BACKEND: groq | elevenlabs | local (faster-whisper + ivrit-ai)
  3. plan_clips      Claude מקבל את התמלול + ההקשר של מניפה ומחזיר 8+ קליפים (start/end/hook/title/why).
                     בלי ANTHROPIC_API_KEY → תכנון היוריסטי לפי הפסקות (לבדיקות ולהדגמה).
  4. render_clip     ffmpeg חיתוך → 9:16 → כתוביות מילה-מילה + הוק בראש (reel.py) → mp4 + srt + txt
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import time
import urllib.request
from dataclasses import asdict, dataclass, field
from pathlib import Path

_HERE = Path(__file__).resolve().parent
for cand in (_HERE, _HERE.parents[1] / "tools" / "video"):
    if (cand / "reel.py").exists():
        sys.path.insert(0, str(cand))
        break
import reel  # noqa: E402

FFMPEG = reel.ffmpeg_bin()
LOG = lambda *a: print(*a, file=sys.stderr, flush=True)  # noqa: E731


def run(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def duration_of(path: Path) -> float:
    import av
    with av.open(str(path)) as c:
        return float(c.duration) / 1e6


# ---------------------------------------------------------------------------
# 1. אודיו
# ---------------------------------------------------------------------------


def extract_audio(video: Path, out: Path) -> Path:
    run([FFMPEG, "-y", "-i", str(video), "-vn", "-ac", "1", "-ar", "16000", "-b:a", "32k", str(out)])
    return out


# ---------------------------------------------------------------------------
# 2. תמלול — שלושה backends, פלט אחיד: list[reel.Word]
# ---------------------------------------------------------------------------


def _multipart(fields: dict[str, str], file_field: str, path: Path, mime: str = "audio/mpeg") -> tuple[bytes, str]:
    boundary = f"----menifa{int(time.time() * 1000)}"
    body = bytearray()
    for k, v in fields.items():
        body += f"--{boundary}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n".encode()
    body += f"--{boundary}\r\nContent-Disposition: form-data; name=\"{file_field}\"; filename=\"{path.name}\"\r\nContent-Type: {mime}\r\n\r\n".encode()
    body += path.read_bytes() + b"\r\n" + f"--{boundary}--\r\n".encode()
    return bytes(body), f"multipart/form-data; boundary={boundary}"


def transcribe_groq(audio: Path, language: str = "he") -> list[reel.Word]:
    """Groq: OpenAI-compatible. whisper-large-v3-turbo, $0.04/שעה, ~15 שנ' לשעת אודיו."""
    key = os.environ["GROQ_API_KEY"]
    body, ctype = _multipart({"model": os.environ.get("GROQ_STT_MODEL", "whisper-large-v3-turbo"), "language": language,
                              "response_format": "verbose_json", "timestamp_granularities[]": "word"}, "file", audio)
    req = urllib.request.Request("https://api.groq.com/openai/v1/audio/transcriptions", data=body,
                                 headers={"Authorization": f"Bearer {key}", "Content-Type": ctype})
    with urllib.request.urlopen(req, timeout=600) as r:
        data = json.loads(r.read())
    words = data.get("words") or []
    if not words:  # fallback: segments בלי מילים → מפצלים סגמנט למילים שוות
        for seg in data.get("segments", []):
            toks = seg["text"].split()
            if not toks:
                continue
            step = (seg["end"] - seg["start"]) / len(toks)
            words += [{"word": t, "start": seg["start"] + i * step, "end": seg["start"] + (i + 1) * step} for i, t in enumerate(toks)]
    return [reel.Word(w["word"].strip(), float(w["start"]), float(w["end"])) for w in words if w.get("word", "").strip()]


def transcribe_elevenlabs(audio: Path, language: str = "heb") -> list[reel.Word]:
    """ElevenLabs Scribe: $0.22/שעה, WER עברית 5.5% (Common Voice) לפי ElevenLabs."""
    key = os.environ["ELEVENLABS_API_KEY"]
    body, ctype = _multipart({"model_id": os.environ.get("ELEVENLABS_STT_MODEL", "scribe_v1"), "language_code": language,
                              "timestamps_granularity": "word", "diarize": "false"}, "file", audio)
    req = urllib.request.Request("https://api.elevenlabs.io/v1/speech-to-text", data=body,
                                 headers={"xi-api-key": key, "Content-Type": ctype})
    with urllib.request.urlopen(req, timeout=600) as r:
        data = json.loads(r.read())
    return [reel.Word(w["text"].strip(), float(w["start"]), float(w["end"]))
            for w in data.get("words", []) if w.get("type", "word") == "word" and w.get("text", "").strip()]


def transcribe_local(audio: Path, language: str = "he") -> list[reel.Word]:
    return reel.transcribe(audio, os.environ.get("WHISPER_MODEL", "ivrit-ai/faster-whisper-v2-d4"), language=language,
                           device=os.environ.get("WHISPER_DEVICE", "auto"))


def transcribe(audio: Path, backend: str | None = None) -> list[reel.Word]:
    backend = backend or os.environ.get("STT_BACKEND", "groq" if os.environ.get("GROQ_API_KEY") else
                                        "elevenlabs" if os.environ.get("ELEVENLABS_API_KEY") else "local")
    LOG(f"🎙 תמלול: {backend}")
    return {"groq": transcribe_groq, "elevenlabs": transcribe_elevenlabs, "local": transcribe_local}[backend](audio)


# ---------------------------------------------------------------------------
# 3. תכנון קליפים
# ---------------------------------------------------------------------------


@dataclass
class ClipPlan:
    start: float
    end: float
    title: str
    hook: str
    why: str = ""
    score: int = 0

    @property
    def length(self) -> float:
        return self.end - self.start


PLAN_SYSTEM = """אתה עורך וידאו בכיר לתוכן קצר (רילס/טיקטוק) שעובד עבור תמיר גרמה, יועץ משכנתאות ("מניפה פיננסית").
אתה מקבל תמלול של סרטון ארוך עם חותמות זמן, ובוחר את הקטעים שיהיו הרילס הכי חזקים.

מה עושה רילס חזק אצלנו:
- פותח בכאב או בהבטחה ב-3 השניות הראשונות ("הבנק חוגג עליכם", "הטעות שעולה 80 אלף").
- עוסק בשאלה אמיתית של לווה: פריים או קבועה, מחזור, ריבית, עמלות, תמהיל, טעויות.
- עומד בפני עצמו: מי שרואה רק את הקליפ מבין הכל. לא מתחיל באמצע משפט ולא נגמר בלי מסקנה.
- טון: ישראלי, ישיר, "תכלס". נתונים ספציפיים > כללי.
- אורך 25–60 שניות. הכי טוב 35–50.

כללים טכניים:
- חתוך על גבולות משפטים. start = תחילת המשפט הפותח, end = סוף משפט המסקנה.
- לא לחפוף בין קליפים. לא להמציא זמנים — רק זמנים שמופיעים בתמלול.
- hook = כותרת של 3–7 מילים שתופיע על המסך ב-3 השניות הראשונות. בעברית. בלי אימוג'י.
- title = שם פנימי קצר לקליפ.
- why = משפט אחד: למה זה יעבוד.
- score 1–10.

החזר JSON בלבד, בלי טקסט מסביב: {"clips":[{"start":12.4,"end":51.0,"title":"...","hook":"...","why":"...","score":8}, ...]}"""


def _transcript_text(words: list[reel.Word], every: float = 5.0) -> str:
    """תמלול עם סימון זמן כל ~5 שניות: [12.4] מילים..."""
    out, last = [], -1e9
    for w in words:
        if w.start - last >= every:
            out.append(f"\n[{w.start:.1f}]")
            last = w.start
        out.append(w.word)
    return " ".join(out).strip()


def plan_clips_claude(words: list[reel.Word], n_clips: int, min_len: float, max_len: float) -> list[ClipPlan]:
    import anthropic

    client = anthropic.Anthropic()
    total = words[-1].end if words else 0
    user = (f"אורך הסרטון: {total:.0f} שניות. בחר {n_clips} קליפים (או פחות אם אין מספיק תוכן חזק), "
            f"כל אחד {min_len:.0f}–{max_len:.0f} שניות.\n\n<transcript>\n{_transcript_text(words)}\n</transcript>")
    with client.messages.stream(model=os.environ.get("PLAN_MODEL", "claude-opus-5"), max_tokens=16000,
                                system=PLAN_SYSTEM, messages=[{"role": "user", "content": user}]) as stream:
        resp = stream.get_final_message()
    if resp.stop_reason == "refusal":
        raise RuntimeError("Claude סירב לתכנן")
    text = "".join(b.text for b in resp.content if b.type == "text")
    m = re.search(r"\{.*\}", text, re.S)
    data = json.loads(m.group(0) if m else text)
    plans = [ClipPlan(float(c["start"]), float(c["end"]), c.get("title", ""), c.get("hook", ""), c.get("why", ""), int(c.get("score", 0)))
             for c in data.get("clips", [])]
    return _sanitize(plans, words, min_len, max_len)


def plan_clips_heuristic(words: list[reel.Word], n_clips: int, min_len: float, max_len: float) -> list[ClipPlan]:
    """בלי LLM: מפצל לפי הפסקות דיבור, בוחר את הקטעים הצפופים במילים (יותר דיבור = יותר תוכן)."""
    if not words:
        return []
    segs, cur = [], [words[0]]
    for prev, w in zip(words, words[1:]):
        if w.start - prev.end > 0.8 and (cur[-1].end - cur[0].start) >= min_len:
            segs.append(cur); cur = []
        cur.append(w)
        if cur[-1].end - cur[0].start >= max_len:
            segs.append(cur); cur = []
    if cur:
        segs.append(cur)
    plans = []
    for s in segs:
        length = s[-1].end - s[0].start
        if length < min_len * 0.6:
            continue
        density = len(s) / max(length, 1)
        text = " ".join(x.word for x in s)
        plans.append(ClipPlan(s[0].start, s[-1].end, text[:30], " ".join(text.split()[:5]), "הקטע הצפוף ביותר בדיבור", int(min(10, density * 4))))
    plans.sort(key=lambda p: -p.score)
    chosen = sorted(plans[:n_clips], key=lambda p: p.start)
    return _sanitize(chosen, words, min_len, max_len)


def _sanitize(plans: list[ClipPlan], words: list[reel.Word], min_len: float, max_len: float) -> list[ClipPlan]:
    total = words[-1].end if words else 0
    out: list[ClipPlan] = []
    for p in sorted(plans, key=lambda p: p.start):
        p.start = max(0.0, p.start - 0.15)
        p.end = min(total + 0.3, p.end + 0.25)
        if p.length < min_len * 0.5 or p.length > max_len * 1.5:
            continue
        if out and p.start < out[-1].end:
            if out[-1].end - p.start > 1.0:   # חפיפה אמיתית — מוותרים על הקליפ
                continue
            p.start = out[-1].end             # חפיפה של הריפוד בלבד — מצמידים
        out.append(p)
    return out


def plan_clips(words: list[reel.Word], n_clips: int = 8, min_len: float = 25, max_len: float = 60) -> tuple[list[ClipPlan], str]:
    if os.environ.get("ANTHROPIC_API_KEY") and not os.environ.get("STUDIO_NO_LLM"):
        try:
            return plan_clips_claude(words, n_clips, min_len, max_len), "claude"
        except Exception as e:  # לא מפילים job בגלל LLM — נופלים להיוריסטיקה ומדווחים
            LOG(f"⚠️ Claude planning failed: {e}")
    return plan_clips_heuristic(words, n_clips, min_len, max_len), "heuristic"


# ---------------------------------------------------------------------------
# 4. רינדור
# ---------------------------------------------------------------------------


@dataclass
class ClipResult:
    index: int
    title: str
    hook: str
    why: str
    score: int
    start: float
    end: float
    duration: float
    video: str
    srt: str
    txt: str
    transcript: str


def render_clip(src: Path, plan: ClipPlan, words: list[reel.Word], out_dir: Path, index: int,
                style: reel.Style, fonts_dir: Path | None = None) -> ClipResult:
    out_dir.mkdir(parents=True, exist_ok=True)
    stem = f"reel_{index:02d}"
    cut = out_dir / f"{stem}_cut.mp4"
    # חיתוך מדויק (re-encode) כדי שהזמנים של הכתוביות יתאימו
    run([FFMPEG, "-y", "-ss", f"{plan.start:.3f}", "-to", f"{plan.end:.3f}", "-i", str(src),
         "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-c:a", "aac", "-b:a", "160k", str(cut)])
    local = [reel.Word(w.word, max(0.0, w.start - plan.start), max(0.0, w.end - plan.start))
             for w in words if w.start >= plan.start - 0.05 and w.end <= plan.end + 0.05]
    ass = out_dir / f"{stem}.ass"
    ass.write_text(reel.build_ass(local, style, fonts_dir=fonts_dir, hook=plan.hook or None), encoding="utf-8")
    final = out_dir / f"{stem}.mp4"
    reel.render(cut, final, ass, fonts_dir=fonts_dir)
    cut.unlink(missing_ok=True)
    srt = out_dir / f"{stem}.srt"; srt.write_text(reel.build_srt(local, style), encoding="utf-8")
    txt = out_dir / f"{stem}.txt"; transcript = " ".join(w.word for w in local); txt.write_text(transcript, encoding="utf-8")
    return ClipResult(index, plan.title, plan.hook, plan.why, plan.score, plan.start, plan.end, round(plan.length, 1),
                      final.name, srt.name, txt.name, transcript)


# ---------------------------------------------------------------------------
# Job מלא
# ---------------------------------------------------------------------------


@dataclass
class JobOptions:
    n_clips: int = 8
    min_len: float = 25
    max_len: float = 60
    font: str = os.environ.get("CAPTION_FONT", "Heebo")
    font_size: int = int(os.environ.get("CAPTION_SIZE", "68"))
    fonts_dir: str | None = os.environ.get("FONTS_DIR") or None
    stt_backend: str | None = None


def process(video: Path, out_dir: Path, opts: JobOptions, progress=lambda stage, pct, msg="": None) -> dict:
    out_dir.mkdir(parents=True, exist_ok=True)
    progress("audio", 5, "מחלץ אודיו")
    audio = extract_audio(video, out_dir / "audio.mp3")
    progress("transcribe", 10, "מתמלל")
    words = transcribe(audio, opts.stt_backend)
    (out_dir / "words.json").write_text(json.dumps([asdict(w) for w in words], ensure_ascii=False), encoding="utf-8")
    (out_dir / "transcript.txt").write_text(" ".join(w.word for w in words), encoding="utf-8")
    progress("plan", 35, f"מתכנן קליפים ({len(words)} מילים)")
    plans, planner = plan_clips(words, opts.n_clips, opts.min_len, opts.max_len)
    (out_dir / "plan.json").write_text(json.dumps({"planner": planner, "clips": [asdict(p) for p in plans]}, ensure_ascii=False, indent=1), encoding="utf-8")
    style = reel.Style(font=opts.font, size=opts.font_size)
    fonts_dir = Path(opts.fonts_dir) if opts.fonts_dir else None
    results = []
    for i, p in enumerate(plans, 1):
        progress("render", 35 + int(60 * (i - 1) / max(len(plans), 1)), f"מרנדר קליפ {i}/{len(plans)}")
        results.append(asdict(render_clip(video, p, words, out_dir / "clips", i, style, fonts_dir)))
    progress("done", 100, f"{len(results)} רילס מוכנים")
    summary = {"planner": planner, "n_words": len(words), "duration": round(duration_of(video), 1), "clips": results}
    (out_dir / "result.json").write_text(json.dumps(summary, ensure_ascii=False, indent=1), encoding="utf-8")
    return summary
