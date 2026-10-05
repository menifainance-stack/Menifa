"""20 carousel design templates ("skins") layered on top of build_carousels.CSS.

Each template = colour variables + extra CSS. Skins never touch the CTA slide's
structure, only its colours, so every template keeps the same proven slide flow
(hook → content → CTA). Select per day with d["tpl"] = <index or name>, or let
the builder rotate through them when the content module sets STYLE = "templates".
"""

def V(bg, ink, acc, acc_ink, soft, alt):
    return dict(bg=bg, ink=ink, acc=acc, acc_ink=acc_ink, soft=soft, alt=alt)

# CTA buttons on templates whose acc_ink is light need a coloured keyword (white-on-white otherwise)
LIGHT_CTA = " .cta li span{color:var(--alt)}"

TEMPLATES = [
 # 1 ─ עיתון כלכלי
 dict(name="עיתון כלכלי", vars=V("#F2ECDD", "#141414", "#FFD84D", "#141414", "#DDD3BD", "#B3261E"), css="""
 .s:not(.cta){border:18px double #141414}
 .s:not(.cta)::before{content:"מהדורה מיוחדת · כלכלה ונדל״ן";position:absolute;top:70px;right:88px;left:88px;border-bottom:4px solid #141414;padding-bottom:10px;font-weight:900;font-size:30px;letter-spacing:.04em;z-index:2}
 .prog{top:24px} .tag{background:#B3261E;color:#fff;border-radius:0} h1{letter-spacing:-.01em}
 .blk .h{border-radius:0;transform:none;background:#141414;color:#F2ECDD} .corner{display:none}
 .blk p{column-rule:2px solid #141414}"""),
 # 2 ─ מחברת
 dict(name="מחברת", vars=V("#FFFDF5", "#1E2A44", "#FFF06A", "#1E2A44", "#E3E8F2", "#E5484D"), css="""
 .s:not(.cta){background:repeating-linear-gradient(#FFFDF5 0 62px,#BFD3F2 62px 64px),#FFFDF5}
 .s:not(.cta)::before{content:"";position:absolute;top:0;bottom:0;right:64px;width:4px;background:#E5484D;opacity:.7}
 .blk .h{transform:rotate(-2deg);box-shadow:4px 4px 0 rgba(0,0,0,.12)} .corner{border-color:#E5484D;opacity:.35}
 .num{color:#E9EEF7} .tag{background:#1E2A44;color:#FFFDF5}
 .k-num .big{color:#1E2A44;text-shadow:10px 10px 0 #FFF06A}"""),
 # 3 ─ קבלה
 dict(name="קבלה", vars=V("#FFFDF7", "#222", "#222", "#FFFDF7", "#ECE7DA", "#C0392B"), css="""
 .s:not(.cta){background:linear-gradient(90deg,#CFC8BA 0 54px,#FFFDF7 54px calc(100% - 54px),#CFC8BA calc(100% - 54px))}
 .s:not(.cta)::before{content:"";position:absolute;inset:0 54px;border-inline:3px dashed #BDB5A4;pointer-events:none}
 .blk{border-bottom:3px dashed #BDB5A4;padding-bottom:36px} .blk:last-child{border:0}
 .blk .h{border-radius:0;transform:none} .corner{display:none} .num{color:#F1ECE0}
 .tag{border-radius:0;background:#C0392B;color:#fff}"""),
 # 4 ─ ניאון
 dict(name="ניאון", vars=V("#07060F", "#F7F2FF", "#FF2E88", "#07060F", "#1B1530", "#21F0FF"), css="""
 h1,.big,.cta h2{text-shadow:0 0 18px rgba(255,46,136,.75),0 0 42px rgba(255,46,136,.45)}
 .blk .h{box-shadow:0 0 30px rgba(255,46,136,.8)} .blk p b{color:#21F0FF;text-shadow:0 0 16px rgba(33,240,255,.7)}
 .corner{border-color:#21F0FF;box-shadow:0 0 40px #21F0FF} .tag{background:#21F0FF;color:#07060F}"""),
 # 5 ─ ברוטליסטי
 dict(name="ברוטליסטי", vars=V("#FFE600", "#000", "#000", "#FFE600", "#F2D500", "#FF3B30"), css="""
 .s:not(.cta){border:16px solid #000}
 .blk .h{border-radius:0;transform:none;box-shadow:12px 12px 0 #FF3B30} .blk p b{color:#FF3B30}
 .tag{border-radius:0;box-shadow:8px 8px 0 #FF3B30} .sticker{border-radius:0;border:6px solid #000;background:#fff;color:#000}
 .corner{border-radius:0;border-color:#000} .k-num .big{color:#000;text-shadow:14px 14px 0 #FF3B30}"""),
 # 6 ─ מינימל לבן
 dict(name="מינימל לבן", vars=V("#FAFAF7", "#111", "#111", "#FAFAF7", "#ECECE6", "#2E7D5B"), css="""
 .s::after{display:none} mark{background:none;color:#111;border-bottom:12px solid #2E7D5B;padding:0}
 .blk .h{background:none;color:#2E7D5B;padding:0;transform:none;font-size:56px} .blk p b{color:#111}
 .corner{display:none} .num{color:#F0F0EA} .tag{background:none;color:#111;border:3px solid #111}
 .sticker{background:#111;color:#FAFAF7;transform:none;box-shadow:none} .k-num .big{color:#111;text-shadow:none}"""),
 # 7 ─ דף בנק
 dict(name="דף בנק", vars=V("#F4F6FA", "#14213D", "#E63946", "#fff", "#DCE3EE", "#2A6FDB"), css="""
 .s:not(.cta){background:linear-gradient(#14213D 0 150px,#F4F6FA 150px)}
 .s:not(.cta)::before{content:"פירוט תנועות · חשבון עו״ש";position:absolute;top:84px;right:88px;color:#fff;font-weight:900;font-size:32px;z-index:2}
 .prog{top:30px} .prog i{background:#2B3A5E} .tag{margin-top:40px;background:#2A6FDB;color:#fff;border-radius:8px}
 .blk{background:#fff;border-radius:16px;padding:30px 36px;box-shadow:0 6px 0 #DCE3EE;border-right:12px solid #E63946}
 .blk .h{border-radius:8px;transform:none} .corner{display:none} .num{color:#E6EBF3}"""),
 # 8 ─ טרמינל
 dict(name="טרמינל", vars=V("#0A0F0A", "#B8FFC8", "#33FF66", "#0A0F0A", "#14301C", "#FFD23F"), css="""
 .s:not(.cta){background:repeating-linear-gradient(#0A0F0A 0 3px,#0D140D 3px 6px)}
 .blk .h{border-radius:0;transform:none} .blk .h::before{content:"> "} .blk p b{color:#33FF66}
 h1::after{content:"▌";color:#33FF66;margin-inline-start:10px} .tag{border-radius:0;background:#33FF66;color:#0A0F0A}
 .corner{border-radius:0;border-width:6px} .num{color:#102114}"""),
 # 9 ─ אקסל
 dict(name="אקסל", vars=V("#FFFFFF", "#1D1D1D", "#107C41", "#fff", "#E8F3EC", "#C42B1C"), css="""
 .s:not(.cta){background:linear-gradient(#107C41 0 96px,transparent 96px),repeating-linear-gradient(90deg,transparent 0 179px,#D9D9D9 179px 180px),repeating-linear-gradient(transparent 0 89px,#D9D9D9 89px 90px),#fff}
 .prog{top:40px} .prog i{background:#0B5C30} .prog i.on{background:#fff}
 .blk{background:#fff;border:3px solid #107C41;padding:26px 32px} .blk .h{border-radius:0;transform:none}
 .tag{border-radius:0;background:#107C41;color:#fff;margin-top:20px} .corner{display:none} .num{color:#EEF5F0}"""),
 # 10 ─ פתקים על שעם
 dict(name="פתקים", vars=V("#B98A5A", "#2B1D0E", "#FFE45C", "#2B1D0E", "#A97B4C", "#FF6F91"), css="""
 .s:not(.cta){background:radial-gradient(#A37446 1.5px,transparent 2px) 0 0/22px 22px,#B98A5A}
 .blk{background:#FFF3A3;color:#2B1D0E;padding:34px 40px;box-shadow:10px 14px 0 rgba(0,0,0,.25);transform:rotate(-1.2deg)}
 .blk:nth-child(2){background:#FFD1DC;transform:rotate(1.4deg)} .blk p b{color:#B3261E}
 .k-num h1,.k-tape h1,.k-bubble h1,.k-strike h1{background:#FFF3A3;padding:30px 36px;box-shadow:10px 14px 0 rgba(0,0,0,.25);transform:rotate(-1deg)}
 .tag{background:#2B1D0E;color:#FFF3A3} .corner{display:none} .num{color:#A97B4C}"""),
 # 11 ─ לוח גיר
 dict(name="לוח גיר", vars=V("#24332B", "#EEF2EC", "#F7E27A", "#24332B", "#2F4237", "#9FD8F2"), css="""
 .s:not(.cta){box-shadow:inset 0 0 0 28px #6B4A2B,inset 0 0 0 32px #3E2A17}
 h1,.blk p{text-shadow:0 0 2px rgba(255,255,255,.5)} mark{background:none;color:#F7E27A;border-bottom:6px dashed #F7E27A}
 .blk .h{background:none;border:5px dashed #F7E27A;color:#F7E27A} .blk p b{color:#9FD8F2}
 .corner{border-style:dashed;opacity:.5}"""),
 # 12 ─ רטרו 80
 dict(name="רטרו 80", vars=V("#2B0F54", "#FFF4E8", "#FF6EC7", "#2B0F54", "#3F1A72", "#FFB627"), css="""
 .s:not(.cta){background:linear-gradient(180deg,#2B0F54 0%,#5B1A7A 55%,#C2367A 100%)}
 .s:not(.cta)::before{content:"";position:absolute;left:50%;bottom:-260px;width:620px;height:620px;margin-left:-310px;border-radius:50%;background:repeating-linear-gradient(#FFB627 0 34px,transparent 34px 46px);opacity:.35}
 h1,.big{color:#FFF4E8;text-shadow:6px 6px 0 #FF6EC7} .blk .h{background:#FFB627;color:#2B0F54} .blk p b{color:#FFB627}
 .corner{border-color:#FFB627}"""),
 # 13 ─ שרטוט
 dict(name="שרטוט", vars=V("#0D3B66", "#F1F6FB", "#FFD166", "#0D3B66", "#154C80", "#7BDFF2"), css="""
 .s:not(.cta){background:repeating-linear-gradient(90deg,rgba(255,255,255,.08) 0 2px,transparent 2px 60px),repeating-linear-gradient(rgba(255,255,255,.08) 0 2px,transparent 2px 60px),#0D3B66}
 .blk{border:3px solid rgba(255,255,255,.55);padding:30px 36px;position:relative}
 .blk .h{border-radius:0;transform:none} .tag{border-radius:0} .corner{border-radius:0;border-width:4px;border-style:dashed}"""),
 # 14 ─ יוקרה שחור-זהב
 dict(name="יוקרה", vars=V("#0B0B0C", "#F3EEE6", "#C9A96E", "#0B0B0C", "#1A1A1C", "#E8D5A8"), css="""
 .s:not(.cta)::before{content:"";position:absolute;inset:40px;border:2px solid #C9A96E;pointer-events:none}
 mark{background:none;color:#C9A96E;padding:0} .blk .h{background:none;color:#C9A96E;border-bottom:3px solid #C9A96E;border-radius:0;transform:none;padding:0 0 8px}
 .tag{background:none;border:2px solid #C9A96E;color:#C9A96E} .k-num .big{text-shadow:none}
 .corner{display:none} .num{color:#151517}"""),
 # 15 ─ קומיקס
 dict(name="קומיקס", vars=V("#FFF2CC", "#111", "#FF3B3B", "#fff", "#FFE29A", "#2D7FF9"), css="""
 .s:not(.cta){background:radial-gradient(#F5C04A 3px,transparent 3.5px) 0 0/26px 26px,#FFF2CC}
 h1{-webkit-text-stroke:3px #111;color:#fff;text-shadow:8px 8px 0 #111;paint-order:stroke fill}
 mark{background:#FF3B3B;color:#fff;-webkit-text-stroke:0}
 .blk{background:#fff;border:6px solid #111;border-radius:40px;padding:30px 38px;box-shadow:10px 10px 0 #111}
 .blk .h{border:5px solid #111} .tag{border:5px solid #111;background:#2D7FF9;color:#fff} .corner{display:none}"""),
 # 16 ─ אזהרה אדומה
 dict(name="אזהרה", vars=V("#C8102E", "#FFFFFF", "#FFE600", "#111", "#A60D26", "#111"), css="""
 .s:not(.cta)::before{content:"";position:absolute;top:0;left:0;right:0;height:26px;background:repeating-linear-gradient(-45deg,#FFE600 0 26px,#111 26px 52px)}
 .s:not(.cta){box-shadow:inset 0 -26px 0 #111} .blk p b{color:#FFE600}
 .tag{background:#FFE600;color:#111} .corner{border-color:#FFE600}"""),
 # 17 ─ פסטל זכוכית
 dict(name="פסטל זכוכית", vars=V("#FFD9C7", "#1B1B3A", "#6C4CF1", "#fff", "#F7C6D9", "#FF7A59"), css="""
 .s:not(.cta){background:radial-gradient(circle at 15% 20%,#FFC2D4 0,transparent 45%),radial-gradient(circle at 85% 80%,#BFD7FF 0,transparent 50%),linear-gradient(135deg,#FFE3D3,#E6DBFF)}
 .blk{background:rgba(255,255,255,.55);border:2px solid rgba(255,255,255,.9);border-radius:36px;padding:32px 38px;box-shadow:0 20px 50px rgba(80,60,160,.18)}
 .blk .h{transform:none;border-radius:999px} .blk p b{color:#6C4CF1} .corner{border-color:#fff} .num{color:rgba(255,255,255,.55)}"""),
 # 18 ─ פולארויד
 dict(name="פולארויד", vars=V("#E9E1D3", "#2A2622", "#FF8A3D", "#fff", "#DDD2BF", "#3D8B7D"), css="""
 .blocks{background:#fff;padding:44px 44px 120px;box-shadow:0 24px 50px rgba(0,0,0,.25);transform:rotate(-1.5deg)}
 .blocks::after{content:"menifa.org";position:absolute;bottom:34px;right:44px;font-family:Sec;font-size:40px;opacity:.5}
 .blk .h{transform:none} .corner{display:none} .num{color:#DED5C4}"""),
 # 19 ─ מותג מניפה (כחול-זהב)
 dict(name="מותג מניפה", vars=V("#2E363F", "#F6F3EE", "#B89259", "#fff", "#3A444F", "#D9C29A"), css="""
 .s:not(.cta)::before{content:"";position:absolute;top:0;bottom:0;right:0;width:22px;background:#B89259}
 .blk{border-right:6px solid #B89259;padding-right:36px} .blk .h{transform:none;border-radius:12px}
 .blk p b{color:#D9C29A} .tag{background:#B89259;color:#fff} .cta li span{color:#2E363F!important} .corner{border-color:#B89259;opacity:.6}"""),
 # 20 ─ ציוץ / פוסט
 dict(name="ציוץ", vars=V("#E9EEF2", "#0F1419", "#1D9BF0", "#fff", "#D5DEE6", "#F91880"), css="""
 .blk,.k-num h1,.k-tape h1,.k-bubble h1,.k-strike h1{background:#fff;border-radius:32px;padding:34px 40px;box-shadow:0 2px 0 #D5DEE6}
 .blocks::before{content:"תמיר | מניפה פיננסית  ✔︎  @tamirgarame";font-weight:900;font-size:32px;color:#536471}
 .blk .h{transform:none;border-radius:999px} .blk p b{color:#1D9BF0} .tag{background:#1D9BF0;color:#fff}
 .corner{display:none} .num{color:#DDE4EA}"""),
]

for _i in (2, 5, 6, 8, 14, 16, 17, 18, 19):
    TEMPLATES[_i]["css"] += LIGHT_CTA

def pick(key, day):
    """key may be an index, a name, or None (rotate by day)."""
    if isinstance(key, str):
        for t in TEMPLATES:
            if t["name"] == key: return t
    if isinstance(key, int): return TEMPLATES[key % len(TEMPLATES)]
    return TEMPLATES[(day - 1) % len(TEMPLATES)]
