"""Render a 1080x1920 Instagram story (hook + poll question, space left for the poll sticker)."""
import html, os, re, sys
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build_carousels as bc  # reuses fonts, themes, noise

CSS = bc.FONTS + f"""
*{{box-sizing:border-box;margin:0;padding:0}} body{{direction:rtl}}
.st{{width:1080px;height:1920px;position:relative;overflow:hidden;background:var(--bg);color:var(--ink);font-family:Heb,sans-serif;padding:150px 90px 170px;display:flex;flex-direction:column}}
.st::after{{content:"";position:absolute;inset:0;background:{bc.NOISE};pointer-events:none;mix-blend-mode:overlay}}
.pill{{align-self:flex-start;background:var(--acc);color:var(--acc_ink);font-weight:900;font-size:40px;padding:12px 30px;border-radius:999px}}
h1{{font-family:Sec;font-weight:400;font-size:104px;line-height:1.05;margin-top:60px;text-wrap:balance}}
mark{{background:linear-gradient(transparent 18%,var(--acc) 18%,var(--acc) 88%,transparent 88%);color:var(--acc_ink);padding:0 .12em}}
.q{{margin-top:auto;background:var(--ink);color:var(--bg);font-family:Sec;font-size:76px;line-height:1.15;padding:34px 40px;border-radius:36px 36px 36px 8px;text-wrap:balance}}
.slot{{height:330px}}
.foot{{display:flex;justify-content:space-between;align-items:center;font-size:36px;font-weight:700}}
.foot b{{color:var(--acc)}}
"""

def render(content_mod, day_idx, out_path, theme_idx):
    C = __import__(content_mod).C
    d = C[day_idx]
    th = bc.THEMES[theme_idx % 3]
    q = d.get("poll", ("מה דעתכם?", "", ""))[0]
    body = (f'<div class="st"><div class="pill">פוסט חדש בפרופיל 👆</div><h1>{bc.rich(d["t"])}</h1>'
            f'<div class="q">{html.escape(q)}</div><div class="slot"></div>'
            f'<div class="foot"><span>{bc.BRAND} · {bc.SITE}</span><b>לפוסט המלא ←</b></div></div>')
    doc = f'<html><head><meta charset="utf-8"><style>:root{{{";".join(f"--{k}:{v}" for k,v in th.items())}}}{CSS}</style></head><body>{body}</body></html>'
    tmp = out_path + ".html"; open(tmp, "w").write(doc)
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={"width": 1080, "height": 1920})
        pg.goto("file://" + os.path.abspath(tmp)); pg.evaluate("document.fonts.ready"); pg.wait_for_timeout(150)
        pg.query_selector(".st").screenshot(path=out_path, type="jpeg", quality=90); b.close()
    os.remove(tmp)

if __name__ == "__main__":
    render(sys.argv[1], int(sys.argv[2]), sys.argv[3], int(sys.argv[4]))
