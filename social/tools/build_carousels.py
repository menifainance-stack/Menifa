import re, html, os, sys
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import importlib
# usage: python3 build_carousels.py <content_module> <out_dir> [day numbers...]
CONTENT = sys.argv[1] if len(sys.argv) > 1 else "content_2026_10"
MOD = importlib.import_module(CONTENT); C = MOD.C
STYLE = getattr(MOD, "STYLE", "themes")  # "templates" → rotate the 20 skins in templates.py
import templates as TPL

FONT = os.environ.get("FONTSOURCE_DIR", os.path.join(HERE, "node_modules/@fontsource"))  # npm i @fontsource/heebo @fontsource/secular-one
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, "out")
BRAND, SITE = "מניפה פיננסית", "menifa.org"

THEMES = [
 dict(bg="#0B1F2A", ink="#F4F8F7", acc="#FFD23F", acc_ink="#0B1F2A", soft="#15344A", alt="#2EC4A6"),
 dict(bg="#0E2B25", ink="#F4F8F7", acc="#2EE6B8", acc_ink="#082019", soft="#17463B", alt="#FFD23F"),
 dict(bg="#1A1440", ink="#F6F4FF", acc="#FF7A59", acc_ink="#1A1440", soft="#2B2462", alt="#FFD23F"),
]
NOISE = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .07 0'/></filter><rect width='300' height='300' filter='url(%23n)'/></svg>\")"
ICONS = {
 "save": '<svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>',
 "dm": '<svg viewBox="0 0 24 24"><path d="M21 3 3 10.5l7 2.5 2.5 7z M10 13l5-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>',
 "chat": '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>',
 "arrow": '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
 "warn": '<svg viewBox="0 0 24 24"><path d="M12 3 2 20h20z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M12 10v4M12 17v.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
}
def ff(name, fam, w, sub):
    return f"@font-face{{font-family:{fam};font-weight:{w};src:url(file://{FONT}/{name}/files/{name}-{sub}-{w}-normal.woff2){';unicode-range:U+0000-00FF,U+20AA' if sub=='latin' else ''}}}"
FONTS = "".join(ff("secular-one","Sec",400,s) for s in ("hebrew","latin")) + "".join(ff("heebo","Heb",w,s) for w in (400,700,900) for s in ("hebrew","latin"))

