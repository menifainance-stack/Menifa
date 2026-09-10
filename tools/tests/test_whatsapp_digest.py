"""בדיקות לפרסר ייצוא וואטסאפ. הרצה: python3 -m unittest tools/tests/test_whatsapp_digest.py"""
import datetime as dt
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import whatsapp_digest as wd  # noqa: E402

ANDROID = """‎ההודעות והשיחות מוצפנות מקצה לקצה. אף אחד מחוץ לצ'אט הזה לא יכול לקרוא אותן.
10/09/2026, 08:15 - ‎רוני כהן יצר את הקבוצה "יועצי משכנתאות - קהילה"
10/09/2026, 08:16 - ‎דנה לוי הצטרפה באמצעות קישור ההזמנה
10/09/2026, 09:02 - רוני כהן: בוקר טוב חברים
10/09/2026, 09:05 - דנה לוי: יש לי לקוח עם 3 הלוואות, הכנסה 22K
דורש מחזור + איחוד, בנק לאומי סירב.
מישהו הצליח לאומי בכזה מקרה?
10/09/2026, 09:07 - רוני כהן: <המדיה לא נכללה>
10/09/2026, 09:09 - משה פרץ: הודעה זו נמחקה
10/09/2026, 09:12 - משה פרץ: דנה לוי, נסי מזרחי, הם גמישים באיחוד עד 50% מהנכס
10/09/2026, 13:40 - רוני כהן: מישהו יודע אם דיסקונט שינו מרווח בפריים?
09/09/2026, 20:00 - דנה לוי: הודעה מאתמול בערב
"""

IOS = """[10/09/2026, 10:15:32] ‎יוסי אברהם: ‎שאלה: הבנק דורש ערב על 85% מימון, זה חוקי?
[10/09/2026, 10:16:01] ‎שרה גל: ‎image omitted
[10/09/2026, 10:17:45] ‎שרה גל: לא, מעל 75% צריך ביטוח EMI, לא ערב. תבדוק את הנוהל
[10/09/2026, 6:20:00 PM] ‎יוסי אברהם: תודה
"""


class ParseTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self.tmp.name)
        (self.dir / "קהילה.txt").write_text(ANDROID, encoding="utf-8")
        (self.dir / "ios.txt").write_text(IOS, encoding="utf-8")

    def tearDown(self):
        self.tmp.cleanup()

    def test_android_parse(self):
        msgs = wd.parse_export(self.dir / "קהילה.txt")
        texts = [m.text for m in msgs]
        self.assertEqual(len(msgs), 5)  # 6 הודעות משתמש פחות מדיה ומחיקה = 4 + 1 מאתמול
        self.assertNotIn("<המדיה לא נכללה>", texts)
        self.assertNotIn("הודעה זו נמחקה", texts)
        self.assertTrue(all("יצר את הקבוצה" not in t for t in texts))
        multi = next(m for m in msgs if m.text.startswith("יש לי לקוח"))
        self.assertEqual(multi.text.count("\n"), 2)
        self.assertEqual(multi.sender, "דנה לוי")
        self.assertEqual(multi.source, "קהילה")

    def test_ios_parse_and_pm(self):
        msgs = wd.parse_export(self.dir / "ios.txt")
        self.assertEqual(len(msgs), 3)
        self.assertEqual(msgs[0].sender, "יוסי אברהם")
        self.assertEqual(msgs[0].text, "שאלה: הבנק דורש ערב על 85% מימון, זה חוקי?")
        self.assertEqual(msgs[-1].ts, dt.datetime(2026, 9, 10, 18, 20))

    def test_window_and_threads(self):
        msgs = []
        for f in wd.collect_files([str(self.dir)]):
            msgs += wd.parse_export(f)
        since = dt.datetime(2026, 9, 10)
        until = dt.datetime(2026, 9, 11)
        win = wd.window(msgs, since, until)
        self.assertEqual(len(win), 7)
        threads = wd.split_threads(win, gap_minutes=90)
        # קהילה: 09:02-09:12 שרשור אחד, 13:40 שרשור שני; ios: 10:15-10:17 אחד, 18:20 שני
        self.assertEqual(len(threads), 4)
        self.assertEqual(threads[0].group, "קהילה")

    def test_anonymize(self):
        msgs = wd.parse_export(self.dir / "קהילה.txt")
        mapping = wd.anonymize(msgs)
        self.assertEqual(len(mapping), 3)
        senders = {m.sender for m in msgs}
        self.assertTrue(all(s.startswith("יועץ ") for s in senders))
        reply = next(m for m in msgs if "נסי מזרחי" in m.text)
        self.assertNotIn("דנה לוי", reply.text)
        self.assertIn("יועץ", reply.text)

    def test_report_no_llm(self):
        msgs = wd.parse_export(self.dir / "קהילה.txt")
        since, until = dt.datetime(2026, 9, 10), dt.datetime(2026, 9, 11)
        win = wd.window(msgs, since, until)
        mapping = wd.anonymize(win)
        threads = wd.split_threads(win)
        md = wd.build_report(threads, win, since, until, None, mapping)
        self.assertIn("סיכום קבוצות יועצי משכנתאות — 10/09/2026", md)
        self.assertIn("| שרשורי שיחה | 2 |", md)
        html_out = wd.report_to_html(md)
        self.assertIn("dir='rtl'", html_out)
        self.assertIn("<table", html_out)

    def test_cli_end_to_end(self):
        out = self.dir / "digest.md"
        rc = wd.main([str(self.dir), "--since", "2026-09-10", "--until", "2026-09-11", "--no-llm",
                      "--out", str(out), "--html", str(self.dir / "d.html"), "--json", str(self.dir / "d.json")])
        self.assertEqual(rc, 0)
        self.assertTrue(out.exists())
        self.assertTrue((self.dir / "d.json").exists())


if __name__ == "__main__":
    unittest.main()
