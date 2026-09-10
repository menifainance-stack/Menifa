"""python3 -m unittest services/wa-collector/tests/test_collector.py  (מתוך שורש הריפו)"""
import json
import os
import sys
import tempfile
import threading
import time
import unittest
import urllib.request
import urllib.error
from http.server import ThreadingHTTPServer
from pathlib import Path

_TMP = tempfile.TemporaryDirectory()
os.environ["WA_DB"] = str(Path(_TMP.name) / "wa.sqlite")
os.environ["WA_OUT"] = str(Path(_TMP.name) / "digests")
os.environ["WA_HOOK_SECRET"] = "s3cret"
os.environ.pop("DIGEST_EMAIL_TO", None)
os.environ.pop("DIGEST_WA_TO", None)

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import collector as c  # noqa: E402

NOW = int(time.time())
YESTERDAY = NOW - 86400 if (time.localtime().tm_hour > 1) else NOW - 90000

WAHA = {"event": "message", "session": "default", "payload": {
    "id": "false_120363xxx@g.us_3EB0ABC", "timestamp": YESTERDAY, "from": "120363xxx@g.us", "fromMe": False,
    "body": "לקוח עם 3 הלוואות, הכנסה 22K, לאומי סירב לאיחוד. רעיונות?", "participant": "972501111111@c.us",
    "hasMedia": False, "_data": {"notifyName": "דנה", "chat": {"name": "יועצי משכנתאות - קהילה"}}}}
WAHA_PRIVATE = {"event": "message", "payload": {"id": "x", "timestamp": YESTERDAY, "from": "972509999999@c.us", "fromMe": False, "body": "היי"}}
GREEN = {"typeWebhook": "incomingMessageReceived", "timestamp": YESTERDAY, "idMessage": "BAE5F", "senderData": {
    "chatId": "120363yyy@g.us", "chatName": "משכנתאות פרו", "sender": "972502222222@c.us", "senderName": "משה"},
    "messageData": {"typeMessage": "extendedTextMessage", "extendedTextMessageData": {"text": "מזרחי גמישים באיחוד עד 50% מהנכס"}}}
WHAPI = {"messages": [{"id": "w1", "from_me": False, "type": "text", "chat_id": "120363zzz@g.us", "chat_name": "WA Pro",
                        "from": "972503333333", "from_name": "יוסי", "timestamp": YESTERDAY, "text": {"body": "מישהו יודע אם דיסקונט שינו מרווח בפריים?"}},
                       {"id": "w2", "from_me": True, "type": "text", "chat_id": "120363zzz@g.us", "timestamp": YESTERDAY, "text": {"body": "שלי"}},
                       {"id": "w3", "from_me": False, "type": "image", "chat_id": "120363zzz@g.us", "timestamp": YESTERDAY}]}
ANDROID = {"package": "com.whatsapp", "title": "יועצי משכנתאות - קהילה", "text": "שרה: מעל 75% מימון צריך EMI, לא ערב",
           "lines": ["שרה: מעל 75% מימון צריך EMI, לא ערב", "רוני: תודה!", "3 הודעות חדשות"], "time": YESTERDAY * 1000}


class NormalizerTests(unittest.TestCase):
    def test_waha(self):
        m = c.norm_waha(WAHA)
        self.assertEqual(len(m), 1)
        self.assertEqual(m[0]["chat_name"], "יועצי משכנתאות - קהילה")
        self.assertEqual(m[0]["sender_name"], "דנה")
        self.assertEqual(c.norm_waha(WAHA_PRIVATE), [])  # לא קבוצה
        self.assertEqual(c.norm_waha({"event": "session.status"}), [])

    def test_greenapi(self):
        m = c.norm_greenapi(GREEN)
        self.assertEqual(len(m), 1)
        self.assertIn("מזרחי", m[0]["text"])
        self.assertEqual(m[0]["sender_name"], "משה")

    def test_whapi(self):
        m = c.norm_whapi(WHAPI)
        self.assertEqual(len(m), 1)  # from_me ותמונה מסוננים
        self.assertEqual(m[0]["msg_id"], "w1")

    def test_android(self):
        m = c.norm_android(ANDROID)
        self.assertEqual(len(m), 2)  # ההתראה המקובצת מסוננת, הכפילות אוחדה
        self.assertEqual(m[0]["chat_name"], "יועצי משכנתאות - קהילה")
        self.assertEqual({x["sender_name"] for x in m}, {"שרה", "רוני"})
        self.assertEqual(c.norm_android({"package": "com.telegram", "title": "x", "text": "a: b"}), [])


class ServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.conn = c.db()
        c.Handler.conn = cls.conn
        cls.srv = ThreadingHTTPServer(("127.0.0.1", 0), c.Handler)
        cls.port = cls.srv.server_address[1]
        threading.Thread(target=cls.srv.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.srv.shutdown()

    def _post(self, path, obj, headers=None):
        req = urllib.request.Request(f"http://127.0.0.1:{self.port}{path}", data=json.dumps(obj).encode(),
                                     headers={"Content-Type": "application/json", **(headers or {})})
        try:
            with urllib.request.urlopen(req) as r:
                return r.status, json.loads(r.read())
        except urllib.error.HTTPError as e:
            return e.code, json.loads(e.read())

    def test_1_auth_required(self):
        code, _ = self._post("/hook/waha", WAHA)
        self.assertEqual(code, 401)

    def test_2_ingest_all_sources_and_dedupe(self):
        h = {"X-Hook-Secret": "s3cret"}
        code, r = self._post("/hook/waha", WAHA, h); self.assertEqual((code, r["inserted"]), (200, 1))
        code, r = self._post("/hook/waha", WAHA, h); self.assertEqual(r["inserted"], 0)  # כפילות
        _, r = self._post("/hook/greenapi", GREEN, h); self.assertEqual(r["inserted"], 1)
        _, r = self._post("/hook/whapi", WHAPI, h); self.assertEqual(r["inserted"], 1)
        _, r = self._post("/hook/android", ANDROID, h); self.assertEqual(r["inserted"], 2)
        _, r = self._post("/hook/raw", {"anything": 1}, h); self.assertEqual(r["parsed"], 0)
        code, _ = self._post("/hook/nope", {}, h); self.assertEqual(code, 404)
        n = self.conn.execute("SELECT COUNT(*) FROM messages").fetchone()[0]
        self.assertEqual(n, 5)
        raw = self.conn.execute("SELECT COUNT(*) FROM raw_events").fetchone()[0]
        self.assertEqual(raw, 6)

    def test_3_waha_hmac(self):
        import hmac, hashlib
        body = json.dumps(dict(WAHA, payload=dict(WAHA["payload"], id="hmac-1"))).encode()
        sig = hmac.new(b"s3cret", body, hashlib.sha512).hexdigest()
        req = urllib.request.Request(f"http://127.0.0.1:{self.port}/hook/waha", data=body,
                                     headers={"Content-Type": "application/json", "X-Webhook-Hmac": sig, "X-Webhook-Hmac-Algorithm": "sha512"})
        with urllib.request.urlopen(req) as r:
            self.assertEqual(json.loads(r.read())["inserted"], 1)

    def test_4_health_and_digest(self):
        with urllib.request.urlopen(f"http://127.0.0.1:{self.port}/health") as r:
            self.assertTrue(json.loads(r.read())["ok"])
        path = c.run_digest(self.conn, days=2, llm=False)
        md = path.read_text(encoding="utf-8")
        self.assertIn("סיכום קבוצות יועצי משכנתאות", md)
        self.assertIn("יועץ 1", md)          # אנונימיזציה
        self.assertNotIn("דנה", md)
        self.assertTrue(path.with_suffix(".html").exists())
        self.assertEqual(self.conn.execute("SELECT COUNT(*) FROM digests").fetchone()[0], 1)


if __name__ == "__main__":
    unittest.main()
