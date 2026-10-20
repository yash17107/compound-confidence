import { describe, expect, it } from "vitest";
import { cleanAccounts, settleWeek, startingAccounts, weeksOfRent } from "./accounts.js";

const thaboSplit = { hold: 80, save: 50, invest: 50 };

describe("accounts", () => {
  it("gives the packed desks starting balances and new desks zero", () => {
    expect(startingAccounts("taxi")).toEqual({ main: 180, savings: 760, invest: 0 });
    expect(startingAccounts("custom")).toEqual({ main: 0, savings: 0, invest: 0 });
  });

  it("moves leftover into savings, investments and main from the split", () => {
    const { accounts, moves } = settleWeek(startingAccounts("taxi"), {
      moneyIn: 1420,
      moneyOut: 1240,
      split: thaboSplit,
    });
    expect(moves).toMatchObject({ leftover: 180, toSavings: 50, toInvest: 50, toMain: 80 });
    expect(accounts).toEqual({ main: 260, savings: 810, invest: 50 });
  });

  it("covers a missed week from main, then savings", () => {
    const { accounts, moves } = settleWeek(startingAccounts("taxi"), {
      moneyIn: 350,
      moneyOut: 1240,
      split: { hold: 0, save: 0, invest: 0 },
    });
    expect(moves).toMatchObject({ fromMain: 180, fromSavings: 710, short: 0 });
    expect(accounts).toEqual({ main: 0, savings: 50, invest: 0 });
  });

  it("reports what savings could not cover and never goes negative", () => {
    const { accounts, moves } = settleWeek(
      { main: 100, savings: 200, invest: 500 },
      { moneyIn: 0, moneyOut: 1000, split: {} },
    );
    expect(moves.short).toBe(700);
    expect(accounts).toEqual({ main: 0, savings: 0, invest: 500 });
  });

  it("never lets a split move more than the leftover", () => {
    const { moves } = settleWeek(EMPTY(), {
      moneyIn: 100,
      moneyOut: 60,
      split: { save: 90, invest: 90 },
    });
    expect(moves.toSavings + moves.toInvest + moves.toMain).toBe(40);
  });

  it("counts how many weeks of rent savings can cover", () => {
    expect(weeksOfRent(760, [{ id: "rent", amount: 700 }])).toBe(1.1);
  });

  it("cleans junk balances", () => {
    expect(cleanAccounts({ main: "abc", savings: -5, invest: "12.5" })).toEqual({
      main: 0,
      savings: 0,
      invest: 12.5,
    });
  });
});

function EMPTY() {
  return { main: 0, savings: 0, invest: 0 };
}
