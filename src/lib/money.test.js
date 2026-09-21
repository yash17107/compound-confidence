import { describe, expect, it } from "vitest";
import {
  canPaperInvest,
  confidenceOf,
  leftoverOf,
  paperWeekPnl,
  splitTotals,
  validateSplit,
} from "./money.js";

const income = [
  { id: "gig", amount: 1070 },
  { id: "sassa", amount: 350 },
];

const obligated = [
  { id: "rent", amount: 700 },
  { id: "food", amount: 320 },
  { id: "airtime", amount: 70 },
  { id: "stokvel", amount: 150 },
];

describe("leftoverOf", () => {
  it("computes Thabo's leftover as R180", () => {
    expect(leftoverOf(income, obligated)).toBe(180);
  });

  it("drops leftover when a gig is removed", () => {
    expect(leftoverOf([{ amount: 350 }], obligated)).toBe(-890);
  });
});

describe("validateSplit", () => {
  it("accepts a split that uses the full leftover", () => {
    const result = validateSplit(180, { hold: 80, save: 50, invest: 50 });
    expect(result.ok).toBe(true);
    expect(result.remaining).toBe(0);
    expect(splitTotals({ hold: 80, save: 50, invest: 50 })).toBe(180);
  });

  it("rejects investing more than leftover", () => {
    const result = validateSplit(180, { hold: 0, save: 0, invest: 200 });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("exceeds-leftover");
  });
});

describe("canPaperInvest", () => {
  const goodSplit = { hold: 80, save: 50, invest: 50 };

  it("blocks a buy before the lesson", () => {
    expect(
      canPaperInvest({
        leftover: 180,
        split: goodSplit,
        lessonDone: false,
        usingCredit: false,
      }).reason,
    ).toBe("lesson");
  });

  it("sits when leftover is gone, even before the lesson", () => {
    expect(
      canPaperInvest({
        leftover: 0,
        split: { hold: 0, save: 0, invest: 0 },
        lessonDone: false,
        usingCredit: false,
      }).reason,
    ).toBe("no-leftover");
  });

  it("blocks mashonisa-funded investing", () => {
    expect(
      canPaperInvest({
        leftover: 180,
        split: goodSplit,
        lessonDone: true,
        usingCredit: true,
      }).reason,
    ).toBe("credit");
  });

  it("requires a cash buffer before a paper buy", () => {
    expect(
      canPaperInvest({
        leftover: 180,
        split: { hold: 0, save: 0, invest: 180 },
        lessonDone: true,
        usingCredit: false,
      }).reason,
    ).toBe("buffer");
  });

  it("allows a paper buy of leftover after the lesson", () => {
    expect(
      canPaperInvest({
        leftover: 180,
        split: goodSplit,
        lessonDone: true,
        usingCredit: false,
      }).ok,
    ).toBe(true);
  });
});

describe("confidenceOf", () => {
  const split = { hold: 80, save: 50, invest: 50 };

  it("starts with only the buffer lit for Thabo", () => {
    const result = confidenceOf({
      lessonDone: false,
      split,
      leftover: 180,
      rugCaught: false,
    });
    expect(result.score).toBe(1);
    expect(result.ready).toBe(false);
    expect(result.checks.buffer).toBe(true);
  });

  it("is ready after lesson, buffer, and a rug catch", () => {
    const result = confidenceOf({
      lessonDone: true,
      split,
      leftover: 180,
      rugCaught: true,
    });
    expect(result.score).toBe(3);
    expect(result.ready).toBe(true);
  });
});

describe("paperWeekPnl", () => {
  it("prints a small paper move on a R50 lot", () => {
    const pnl = paperWeekPnl(50);
    expect(pnl.start).toBe(50);
    expect(pnl.change).toBe(1.2);
    expect(pnl.value).toBe(51.2);
  });
});
