import { leftoverOf, roundRand, sumAmounts } from "./money.js";
import { missPrimaryPrint, restorePrimaryPrint } from "./profile.js";

export const HISTORY_LIMIT = 12;
export const BUFFER = 50;

const week = (moneyIn, moneyOut, missed) => ({ moneyIn, moneyOut, missed });

export const SEEDED_HISTORY = {
  taxi: [
    week(1420, 1240, false),
    week(350, 1240, true),
    week(1620, 1240, false),
    week(1420, 1240, false),
    week(350, 1240, true),
    week(1420, 1240, false),
  ],
  care: [
    week(1400, 1200, false),
    week(0, 1200, true),
    week(1400, 1200, false),
    week(1400, 1200, false),
    week(1400, 1200, false),
    week(1400, 1200, false),
  ],
};

export function seededHistory(hustle) {
  return (SEEDED_HISTORY[hustle] || []).map((item) => ({ ...item }));
}

export function weekRecord(income, obligated) {
  return {
    moneyIn: roundRand(sumAmounts(income)),
    moneyOut: roundRand(sumAmounts(obligated)),
    missed: (income || []).some((item) => item.missed),
  };
}

export function appendWeek(history, record) {
  return [...(history || []), record].slice(-HISTORY_LIMIT);
}

function recencyWeights(count) {
  return Array.from({ length: count }, (_, index) => index + 1);
}

export function landingOdds(history) {
  const weeks = history || [];
  if (!weeks.length) return 1;
  const weights = recencyWeights(weeks.length);
  const total = weights.reduce((sum, w) => sum + w, 0);
  const landed = weeks.reduce((sum, item, index) => sum + (item.missed ? 0 : weights[index]), 0);
  // Laplace-style smoothing so one bad week can't make the odds 0% or 100%.
  return (landed + 1) / (total + 2);
}

export function missStreak(history) {
  let streak = 0;
  for (let index = (history || []).length - 1; index >= 0; index -= 1) {
    if (!history[index].missed) break;
    streak += 1;
  }
  return streak;
}

function roundTen(value) {
  return Math.max(0, Math.floor(value / 10) * 10);
}

export function forecastWeek({ history, income, obligated }) {
  const weeks = history || [];
  const landed = weeks.filter((item) => !item.missed).length;
  const goodTape = restorePrimaryPrint(income || []).filter((item) => item.id !== "extra");
  const goodLeftover = leftoverOf(goodTape, obligated || []);
  const badLeftover = leftoverOf(missPrimaryPrint(goodTape), obligated || []);
  const streak = missStreak(weeks);

  let odds = landingOdds(weeks);
  if (streak >= 2) odds *= 0.75;
  odds = Math.min(0.97, Math.max(0.03, odds));

  const expected = roundRand(odds * goodLeftover + (1 - odds) * badLeftover);
  const shortRisk = badLeftover < 0 ? 1 - odds : 0;
  const lowData = weeks.length < 3;

  let call = "go";
  if (goodLeftover <= 0 || shortRisk >= 0.5) call = "sit";
  else if (shortRisk >= 0.2 || lowData) call = "light";

  const room = Math.max(0, goodLeftover - BUFFER);
  const investCap =
    call === "sit" ? 0 : roundTen(call === "light" ? room * (1 - shortRisk) * 0.5 : room * (1 - shortRisk));
  const setAside = shortRisk > 0 ? roundTen(Math.max(0, goodLeftover - investCap)) : BUFFER;

  return {
    weeks: weeks.length,
    landed,
    odds: roundRand(odds),
    oddsPct: Math.round(odds * 100),
    riskPct: Math.round(shortRisk * 100),
    goodLeftover,
    badLeftover,
    expected,
    streak,
    lowData,
    call,
    investCap,
    setAside,
  };
}
