"""python3 -m unittest services/menifa-studio/tests/test_studio.py  (מתוך שורש הריפו)
E2E על סרטון סינתטי של 90 שנ' עם תמלול מזויף (בלי API): תכנון היוריסטי → 3 רילס 1080×1920."""
import json
import os
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path

_TMP = tempfile.TemporaryDirectory()
os.environ["STUDIO_DATA"] = str(Path(_TMP.name) / "data")
os.environ["STUDIO_PASSWORD"] = "test-key"
os.environ["STUDIO_NO_LLM"] = "1"
os.environ.pop("ANTHROPIC_API_KEY", None)
os.environ["CAPTION_FONT"] = "DejaVu Sans"

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import pipeline  # noqa: E402
import reel  # noqa: E402

WORDS_HE = "תכלס חברים הבנק חוגג עליכם כי אף אחד לא בודק את המשכנתא אחרי שלוקחים אותה ריבית בנק ישראל ירדה ל-3.25% ומי שלקח ב-2022 משלם היום יותר מדי".split()


def fake_words(total: float = 90.0, pause_every: float = 30.0) -> list[reel.Word]:
    """~2.6 מילים/שנ' עם הפסקה של 1.5 שנ' כל 30 שנ' → 3 סגמנטים של ~28.5 שנ'."""
    words, t, i, since_pause = [], 0.5, 0, 0.0
    while t < total - 1:
        if since_pause >= pause_every:
            t += 1.5; since_pause = 0.0
        w = WORDS_HE[i % len(WORDS_HE)]
        words.append(reel.Word(w, round(t, 2), round(t + 0.3, 2)))
        t = round(t + 0.38, 2); i += 1; since_pause += 0.38
    return words


def make_video(path: Path, secs: int = 90) -> None:
    subprocess.run([pipeline.FFMPEG, "-y", "-loglevel", "error", "-f", "lavfi", "-i", f"testsrc=size=1280x720:rate=24:duration={secs}",
                    "-f", "lavfi", "-i", f"sine=frequency=440:duration={secs}", "-c:v", "libx264", "-preset", "ultrafast",
                    "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", str(path)], check=True)


class PlanTests(unittest.TestCase):
    def test_heuristic_plan(self):
        words = fake_words()
        plans, planner = pipeline.plan_clips(words, n_clips=8, min_len=25, max_len=60)
        self.assertEqual(planner, "heuristic")
        self.assertGreaterEqual(len(plans), 2)
        for a, b in zip(plans, plans[1:]):
            self.assertLessEqual(a.end, b.start)  # בלי חפיפה
        self.assertTrue(all(12 <= p.length <= 90 for p in plans))
        self.assertTrue(all(p.hook for p in plans))

    def test_sanitize_drops_overlap_and_bad_length(self):
        words = fake_words()
        plans = [pipeline.ClipPlan(0, 30, "a", "h"), pipeline.ClipPlan(20, 50, "b", "h"), pipeline.ClipPlan(60, 62, "c", "h")]
        out = pipeline._sanitize(plans, words, 25, 60)
        self.assertEqual(len(out), 1)

    def test_transcript_text_has_timestamps(self):
        txt = pipeline._transcript_text(fake_words(20))
        self.assertIn("[0.5]", txt)
        self.assertIn("תכלס", txt)


class PipelineE2E(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.dir = Path(_TMP.name) / "e2e"; cls.dir.mkdir(parents=True, exist_ok=True)
        cls.video = cls.dir / "talk.mp4"; make_video(cls.video)
        cls._orig = pipeline.transcribe
        pipeline.transcribe = lambda audio, backend=None: fake_words()

    @classmethod
    def tearDownClass(cls):
        pipeline.transcribe = cls._orig

    def test_process_end_to_end(self):
        stages = []
        res = pipeline.process(self.video, self.dir / "out", pipeline.JobOptions(n_clips=8, min_len=25, max_len=60, font="DejaVu Sans"),
                               progress=lambda s, p, m="": stages.append((s, p)))
        self.assertEqual(res["planner"], "heuristic")
        self.assertGreaterEqual(len(res["clips"]), 2)
        self.assertEqual(stages[-1][0], "done")
        for c in res["clips"]:
            f = self.dir / "out" / "clips" / c["video"]
            self.assertTrue(f.exists())
            w, h = reel.probe_size(f)
            self.assertEqual((w, h), (1080, 1920))
            self.assertAlmostEqual(pipeline.duration_of(f), c["duration"], delta=1.0)
            self.assertTrue((self.dir / "out" / "clips" / c["srt"]).exists())
            self.assertIn("תכלס", c["transcript"])
        self.assertTrue((self.dir / "out" / "result.json").exists())

    def test_api_upload_and_poll(self):
        from fastapi.testclient import TestClient
        import app as studio
        client = TestClient(studio.app)
        self.assertEqual(client.get("/api/health").json()["auth"], True)
        self.assertEqual(client.get("/api/jobs").status_code, 401)
        h = {"X-Studio-Key": "test-key"}
        with self.video.open("rb") as fh:
            r = client.post("/api/jobs", headers=h, files={"file": ("talk.mp4", fh, "video/mp4")}, data={"n_clips": "3", "min_len": "25", "max_len": "60"})
        self.assertEqual(r.status_code, 200, r.text)
        jid = r.json()["id"]
        for _ in range(240):
            j = client.get(f"/api/jobs/{jid}", headers=h).json()
            if j["status"] in ("done", "error"):
                break
            time.sleep(1)
        self.assertEqual(j["status"], "done", j.get("error"))
        self.assertGreaterEqual(len(j["result"]["clips"]), 2)
        clip = j["result"]["clips"][0]["video"]
        r = client.get(f"/api/jobs/{jid}/clips/{clip}", headers=h)
        self.assertEqual(r.status_code, 200)
        self.assertGreater(len(r.content), 10_000)
        self.assertEqual(client.get("/", headers=h).status_code, 200)
        self.assertIn("מניפה", client.get("/").text)
        r = client.post("/api/jobs", headers=h, files={"file": ("x.exe", b"nope", "application/octet-stream")}, data={"n_clips": "3"})
        self.assertEqual(r.status_code, 400)
        self.assertEqual(client.delete(f"/api/jobs/{jid}", headers=h).json()["ok"], True)


if __name__ == "__main__":
    unittest.main()
