#!/usr/bin/env python3
"""
reel.py — מסרטון סלולרי של תמיר לרילס 9:16 עם כתוביות עברית, בפקודה אחת.

    python3 tools/video/reel.py in.mp4                      # חיתוך שקטים → תמלול → כתוביות → 9:16
    python3 tools/video/reel.py in.mp4 --no-cut             # בלי חיתוך
    python3 tools/video/reel.py in.mp4 --transcript w.json  # תמלול מוכן (רשימת {word,start,end})
    python3 tools/video/reel.py in.mp4 --model small        # מודל קטן לבדיקה מהירה
    python3 tools/video/reel.py in.mp4 --edit-only          # רק חיתוך + 9:16, בלי כתוביות

הצינור (כל שלב = ספריית קוד פתוח מהקטלוג):
  1. auto-editor  — מוריד שקטים ו-"אממ" (jump cuts).
  2. faster-whisper עם מודל ivrit-ai (עברית) — תמלול עם חותמות זמן לכל מילה.
  3. כתוביות ASS מילה-מילה בסטייל מניפה (64–72px, מילה פעילה בזהב) — נצרבות עם ffmpeg.
  4. ffmpeg — חיתוך/ריפוד ל-1080×1920.
פלט: <שם>_reel.mp4, <שם>.srt, <שם>.txt (התמלול לפוסט), <שם>.words.json.

תלויות: pip install auto-editor faster-whisper imageio-ffmpeg   (ffmpeg מגיע עם imageio-ffmpeg)
מודל ברירת מחדל: ivrit-ai/faster-whisper-v2-d4 (הורדה ~1.5GB בפעם הראשונה). CPU עובד, GPU מהיר פי 10.
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path


def ffmpeg_bin() -> str:
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return shutil.which("ffmpeg") or "ffmpeg"


def run(cmd: list[str], quiet: bool = True) -> None:
    print("▶", " ".join(str(c) for c in cmd[:6]) + (" …" if len(cmd) > 6 else ""), file=sys.stderr)
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL if quiet else None, stderr=subprocess.DEVNULL if quiet else None)


# ---------------------------------------------------------------------------
# 1. חיתוך שקטים
# ---------------------------------------------------------------------------


def cut_silence(src: Path, dst: Path, threshold: float = 0.04, margin: str = "0.2s") -> Path:
    """auto-editor: משאיר רק קטעים עם קול מעל הסף, עם שוליים של 0.2 שנ' לכל כיוון."""
    run([sys.executable, "-m", "auto_editor", str(src), "--edit", f"audio:threshold={threshold}",
         "--margin", margin, "--no-open", "--progress", "none", "-o", str(dst)])
    return dst


# ---------------------------------------------------------------------------
# 2. תמלול
# ---------------------------------------------------------------------------


@dataclass
class Word:
    word: str
    start: float
    end: float


def transcribe(src: Path, model_name: str, language: str = "he", device: str = "auto") -> list[Word]:
    from faster_whisper import WhisperModel  # ייבוא עצל — לא נדרש עם --transcript

    compute = "int8" if device in ("cpu", "auto") else "float16"
    model = WhisperModel(model_name, device=device, compute_type=compute)
    segments, _info = model.transcribe(str(src), language=language, word_timestamps=True, vad_filter=True,
                                       beam_size=5, condition_on_previous_text=False)
    words: list[Word] = []
    for seg in segments:
        for w in seg.words or []:
            text = w.word.strip()
            if text:
                words.append(Word(text, float(w.start), float(w.end)))
    return words


def load_words(path: Path) -> list[Word]:
    data = json.loads(path.read_text(encoding="utf-8"))
    return [Word(d["word"], float(d["start"]), float(d["end"])) for d in data]


# ---------------------------------------------------------------------------
# 3. כתוביות
# ---------------------------------------------------------------------------


@dataclass
class Style:
    font: str = "Heebo"
    size: int = 68              # הנוסחה שלנו: 64–72px על 1080×1920
    color: str = "FFFFFF"       # לבן
    active: str = "5992B8"      # זהב מניפה #B89259 בסדר BGR של ASS
    outline: str = "000000"
    outline_w: int = 4
    margin_v: int = 420         # מרחק מהתחתית (מעל כפתורי הרילס)
    max_words: int = 3
    max_secs: float = 1.6


def _ass_time(t: float) -> str:
    h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60
    return f"{h}:{m:02d}:{s:05.2f}"


