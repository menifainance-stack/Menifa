"""לוחות סילוקין (שפיצר) למסלולי המשכנתא הישראליים."""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum


class TrackType(str, Enum):
    FIXED_UNLINKED = "קל\"צ"          # קבועה לא צמודה
    FIXED_LINKED = "ק\"צ"             # קבועה צמודה למדד
    PRIME = "פריים"                   # P + מרווח (משתנה כל חודש, לא צמודה)
    VARIABLE_LINKED = "משתנה צמודה"    # משתנה כל N שנים, צמודה
    VARIABLE_UNLINKED = "משתנה לא צמודה"

    @property
    def linked(self) -> bool:
        return self in (TrackType.FIXED_LINKED, TrackType.VARIABLE_LINKED)

    @property
    def fixed(self) -> bool:
        return self in (TrackType.FIXED_UNLINKED, TrackType.FIXED_LINKED)


@dataclass
class Assumptions:
    """הנחות מאקרו. ברירות המחדל מ-DATA_SOURCE_OF_TRUTH.md (10/09/2026)."""
    boi_rate: float = 0.0325          # ריבית בנק ישראל
    prime_spread: float = 0.015       # פריים = ב"י + 1.5%
    annual_cpi: float = 0.022         # תחזית אינפלציה שנתית
    # מסלול משתנה: שינוי הריבית בנקודת העדכון (0 = נשארת). חיובי = עלייה.
    variable_reset_delta: float = 0.0

    @property
    def prime(self) -> float:
        return self.boi_rate + self.prime_spread


@dataclass
class Track:
    kind: TrackType
    principal: float
    years: int
    rate: float | None = None         # ריבית שנתית נומינלית. בפריים: None → P + spread
    spread: float = 0.0               # לפריים: מרווח מהפריים (שלילי = P-0.5%)
    reset_years: int = 5              # למשתנה: כל כמה שנים נקודת שינוי
    name: str = ""

    def annual_rate(self, a: Assumptions, month: int = 1) -> float:
        if self.kind == TrackType.PRIME:
            return a.prime + self.spread
        if self.rate is None:
            raise ValueError(f"{self.kind.value}: חסרה ריבית")
        if self.kind in (TrackType.VARIABLE_LINKED, TrackType.VARIABLE_UNLINKED):
            resets = (month - 1) // (self.reset_years * 12)
            return self.rate + resets * a.variable_reset_delta
        return self.rate

    @property
    def months(self) -> int:
        return self.years * 12


def shpitzer_payment(principal: float, annual_rate: float, months: int) -> float:
    """תשלום חודשי קבוע (שפיצר). ריבית חודשית = שנתית/12 (נומינלית, כמקובל בבנקים בישראל)."""
    if months <= 0:
        return 0.0
    r = annual_rate / 12
    if abs(r) < 1e-12:
        return principal / months
    return principal * r / (1 - (1 + r) ** -months)


@dataclass
class Row:
    month: int
    payment: float          # תשלום נומינלי בפועל (אחרי הצמדה)
    principal: float
    interest: float
    balance: float          # יתרה נומינלית אחרי התשלום (כולל הצמדה)
    rate: float             # ריבית שנתית שחלה בחודש


@dataclass
class Schedule:
    track: Track
    rows: list[Row] = field(default_factory=list)

    @property
    def total_paid(self) -> float:
        return sum(r.payment for r in self.rows)

    @property
    def total_interest(self) -> float:
        return sum(r.interest for r in self.rows)

    @property
    def first_payment(self) -> float:
        return self.rows[0].payment if self.rows else 0.0

    @property
    def max_payment(self) -> float:
        return max((r.payment for r in self.rows), default=0.0)

    def balance_at(self, month: int) -> float:
        """יתרה אחרי `month` תשלומים (0 = יתרת פתיחה)."""
        if month <= 0:
            return self.track.principal
        if month >= len(self.rows):
            return 0.0
        return self.rows[month - 1].balance


def amortize(track: Track, a: Assumptions | None = None) -> Schedule:
    """
    לוח שפיצר מלא. במסלולים צמודים היתרה והתשלום מוצמדים חודש-חודש לפי
    (1+annual_cpi)^(1/12). בפריים/משתנה התשלום מחושב מחדש בכל שינוי ריבית על היתרה הנותרת.
    """
    a = a or Assumptions()
    sched = Schedule(track)
    balance = float(track.principal)
    monthly_cpi = (1 + a.annual_cpi) ** (1 / 12) - 1 if track.kind.linked else 0.0
    months = track.months
    current_rate = None
    payment_real = 0.0  # תשלום "ריאלי" קבוע (לפני הצמדה) — מוצמד יחד עם היתרה

    for m in range(1, months + 1):
        rate = track.annual_rate(a, m)
        if rate != current_rate:
            # נקודת שינוי ריבית (או חודש 1): חישוב תשלום מחדש על היתרה לתקופה הנותרת
            current_rate = rate
            payment_real = shpitzer_payment(balance, rate, months - m + 1)
        # הצמדה: היתרה והתשלום גדלים באותו שיעור
        if monthly_cpi:
            balance *= 1 + monthly_cpi
            payment_real *= 1 + monthly_cpi
        interest = balance * rate / 12
        principal_part = payment_real - interest
        if m == months:  # סגירת עיגולים
            principal_part = balance
            payment_real = principal_part + interest
        balance -= principal_part
        sched.rows.append(Row(m, payment_real, principal_part, interest, max(balance, 0.0), rate))
    return sched


@dataclass
class Mortgage:
    tracks: list[Track]
    assumptions: Assumptions = field(default_factory=Assumptions)
    name: str = ""

    @property
    def principal(self) -> float:
        return sum(t.principal for t in self.tracks)

    def schedules(self) -> list[Schedule]:
        return [amortize(t, self.assumptions) for t in self.tracks]

    def monthly_payments(self) -> list[float]:
        """תשלום כולל לכל חודש (סכום המסלולים; מסלול שנגמר תורם 0)."""
        scheds = self.schedules()
        n = max(len(s.rows) for s in scheds)
        return [sum(s.rows[m].payment for s in scheds if m < len(s.rows)) for m in range(n)]

    def summary(self) -> dict:
        scheds = self.schedules()
        pays = self.monthly_payments()
        return {
            "principal": round(self.principal),
            "first_payment": round(pays[0]),
            "max_payment": round(max(pays)),
            "total_paid": round(sum(pays)),
            "total_interest_and_linkage": round(sum(pays) - self.principal),
            "years": max(t.years for t in self.tracks),
            "tracks": [
                {"name": t.name or t.kind.value, "kind": t.kind.value, "principal": round(t.principal), "years": t.years,
                 "rate": round(t.annual_rate(self.assumptions) * 100, 3), "first_payment": round(s.first_payment),
                 "total_paid": round(s.total_paid)}
                for t, s in zip(self.tracks, scheds)
            ],
        }
