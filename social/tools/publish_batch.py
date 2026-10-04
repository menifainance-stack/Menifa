"""Render a monthly batch of 30 carousels + silent reels and queue them for the Make scenarios.

usage (from repo root):
  python3 social/tools/publish_batch.py <content_module> <batch_id> <start_date YYYY-MM-DD>
  e.g. python3 social/tools/publish_batch.py content_2026_11 2026-11 2026-10-31
  second daily carousel (SLOTS2 hours; silent reel -> social/reels/queue2, no story):
  python3 social/tools/publish_batch.py content_2026_10b 2026-10b 2026-10-03 second

Writes:
  social/carousels/<batch>/dayNN/NN.jpg + caption.txt      (images Instagram downloads)
  social/carousels/queue/<YYYY-MM-DD-HH>.json               (Make "קרוסלה יומית" reads the current hour)
  social/reels/<batch>/dayNN.mp4                            (silent 9:16 reel)
  social/reels/queue/<YYYY-MM-DD>.json                      (Make "ריל יומי במייל" reads today at 09:00)
  social/carousels/<batch>/schedule.csv
Never overwrites a queue file that already exists (protects the running month).
"""
import csv, datetime, glob, importlib, json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
RAW = "https://raw.githubusercontent.com/menifainance-stack/Menifa/main/"
# Israel-time posting hour per weekday (Mon=0 .. Sun=6). Saturday slot is after Shabbat.
SLOTS = {6: 19, 0: 19, 1: 19, 2: 19, 3: 19, 4: 9, 5: 20}  # data 02.10.2026, see social/research/posting-times.md
# Second daily carousel: at least ~6h away from SLOTS on the same day.
SLOTS2 = {6: 9, 0: 9, 1: 9, 2: 9, 3: 9, 4: 14, 5: 22}
NAMES = ["שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת", "ראשון"]

def gallery(urls, title, when):
    """HTML thumbnails of a carousel for the morning email (images load from raw GitHub)."""
    imgs = "".join(f'<a href="{u}"><img src="{u}" width="31%" style="width:31%;max-width:170px;border-radius:8px;margin:1%;vertical-align:top" alt="שקף {i}"></a>' for i, u in enumerate(urls, 1))
    return (f'<div style="background:#ffffff;border-radius:14px;padding:14px 12px;margin-top:16px;color:#122523">'
            f'<div style="font-size:13px;font-weight:bold;color:#0e5e57">🖼 {when}</div><div style="font-size:17px;font-weight:900;margin:4px 0 8px">{title}</div>'
            f'<div style="text-align:center;direction:rtl">{imgs}</div>'
            f'<div style="font-size:12px;color:#5b6b68;margin-top:6px">לחיצה על שקף פותחת אותו בגודל מלא ← לחיצה ארוכה ← שמירה</div></div>')