def chunk_words(words: list[Word], max_words: int, max_secs: float) -> list[list[Word]]:
    chunks, cur = [], []
    for w in words:
        if cur and (len(cur) >= max_words or w.end - cur[0].start > max_secs or w.start - cur[-1].end > 0.7):
            chunks.append(cur); cur = []
        cur.append(w)
    if cur:
        chunks.append(cur)
    return chunks


_HEB = re.compile(r"[\u0590-\u05FF]")


def _font_path(font: str, fonts_dir: Path | None) -> Path | None:
    """מוצא את קובץ ה-TTF של הפונט (לצורך מדידת רוחב מילים ב-PIL). fonts_dir קודם, אחרת fc-match."""
    if fonts_dir and fonts_dir.exists():
        cands = sorted(fonts_dir.glob("*.ttf")) + sorted(fonts_dir.glob("*.otf"))
        for c in cands:
            if font.replace(" ", "").lower() in c.stem.replace("-", "").replace(" ", "").lower():
                return c
        if cands:
            return cands[0]
    try:
        out = subprocess.run(["fc-match", "-f", "%{file}", font], capture_output=True, text=True, timeout=5).stdout.strip()
        return Path(out) if out and Path(out).exists() else None
    except Exception:
        return None


class _Measurer:
    """רוחב טקסט בפיקסלים של PlayRes. אם אין פונט — אומדן 0.55×גודל לתו."""

    def __init__(self, font: str, size: int, fonts_dir: Path | None):
        self.size = size
        self._font = None
        path = _font_path(font, fonts_dir)
        if path:
            try:
                from PIL import ImageFont
                self._font = ImageFont.truetype(str(path), size)
            except Exception:
                self._font = None

    def width(self, text: str) -> float:
        if self._font is not None:
            return float(self._font.getlength(text))
        return 0.55 * self.size * len(text)


def _word_events(chunk: list[Word], active: int, style: Style, meas: _Measurer, width: int, height: int,
                 start: float, end: float) -> list[str]:
    """
    עברית ב-ASS: תגי צבע בתוך שורה מפצלים אותה ל"ריצות" ו-libass מסדר אותן לא נכון (נבדק).
    לכן כל מילה = אירוע נפרד עם מיקום מפורש (\pos). מילה בודדת = ריצה אחת = bidi נכון,
    כולל פיסוק ומספרים. הסדר בין המילים: מימין לשמאל לשורה עברית, משמאל לימין אחרת.
    """
    rtl = bool(_HEB.search(" ".join(w.word for w in chunk)))
    gap = style.size * 0.32
    words = [w.word.replace("{", "").replace("}", "") for w in chunk]
    widths = [meas.width(t) for t in words]
    total = sum(widths) + gap * (len(words) - 1)
    fs = style.size
    max_w = width - 2 * 60
    if total > max_w:  # שורה ארוכה מדי — מקטינים פונט לצ'אנק הזה
        scale = max_w / total
        fs = int(style.size * scale)
        widths = [w * scale for w in widths]
        gap *= scale
        total = max_w
    y = height - style.margin_v
    x_left = (width - total) / 2
    events = []
    cursor = x_left + total if rtl else x_left
    for j, (t, w) in enumerate(zip(words, widths)):
        cx = (cursor - w / 2) if rtl else (cursor + w / 2)
        cursor = cursor - (w + gap) if rtl else cursor + (w + gap)
        color = style.active if j == active else style.color
        events.append(f"Dialogue: 0,{_ass_time(start)},{_ass_time(end)},Menifa,,0,0,0,,"
                      f"{{\\an5\\pos({cx:.0f},{y})\\fs{fs}\\c&H{color}&}}{t}")
    return events


def build_ass(words: list[Word], style: Style, width: int = 1080, height: int = 1920, fonts_dir: Path | None = None) -> str:
    """כל מילה = אירוע ממוקם; המילה הפעילה בזהב. ראה _word_events לסיבה."""
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {width}
PlayResY: {height}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Menifa,{style.font},{style.size},&H00{style.color},&H00{style.active},&H00{style.outline},&H80000000,-1,0,0,0,100,100,0,0,1,{style.outline_w},2,5,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    meas = _Measurer(style.font, style.size, fonts_dir)
    events: list[str] = []
    for chunk in chunk_words(words, style.max_words, style.max_secs):
        for i, w in enumerate(chunk):
            end = chunk[i + 1].start if i + 1 < len(chunk) else w.end + 0.15
            events += _word_events(chunk, i, style, meas, width, height, w.start, end)
    return head + "\n".join(events) + "\n"


