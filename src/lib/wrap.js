import { inWindow, WINDOW_DAYS } from "./ledger.js";
import { formatRand, roundRand } from "./money.js";
import { minimiseWrap } from "./privacy.js";

export const VIBES = ["survivor", "compounder", "stacker", "starter"];

export function moneyWrap(ledger, { today = new Date(), days = WINDOW_DAYS } = {}) {
  const rows = (ledger || []).filter((entry) => inWindow(entry, today, days));
  let moneyIn = 0;
  let moneyOut = 0;
  let unpaid = 0;
  let toSavings = 0;
  let fromSavings = 0;
  let invested = 0;
  const bills = {};
  const paydays = new Set();
  const coverDays = new Set();

  for (const entry of rows) {
    const amount = Number(entry.amount) || 0;
    if (entry.kind === "in") {
      moneyIn += amount;
      paydays.add(entry.date);
    } else if (entry.kind === "out") {
      moneyOut += amount;
      unpaid += Number(entry.unpaid) || 0;
      const key = entry.item || entry.label || "other";
      bills[key] = (bills[key] || 0) + amount;
    } else if (entry.to === "savings") {
      toSavings += amount;
    } else if (entry.from === "savings") {
      fromSavings += amount;
      if (entry.reason === "cover") coverDays.add(entry.date);
    }
    if (entry.kind === "move" && entry.to === "invest") invested += amount;
  }

  const topBills = Object.entries(bills)
    .map(([id, amount]) => ({ id, amount: roundRand(amount) }))
    .sort((a, b) => b.amount - a.amount);
  const saveRate = moneyIn > 0 ? Math.round((toSavings / moneyIn) * 100) : 0;
  const top = topBills[0] || null;
  const badWeeks = coverDays.size;

  const vibe =
    badWeeks > 0 && unpaid === 0
      ? "survivor"
      : invested > 0
        ? "compounder"
        : saveRate >= 5
          ? "stacker"
          : "starter";

  return {
    days,
    count: rows.length,
    paydays: paydays.size,
    moneyIn: roundRand(moneyIn),
    moneyOut: roundRand(moneyOut),
    net: roundRand(moneyIn - moneyOut),
    unpaid: roundRand(unpaid),
    toSavings: roundRand(toSavings),
    fromSavings: roundRand(fromSavings),
    invested: roundRand(invested),
    saveRate,
    badWeeks,
    topBills,
    top,
    topShare: top && moneyOut > 0 ? Math.round((top.amount / moneyOut) * 100) : 0,
    vibe,
  };
}

export function offlineWrap(wrap, billName = (id) => id) {
  if (!wrap.count) return "No money moved in the last 30 days yet. Close a week and your wrap fills up.";
  const parts = [
    `In 30 days, ${formatRand(wrap.moneyIn)} came in and ${formatRand(wrap.moneyOut)} paid the bills.`,
  ];
  if (wrap.top) parts.push(`${billName(wrap.top.id)} was the biggest bill at ${wrap.topShare}% of spending.`);
  if (wrap.badWeeks > 0 && wrap.unpaid === 0) {
    parts.push(`Savings covered ${wrap.badWeeks} short week and nothing went unpaid. That buffer did its job.`);
  } else if (wrap.unpaid > 0) {
    parts.push(`${formatRand(wrap.unpaid)} went unpaid. Talk to whoever is owed early, and grow Savings first.`);
  }
  parts.push(
    wrap.toSavings > 0
      ? `You stacked ${formatRand(wrap.toSavings)} into Savings, ${wrap.saveRate}% of what came in. Keep it boring, keep it going.`
      : "Next month, try moving even R20 a week into Savings.",
  );
  return parts.join(" ");
}

export async function askWrap({ wrap, lang, billName }) {
  try {
    const response = await fetch("/api/wrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lang, wrap: minimiseWrap(wrap) }),
    });
    const data = await response.json();
    if (response.ok && data.ok && data.summary) {
      return { text: data.summary, source: data.source === "ai" ? "ai" : "rules" };
    }
  } catch {
    /* offline or no API */
  }
  return { text: offlineWrap(wrap, billName), source: "offline" };
}
