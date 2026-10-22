"""Leftover-only marketplace: Yahoo quotes for JSE ETFs, no crypto, no single-stock YOLO."""

import json
import math
import time
import urllib.error
import urllib.parse
import urllib.request

UNIVERSE = [
    {
        "ticker": "ETFT40.JO",
        "code": "ETFT40",
        "name": "FNB Top 40 ETF",
        "rail": "Shares Zero",
        "kind": "etf",
        "featured": True,
        "fallback": 72.4,
    },
    {
        "ticker": "STX40.JO",
        "code": "STX40",
        "name": "Satrix 40 ETF",
        "rail": "JSE ETF",
        "kind": "etf",
        "featured": False,
        "fallback": 84.2,
    },
    {
        "ticker": "STXSWX.JO",
        "code": "STXSWX",
        "name": "Satrix SWIX Top 40",
        "rail": "JSE ETF",
        "kind": "etf",
        "featured": False,
        "fallback": 18.6,
    },
    {
        "ticker": "STXFIN.JO",
        "code": "STXFIN",
        "name": "Satrix FINI",
        "rail": "JSE ETF",
        "kind": "etf",
        "featured": False,
        "fallback": 16.8,
    },
    {
        "ticker": "STXIND.JO",
        "code": "STXIND",
        "name": "Satrix INDI",
        "rail": "JSE ETF",
        "kind": "etf",
        "featured": False,
        "fallback": 88.5,
    },
    {
        "ticker": "STXDIV.JO",
        "code": "STXDIV",
        "name": "Satrix DIVI",
        "rail": "JSE ETF",
        "kind": "etf",
        "featured": False,
        "fallback": 22.1,
    },
    {
        "ticker": "STXPRO.JO",
        "code": "STXPRO",
        "name": "Satrix Property",
        "rail": "JSE ETF",
        "kind": "etf",
        "featured": False,
        "fallback": 11.4,
    },
    {
        "ticker": "GLD.JO",
        "code": "GLD",
        "name": "NewGold",
        "rail": "JSE ETF",
        "kind": "etf",
        "featured": False,
        "fallback": 310.0,
    },
    {
        "ticker": "SYGWD.JO",
        "code": "SYGWD",
        "name": "Sygnia Itrix MSCI World",
        "rail": "JSE ETF",
        "kind": "etf",
        "featured": False,
        "fallback": 52.8,
    },
    {
        "ticker": "SYGUS.JO",
        "code": "SYGUS",
        "name": "Sygnia Itrix S&P 500",
        "rail": "JSE ETF",
        "kind": "etf",
        "featured": False,
        "fallback": 95.3,
    },
]

BY_TICKER = {item["ticker"]: item for item in UNIVERSE}
BLOCKED = ("BTC", "ETH", "DOGE", "SOL-", "CRYPTO", "COIN", "XRP", "ADA-", "USDT")
YAHOO = "https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?range=1mo&interval=1d"
CACHE_TTL = 180
_cache = {}


def _safe(value, digits=2):
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if math.isnan(number) or math.isinf(number):
        return None
    return round(number, digits)


def _rsi(closes, period=14):
    if len(closes) < period + 1:
        return None
    gains = []
    losses = []
    for index in range(1, len(closes)):
        delta = closes[index] - closes[index - 1]
        gains.append(max(delta, 0.0))
        losses.append(max(-delta, 0.0))
    avg_gain = sum(gains[:period]) / period
    avg_loss = sum(losses[:period]) / period
    for gain, loss in zip(gains[period:], losses[period:]):
        avg_gain = (avg_gain * (period - 1) + gain) / period
        avg_loss = (avg_loss * (period - 1) + loss) / period
    if avg_loss == 0:
        return 100.0
    return 100 - (100 / (1 + avg_gain / avg_loss))


def tape_note(closes):
    if len(closes) < 3:
        return {"heat": "mixed", "rsi": None, "changePct": None, "trendPct": None, "note": "Not enough tape yet."}
    last = closes[-1]
    prev = closes[-2] if closes[-2] else last
    start = closes[-5] if len(closes) >= 5 else closes[0]
    change_pct = ((last - prev) / prev) * 100 if prev else 0
    trend_pct = ((last - start) / start) * 100 if start else 0
    rsi = _rsi(closes)
    if rsi is not None and rsi > 70 or change_pct > 3:
        heat = "hot"
        note = "Tape is running hot. Don't chase. Leftover still decides, and sitting is allowed."
    elif rsi is not None and rsi < 35 or change_pct < -3:
        heat = "quiet"
        note = "Quiet tape. A leftover slice of the basket is fine if rent is already covered."
    else:
        heat = "mixed"
        note = "Mixed tape. Buy a slice only with leftover, never because a candle went green."
    return {
        "heat": heat,
        "rsi": round(rsi, 1) if rsi is not None else None,
        "changePct": _safe(change_pct),
        "trendPct": _safe(trend_pct),
        "note": note,
    }


