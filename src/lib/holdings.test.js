import { describe, expect, it } from "vitest";
import { leftoverCash, buyHolding, portfolioOf, sellHolding } from "./holdings.js";

const STX = "STX40.JO";
const PRICE = 80;

describe("leftover marketplace", () => {
  it("only leftover cash in Investments can buy an ETF slice", () => {
    const bought = buyHolding({
      invest: 40,
      holdings: [],
      ticker: STX,
      amount: 40,
      price: PRICE,
      lessonDone: true,
    });
    expect(bought.ok).toBe(true);
    expect(bought.holdings[0]).toMatchObject({ ticker: STX, cost: 40 });
    expect(bought.holdings[0].units).toBeCloseTo(0.5);
    expect(bought.cash).toBe(0);
  });

  it("blocks buys until the lesson is done, and never spends more than leftover cash", () => {
    expect(buyHolding({ invest: 40, holdings: [], ticker: STX, amount: 40, price: PRICE, lessonDone: false }).reason).toBe("lesson");
    expect(buyHolding({ invest: 40, holdings: [], ticker: STX, amount: 50, price: PRICE, lessonDone: true }).reason).toBe("funds");
    expect(buyHolding({ invest: 40, holdings: [], ticker: "BTC-USD", amount: 10, price: 1, lessonDone: true }).reason).toBe("unknown");
  });

  it("keeps units marked to market without touching leftover cost", () => {
    const holdings = [{ ticker: STX, units: 0.5, cost: 40 }];
    const snap = portfolioOf({
      invest: 40,
      holdings,
      quotes: { [STX]: { price: 88 } },
    });
    expect(snap.cash).toBe(0);
    expect(snap.market).toBe(44);
    expect(snap.live).toBe(44);
    expect(snap.pnl).toBe(4);
    expect(leftoverCash(40, holdings)).toBe(0);
  });

  it("sells back into Investments, never into Main", () => {
    const sold = sellHolding({
      invest: 40,
      holdings: [{ ticker: STX, units: 0.5, cost: 40 }],
      ticker: STX,
      units: 0.5,
      price: 88,
    });
    expect(sold.ok).toBe(true);
    expect(sold.holdings).toEqual([]);
    expect(sold.accountsInvest).toBe(44);
    expect(sold.trade.pnl).toBe(4);
    expect(sold.cash).toBe(44);
  });
});
