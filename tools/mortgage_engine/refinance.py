"""השוואת מחזור: המשכנתא הקיימת מול תמהיל מוצע, כולל עמלות פירעון מוקדם ועלויות מחזור."""
from __future__ import annotations

from dataclasses import dataclass, field

from .core import Mortgage, amortize
from .fees import early_repayment_fee


@dataclass
class RefinanceResult:
    current_remaining_total: float      # כמה עוד ישולם אם לא נוגעים
    proposed_total: float               # כמה ישולם בתמהיל החדש
    fees_total: float                   # עמלות פירעון מוקדם
    other_costs: float                  # שמאי, רישום, עו"ד, שכ"ט ייעוץ וכו'
    current_payment: float
    proposed_payment: float
    details: dict = field(default_factory=dict)

    @property
    def gross_saving(self) -> float:
        return self.current_remaining_total - self.proposed_total

    @property
    def net_saving(self) -> float:
        return self.gross_saving - self.fees_total - self.other_costs

    @property
    def monthly_delta(self) -> float:
        return self.current_payment - self.proposed_payment

    @property
    def breakeven_months(self) -> float | None:
        cost = self.fees_total + self.other_costs
        if self.monthly_delta <= 0:
            return None
        return cost / self.monthly_delta

    def verdict(self) -> str:
        """הפסק-דין בשלוש דרגות, כמו בתסריט הבדיקה של תמיר."""
        if self.net_saving <= 0:
            return "מסודר — אל תיגע"
        if self.net_saving < 15_000 or (self.breakeven_months or 0) > 36:
            return "יש חיסכון קטן — לא בטוח שווה עמלות"
        return "יש פה כסף אמיתי"


def compare_refinance(current: Mortgage, months_elapsed: int, proposed: Mortgage, avg_rates_now: dict[str, float],
                      other_costs: float = 0.0, notice_given: bool = True, repay_day_of_month: int = 20,
                      avg_monthly_cpi_12m: float = 0.0) -> RefinanceResult:
    """
    current       — המשכנתא כפי שנלקחה (סכומים מקוריים, ריביות, שנים).
    months_elapsed— כמה חודשים כבר שולמו.
    proposed      — התמהיל החדש. הקרן שלו צריכה להיות ≈ יתרת הקיימת (+ עלויות אם מגלגלים).
    avg_rates_now — הריבית הממוצעת של ב"י היום לכל מסלול (מפתח = שם המסלול או סוגו).
    """
    cur_scheds = current.schedules()
    remaining_total = 0.0
    current_payment = 0.0
    fees_total = 0.0
    fee_rows = []
    balance_total = 0.0
    for t, s in zip(current.tracks, cur_scheds):
        rows_left = s.rows[months_elapsed:]
        remaining_total += sum(r.payment for r in rows_left)
        if rows_left:
            current_payment += rows_left[0].payment
        bal = s.balance_at(months_elapsed)
        balance_total += bal
        key = t.name if t.name in avg_rates_now else t.kind.value
        avg_now = avg_rates_now.get(key, t.annual_rate(current.assumptions))
        f = early_repayment_fee(t, bal, months_elapsed, avg_now, notice_given=notice_given,
                                repay_day_of_month=repay_day_of_month, avg_monthly_cpi_12m=avg_monthly_cpi_12m)
        fees_total += f.total
        fee_rows.append({"track": t.name or t.kind.value, "balance": round(bal), **f.as_dict()})

    prop_pays = proposed.monthly_payments()
    return RefinanceResult(
        current_remaining_total=remaining_total,
        proposed_total=sum(prop_pays),
        fees_total=fees_total,
        other_costs=other_costs,
        current_payment=current_payment,
        proposed_payment=prop_pays[0] if prop_pays else 0.0,
        details={"balance_now": round(balance_total), "fees": fee_rows, "proposed": proposed.summary()},
    )


def refinance_report(res: RefinanceResult, client_name: str = "") -> str:
    """דוח כדאיות בעמוד אחד (Markdown) — לשליחה ללקוח אחרי שיחת הבדיקה."""
    be = res.breakeven_months
    lines = [
        f"# דוח כדאיות מחזור משכנתא{(' — ' + client_name) if client_name else ''}",
        "",
        f"**פסק דין: {res.verdict()}**",
        "",
        "| | ₪ |", "|---|---:|",
        f"| יתרת המשכנתא היום | {res.details.get('balance_now', 0):,} |",
        f"| תשלום חודשי היום | {res.current_payment:,.0f} |",
        f"| תשלום חודשי מוצע | {res.proposed_payment:,.0f} |",
        f"| שינוי חודשי | {res.monthly_delta:+,.0f} |",
        f"| סה\"כ שישולם אם לא נוגעים | {res.current_remaining_total:,.0f} |",
        f"| סה\"כ בתמהיל המוצע | {res.proposed_total:,.0f} |",
        f"| חיסכון ברוטו | {res.gross_saving:,.0f} |",
        f"| עמלות פירעון מוקדם (אומדן) | {res.fees_total:,.0f} |",
        f"| עלויות נוספות (שמאי, רישום, ייעוץ) | {res.other_costs:,.0f} |",
        f"| **חיסכון נטו** | **{res.net_saving:,.0f}** |",
        f"| החזר השקעה | {f'{be:.0f} חודשים' if be else '—'} |",
        "",
        "## עמלות לפי מסלול (אומדן — דף הפירעון של הבנק קובע)",
        "", "| מסלול | יתרה | תפעולית | אי-הודעה | היוון | מדד | סה\"כ |", "|---|---:|---:|---:|---:|---:|---:|",
    ]
    total_key = 'סה"כ'
    for f in res.details.get("fees", []):
        lines.append(f"| {f['track']} | {f['balance']:,} | {f['תפעולית']:,} | {f['אי-הודעה']:,} | {f['היוון']:,} | {f['מדד']:,} | {f[total_key]:,} |")
    lines += ["", "## התמהיל המוצע", "", "| מסלול | קרן | שנים | ריבית | תשלום ראשון |", "|---|---:|---:|---:|---:|"]
    for t in res.details.get("proposed", {}).get("tracks", []):
        lines.append(f"| {t['name']} | {t['principal']:,} | {t['years']} | {t['rate']}% | {t['first_payment']:,} |")
    lines += ["", "_החישוב מבוסס על הנחות אינפלציה וריבית שיכולות להשתנות. הצמדה למדד חושבה לפי תחזית שנתית קבועה._"]
    return "\n".join(lines)
