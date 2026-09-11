"""
עמלות פירעון מוקדם — אומדן לפי צו הבנקאות (פירעון מוקדם של הלוואה לדיור), תשס"ב-2002.

מקורות (אומתו 11/09/2026 דרך תקצירים; נוסח הצו עצמו חסום מסביבת הפיתוח):
- עמלה תפעולית: עד 60 ₪.
- עמלת אי-הודעה מוקדמת: 0.1% מהסכום הנפרע אם לא ניתנה הודעה 10 ימים מראש.
- עמלת היוון (הפרשי ריבית): ההפרש בין הריבית הממוצעת ביום מתן ההלוואה (או ריבית ההלוואה אם נמוכה ממנה)
  לריבית הממוצעת ביום הפירעון לתקופה הנותרת, מהוון. הנחות: 20% אחרי 3 שנים, 30% אחרי 5 שנים.
  אין עמלת היוון בפריים; במשתנה — אין בנקודת השינוי.
- עמלת מדד ממוצע: במסלול צמוד, בפירעון בין ה-1 ל-15 בחודש: הסכום × מחצית השינוי הממוצע החודשי במדד
  ב-12 החודשים האחרונים.
⚠️ זה אומדן ליועץ. דף הפירעון של הבנק הוא הקובע.
"""
from __future__ import annotations

from dataclasses import dataclass

from .core import Track, TrackType, shpitzer_payment

OPERATIONAL_FEE = 60.0
NO_NOTICE_FEE_RATE = 0.001
DISCOUNT_TIERS = ((5, 0.30), (3, 0.20))  # (שנים מינימום, הנחה)


@dataclass
class EarlyRepaymentFees:
    operational: float
    no_notice: float
    capitalization: float
    index: float

    @property
    def total(self) -> float:
        return self.operational + self.no_notice + self.capitalization + self.index

    def as_dict(self) -> dict:
        return {"תפעולית": round(self.operational), "אי-הודעה": round(self.no_notice),
                "היוון": round(self.capitalization), "מדד": round(self.index), "סה\"כ": round(self.total)}


def _discount(years_elapsed: float) -> float:
    for min_years, disc in DISCOUNT_TIERS:
        if years_elapsed >= min_years:
            return disc
    return 0.0


def capitalization_fee(balance: float, loan_rate: float, avg_rate_at_grant: float | None,
                       avg_rate_now: float, remaining_months: int, years_elapsed: float) -> float:
    """
    עמלת היוון: PV של תשלומי היתרה הנותרת בריבית ההלוואה (או הממוצעת במתן, הנמוכה מביניהן),
    מהוון בריבית הממוצעת היום, פחות היתרה. חיובי רק אם הריבית היום נמוכה יותר.
    """
    if remaining_months <= 0 or balance <= 0:
        return 0.0
    base_rate = loan_rate if avg_rate_at_grant is None else min(loan_rate, avg_rate_at_grant)
    if avg_rate_now >= base_rate:
        return 0.0
    pmt = shpitzer_payment(balance, base_rate, remaining_months)
    r = avg_rate_now / 12
    pv = pmt * (1 - (1 + r) ** -remaining_months) / r if r > 1e-12 else pmt * remaining_months
    fee = max(pv - balance, 0.0)
    return fee * (1 - _discount(years_elapsed))


def early_repayment_fee(track: Track, balance: float, months_elapsed: int, avg_rate_now: float,
                        avg_rate_at_grant: float | None = None, notice_given: bool = True,
                        repay_day_of_month: int = 20, avg_monthly_cpi_12m: float = 0.0,
                        boi_rate_now: float | None = None) -> EarlyRepaymentFees:
    """
    אומדן עמלות לפירעון מלא של מסלול אחד.
    avg_rate_now — הריבית הממוצעת שבנק ישראל מפרסם למסלול ולתקופה הנותרת (להזין ידנית).
    """
    remaining = track.months - months_elapsed
    years_elapsed = months_elapsed / 12
    no_notice = 0.0 if notice_given else balance * NO_NOTICE_FEE_RATE

    cap = 0.0
    if track.kind.fixed:
        cap = capitalization_fee(balance, track.rate or 0.0, avg_rate_at_grant, avg_rate_now, remaining, years_elapsed)
    elif track.kind in (TrackType.VARIABLE_LINKED, TrackType.VARIABLE_UNLINKED):
        at_reset = months_elapsed % (track.reset_years * 12) == 0
        if not at_reset:
            months_to_reset = track.reset_years * 12 - months_elapsed % (track.reset_years * 12)
            cap = capitalization_fee(balance, track.rate or 0.0, avg_rate_at_grant, avg_rate_now, months_to_reset, years_elapsed)
    # פריים: אין עמלת היוון

    index = 0.0
    if track.kind.linked and 1 <= repay_day_of_month <= 15:
        index = balance * (avg_monthly_cpi_12m / 2)

    return EarlyRepaymentFees(OPERATIONAL_FEE if balance > 0 else 0.0, no_notice, cap, index)