def _scale(closes, ticker):
    usable = [price for price in closes if price is not None]
    if ticker.endswith(".JO") and usable and max(usable) > 500:
        return [None if price is None else price / 100 for price in closes]
    return closes


def _yahoo(ticker, timeout=8):
    now = time.time()
    hit = _cache.get(ticker)
    if hit and now - hit["ts"] < CACHE_TTL:
        return hit["data"]
    request = urllib.request.Request(
        YAHOO.format(ticker=urllib.parse.quote(ticker, safe=".")),
        headers={"User-Agent": "CompoundConfidence/1.0 (leftover-first desk)"},
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        payload = json.loads(response.read())
    result = (payload.get("chart") or {}).get("result") or []
    if not result:
        raise ValueError("empty")
    chart = result[0]
    quote = ((chart.get("indicators") or {}).get("quote") or [{}])[0]
    raw_closes = quote.get("close") or []
    timestamps = chart.get("timestamp") or []
    closes = _scale([_safe(value, 4) for value in raw_closes], ticker)
    spark = []
    for stamp, close in zip(timestamps, closes):
        if close is None:
            continue
        spark.append({"date": time.strftime("%Y-%m-%d", time.gmtime(stamp)), "close": close})
    prices = [point["close"] for point in spark]
    if not prices:
        raise ValueError("no closes")
    meta = chart.get("meta") or {}
    price = _safe(meta.get("regularMarketPrice"), 4) or prices[-1]
    if ticker.endswith(".JO") and price > 500:
        price = round(price / 100, 4)
    prev = prices[-2] if len(prices) > 1 else prices[-1]
    data = {
        "price": round(price, 2),
        "prevClose": round(prev, 2),
        "change": round(price - prev, 2),
        "changePct": _safe(((price - prev) / prev) * 100 if prev else 0),
        "spark": spark[-22:],
        "tape": tape_note(prices),
        "source": "yahoo",
        "currency": "ZAR",
    }
    _cache[ticker] = {"ts": now, "data": data}
    return data


def _fallback(item):
    price = item["fallback"]
    spark = [{"date": f"seed-{index}", "close": round(price * (0.97 + index * 0.003), 2)} for index in range(12)]
    closes = [point["close"] for point in spark]
    return {
        "price": price,
        "prevClose": spark[-2]["close"],
        "change": round(price - spark[-2]["close"], 2),
        "changePct": _safe(((price - spark[-2]["close"]) / spark[-2]["close"]) * 100),
        "spark": spark,
        "tape": tape_note(closes),
        "source": "offline",
        "currency": "ZAR",
    }


def blocked(ticker):
    upper = str(ticker or "").upper()
    return any(word in upper for word in BLOCKED)


def quote_one(ticker):
    item = BY_TICKER.get(str(ticker or "").upper())
    if not item:
        return None
    try:
        live = _yahoo(item["ticker"])
        return {**item, **live, "error": False}
    except (urllib.error.URLError, TimeoutError, ValueError, KeyError, IndexError, json.JSONDecodeError):
        return {**item, **_fallback(item), "error": False}


def marketplace(ticker=None):
    asked = str(ticker or "").strip().upper()
    if asked and blocked(asked):
        return {
            "ok": False,
            "reason": "blocked",
            "message": "Crypto is not leftover investing. Rent never gets a ticker.",
        }
    if asked:
        row = quote_one(asked)
        if not row:
            return {"ok": False, "reason": "unknown", "message": "This desk only lists leftover ETFs."}
        return {"ok": True, "board": [row], "featured": row["ticker"] if row.get("featured") else UNIVERSE[0]["ticker"]}
    board = [quote_one(item["ticker"]) for item in UNIVERSE]
    return {
        "ok": True,
        "board": board,
        "featured": UNIVERSE[0]["ticker"],
        "rule": "Only leftover may buy a slice. Bills stay in Main and Savings.",
    }
