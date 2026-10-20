"""Next-week forecast. Mirrors src/lib/forecast.js so the app, the coach and WhatsApp agree."""

import math

HISTORY_LIMIT = 12
BUFFER = 50


def round_rand(value):
    return math.floor(float(value) * 100 + 0.5) / 100


def js_round(value):
    return math.floor(float(value) + 0.5)


def _amount(item):
    try:
        return float(item.get("amount") or 0)
    except (TypeError, ValueError):
        return 0.0


def sum_amounts(items):
    return sum(_amount(item) for item in items or [])


def leftover_of(income, obligated):
    return round_rand(sum_amounts(income) - sum_amounts(obligated))


def restore_primary_print(income):
    restored = []
    for item in income or []:
        if item.get("missed"):
            was = item.get("was")
            restored.append({**item, "amount": item.get("amount") if was is None else was, "missed": False})
        else:
            restored.append(item)
    return restored


def miss_primary_print(income):
    items = list(income or [])
    for index, item in enumerate(items):
        if item.get("id") != "extra" and not item.get("missed") and _amount(item) > 0:
            items[index] = {**item, "missed": True, "was": item.get("amount"), "amount": 0}
            break
    return items


def landing_odds(history):
    weeks = history or []
    if not weeks:
        return 1.0
    weights = range(1, len(weeks) + 1)
    total = sum(weights)
    landed = sum(w for w, item in zip(weights, weeks) if not item.get("missed"))
    return (landed + 1) / (total + 2)


def miss_streak(history):
    streak = 0
    for item in reversed(history or []):
        if not item.get("missed"):
            break
        streak += 1
    return streak


def _round_ten(value):
    return max(0, math.floor(value / 10) * 10)


def forecast_week(history, income, obligated):
    weeks = list(history or [])[-HISTORY_LIMIT:]
    landed = sum(1 for item in weeks if not item.get("missed"))
    good_tape = [item for item in restore_primary_print(income) if item.get("id") != "extra"]
    good_leftover = leftover_of(good_tape, obligated)
    bad_leftover = leftover_of(miss_primary_print(good_tape), obligated)
    streak = miss_streak(weeks)

    odds = landing_odds(weeks)
    if streak >= 2:
        odds *= 0.75
    odds = min(0.97, max(0.03, odds))

    expected = round_rand(odds * good_leftover + (1 - odds) * bad_leftover)
    short_risk = 1 - odds if bad_leftover < 0 else 0
    low_data = len(weeks) < 3

    call = "go"
    if good_leftover <= 0 or short_risk >= 0.5:
        call = "sit"
    elif short_risk >= 0.2 or low_data:
        call = "light"

    room = max(0, good_leftover - BUFFER)
    if call == "sit":
        invest_cap = 0
    elif call == "light":
        invest_cap = _round_ten(room * (1 - short_risk) * 0.5)
    else:
        invest_cap = _round_ten(room * (1 - short_risk))
    set_aside = _round_ten(max(0, good_leftover - invest_cap)) if short_risk > 0 else BUFFER

    return {
        "weeks": len(weeks),
        "landed": landed,
        "odds": round_rand(odds),
        "oddsPct": js_round(odds * 100),
        "riskPct": js_round(short_risk * 100),
        "goodLeftover": good_leftover,
        "badLeftover": bad_leftover,
        "expected": expected,
        "streak": streak,
        "lowData": low_data,
        "call": call,
        "investCap": invest_cap,
        "setAside": set_aside,
    }
