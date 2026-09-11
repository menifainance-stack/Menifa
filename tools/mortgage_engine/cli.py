#!/usr/bin/env python3
"""
דוגמת שימוש + CLI מהיר:
    python3 -m tools.mortgage_engine.cli demo
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from mortgage_engine import Assumptions, Mortgage, Track, TrackType, compare_refinance, refinance_report  # noqa: E402


def demo() -> None:
    a = Assumptions(boi_rate=0.0325, annual_cpi=0.022)
    # משכנתא שנלקחה ב-2022: 1.2M ל-25 שנה, תמהיל טיפוסי
    current = Mortgage(name="קיימת 2022", assumptions=a, tracks=[
        Track(TrackType.FIXED_UNLINKED, 480_000, 25, rate=0.052, name="קל\"צ"),
        Track(TrackType.PRIME, 400_000, 25, spread=-0.005, name="פריים"),
        Track(TrackType.VARIABLE_LINKED, 320_000, 25, rate=0.031, reset_years=5, name="משתנה צמודה"),
    ])
    months_elapsed = 48
    balance_now = sum(s.balance_at(months_elapsed) for s in current.schedules())
    proposed = Mortgage(name="מוצע 2026", assumptions=a, tracks=[
        Track(TrackType.FIXED_UNLINKED, round(balance_now * 0.45), 21, rate=0.046, name="קל\"צ"),
        Track(TrackType.PRIME, round(balance_now * 0.40), 21, spread=-0.006, name="פריים"),
        Track(TrackType.FIXED_LINKED, round(balance_now * 0.15), 21, rate=0.033, name="ק\"צ"),
    ])
    res = compare_refinance(current, months_elapsed, proposed,
                            avg_rates_now={"קל\"צ": 0.046, "משתנה צמודה": 0.033},
                            other_costs=6_500 + 1_500, avg_monthly_cpi_12m=0.0015)
    print(refinance_report(res, "לקוח לדוגמה"))


if __name__ == "__main__":
    demo() if (len(sys.argv) > 1 and sys.argv[1] == "demo") else print(__doc__)