CSS = FONTS + f"""
*{{box-sizing:border-box;margin:0;padding:0}} body{{direction:rtl;background:#444}}
.s{{width:1080px;height:1350px;position:relative;overflow:hidden;background:var(--bg);color:var(--ink);font-family:Heb,sans-serif;padding:110px 88px 130px;display:flex;flex-direction:column}}
.s::after{{content:"";position:absolute;inset:0;background:{NOISE};pointer-events:none;mix-blend-mode:overlay}}
mark{{background:linear-gradient(transparent 18%,var(--acc) 18%,var(--acc) 88%,transparent 88%);color:var(--acc_ink);padding:0 .12em;-webkit-box-decoration-break:clone;box-decoration-break:clone}}
.prog{{position:absolute;top:44px;right:88px;left:88px;display:flex;gap:10px;z-index:2}}
.prog i{{flex:1;height:8px;border-radius:4px;background:var(--soft)}} .prog i.on{{background:var(--acc)}}
.foot{{position:absolute;bottom:52px;right:88px;left:88px;display:flex;justify-content:space-between;align-items:center;font-size:30px;font-weight:700;z-index:2}}
.foot .sw{{display:flex;align-items:center;gap:10px;color:var(--acc)}} .foot svg{{width:40px;height:40px}}
.tag{{align-self:flex-start;background:var(--ink);color:var(--bg);font-weight:900;font-size:32px;padding:8px 24px;border-radius:999px}}
.sticker{{position:absolute;left:70px;bottom:150px;transform:rotate(-8deg);background:var(--acc);color:var(--acc_ink);font-family:Sec;font-size:46px;padding:14px 30px;border-radius:18px;box-shadow:8px 8px 0 rgba(0,0,0,.35);display:flex;gap:10px;align-items:center;z-index:3}}
.sticker svg{{width:46px;height:46px}}
h1{{font-family:Sec;font-weight:400;line-height:1.04;text-wrap:balance;position:relative;z-index:2}}
/* num */
.k-num .big{{font-family:Sec;line-height:.85;color:var(--acc);margin-top:24px;white-space:nowrap;text-shadow:10px 10px 0 var(--soft)}}
.k-num h1{{font-size:104px;margin-top:auto;margin-bottom:120px}}
/* tape */
.tape{{position:absolute;left:-80px;right:-80px;height:110px;background:repeating-linear-gradient(-45deg,var(--acc) 0 60px,#111 60px 120px);display:flex;align-items:center;justify-content:center;z-index:1}}
.tape span{{background:#111;color:var(--acc);font-family:Sec;font-size:54px;padding:0 34px;display:flex;gap:14px;align-items:center}}
.tape span svg{{width:52px;height:52px}}
.k-tape .t1{{top:170px;transform:rotate(-6deg)}} .k-tape .t2{{bottom:250px;transform:rotate(4deg);opacity:.9}}
.k-tape h1{{font-size:128px;margin-block:auto}}
/* bubble */
.chat{{margin-top:70px;display:flex;flex-direction:column;gap:14px;align-items:flex-start;position:relative;z-index:2}}
.who{{display:flex;align-items:center;gap:16px;font-size:34px;font-weight:700;opacity:.8}}
.who i{{width:62px;height:62px;border-radius:50%;background:var(--alt);display:flex;align-items:center;justify-content:center;font-style:normal;color:#0B1F2A;font-weight:900;font-size:32px}}
.bub{{background:#ECEFF1;color:#111;font-size:58px;font-weight:700;line-height:1.25;padding:30px 40px;border-radius:44px 44px 44px 10px;max-width:880px;box-shadow:0 18px 40px rgba(0,0,0,.35)}}
.seen{{font-size:28px;opacity:.6;margin-inline-start:20px}}
.k-bubble h1{{font-size:112px;margin-top:auto;margin-bottom:120px}}
/* strike */
.q{{margin-top:90px;font-family:Sec;font-size:96px;line-height:1.1;color:var(--ink);opacity:.55;position:relative;align-self:flex-start;z-index:2}}
.q::after{{content:"";position:absolute;right:-20px;left:-20px;top:52%;height:18px;background:#FF4B55;transform:rotate(-3deg);border-radius:9px}}
.k-strike h1{{font-size:128px;margin-top:auto;margin-bottom:120px}}
/* content */
.num{{position:absolute;left:-40px;bottom:-130px;font-family:Sec;font-size:640px;line-height:1;color:var(--soft)}}
.corner{{position:absolute;left:-160px;top:-160px;width:360px;height:360px;border:30px solid var(--acc);border-radius:50%}}
.blocks{{margin-block:auto;display:flex;flex-direction:column;gap:56px;position:relative;z-index:2}}
.blk .h{{display:inline-block;font-family:Sec;font-size:72px;line-height:1.1;color:var(--acc_ink);background:var(--acc);padding:8px 28px 12px;border-radius:18px;margin-bottom:30px;transform:rotate(-1.5deg)}}
.blk .h.badge{{width:124px;height:124px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:72px;padding:0;transform:none}}
.blk p{{font-size:76px;line-height:1.25;font-weight:700;text-wrap:pretty}} .blk p b{{color:var(--acc);font-weight:900}}
.blk.long p{{font-size:64px}} .blk.xl p{{font-size:54px}}
.blk.xxl p{{font-family:Sec;font-weight:400;font-size:116px;line-height:1.1}} .blk.xxl p b{{font-weight:400}}
.blk.bad .h{{background:#FF4B55;color:#fff;text-decoration:line-through;text-decoration-thickness:6px}}
.blk.good .h{{background:var(--alt);color:#0B1F2A}} .blk.bad p{{opacity:.6}}
/* cta */
.cta{{background:var(--acc);color:var(--acc_ink)}} .cta::after{{mix-blend-mode:multiply;opacity:.5}}
.cta .prog i{{background:rgba(0,0,0,.15)}} .cta .prog i.on{{background:var(--acc_ink)}}
.cta h2{{font-family:Sec;font-weight:400;font-size:132px;line-height:1;margin-top:70px}}
.cta .sub{{font-size:46px;font-weight:700;margin-top:26px}}
.cta ul{{list-style:none;margin-top:auto;margin-bottom:40px;display:flex;flex-direction:column;gap:26px}}
.cta li{{display:flex;align-items:center;gap:30px;background:var(--acc_ink);color:var(--acc);border-radius:28px;padding:28px 36px;font-size:50px;font-weight:900}}
.cta li svg{{width:70px;height:70px;flex:none}} .cta li span{{color:#fff}}
"""
e = html.escape
def rich(s): return re.sub(r"\*(.+?)\*", r"<mark>\1</mark>", e(s))
def prog(i, n): return '<div class="prog">' + "".join(f'<i class="{"on" if k<=i else ""}"></i>' for k in range(n)) + "</div>"
def foot(last=False):
    sw = "" if last else '<span class="sw">החליקו ' + ICONS["arrow"] + "</span>"
    return f'<div class="foot"><span>{BRAND} · {SITE}</span>{sw}</div>'
