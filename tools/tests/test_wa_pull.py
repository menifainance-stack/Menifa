"""python3 -m unittest tools/tests/test_wa_pull.py — מדמה את שני הספקים בשרת HTTP מקומי."""
import json
import os
import sys
import tempfile
import threading
import time
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import wa_pull  # noqa: E402

NOW = int(time.time())
GREEN = [
    {"type": "incoming", "idMessage": "A1", "timestamp": NOW - 3600, "typeMessage": "textMessage", "chatId": "120363aaa@g.us",
     "textMessage": "לקוח עם 3 הלוואות, לאומי סירב לאיחוד", "senderId": "97250@c.us", "senderName": "דנה"},
    {"type": "incoming", "idMessage": "A2", "timestamp": NOW - 3000, "typeMessage": "extendedTextMessage", "chatId": "120363aaa@g.us",
     "extendedTextMessage": {"text": "נסי מזרחי"}, "senderId": "97251@c.us", "senderName": "משה"},
    {"type": "incoming", "idMessage": "A3", "timestamp": NOW - 2000, "typeMessage": "textMessage", "chatId": "97252@c.us",
     "textMessage": "פרטי — לא קבוצה", "senderName": "X"},
    {"type": "incoming", "idMessage": "A4", "timestamp": NOW - 1000, "typeMessage": "imageMessage", "chatId": "120363aaa@g.us", "senderName": "Y"},
]
WAHA_GROUPS = [{"id": {"_serialized": "120363bbb@g.us"}, "name": "משכנתאות פרו"}]
WAHA_MSGS = [
    {"id": "W1", "timestamp": NOW - 5000, "from": "120363bbb@g.us", "fromMe": False, "body": "דיסקונט שינו מרווח?", "participant": "97253@c.us", "_data": {"notifyName": "יוסי"}},
    {"id": "W2", "timestamp": NOW - 4000, "from": "120363bbb@g.us", "fromMe": True, "body": "שלי"},
    {"id": "W1", "timestamp": NOW - 5000, "from": "120363bbb@g.us", "fromMe": False, "body": "דיסקונט שינו מרווח?", "participant": "97253@c.us"},  # כפילות
]


class Mock(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def do_GET(self):
        if "/lastIncomingMessages/" in self.path:
            assert "minutes=1440" in self.path, self.path
            body = GREEN
        elif self.path.endswith("/api/default/groups"):
            body = WAHA_GROUPS
        elif "/chats/120363bbb%40g.us/messages" in self.path:
            assert "filter.timestamp.gte=" in self.path and "filter.fromMe=false" in self.path
            body = WAHA_MSGS
        else:
            self.send_response(404); self.end_headers(); return
        data = json.dumps(body).encode()
        self.send_response(200); self.send_header("Content-Type", "application/json"); self.send_header("Content-Length", str(len(data))); self.end_headers()
        self.wfile.write(data)


class PullTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.srv = ThreadingHTTPServer(("127.0.0.1", 0), Mock)
        threading.Thread(target=cls.srv.serve_forever, daemon=True).start()
        base = f"http://127.0.0.1:{cls.srv.server_address[1]}"
        os.environ.update({"GREEN_API_ID_INSTANCE": "1101", "GREEN_API_TOKEN": "tok", "GREEN_API_HOST": base,
                           "WAHA_URL": base, "WAHA_API_KEY": "k"})
        os.environ.pop("DIGEST_EMAIL_TO", None)

    @classmethod
    def tearDownClass(cls):
        cls.srv.shutdown()

    def test_greenapi(self):
        rows, raw = wa_pull.pull_greenapi(24)
        self.assertEqual(len(raw), 4)
        self.assertEqual([r["msg_id"] for r in rows], ["A1", "A2"])  # פרטי ותמונה מסוננים
        self.assertEqual(rows[1]["text"], "נסי מזרחי")

    def test_waha(self):
        rows, raw = wa_pull.pull_waha(24)
        self.assertEqual(len(rows), 2)  # fromMe מסונן; הכפילות מסוננת רק ב-to_messages
        self.assertEqual(rows[0]["chat_name"], "משכנתאות פרו")
        self.assertEqual(rows[0]["sender_name"], "יוסי")
        self.assertEqual(len(wa_pull.to_messages(rows)), 1)

    def test_cli_end_to_end(self):
        with tempfile.TemporaryDirectory() as d:
            out = Path(d) / "r.md"
            rc = wa_pull.main(["greenapi", "--no-llm", "--no-email", "--out", str(out), "--dump", str(Path(d) / "raw.json")])
            self.assertEqual(rc, 0)
            md = out.read_text(encoding="utf-8")
            self.assertIn("| הודעות מקצועיות (אחרי סינון מדיה/מערכת) | 2 |", md)
            self.assertIn("יועץ 1", md)
            self.assertNotIn("דנה", md)


if __name__ == "__main__":
    unittest.main()
