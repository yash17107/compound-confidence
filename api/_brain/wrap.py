"""30-day money wrap: the browser sends totals only, never transactions, and gets a short story back."""

import re

from .ai import chat
from .coach import LANG_NAMES

NUMBERS = ["moneyIn", "moneyOut", "net", "unpaid", "toSavings", "fromSavings", "invested", "saveRate", "badWeeks", "paydays", "topShare", "count"]
VIBES = {"survivor", "compounder", "stacker", "starter"}
BILL_ID = re.compile(r"[^a-z0-9 _-]", re.I)


def _rand(value):
    return f"R{round(value):,}".replace(",", " ")


def _number(value, limit=10_000_000):
    try:
        number = float(value)
    except (TypeError, ValueError):
        return 0.0
    if number != number:
        return 0.0
    return max(-limit, min(limit, number))


def clean_wrap(wrap):
    wrap = wrap if isinstance(wrap, dict) else {}
    clean = {key: _number(wrap.get(key)) for key in NUMBERS}
    bills = []
    for bill in wrap.get("topBills") if isinstance(wrap.get("topBills"), list) else []:
        if isinstance(bill, dict) and len(bills) < 5:
            name = BILL_ID.sub("", str(bill.get("id", "")))[:24] or "other"
            bills.append({"id": name, "amount": max(0.0, _number(bill.get("amount")))})
    clean["topBills"] = bills
    clean["vibe"] = wrap.get("vibe") if wrap.get("vibe") in VIBES else "starter"
    return clean


def rule_summary(wrap):
    if wrap["count"] <= 0:
        return "No money moved in the last 30 days yet. Close a week and your wrap fills up."
    parts = [f"In 30 days, {_rand(wrap['moneyIn'])} came in and {_rand(wrap['moneyOut'])} paid the bills."]
    if wrap["topBills"]:
        top = wrap["topBills"][0]
        parts.append(f"{top['id'].capitalize()} was the biggest bill at {round(wrap['topShare'])}% of spending.")
    if wrap["badWeeks"] > 0 and wrap["unpaid"] <= 0:
        parts.append(f"Savings covered {round(wrap['badWeeks'])} short week and nothing went unpaid. That buffer did its job.")
    elif wrap["unpaid"] > 0:
        parts.append(f"{_rand(wrap['unpaid'])} went unpaid. Talk to whoever is owed early, and grow Savings first.")
    if wrap["toSavings"] > 0:
        parts.append(
            f"You stacked {_rand(wrap['toSavings'])} into Savings, {round(wrap['saveRate'])}% of what came in. Keep it boring, keep it going."
        )
    else:
        parts.append("Next month, try moving even R20 a week into Savings.")
    return " ".join(parts)


def _system_prompt(lang):
    return (
        "You write a 30-day 'money wrap' for a young South African with irregular income, like a Spotify Wrapped for money. "
        f"Write in {LANG_NAMES.get(lang, 'English')}. Three or four short sentences, under 80 words, warm and a little playful. "
        "Celebrate discipline, not spending. Use rands (R). End with one small, concrete tip for next month.\n"
        "Hard rules: use only the numbers given, never invent any. Never suggest borrowing or credit. "
        "Never name a stock. Bills are paid before anything is invested."
    )


def _facts(wrap):
    bills = ", ".join(f"{bill['id']} {_rand(bill['amount'])}" for bill in wrap["topBills"]) or "none"
    return (
        f"Money in: {_rand(wrap['moneyIn'])} over {round(wrap['paydays'])} paydays. Bills paid: {_rand(wrap['moneyOut'])}. "
        f"Biggest bills: {bills}. Biggest bill share: {round(wrap['topShare'])}%. "
        f"Moved into Savings: {_rand(wrap['toSavings'])} ({round(wrap['saveRate'])}% of money in). "
        f"Taken from Savings to cover short weeks: {_rand(wrap['fromSavings'])} across {round(wrap['badWeeks'])} weeks. "
        f"Unpaid bills: {_rand(wrap['unpaid'])}. Invested from leftover: {_rand(wrap['invested'])}. "
        f"Their vibe this month: {wrap['vibe']}."
    )


def ai_summary(wrap, lang):
    return chat(_system_prompt(lang), _facts(wrap), max_tokens=200, temperature=0.6)


def money_wrap(wrap, lang="en"):
    wrap = clean_wrap(wrap)
    summary = ai_summary(wrap, lang) if wrap["count"] > 0 else None
    return {
        "ok": True,
        "summary": summary or rule_summary(wrap),
        "source": "ai" if summary else "rules",
        "vibe": wrap["vibe"],
    }
