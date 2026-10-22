import { MARKET } from "./market.js";
import { roundRand } from "./money.js";

export const HOLDING_LIMIT = 20;

export function catalogItem(ticker) {
  return MARKET.find((item) => item.ticker === ticker);
}

export function cleanHoldings(holdings) {
  if (!Array.isArray(holdings)) return [];
  const merged = {};
  for (const row of holdings) {
    if (!row || typeof row !== "object") continue;
    const meta = catalogItem(String(row.ticker || "").toUpperCase());
    const units = Number(row.units) || 0;
    const cost = Number(row.cost) || 0;
    if (!meta || units <= 0 || cost <= 0) continue;
    const current = merged[meta.ticker] || { ticker: meta.ticker, name: meta.name, code: meta.code, units: 0, cost: 0 };
    current.units += units;
    current.cost += cost;
    merged[meta.ticker] = current;
  }
  return Object.values(merged)
    .map((row) => ({
      ...row,
      units: roundRand(row.units),
      cost: roundRand(row.cost),
    }))
    .slice(0, HOLDING_LIMIT);
}

export function costBasis(holdings) {
  return roundRand(cleanHoldings(holdings).reduce((sum, row) => sum + row.cost, 0));
}

export function leftoverCash(invest, holdings) {
  return roundRand(Math.max(0, (Number(invest) || 0) - costBasis(holdings)));
}

export function quoteMap(board) {
  const map = {};
  for (const row of board || []) {
    if (row?.ticker && Number(row.price) > 0) map[row.ticker] = row;
  }
  return map;
}

export function markHolding(row, quotes) {
  const quote = quotes?.[row.ticker];
  const price = Number(quote?.price) || 0;
  const market = price > 0 ? roundRand(row.units * price) : row.cost;
  const pnl = roundRand(market - row.cost);
  const pnlPct = row.cost > 0 ? Math.round((pnl / row.cost) * 1000) / 10 : 0;
  return { ...row, price, market, pnl, pnlPct, live: price > 0 };
}

export function portfolioOf({ invest, holdings, quotes }) {
  const rows = cleanHoldings(holdings).map((row) => markHolding(row, quotes));
  const cost = roundRand(rows.reduce((sum, row) => sum + row.cost, 0));
  const market = roundRand(rows.reduce((sum, row) => sum + row.market, 0));
  const cash = leftoverCash(invest, rows);
  const live = roundRand(cash + market);
  const pnl = roundRand(market - cost);
  return { rows, cash, cost, market, live, pnl, invested: cost > 0 };
}

export function buyHolding({ invest, holdings, ticker, amount, price, lessonDone }) {
  const meta = catalogItem(String(ticker || "").toUpperCase());
  if (!meta) return { ok: false, reason: "unknown" };
  if (meta.kind !== "etf") return { ok: false, reason: "blocked" };
  if (!lessonDone) return { ok: false, reason: "lesson" };
  const value = roundRand(Number(amount) || 0);
  const unitPrice = Number(price) || 0;
  if (!(value > 0)) return { ok: false, reason: "amount" };
  if (!(unitPrice > 0)) return { ok: false, reason: "price" };
  const cash = leftoverCash(invest, holdings);
  if (value > cash) return { ok: false, reason: "funds" };
  const units = value / unitPrice;
  const next = cleanHoldings([...(holdings || []), { ticker: meta.ticker, units, cost: value }]);
  return {
    ok: true,
    holdings: next,
    cash: leftoverCash(invest, next),
    trade: { ticker: meta.ticker, name: meta.name, code: meta.code, units, amount: value, price: unitPrice },
  };
}

export function sellHolding({ invest, holdings, ticker, units, price }) {
  const current = cleanHoldings(holdings);
  const row = current.find((item) => item.ticker === ticker);
  const unitPrice = Number(price) || 0;
  const selling = Number(units) || 0;
  if (!row) return { ok: false, reason: "holding" };
  if (!(selling > 0) || selling > row.units + 1e-9) return { ok: false, reason: "units" };
  if (!(unitPrice > 0)) return { ok: false, reason: "price" };
  const fraction = selling / row.units;
  const costSold = roundRand(row.cost * fraction);
  const proceeds = roundRand(selling * unitPrice);
  const pnl = roundRand(proceeds - costSold);
  const next = current
    .map((item) =>
      item.ticker === ticker
        ? { ...item, units: roundRand(item.units - selling), cost: roundRand(item.cost - costSold) }
        : item,
    )
    .filter((item) => item.units > 0.0001 && item.cost > 0);
  return {
    ok: true,
    holdings: next,
    accountsInvest: roundRand((Number(invest) || 0) + pnl),
    cash: leftoverCash(roundRand((Number(invest) || 0) + pnl), next),
    trade: { ticker: row.ticker, name: row.name, code: row.code, units: selling, amount: proceeds, price: unitPrice, pnl },
  };
}