def main(mod, batch, start, mode="main"):
    second = mode == "second"
    sys.path.insert(0, HERE)
    C = importlib.import_module(mod).C
    start = datetime.date.fromisoformat(start)
    cdir = os.path.join(ROOT, "social/carousels", batch)
    rdir = os.path.join(ROOT, "social/reels", batch)
    os.makedirs(rdir, exist_ok=True)
    subprocess.run([sys.executable, os.path.join(HERE, "build_carousels.py"), mod, cdir], check=True)
    sys.path.insert(0, HERE)
    import make_reel
    rows = []
    for i, d in enumerate(C, 1):
        day = f"day{i:02d}"
        imgs = sorted(glob.glob(f"{cdir}/{day}/*.jpg"))
        cap = open(f"{cdir}/{day}/caption.txt").read()
        date = start + datetime.timedelta(days=i - 1)
        hour = (SLOTS2 if second else SLOTS)[date.weekday()]
        mp4 = f"{rdir}/{day}.mp4"
        cq = os.path.join(ROOT, "social/carousels/queue", f"{date.isoformat()}-{hour:02d}.json")
        if second:
            assert hour != SLOTS[date.weekday()]
            if os.path.exists(cq): print("SKIP existing", cq)
            else:
                json.dump({"day": i, "batch": batch, "n": len(imgs), "caption": cap,
                           "urls": [RAW + os.path.relpath(p, ROOT) for p in imgs]}, open(cq, "w"), ensure_ascii=False, indent=1)
            # second series also gets a silent reel, emailed with the main one (social/reels/queue2)
            if not os.path.exists(mp4):
                make_reel.build(f"{cdir}/{day}", mp4, -1)
            rq2 = os.path.join(ROOT, "social/reels/queue2", f"{date.isoformat()}.json")
            if os.path.exists(rq2): print("SKIP existing", rq2)
            else:
                os.makedirs(os.path.dirname(rq2), exist_ok=True)
                urls = [RAW + os.path.relpath(p, ROOT) for p in imgs]
                json.dump({"day": i, "batch": batch, "title": d["t"].replace("*", ""), "caption": cap,
                           "video": RAW + os.path.relpath(mp4, ROOT), "slot": f"{hour:02d}:27",
                           "gallery": gallery(urls, d["t"].replace("*", ""), f"קרוסלה שנייה · עולה אוטומטית ב-{hour:02d}:27")},
                          open(rq2, "w"), ensure_ascii=False, indent=1)
            rows.append([i, date.isoformat(), NAMES[date.weekday()], f"{hour:02d}:xx", day, len(imgs), d["t"].replace("*", "")])
            continue
        title = d["t"].replace("*", "")
        mp4 = f"{rdir}/{day}.mp4"
        if not os.path.exists(mp4):
            make_reel.build(f"{cdir}/{day}", mp4, -1)
        sdir = os.path.join(ROOT, "social/stories", batch); os.makedirs(sdir, exist_ok=True)
        story = f"{sdir}/{day}.jpg"
        if not os.path.exists(story):
            subprocess.run([sys.executable, os.path.join(HERE, "make_story.py"), mod, str(i - 1), story, str((i - 1) % 3)], check=True)
        poll = d.get("poll") or ("מה דעתכם?", "כן", "לא")
        cq = os.path.join(ROOT, "social/carousels/queue", f"{date.isoformat()}-{hour:02d}.json")
        rq = os.path.join(ROOT, "social/reels/queue", f"{date.isoformat()}.json")
        for path, payload in (
            (cq, {"day": i, "batch": batch, "n": len(imgs), "caption": cap,
                  "urls": [RAW + os.path.relpath(p, ROOT) for p in imgs]}),
            (rq, {"day": i, "batch": batch, "title": title, "caption": cap,
                  "video": RAW + os.path.relpath(mp4, ROOT), "story": RAW + os.path.relpath(story, ROOT),
                  "poll_q": poll[0], "poll_a": poll[1], "poll_b": poll[2], "slot": f"{hour:02d}:27",
                  "gallery": gallery([RAW + os.path.relpath(p, ROOT) for p in imgs], title, f"קרוסלה ראשית · עולה אוטומטית ב-{hour:02d}:27")})):
            if os.path.exists(path):
                print("SKIP existing", path); continue
            os.makedirs(os.path.dirname(path), exist_ok=True)
            json.dump(payload, open(path, "w"), ensure_ascii=False, indent=1)
        rows.append([i, date.isoformat(), NAMES[date.weekday()], f"{hour:02d}:xx", day, len(imgs), title])
    with open(f"{cdir}/schedule.csv", "w", newline="", encoding="utf-8-sig") as fp:
        w = csv.writer(fp); w.writerow(["day", "date", "weekday", "hour_IL", "folder", "slides", "title"]); w.writerows(rows)
    print("batch ready:", batch, rows[0][1], "→", rows[-1][1])

if __name__ == "__main__":
    main(*sys.argv[1:5])
