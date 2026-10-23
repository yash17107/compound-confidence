import { describe, expect, it } from "vitest";
import {
  canAllocateInvest,
  confidenceOf,
  displayAmount,
  formatPct,
  formatRand,
  formatSignedRand,
  leftoverOf,
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

const goodSplit = { hold: 80, save: 50, invest: 50 };
const lightForecast = { investCap: 40 };

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
    const result = validateSplit(180, goodSplit);
    expect(result.ok).toBe(true);
    expect(result.remaining).toBe(0);
    expect(splitTotals(goodSplit)).toBe(180);
  });

  it("rejects investing more than leftover", () => {
    const result = validateSplit(180, { hold: 0, save: 0, invest: 200 });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("exceeds-leftover");
  });
});

describe("canAllocateInvest", () => {
  it("lets a zero investment through before the lesson", () => {
    expect(
      canAllocateInvest({
        leftover: 180,
        split: { hold: 180, save: 0, invest: 0 },
        lessonDone: false,
        forecast: lightForecast,
      }).ok,
    ).toBe(true);
  });

  it("blocks leftover into investments until the lesson is done", () => {
    expect(
      canAllocateInvest({
        leftover: 180,
        split: goodSplit,
        lessonDone: false,
        forecast: lightForecast,
      }).reason,
    ).toBe("lesson");
  });

  it("sits when leftover is gone", () => {
    expect(
      canAllocateInvest({
        leftover: 0,
        split: { hold: 0, save: 0, invest: 50 },
        lessonDone: true,
        forecast: lightForecast,
      }).reason,
    ).toBe("no-leftover");
  });

  it("requires a cash buffer before leftover can leave Main", () => {
    expect(
      canAllocateInvest({
        leftover: 180,
        split: { hold: 0, save: 0, invest: 180 },
        lessonDone: true,
        forecast: { investCap: 180 },
      }).reason,
    ).toBe("buffer");
  });

  it("caps leftover into investments at the forecast", () => {
    expect(
      canAllocateInvest({
        leftover: 180,
        split: goodSplit,
        lessonDone: true,
        forecast: lightForecast,
      }).reason,
    ).toBe("cap");
  });

  it("allows leftover into investments after the lesson, inside the cap", () => {
    expect(
      canAllocateInvest({
        leftover: 180,
        split: { hold: 90, save: 50, invest: 40 },
        lessonDone: true,
        forecast: lightForecast,
      }).ok,
    ).toBe(true);
  });
});

describe("confidenceOf", () => {
  it("starts with only the buffer lit for Thabo", () => {
    const result = confidenceOf({
      lessonDone: false,
      split: goodSplit,
      leftover: 180,
      forecast: lightForecast,
    });
    expect(result.score).toBe(1);
    expect(result.checks.buffer).toBe(true);
    expect(result.checks.cap).toBe(false);
    expect(result.ready).toBe(false);
  });

  it("is ready after the lesson and sizing inside the forecast cap", () => {
    const result = confidenceOf({
      lessonDone: true,
      split: { hold: 90, save: 50, invest: 40 },
      leftover: 180,
      forecast: lightForecast,
    });
    expect(result.score).toBe(3);
    expect(result.max).toBe(4);
    expect(result.ready).toBe(true);
  });

  it("lights the rug check without blocking leftover investing", () => {
    const result = confidenceOf({
      lessonDone: true,
      split: { hold: 90, save: 50, invest: 40 },
      leftover: 180,
      forecast: lightForecast,
      rugCaught: true,
    });
    expect(result.score).toBe(4);
    expect(result.checks.rug).toBe(true);
    expect(result.ready).toBe(true);
  });
});

describe("formatRand", () => {
  it("prints signed zero as R0", () => {
    expect(formatRand(-0)).toBe("R0");
    expect(formatSignedRand(-0.004)).toBe("R0");
    expect(formatSignedRand(-0.4)).toBe("R0");
    expect(displayAmount(-0.4)).toBe(0);
    expect(formatSignedRand(0)).toBe("R0");
    expect(formatSignedRand(12)).toBe("+R12");
    expect(formatSignedRand(-8)).toBe("-R8");
    expect(formatPct(-0)).toBe("0%");
  });
});