STICK = f'<div class="sticker">החליקו {ICONS["arrow"]}</div>'

def hook(d, n):
    k, t = d["h"], d["t"]
    if k == "num":
        m = re.match(r"^(\d[\d/,%]*(?:\s*שקל)?)[.]?\s+(.*)$", t)
        num, rest = (m.group(1), m.group(2)) if m else ("", t)
        size = 460 if len(num) <= 2 else (300 if len(num) <= 4 else 200)
        body = f'<div class="tag">{e(d["cat"])}</div><div class="big" style="font-size:{size}px">{e(num)}</div><h1>{rich(rest)}</h1>'
    elif k == "tape":
        tp = f'<span>{ICONS["warn"]} עצרו רגע</span>'
        body = f'<div class="tape t1">{tp}</div><div class="tag" style="position:relative;z-index:2;margin-top:230px">{e(d["cat"])}</div><h1>{rich(t)}</h1>'
    elif k == "bubble":
        body = (f'<div class="tag">{e(d["cat"])}</div><div class="chat"><div class="who"><i>{e(d["who"][0])}</i>{e(d["who"])}</div>'
                f'<div class="bub">{e(d["bub"])}</div><div class="seen">נקרא ✓✓</div></div><h1>{rich(t)}</h1>')
    else:
        body = f'<div class="tag">{e(d["cat"])}</div><div class="q">"{e(d["q"])}"</div><h1>{rich(t)}</h1>'
    return f'<div class="s k-{k}">{prog(0,n)}{body}{STICK}{foot()}</div>'

def content(txt, i, n):
    lines = txt.split("\n"); size = "xxl" if len(txt) < 42 and len(lines) == 1 else ("" if len(txt) < 95 else ("long" if len(txt) < 150 else "xl"))
    out = []
    for line in lines:
        h, _, b = line.partition("|")
        if not b: h, b = "", h
        kind = "bad" if (h == "מיתוס" and len(lines) > 1) else ("good" if (h == "אמת" and len(lines) > 1) else "")
        badge = " badge" if re.fullmatch(r"\d{1,2}", h) else ""
        hh = f'<span class="h{badge}">{e(h)}</span>' if h else ""
        m = re.match(r"^(.+?[.?!:])\s+(.+)$", b, re.S)
        body = f"<b>{e(m.group(1))}</b> {e(m.group(2))}" if (m and kind != "bad") else e(b)
        out.append(f'<div class="blk {size} {kind}">{hh}<p>{body}</p></div>')
    return f'<div class="s"><div class="corner"></div><div class="num">{i:02d}</div>{prog(i,n)}<div class="blocks">{"".join(out)}</div>{foot()}</div>'