def build_srt(words: list[Word], style: Style) -> str:
    out = []
    for n, chunk in enumerate(chunk_words(words, style.max_words * 2, style.max_secs * 2), 1):
        def t(x: float) -> str:
            h = int(x // 3600); m = int(x % 3600 // 60); s = int(x % 60); ms = int((x - int(x)) * 1000)
            return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"
        out += [str(n), f"{t(chunk[0].start)} --> {t(chunk[-1].end)}", " ".join(w.word for w in chunk), ""]
    return "\n".join(out)


# ---------------------------------------------------------------------------
# 4. רינדור 9:16
# ---------------------------------------------------------------------------


def render(src: Path, dst: Path, ass_path: Path | None, width: int = 1080, height: int = 1920, fonts_dir: Path | None = None) -> Path:
    """
    scale כך שהגובה 1920 ואז crop למרכז ל-1080 (לוידאו אופקי), או scale לרוחב 1080 ו-pad (לוידאו צר).
    הביטוי בוחר אוטומטית לפי יחס המקור.
    """
    vf = (f"scale='if(gt(a,{width}/{height}),-2,{width})':'if(gt(a,{width}/{height}),{height},-2)',"
          f"crop='min(iw,{width})':'min(ih,{height})',"
          f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:black")
    if ass_path:
        fd = f":fontsdir={fonts_dir}" if fonts_dir else ""
        vf += f",ass={ass_path}{fd}"
    run([ffmpeg_bin(), "-y", "-i", str(src), "-vf", vf, "-c:v", "libx264", "-preset", "medium", "-crf", "20",
         "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", str(dst)])
    return dst


def probe_size(path: Path) -> tuple[int, int]:
    import av  # PyAV מגיע עם auto-editor
    with av.open(str(path)) as c:
        s = c.streams.video[0]
        return s.codec_context.width, s.codec_context.height


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("input")
    ap.add_argument("--out-dir", default=None, help="תיקיית פלט (ברירת מחדל: ליד המקור)")
    ap.add_argument("--no-cut", action="store_true")
    ap.add_argument("--threshold", type=float, default=0.04, help="סף שקט ל-auto-editor (0.04 = 4%%)")
    ap.add_argument("--margin", default="0.2s")
    ap.add_argument("--transcript", help="JSON של מילים מוכן — מדלג על התמלול")
    ap.add_argument("--model", default="ivrit-ai/faster-whisper-v2-d4")
    ap.add_argument("--device", default="auto", help="auto | cpu | cuda")
    ap.add_argument("--edit-only", action="store_true", help="בלי תמלול ובלי כתוביות")
    ap.add_argument("--font", default="Heebo"); ap.add_argument("--size", type=int, default=68)
    ap.add_argument("--fonts-dir", help="תיקיית פונטים (אם Heebo לא מותקן במערכת)")
    ap.add_argument("--max-words", type=int, default=3)
    a = ap.parse_args(argv)

    src = Path(a.input).resolve()
    out_dir = Path(a.out_dir).resolve() if a.out_dir else src.parent
    out_dir.mkdir(parents=True, exist_ok=True)
    stem = src.stem
    work = out_dir / f".{stem}_work"; work.mkdir(exist_ok=True)

    cut = src
    if not a.no_cut:
        cut = cut_silence(src, work / f"{stem}_cut.mp4", a.threshold, a.margin)

    ass_path = None
    if not a.edit_only:
        words = load_words(Path(a.transcript)) if a.transcript else transcribe(cut, a.model, device=a.device)
        style = Style(font=a.font, size=a.size, max_words=a.max_words)
        (out_dir / f"{stem}.words.json").write_text(json.dumps([w.__dict__ for w in words], ensure_ascii=False, indent=1), encoding="utf-8")
        (out_dir / f"{stem}.srt").write_text(build_srt(words, style), encoding="utf-8")
        (out_dir / f"{stem}.txt").write_text(" ".join(w.word for w in words), encoding="utf-8")
        ass_path = work / f"{stem}.ass"
        ass_path.write_text(build_ass(words, style, fonts_dir=Path(a.fonts_dir) if a.fonts_dir else None), encoding="utf-8")
        print(f"📝 {len(words)} מילים · תמלול ב-{stem}.txt", file=sys.stderr)

    final = render(cut, out_dir / f"{stem}_reel.mp4", ass_path, fonts_dir=Path(a.fonts_dir) if a.fonts_dir else None)
    w, h = probe_size(final)
    print(f"✅ {final} ({w}×{h})", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
