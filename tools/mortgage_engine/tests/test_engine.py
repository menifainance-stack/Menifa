"""python3 -m unittest tools/mortgage_engine/tests/test_engine.py"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from mortgage_engine import Assumptions, Mortgage, Track, TrackType, amortize, shpitzer_payment  # noqa: E402
from mortgage_engine.fees import capitalization_fee, early_repayment_fee, _discount  # noqa: E402
from mortgage_engine.refinance import compare_refinance, refinance_report  # noqa: E402


class CoreTests(unittest.TestCase):
    def test_shpitzer_known_value(self):
        # 1,000,000 ל-30 שנה ב-4.5% → 5,066.85 ₪ (ערך מוכר)
        self.assertAlmostEqual(shpitzer_payment(1_000_000, 0.045, 360), 5066.85, places=1)
        # DATA_SOURCE_OF_TRUTH: 1M ל-30 שנה ≈ 5,277 ₪ (ב"י Q1/2026) ↔ ריבית משוקללת ≈ 4.85%
        self.assertAlmostEqual(shpitzer_payment(1_000_000, 0.0485, 360), 5277, delta=2)

    def test_zero_rate(self):
        self.assertAlmostEqual(shpitzer_payment(120_000, 0.0, 120), 1000.0)

    def test_fixed_unlinked_amortizes_to_zero(self):
        s = amortize(Track(TrackType.FIXED_UNLINKED, 500_000, 20, rate=0.05))
        self.assertEqual(len(s.rows), 240)
        self.assertAlmostEqual(s.rows[-1].balance, 0.0, places=2)
        self.assertAlmostEqual(sum(r.principal for r in s.rows), 500_000, places=2)
        self.assertTrue(all(abs(r.payment - s.rows[0].payment) < 0.01 for r in s.rows))  # תשלום קבוע

    def test_linked_payment_grows_with_cpi(self):
        a = Assumptions(annual_cpi=0.03)
        s = amortize(Track(TrackType.FIXED_LINKED, 500_000, 20, rate=0.03), a)
        self.assertGreater(s.rows[-1].payment, s.rows[0].payment * 1.7)  # 20 שנה × 3% ≈ ×1.8
        self.assertAlmostEqual(s.rows[-1].balance, 0.0, places=2)
        self.assertGreater(s.total_paid, amortize(Track(TrackType.FIXED_UNLINKED, 500_000, 20, rate=0.03)).total_paid)

    def test_prime_uses_boi_plus_spread(self):
        a = Assumptions(boi_rate=0.0325, prime_spread=0.015)
        t = Track(TrackType.PRIME, 400_000, 25, spread=-0.005)
        self.assertAlmostEqual(t.annual_rate(a), 0.0425)
        s = amortize(t, a)
        self.assertAlmostEqual(s.rows[-1].balance, 0.0, places=2)

    def test_variable_resets_every_5y(self):
        a = Assumptions(variable_reset_delta=0.01)
        t = Track(TrackType.VARIABLE_UNLINKED, 300_000, 15, rate=0.04, reset_years=5)
        s = amortize(t, a)
        self.assertAlmostEqual(s.rows[0].rate, 0.04)
        self.assertAlmostEqual(s.rows[60].rate, 0.05)
        self.assertAlmostEqual(s.rows[120].rate, 0.06)
        self.assertGreater(s.rows[60].payment, s.rows[59].payment)
        self.assertAlmostEqual(s.rows[-1].balance, 0.0, places=2)

    def test_mortgage_summary(self):
        m = Mortgage([Track(TrackType.FIXED_UNLINKED, 600_000, 25, rate=0.05), Track(TrackType.PRIME, 400_000, 20, spread=-0.005)])
        smry = m.summary()
        self.assertEqual(smry["principal"], 1_000_000)
        self.assertEqual(len(m.monthly_payments()), 300)
        self.assertLess(m.monthly_payments()[-1], m.monthly_payments()[0])  # הפריים נגמר אחרי 20 שנה


class FeeTests(unittest.TestCase):
    def test_discount_tiers(self):
        self.assertEqual(_discount(2.9), 0.0)
        self.assertEqual(_discount(3), 0.20)
        self.assertEqual(_discount(5), 0.30)

    def test_capitalization_zero_when_rates_up(self):
        self.assertEqual(capitalization_fee(500_000, 0.04, None, 0.05, 240, 2), 0.0)

    def test_capitalization_positive_and_discounted(self):
        full = capitalization_fee(500_000, 0.05, None, 0.04, 240, 1)
        disc = capitalization_fee(500_000, 0.05, None, 0.04, 240, 6)
        self.assertGreater(full, 0)
        self.assertAlmostEqual(disc, full * 0.7, places=2)
        # 1% הפרש על 500K ל-20 שנה — סדר גודל של עשרות אלפי ₪
        self.assertTrue(30_000 < full < 60_000, full)

    def test_uses_lower_of_loan_and_avg_at_grant(self):
        a = capitalization_fee(500_000, 0.06, 0.05, 0.04, 240, 0)
        b = capitalization_fee(500_000, 0.05, None, 0.04, 240, 0)
        self.assertAlmostEqual(a, b)

    def test_prime_has_no_capitalization(self):
        f = early_repayment_fee(Track(TrackType.PRIME, 400_000, 25, spread=-0.005), 350_000, 30, 0.02)
        self.assertEqual(f.capitalization, 0.0)
        self.assertEqual(f.operational, 60.0)

    def test_index_fee_only_linked_and_1_15(self):
        t = Track(TrackType.FIXED_LINKED, 300_000, 20, rate=0.03)
        f1 = early_repayment_fee(t, 250_000, 12, 0.03, repay_day_of_month=10, avg_monthly_cpi_12m=0.002)
        f2 = early_repayment_fee(t, 250_000, 12, 0.03, repay_day_of_month=20, avg_monthly_cpi_12m=0.002)
        self.assertAlmostEqual(f1.index, 250_000 * 0.001)
        self.assertEqual(f2.index, 0.0)
        f3 = early_repayment_fee(Track(TrackType.FIXED_UNLINKED, 300_000, 20, rate=0.05), 250_000, 12, 0.05, repay_day_of_month=10, avg_monthly_cpi_12m=0.002)
        self.assertEqual(f3.index, 0.0)

    def test_no_notice_fee(self):
        f = early_repayment_fee(Track(TrackType.PRIME, 400_000, 25), 100_000, 12, 0.04, notice_given=False)
        self.assertAlmostEqual(f.no_notice, 100.0)

    def test_variable_no_cap_at_reset(self):
        t = Track(TrackType.VARIABLE_LINKED, 300_000, 20, rate=0.04, reset_years=5)
        at = early_repayment_fee(t, 250_000, 60, 0.02)
        mid = early_repayment_fee(t, 250_000, 48, 0.02)
        self.assertEqual(at.capitalization, 0.0)
        self.assertGreater(mid.capitalization, 0.0)


class RefinanceTests(unittest.TestCase):
    def test_compare_and_report(self):
        a = Assumptions()
        cur = Mortgage([Track(TrackType.FIXED_UNLINKED, 800_000, 25, rate=0.055, name="קל\"צ")], a)
        bal = cur.schedules()[0].balance_at(36)
        prop = Mortgage([Track(TrackType.FIXED_UNLINKED, round(bal), 22, rate=0.045, name="קל\"צ")], a)
        res = compare_refinance(cur, 36, prop, {"קל\"צ": 0.045}, other_costs=8_000)
        self.assertGreater(res.gross_saving, 0)
        self.assertGreater(res.fees_total, 60)          # יש עמלת היוון (ריבית ירדה)
        self.assertGreater(res.monthly_delta, 0)
        self.assertIsNotNone(res.breakeven_months)
        rep = refinance_report(res, "בדיקה")
        self.assertIn("פסק דין", rep)
        self.assertIn("חיסכון נטו", rep)
        self.assertIn(res.verdict(), rep)

    def test_verdict_no_saving(self):
        a = Assumptions()
        cur = Mortgage([Track(TrackType.FIXED_UNLINKED, 800_000, 25, rate=0.04, name="קל\"צ")], a)
        bal = cur.schedules()[0].balance_at(36)
        prop = Mortgage([Track(TrackType.FIXED_UNLINKED, round(bal), 22, rate=0.05, name="קל\"צ")], a)
        res = compare_refinance(cur, 36, prop, {"קל\"צ": 0.05})
        self.assertEqual(res.verdict(), "מסודר — אל תיגע")


if __name__ == "__main__":
    unittest.main()
