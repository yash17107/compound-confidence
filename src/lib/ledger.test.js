import { describe, expect, it } from "vitest";
import { settleWeek, startingAccounts } from "./accounts.js";
import {
  accountStatement,
  appendEntries,
  cleanLedger,
  seededLedger,
  transfer,
  weekEntries,
} from "./ledger.js";
import { DEMO_PROFILE } from "./profile.js";

const TODAY = new Date("2026-10-14T10:00:00");

describe("seeded ledger", () => {
  for (const hustle of ["taxi", "care"]) {
    it(`never takes a ${hustle} account below zero over 30 days`, () => {
      const ledger = seededLedger(hustle, TODAY);
      const accounts = startingAccounts(hustle);
      for (const id of ["main", "savings", "invest"]) {
        const statement = accountStatement(ledger, id, accounts[id], { today: TODAY });
        expect(statement.opening).toBeGreaterThanOrEqual(0);
        statement.rows.forEach((row) => expect(row.balance).toBeGreaterThanOrEqual(0));
      }
    });
  }

  it("shows Thabo's transfers between Main and Savings", () => {
    const ledger = seededLedger("taxi", TODAY);
    const savings = accountStatement(ledger, "savings", 760, { today: TODAY });
    expect(savings.rows.some((row) => row.from === "main" && row.reason === "manual")).toBe(true);
    expect(savings.rows.some((row) => row.from === "savings" && row.reason === "cover")).toBe(true);
    expect(savings.rows[0].balance).toBe(760);
  });
});

describe("accountStatement", () => {
  it("adds money in and out for the window", () => {
    const ledger = seededLedger("taxi", TODAY);
    const main = accountStatement(ledger, "main", 180, { today: TODAY });
    expect(main.moneyIn).toBeGreaterThan(main.moneyOut);
    expect(main.rows[0].balance).toBe(180);
    expect(main.opening + main.moneyIn - main.moneyOut).toBe(180);
  });

  it("leaves older entries out of a 30-day window", () => {
    const ledger = [
      { id: "a", date: "2026-08-01", kind: "in", account: "main", amount: 100 },
      { id: "b", date: "2026-10-10", kind: "in", account: "main", amount: 50 },
    ];
    const main = accountStatement(ledger, "main", 150, { today: TODAY });
    expect(main.rows).toHaveLength(1);
    expect(main.opening).toBe(100);
  });
});

describe("weekEntries", () => {
  it("matches settleWeek for a good week", () => {
    const start = startingAccounts("taxi");
    const settled = settleWeek(start, {
      moneyIn: 1420,
      moneyOut: 1240,
      split: { hold: 80, save: 50, invest: 50 },
    });
    const entries = weekEntries({
      income: DEMO_PROFILE.income,
      obligated: DEMO_PROFILE.obligated,
      moves: settled.moves,
      date: "2026-10-14",
    });
    for (const id of ["main", "savings", "invest"]) {
      const statement = accountStatement(entries, id, settled.accounts[id], { today: TODAY });
      expect(statement.opening).toBe(start[id]);
    }
  });

  it("marks unpaid bills when Main and Savings run dry", () => {
    const settled = settleWeek({ main: 0, savings: 100, invest: 0 }, { moneyIn: 0, moneyOut: 1240 });
    const entries = weekEntries({
      income: [{ id: "gig", amount: 0, missed: true }],
      obligated: DEMO_PROFILE.obligated,
      moves: settled.moves,
      date: "2026-10-14",
    });
    const unpaid = entries.reduce((sum, entry) => sum + (entry.unpaid || 0), 0);
    expect(unpaid).toBe(settled.moves.short);
    const main = accountStatement(entries, "main", settled.accounts.main, { today: TODAY });
    expect(main.opening).toBe(0);
  });
});

describe("transfer", () => {
  const accounts = { main: 180, savings: 760, invest: 0 };

  it("moves money from Main to Savings", () => {
    const result = transfer(accounts, { from: "main", to: "savings", amount: 100, date: "2026-10-14" });
    expect(result.ok).toBe(true);
    expect(result.accounts).toEqual({ main: 80, savings: 860, invest: 0 });
    expect(result.entry).toMatchObject({ kind: "move", from: "main", to: "savings", amount: 100 });
  });

  it("blocks overdrafts, same-account moves and side doors into Investments", () => {
    expect(transfer(accounts, { from: "main", to: "savings", amount: 500 }).reason).toBe("funds");
    expect(transfer(accounts, { from: "main", to: "main", amount: 10 }).reason).toBe("same");
    expect(transfer(accounts, { from: "savings", to: "invest", amount: 10 }).reason).toBe("invest");
    expect(transfer(accounts, { from: "main", to: "savings", amount: 0 }).reason).toBe("amount");
  });
});

describe("ledger housekeeping", () => {
  it("drops junk entries and caps length", () => {
    expect(cleanLedger([null, { date: "x", kind: "nope", amount: 1 }, "junk"])).toEqual([]);
    expect(cleanLedger("junk")).toEqual([]);
    const many = Array.from({ length: 500 }, (_, i) => ({ id: String(i) }));
    expect(appendEntries([], many)).toHaveLength(400);
  });
});