def cta(d, n):
    lis = (f'<li>{ICONS["save"]}<div>שמרו לפני שזה נקבר בפיד</div></li>'
           f'<li>{ICONS["chat"]}<div>כתבו בתגובות <span>"{e(d["kw"])}"</span></div></li>'
           f'<li>{ICONS["dm"]}<div>שלחו למי שקונה דירה</div></li>')
    return f'<div class="s cta">{prog(n-1,n)}<h2>אהבתם? אל תלכו עדיין</h2><div class="sub">כותבים את המילה, ואני שולח לכם בפרטי בדיקה אישית בחינם</div><ul>{lis}</ul>{foot(True)}</div>'

SEO = {"בנקים":"משכנתא מול הבנק","משא ומתן":"משא ומתן על משכנתא","אותיות קטנות":"אישור משכנתא","מיתוסים":"מיתוסים על משכנתא",
 "מתמטיקה":"תקופת משכנתא","רכישה":"קניית דירה ומשכנתא","סירוב":"סירוב משכנתא","הון עצמי":"הון עצמי למשכנתא","עלויות":"עלויות קניית דירה",
 "מדד":"משכנתא צמודה למדד","ביטוח":"ביטוח משכנתא","מחזור":"מחזור משכנתא","הלוואות":"איחוד הלוואות","יחס החזר":"יחס החזר משכנתא",
 "דפי חשבון":"בקשת משכנתא","עצמאים":"משכנתא לעצמאים","דירה ראשונה":"משכנתא לדירה ראשונה","תמהיל":"תמהיל משכנתא","קבלן":"משכנתא לדירה מקבלן",
 "ייעוץ":"יועץ משכנתאות","כסף":"הון עצמי לדירה","זכאות":"משכנתא בזכאות","הורים":"עזרה מההורים לדירה","אשראי":"דירוג אשראי למשכנתא",
 "מילון":"מושגי משכנתא","משפרי דיור":"משפרי דיור משכנתא"}

def seo_line(d):
    # first caption line = search keyword + title (Instagram ranks keyword search on the first lines)
    return f"{d.get('seo') or SEO.get(d['cat'], 'משכנתא')} | {d['t'].replace('*', '')}"

def caption(d):
    return (f"{seo_line(d)}\n\n" f"{d['cap']}\n\n💬 כתבו \"{d['kw']}\" בתגובות ואשלח לכם בפרטי\n📌 שמרו לפעם הבאה שאתם מדברים עם הבנק\n\n"
            f"תמיר | יועץ משכנתאות · מניפה פיננסית\n\n#משכנתא #יועץמשכנתאות #נדלן {d['tag']}")

if __name__ == "__main__":
    only = [int(x) for x in sys.argv[3:]]
    os.makedirs(OUT, exist_ok=True)
    allcap = []
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={"width": 1080, "height": 1350})
        for day, d in enumerate(C, 1):
            if only and day not in only: continue
            skin = ""
            if STYLE == "templates" or "tpl" in d:
                t = TPL.pick(d.get("tpl"), day); th, skin = t["vars"], t["css"]
            else:
                th = THEMES[(day - 1) % 3]
            n = len(d["s"]) + 2
            slides = [hook(d, n)] + [content(s, i + 1, n) for i, s in enumerate(d["s"])] + [cta(d, n)]
            doc = f'<html><head><meta charset="utf-8"><style>:root{{{";".join(f"--{k}:{v}" for k,v in th.items())}}}{CSS}{skin}</style></head><body>{"".join(slides)}</body></html>'
            open(os.path.join(OUT, "_tmp.html"), "w").write(doc)
            pg.goto("file://" + os.path.join(OUT, "_tmp.html")); pg.evaluate("document.fonts.ready"); pg.wait_for_timeout(120)
            folder = f"{OUT}/day{day:02d}"; os.makedirs(folder, exist_ok=True)
            for k, el in enumerate(pg.query_selector_all(".s"), 1):
                el.screenshot(path=f"{folder}/{k:02d}.jpg", type="jpeg", quality=92)
            cp = caption(d); open(f"{folder}/caption.txt", "w").write(cp)
            allcap.append(f"=== יום {day:02d}: {d['t'].replace('*','')} ===\n{cp}\n")
        b.close()
    if not only: open(f"{OUT}/captions_all.txt", "w").write("\n".join(allcap))
    print("ok")
