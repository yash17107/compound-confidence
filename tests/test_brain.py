import os
import sys
import unittest
from unittest import mock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "api"))

from _brain import coach as coach_mod  # noqa: E402
from _brain.forecast import forecast_week, landing_odds, miss_primary_print  # noqa: E402

THABO_INCOME = [{"id": "gig", "amount": 1070}, {"id": "sassa", "amount": 350}]
THABO_BILLS = [
    {"id": "rent", "amount": 700},
    {"id": "food", "amount": 320},
    {"id": "airtime", "amount": 70},
    {"id": "stokvel", "amount": 150},
]
THABO_HISTORY = [{"missed": m} for m in (False, True, False, False, True, False)]

NOMSA_INCOME = [{"id": "wages", "amount": 1400}]
NOMSA_BILLS = [
    {"id": "rent", "amount": 650},
    {"id": "food", "amount": 300},
    {"id": "airtime", "amount": 70},
    {"id": "transport", "amount": 180},
]
NOMSA_HISTORY = [{"missed": m} for m in (False, True, False, False, False, False)]

THABO_DESK = {"income": THABO_INCOME, "obligated": THABO_BILLS, "history": THABO_HISTORY}


class ForecastParity(unittest.TestCase):
    """Same numbers as src/lib/forecast.test.js and the App tests."""

    def test_thabo_sizes_lightly_with_a_r40_cap(self):
        f = forecast_week(THABO_HISTORY, THABO_INCOME, THABO_BILLS)
        self.assertEqual(f["call"], "light")
        self.assertEqual((f["landed"], f["weeks"]), (4, 6))
        self.assertEqual(f["goodLeftover"], 180)
        self.assertEqual(f["oddsPct"], 65)
        self.assertEqual(f["investCap"], 40)
        self.assertEqual(f["setAside"], 140)

    def test_nomsa_goes(self):
        f = forecast_week(NOMSA_HISTORY, NOMSA_INCOME, NOMSA_BILLS)
        self.assertEqual(f["call"], "go")
        self.assertGreater(f["investCap"], 0)
        self.assertLessEqual(f["investCap"], 150)

    def test_another_missed_week_flips_thabo_to_sit(self):
        f = forecast_week(THABO_HISTORY + [{"missed": True}], THABO_INCOME, THABO_BILLS)
        self.assertEqual(f["call"], "sit")
        self.assertEqual(f["investCap"], 0)

    def test_toggled_miss_this_week_does_not_change_next_week(self):
        missed_now = forecast_week(THABO_HISTORY, miss_primary_print(THABO_INCOME), THABO_BILLS)
        self.assertEqual(missed_now["goodLeftover"], 180)

    def test_recent_weeks_weigh_more(self):
        early = [{"missed": True}, {"missed": False}, {"missed": False}]
        late = [{"missed": False}, {"missed": False}, {"missed": True}]
        self.assertGreater(landing_odds(early), landing_odds(late))


class CoachRules(unittest.TestCase):
    def setUp(self):
        patcher = mock.patch.dict(os.environ, {}, clear=False)
        patcher.start()
        os.environ.pop("OPENAI_API_KEY", None)
        self.addCleanup(patcher.stop)

    def test_refuses_borrowing_even_with_ai_on(self):
        with mock.patch.object(coach_mod, "ai_reply") as ai:
            result = coach_mod.coach("Can I borrow R500 from the mashonisa to invest?", THABO_DESK)
        ai.assert_not_called()
        self.assertEqual(result["source"], "rules")
        self.assertIn("Borrowed money is not leftover", result["reply"])

    def test_flags_scams(self):
        result = coach_mod.coach("Guy says send bitcoin, guaranteed 30%", THABO_DESK)
        self.assertIn("scam", result["reply"].lower())

    def test_sits_when_no_leftover(self):
        desk = {**THABO_DESK, "income": miss_primary_print(THABO_INCOME)}
        result = coach_mod.coach("Can I invest this week?", desk)
        self.assertIn("Sit this week", result["reply"])

    def test_rules_reply_uses_the_forecast_cap(self):
        result = coach_mod.coach("Can I invest this week?", THABO_DESK)
        self.assertEqual(result["source"], "rules")
        self.assertIn("R40", result["reply"])

    def test_uses_ai_when_available(self):
        with mock.patch.object(coach_mod, "ai_reply", return_value="Size lightly, bru."):
            result = coach_mod.coach("Can I invest this week?", THABO_DESK, "zu")
        self.assertEqual(result["source"], "ai")
        self.assertEqual(result["reply"], "Size lightly, bru.")

    def test_rejects_empty_and_junk_input(self):
        self.assertFalse(coach_mod.coach("   ", THABO_DESK)["ok"])
        junk = {"income": "lol", "obligated": [None, {"amount": "abc"}], "history": 5}
        self.assertTrue(coach_mod.coach("hi", junk)["ok"])

    def test_prompt_carries_the_hard_rules(self):
        leftover, forecast = coach_mod.facts_for(coach_mod.clean_desk(THABO_DESK))
        prompt = coach_mod._system_prompt("zu", leftover, forecast)
        self.assertIn("isiZulu", prompt)
        self.assertIn("Never suggest borrowing", prompt)
        self.assertIn("R40", prompt)


if __name__ == "__main__":
    unittest.main()
