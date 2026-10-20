import { roundRand } from "./money.js";

export const ACCOUNT_IDS = ["main", "savings", "invest"];

export const EMPTY_ACCOUNTS = { main: 0, savings: 0, invest: 0 };

export const STARTING_ACCOUNTS = {
  taxi: { main: 180, savings: 760, invest: 0 },
  care: { main: 220, savings: 940, invest: 0 },
};

export function startingAccounts(hustle) {
  return { ...(STARTING_ACCOUNTS[hustle] || EMPTY_ACCOUNTS) };
}

export function cleanAccounts(accounts) {
  const source = accounts && typeof accounts === "object" ? accounts : {};
  return Object.fromEntries(
    ACCOUNT_IDS.map((id) => [id, roundRand(Math.max(0, Number(source[id]) || 0))]),
  );
}

export function rentAmount(obligated) {
  const rent = (obligated || []).find((item) => item.id === "rent");
  return roundRand(Math.max(0, Number(rent?.amount) || 0));
}

export function weeksOfRent(savings, obligated) {
  const rent = rentAmount(obligated);
  if (rent <= 0) return 0;
  return Math.round(((Number(savings) || 0) / rent) * 10) / 10;
}

export function netWorth(accounts) {
  const clean = cleanAccounts(accounts);
  return roundRand(clean.main + clean.savings + clean.invest);
}

export function settleWeek(accounts, { moneyIn, moneyOut, split }) {
  const start = cleanAccounts(accounts);
  const leftover = roundRand(Number(moneyIn) - Number(moneyOut));

  if (leftover < 0) {
    const need = -leftover;
    const fromMain = Math.min(start.main, need);
    const fromSavings = Math.min(start.savings, roundRand(need - fromMain));
    const short = roundRand(need - fromMain - fromSavings);
    return {
      accounts: {
        main: roundRand(start.main - fromMain),
        savings: roundRand(start.savings - fromSavings),
        invest: start.invest,
      },
      moves: { leftover, toSavings: 0, toInvest: 0, toMain: 0, fromMain, fromSavings, short },
    };
  }

  const toSavings = Math.min(Math.max(0, Number(split?.save) || 0), leftover);
  const toInvest = Math.min(Math.max(0, Number(split?.invest) || 0), roundRand(leftover - toSavings));
  const toMain = roundRand(leftover - toSavings - toInvest);
  return {
    accounts: {
      main: roundRand(start.main + toMain),
      savings: roundRand(start.savings + toSavings),
      invest: roundRand(start.invest + toInvest),
    },
    moves: { leftover, toSavings, toInvest, toMain, fromMain: 0, fromSavings: 0, short: 0 },
  };
}
