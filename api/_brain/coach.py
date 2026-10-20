"""Compound Confidence coach: hard rules first, then an optional OpenAI voice on top of the numbers."""

import re

from .ai import chat
from .forecast import HISTORY_LIMIT, forecast_week, leftover_of

MAX_QUESTION = 500
MAX_LINES = 20

LANG_NAMES = {
    "en": "English",
    "af": "Afrikaans",
    "zu": "isiZulu",
    "xh": "isiXhosa",
    "nr": "isiNdebele",
    "ss": "siSwati",
    "st": "Sesotho",
    "nso": "Sepedi",
    "tn": "Setswana",
    "ts": "Xitsonga",
    "ve": "Tshivenda",
    "sfs": "plain, short English (the user reads SASL captions)",
}

CREDIT_WORDS = re.compile(r"\b(borrow|loan|mashonisa|credit card|lend|owe|payday)\b", re.I)
SCAM_WORDS = re.compile(r"\b(guaranteed|bitcoin|crypto|otp|double your|forex signal|pyramid)\b", re.I)


def _rand(value):
    return f"R{round(value):,}".replace(",", " ")


def _clean_line(item):
    if not isinstance(item, dict):
        return None
    try:
        amount = max(0.0, float(item.get("amount") or 0))
    except (TypeError, ValueError):
        amount = 0.0
    line = {"id": str(item.get("id", ""))[:40], "amount": amount}
    if item.get("missed"):
        line["missed"] = True
        try:
            line["was"] = max(0.0, float(item.get("was") or 0))
        except (TypeError, ValueError):
            line["was"] = 0.0
    return line


def _as_list(value):
    return value if isinstance(value, list) else []


def clean_desk(desk):
    desk = desk if isinstance(desk, dict) else {}

    def lines(key):
        return [line for line in map(_clean_line, _as_list(desk.get(key))[:MAX_LINES]) if line]

    history = []
    for week in _as_list(desk.get("history"))[-HISTORY_LIMIT:]:
        if isinstance(week, dict):
            history.append({"missed": bool(week.get("missed"))})
    return {"income": lines("income"), "obligated": lines("obligated"), "history": history}


def facts_for(desk):
    leftover = leftover_of(desk["income"], desk["obligated"])
    forecast = forecast_week(desk["history"], desk["income"], desk["obligated"])
    return leftover, forecast


def rule_reply(question, leftover, forecast):
    if CREDIT_WORDS.search(question):
        return "No. Borrowed money is not leftover. Never put a loan or a mashonisa's money into shares."
    if SCAM_WORDS.search(question):
        return "That smells like a scam. Nobody can guarantee returns, and FNB will never ask for your OTP. Don't send a rand."
    if leftover <= 0:
        return "Sit this week. There is no leftover after rent and bills, so there is nothing to invest. Sitting is how the account survives."
    if forecast["call"] == "sit":
        return (
            f"You have {_rand(leftover)} leftover now, but your pattern says next week could squeeze the bills. "
            f"Keep it in Main and Savings. Investment cap next week: R0."
        )
    lead = "Size lightly." if forecast["call"] == "light" else "You may size, within the cap."
    return (
        f"{lead} Leftover this week is {_rand(leftover)}. Your main money landed {forecast['landed']} of the last "
        f"{forecast['weeks']} weeks. Cap investments at {_rand(forecast['investCap'])} and keep "
        f"{_rand(forecast['setAside'])} in Main and Savings."
    )


def _system_prompt(lang, leftover, forecast):
    return (
        "You are the Compound Confidence desk coach for young South Africans with irregular income. "
        "You speak like a calm older cousin who works at a bank: short, warm, plain words, no jargon. "
        f"Reply in {LANG_NAMES.get(lang, 'English')}. Keep it under 70 words. Use rands (R).\n"
        "Hard rules you never break:\n"
        "1. Rent and bills are paid first. Only leftover may ever be invested.\n"
        "2. Never suggest borrowing, credit or a mashonisa to invest.\n"
        "3. Investing here is paper trading only. Say it is not financial advice if asked what to buy.\n"
        "4. Never recommend a specific stock. The only product is the FNB Top 40 ETF on FNB Shares Zero.\n"
        "5. Never ask for passwords, PINs or OTPs.\n"
        "6. Never invent numbers. Use only the facts below.\n"
        f"Facts: leftover this week {_rand(leftover)}. Forecast call for next week: {forecast['call']}. "
        f"Main income landed {forecast['landed']} of the last {forecast['weeks']} weeks "
        f"({forecast['oddsPct']}% odds next week). Chance bills come up short: {forecast['riskPct']}%. "
        f"Investment cap next week: {_rand(forecast['investCap'])}. Keep in Main and Savings: {_rand(forecast['setAside'])}."
    )


def ai_reply(question, lang, leftover, forecast, timeout=20):
    return chat(_system_prompt(lang, leftover, forecast), question, timeout=timeout)


def coach(question, desk, lang="en"):
    question = str(question or "").strip()[:MAX_QUESTION]
    desk = clean_desk(desk)
    leftover, forecast = facts_for(desk)
    if not question:
        return {"ok": False, "reason": "empty"}

    guarded = CREDIT_WORDS.search(question) or SCAM_WORDS.search(question)
    reply = None if guarded else ai_reply(question, lang, leftover, forecast)
    source = "ai" if reply else "rules"
    return {
        "ok": True,
        "reply": reply or rule_reply(question, leftover, forecast),
        "source": source,
        "leftover": leftover,
        "forecast": forecast,
    }
