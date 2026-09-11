"""
menifa mortgage engine — מנוע חישוב משכנתא ישראלי.

מסלולים: קל"צ (קבועה לא צמודה), ק"צ (קבועה צמודה למדד), פריים (P + מרווח),
משתנה (צמודה / לא צמודה, נקודת שינוי כל N שנים). לוח שפיצר. הצמדה למדד לפי תחזית
אינפלציה שנתית. עמלות פירעון מוקדם לפי צו הבנקאות (פירעון מוקדם של הלוואה לדיור), תשס"ב-2002
— כאומדן, לא כתחליף לדף הפירעון של הבנק.

    from mortgage_engine import Track, TrackType, Mortgage, refinance_report
"""
from .core import (  # noqa: F401
    Track, TrackType, Mortgage, Schedule, Assumptions,
    shpitzer_payment, amortize,
)
from .fees import EarlyRepaymentFees, early_repayment_fee  # noqa: F401
from .refinance import RefinanceResult, compare_refinance, refinance_report  # noqa: F401

__version__ = "0.1.0"
