#!/usr/bin/env python3
"""
referral_model.py — מודל משפך להנדסת הפניות בסוכנות ביטוח (10,000 לקוחות פעילים)
עם cross-sell לבדיקת משכנתא. כל מספר שיוצא מכאן = תוצאה של הנחות מפורשות, לא ניחוש.

הרצה:  python3 tools/referral_model.py            # שלושה תרחישים, טבלה
        python3 tools/referral_model.py --json     # לפלט אוטומציה

ההנחות מסומנות [A] (assumption) ומקורן מתועד ב-docs/business-plan/README.md:
- שיעור סגירה של הפניות בביטוח 30–50% (מקור: סקירת benchmarks, ראה README) → כאן 30%/35%/40%.
- כמות ההפניות ללקוח שמסכים: 1.5 בממוצע (חבר/משפחה/עמית). [A]
- שיעור לקוחות שיש להם ביטוח חיים למשכנתא מתוך התיק: 25%/30%/35%. [A] — לאמת מול ה-CRM של הסוכנות!
- מתאם פגישות אחד: 50 שיחות יוצאות ביום, 21 ימי עבודה. [A] תעשייתי-סטנדרטי למוקד קטן.
"""
from __future__ import annotations

import argparse
import json
from dataclasses import dataclass, asdict


@dataclass
class Scenario:
    name: str
    clients: int = 10_000
    reachable_share: float = 0.70        # [A] טלפון תקין + עונים תוך 3 ניסיונות
    calls_per_day: int = 50               # [A] מתאם אחד
    work_days: int = 21
    connect_rate: float = 0.35            # [A] שיחות שנענות מתוך חיוגים
    referral_agree_rate: float = 0.12     # [A] מסכימים לתת שם — משתנה לפי תרחיש
    referrals_per_agreer: float = 1.5     # [A]
    referral_reach_rate: float = 0.70     # [A] מגיעים לאדם שהופנה
    referral_meeting_rate: float = 0.50   # [A] "חבר של חבר" מסכים לפגישה
    referral_close_rate: float = 0.35     # benchmark 30–50%
    avg_insurance_annual_commission: float = 1_800  # [A] ₪ עמלה שנתית ממוצעת ללקוח ביטוח חדש — לאמת!
    mortgage_life_share: float = 0.30     # [A] חלק התיק עם ביטוח חיים למשכנתא
    mortgage_check_optin: float = 0.25    # [A] מסכימים לבדיקת משכנתא חינם
    mortgage_check_actionable: float = 0.40  # [A] הבדיקה מוצאת חיסכון שמצדיק מחזור/פעולה
    mortgage_close_rate: float = 0.50     # [A] מהאקשנבליים סוגרים ייעוץ
    mortgage_fee: float = 6_500           # [A] ₪ שכ"ט ממוצע לייעוץ/מחזור — לפי התמחור של מניפה
    coordinator_monthly_cost: float = 14_000  # [A] ₪ עלות מעביד + בונוסים

    def run(self) -> dict:
        dials_month = self.calls_per_day * self.work_days
        connects_month = dials_month * self.connect_rate
        reachable = self.clients * self.reachable_share
        months_to_cover = reachable / connects_month if connects_month else float("inf")

        # --- הפניות לביטוח ---
        agreers = connects_month * self.referral_agree_rate
        referrals = agreers * self.referrals_per_agreer
        ref_reached = referrals * self.referral_reach_rate
        ref_meetings = ref_reached * self.referral_meeting_rate
        new_ins_clients = ref_meetings * self.referral_close_rate
        ins_revenue_month = new_ins_clients * self.avg_insurance_annual_commission

        # --- בדיקת משכנתא (רק למי שמדברים איתו ויש לו ביטוח חיים למשכנתא) ---
        mortgage_holders_talked = connects_month * self.mortgage_life_share
        checks = mortgage_holders_talked * self.mortgage_check_optin
        actionable = checks * self.mortgage_check_actionable
        mortgage_deals = actionable * self.mortgage_close_rate
        mortgage_revenue_month = mortgage_deals * self.mortgage_fee

        total = ins_revenue_month + mortgage_revenue_month
        return {
            "scenario": self.name,
            "dials_month": round(dials_month),
            "connects_month": round(connects_month),
            "months_to_cover_book": round(months_to_cover, 1),
            "referrals_month": round(referrals),
            "referral_meetings_month": round(ref_meetings, 1),
            "new_insurance_clients_month": round(new_ins_clients, 1),
            "insurance_revenue_month": round(ins_revenue_month),
            "mortgage_checks_month": round(checks, 1),
            "mortgage_deals_month": round(mortgage_deals, 1),
            "mortgage_revenue_month": round(mortgage_revenue_month),
            "total_revenue_month": round(total),
            "coordinator_cost": round(self.coordinator_monthly_cost),
            "roi_x": round(total / self.coordinator_monthly_cost, 1) if self.coordinator_monthly_cost else None,
            "cost_per_new_client": round(self.coordinator_monthly_cost / (new_ins_clients + mortgage_deals)) if (new_ins_clients + mortgage_deals) else None,
        }


SCENARIOS = [
    Scenario("שמרני", referral_agree_rate=0.08, referral_close_rate=0.30, mortgage_life_share=0.25, mortgage_check_optin=0.20, connect_rate=0.30),
    Scenario("בסיס", referral_agree_rate=0.12, referral_close_rate=0.35, mortgage_life_share=0.30, mortgage_check_optin=0.25, connect_rate=0.35),
    Scenario("אגרסיבי", referral_agree_rate=0.18, referral_close_rate=0.40, mortgage_life_share=0.35, mortgage_check_optin=0.30, connect_rate=0.40),
]

LABELS = {
    "dials_month": "חיוגים/חודש", "connects_month": "שיחות שנענו/חודש", "months_to_cover_book": "חודשים לכיסוי כל התיק",
    "referrals_month": "הפניות שנאספו/חודש", "referral_meetings_month": "פגישות מהפניות/חודש",
    "new_insurance_clients_month": "לקוחות ביטוח חדשים/חודש", "insurance_revenue_month": "הכנסה ביטוח/חודש (₪)",
    "mortgage_checks_month": "בדיקות משכנתא/חודש", "mortgage_deals_month": "עסקאות משכנתא/חודש",
    "mortgage_revenue_month": "הכנסה משכנתאות/חודש (₪)", "total_revenue_month": "סה\"כ הכנסה/חודש (₪)",
    "coordinator_cost": "עלות מתאם/חודש (₪)", "roi_x": "ROI (x)", "cost_per_new_client": "עלות ללקוח חדש (₪)",
}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--markdown", action="store_true")
    a = ap.parse_args()
    results = [s.run() for s in SCENARIOS]
    if a.json:
        print(json.dumps({"scenarios": results, "assumptions": [asdict(s) for s in SCENARIOS]}, ensure_ascii=False, indent=2))
        return
    keys = [k for k in results[0] if k != "scenario"]
    head = "| מדד | " + " | ".join(r["scenario"] for r in results) + " |"
    sep = "|---|" + "---:|" * len(results)
    rows = [f"| {LABELS[k]} | " + " | ".join(f"{r[k]:,}" if isinstance(r[k], (int, float)) else str(r[k]) for r in results) + " |" for k in keys]
    print("\n".join([head, sep, *rows]))


if __name__ == "__main__":
    main()
