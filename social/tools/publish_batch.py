"""Render a monthly batch of 30 carousels + silent reels and queue them for the Make scenarios.

usage (from repo root):
  python3 social/tools/publish_batch.py <content_module> <batch_id> <start_date YYYY-MM-DD>
  e.g. python3 social/tools/publish_batch.py content_2026_11 2026-11 2026-10-31

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
SLOTS = {6: 20, 0: 19, 1: 19, 2: 12, 3: 8, 4: 13, 5: 20}
NAMES = ["שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת", "ראשון"]

def main(mod, batch, start):
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
        hour = SLOTS[date.weekday()]
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
                  "poll_q": poll[0], "poll_a": poll[1], "poll_b": poll[2]})):
            if os.path.exists(path):
                print("SKIP existing", path); continue
            os.makedirs(os.path.dirname(path), exist_ok=True)
            json.dump(payload, open(path, "w"), ensure_ascii=False, indent=1)
        rows.append([i, date.isoformat(), NAMES[date.weekday()], f"{hour:02d}:xx", day, len(imgs), title])
    with open(f"{cdir}/schedule.csv", "w", newline="", encoding="utf-8-sig") as fp:
        w = csv.writer(fp); w.writerow(["day", "date", "weekday", "hour_IL", "folder", "slides", "title"]); w.writerows(rows)
    print("batch ready:", batch, rows[0][1], "→", rows[-1][1])

if __name__ == "__main__":
    main(*sys.argv[1:4])
