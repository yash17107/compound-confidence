import { cleanAccounts } from "./accounts.js";
import { leftoverCash } from "./holdings.js";
import { packedProfile } from "./profile.js";
import { roundRand } from "./money.js";

export const LEDGER_LIMIT = 400;
export const WINDOW_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export function isoDay(date) {
  const value = date instanceof Date ? date : new Date(date);
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function dayOffset(today, days) {
  return isoDay(new Date(new Date(today).getTime() - days * DAY_MS));
}

let counter = 0;
function entryId(date) {
  counter += 1;
  return `${date}-${Date.now().toString(36)}-${counter}`;
}

function money(amount) {
  return roundRand(Math.max(0, Number(amount) || 0));
}

export function moneyIn({ date, item, label, amount, account = "main" }) {
  return { id: entryId(date), date, kind: "in", account, item, label, amount: money(amount) };
}

export function moneyOut({ date, item, label, amount, account = "main", unpaid = 0 }) {
  const entry = { id: entryId(date), date, kind: "out", account, item, label, amount: money(amount) };
  if (unpaid > 0) entry.unpaid = money(unpaid);
  return entry;
}

export function moneyMove({ date, from, to, amount, reason = "manual" }) {
  return { id: entryId(date), date, kind: "move", from, to, amount: money(amount), reason };
}

export function moneyTrade({ date, side, ticker, name, units, amount, price, pnl = 0 }) {
  return {
    id: entryId(date),
    date,
    kind: side,
    account: "invest",
    ticker,
    label: name,
    units: roundRand(Number(units) || 0),
    amount: money(amount),
    price: roundRand(Number(price) || 0),
    pnl: roundRand(Number(pnl) || 0),
  };
}

// Seeded weeks are ordered oldest first. Each one is paid in, covered, paid out, then split.
const SEED_WEEKS = {
  taxi: [
    { ago: 27, extra: 200, save: 200 },
    { ago: 20, save: 100 },
    { ago: 13, missed: true, cover: 700 },
    { ago: 9, manual: { from: "main", to: "savings", amount: 50 } },
    { ago: 6, save: 100 },
  ],
  care: [
    { ago: 27, save: 100 },
    { ago: 20, missed: true, cover: 1000 },
    { ago: 13, save: 100 },
    { ago: 9, manual: { from: "main", to: "savings", amount: 50 } },
    { ago: 6, save: 100 },
  ],
};

export function seededLedger(hustle, today = new Date()) {
  const plan = SEED_WEEKS[hustle];
  if (!plan) return [];
  const profile = packedProfile(hustle);
  const entries = [];

  for (const week of plan) {
    const date = dayOffset(today, week.ago);
    if (week.manual) {
      entries.push(moneyMove({ date, ...week.manual }));
      continue;
    }
    profile.income.forEach((item, index) => {
      if (week.missed && index === 0) return;
      entries.push(moneyIn({ date, item: item.id, label: item.label, amount: item.amount }));
    });
    if (week.extra) entries.push(moneyIn({ date, item: "extra", amount: week.extra }));
    if (week.cover) {
      entries.push(moneyMove({ date, from: "savings", to: "main", amount: week.cover, reason: "cover" }));
    }
    profile.obligated.forEach((item) => {
      entries.push(moneyOut({ date, item: item.id, label: item.label, amount: item.amount }));
    });
    if (week.save) {
      entries.push(moneyMove({ date, from: "main", to: "savings", amount: week.save, reason: "save" }));
    }
  }
  return entries;
}

export function weekEntries({ income, obligated, moves, date }) {
  const entries = [];
  (income || []).forEach((item) => {
    if (item.missed || !(Number(item.amount) > 0)) return;
    entries.push(moneyIn({ date, item: item.id, label: item.label, amount: item.amount }));
  });

  if (moves.fromSavings > 0) {
    entries.push(moneyMove({ date, from: "savings", to: "main", amount: moves.fromSavings, reason: "cover" }));
  }

  let unpaid = money(moves.short);
  const bills = [...(obligated || [])].reverse().map((item) => {
    const amount = money(item.amount);
    const gap = Math.min(unpaid, amount);
    unpaid = roundRand(unpaid - gap);
    return { item, paid: roundRand(amount - gap), gap };
  });
  bills.reverse().forEach(({ item, paid, gap }) => {
    if (paid <= 0 && gap <= 0) return;
    entries.push(moneyOut({ date, item: item.id, label: item.label, amount: paid, unpaid: gap }));
  });

  if (moves.toSavings > 0) {
    entries.push(moneyMove({ date, from: "main", to: "savings", amount: moves.toSavings, reason: "save" }));
  }
  if (moves.toInvest > 0) {
    entries.push(moneyMove({ date, from: "main", to: "invest", amount: moves.toInvest, reason: "invest" }));
  }
  return entries;
}

export function appendEntries(ledger, entries) {
  return [...(ledger || []), ...entries].slice(-LEDGER_LIMIT);
}

export function cleanLedger(ledger) {
  if (!Array.isArray(ledger)) return [];
  return ledger.filter(
    (entry) =>
      entry &&
      typeof entry.date === "string" &&
      ["in", "out", "move", "buy", "sell"].includes(entry.kind) &&
      Number(entry.amount) >= 0,
  );
}

export function deltaFor(entry, accountId) {
  if (entry.kind === "in") return entry.account === accountId ? entry.amount : 0;
  if (entry.kind === "out") return entry.account === accountId ? -entry.amount : 0;
  if (entry.kind === "buy") return 0;
  if (entry.kind === "sell") return entry.account === accountId ? roundRand(Number(entry.pnl) || 0) : 0;
  if (entry.from === accountId) return -entry.amount;
  if (entry.to === accountId) return entry.amount;
  return 0;
}

export function inWindow(entry, today = new Date(), days = WINDOW_DAYS) {
  return entry.date >= dayOffset(today, days) && entry.date <= isoDay(today);
}

// Newest first, with the balance straight after each entry worked back from today's balance.
export function accountStatement(ledger, accountId, balance, { today = new Date(), days = WINDOW_DAYS } = {}) {
  let running = roundRand(Number(balance) || 0);
  const rows = [];
  let moneyInTotal = 0;
  let moneyOutTotal = 0;

  for (let index = (ledger || []).length - 1; index >= 0; index -= 1) {
    const entry = ledger[index];
    const delta = deltaFor(entry, accountId);
    if (!inWindow(entry, today, days)) continue;
    if (delta === 0 && entry.kind !== "buy" && entry.kind !== "sell") continue;
    rows.push({ ...entry, delta, balance: running });
    if (delta > 0) moneyInTotal += delta;
    else moneyOutTotal -= delta;
    running = roundRand(running - delta);
  }

  return {
    rows,
    opening: running,
    moneyIn: roundRand(moneyInTotal),
    moneyOut: roundRand(moneyOutTotal),
  };
}

export function moveDestinations(from) {
  if (from === "main") return ["savings", "invest"];
  if (from === "savings") return ["main"];
  if (from === "invest") return ["shares", "main", "savings"];
  return [];
}

export function parkedInvestOn(ledger, date = isoDay(new Date())) {
  return roundRand(
    (ledger || []).reduce((total, entry) => {
      if (entry?.kind !== "move" || entry.to !== "invest" || entry.date !== date) return total;
      return total + Number(entry.amount || 0);
    }, 0),
  );
}

export function investRoom({ leftover, forecast, ledger, date = isoDay(new Date()) }) {
  const cap = Number(forecast?.investCap);
  const ceiling = Number.isNaN(cap) ? Number(leftover) || 0 : Math.min(Number(leftover) || 0, cap);
  return roundRand(Math.max(0, ceiling - parkedInvestOn(ledger, date)));
}

export function canMove({
  from,
  to,
  amount,
  accounts,
  leftover,
  lessonDone,
  forecast,
  holdings,
  ledger,
  date = isoDay(new Date()),
}) {
  if (!moveDestinations(from).includes(to)) {
    return { ok: false, reason: from === "savings" && to === "invest" ? "buffer" : "same" };
  }
  const value = roundRand(Number(amount) || 0);
  if (!(value > 0)) return { ok: false, reason: "amount" };

  if (to === "shares") {
    if (!lessonDone) return { ok: false, reason: "lesson" };
    if (value > leftoverCash(accounts?.invest, holdings)) return { ok: false, reason: "funds" };
    return { ok: true, kind: "buy" };
  }

  if (to === "invest") {
    if (!lessonDone) return { ok: false, reason: "lesson" };
    if (!(Number(leftover) > 0)) return { ok: false, reason: "no-leftover" };
    if (value > investRoom({ leftover, forecast, ledger, date })) return { ok: false, reason: "cap" };
  }

  return { ok: true, kind: "move" };
}

export function transfer(accounts, { from, to, amount, date = isoDay(new Date()), available }) {
  const start = cleanAccounts(accounts);
  const value = roundRand(Number(amount) || 0);
  if (!(from in start) || !(to in start) || from === to) return { ok: false, reason: "same" };
  if (!(value > 0)) return { ok: false, reason: "amount" };
  const pocket = available == null ? start[from] : roundRand(Math.max(0, Number(available) || 0));
  if (value > pocket || value > start[from]) return { ok: false, reason: "funds" };
  return {
    ok: true,
    accounts: {
      ...start,
      [from]: roundRand(start[from] - value),
      [to]: roundRand(start[to] + value),
    },
    entry: moneyMove({ date, from, to, amount: value, reason: "manual" }),
  };
}
