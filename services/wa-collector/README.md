# wa-collector
Webhook → SQLite → סיכום יומי עם Claude. תיעוד מלא: [`docs/whatsapp-digests/README.md`](../../docs/whatsapp-digests/README.md).

```bash
# מקומי
WA_HOOK_SECRET=x python3 collector.py serve
curl -X POST localhost:8080/hook/waha -H 'X-Hook-Secret: x' -d @sample.json
python3 collector.py stats
python3 collector.py digest --no-llm

# בדיקות (מתוך שורש הריפו)
python3 -m unittest services/wa-collector/tests/test_collector.py

# פרודקשן
cp .env.example .env && docker compose up -d --build
```
