import { cleanAccounts, rentAmount } from "./accounts.js";
import { roundRand } from "./money.js";

// Illustrative long-run yearly returns for a Top 40 ETF. Not a promise.
export const GROWTH_RATES = { low: 0.06, mid: 0.1, high: 0.13 };
export const MAX_GOALS = 6;
export const GOAL_ACCOUNTS = ["savings", "invest"];

const DAY_MS = 24 * 60 * 60 * 1000;

export function defaultGoals(obligated) {
  const rent = rentAmount(obligated) || 500;
  return [
    { id: "buffer", preset: "buffer", target: roundRand(rent * 4), account: "savings" },
    { id: "first-invest", preset: "firstInvest", target: 1000, account: "invest" },
  ];
}

export function cleanGoals(goals) {
  if (!Array.isArray(goals)) return [];
  return goals
    .filter((goal) => goal && typeof goal === "object")
    .map((goal, index) => ({
      id: String(goal.id || `goal-${index}`).slice(0, 40),
      ...(goal.preset ? { preset: String(goal.preset).slice(0, 20) } : {}),
      ...(goal.name ? { name: String(goal.name).trim().slice(0, 40) } : {}),
      target: roundRand(Math.max(0, Number(goal.target) || 0)),
      account: GOAL_ACCOUNTS.includes(goal.account) ? goal.account : "savings",
    }))
    .filter((goal) => goal.target > 0 && (goal.preset || goal.name))
    .slice(0, MAX_GOALS);
}

export function newGoal({ name, target, account }, existing = []) {
  const goal = cleanGoals([{ id: `goal-${Date.now().toString(36)}`, name, target, account }])[0];
  if (!goal) return { ok: false, reason: "invalid" };
  if (existing.length >= MAX_GOALS) return { ok: false, reason: "full" };
  return { ok: true, goal };
}

// Balances fill goals in order, per account. Pace is this week's planned move times the odds it lands.
export function goalProgress(goals, accounts, { pace = {}, odds = 1, today = new Date() } = {}) {
  const pool = { ...cleanAccounts(accounts) };
  const queued = { savings: 0, invest: 0 };

  return cleanGoals(goals).map((goal) => {
    const have = roundRand(Math.min(Math.max(pool[goal.account], 0), goal.target));
    pool[goal.account] = roundRand(pool[goal.account] - have);
    const left = roundRand(goal.target - have);
    queued[goal.account] = roundRand(queued[goal.account] + left);

    const weekly = roundRand(Math.max(0, Number(pace[goal.account]) || 0) * Math.max(0, Math.min(1, odds)));
    const weeks = left <= 0 ? 0 : weekly > 0 ? Math.ceil(queued[goal.account] / weekly) : null;
    const eta = weeks === null ? null : new Date(new Date(today).getTime() + weeks * 7 * DAY_MS);

    return {
      ...goal,
      have,
      left,
      pct: goal.target ? Math.round((have / goal.target) * 100) : 0,
      done: left <= 0,
      weekly,
      weeks,
      eta,
    };
  });
}

export function weeklyRate(yearly) {
  return Math.pow(1 + yearly, 1 / 52) - 1;
}

export function projection({ weekly, start = 0, years = 10, rate = GROWTH_RATES.mid }) {
  const amount = Math.max(0, Number(weekly) || 0);
  const opening = Math.max(0, Number(start) || 0);
  const i = weeklyRate(rate);
  const points = [];
  for (let year = 0; year <= years; year += 1) {
    const n = year * 52;
    const growth = Math.pow(1 + i, n);
    const fromWeekly = i > 0 ? amount * ((growth - 1) / i) : amount * n;
    const value = roundRand(opening * growth + fromWeekly);
    const contributed = roundRand(opening + amount * n);
    points.push({ year, value, contributed, growth: roundRand(value - contributed) });
  }
  return points;
}
