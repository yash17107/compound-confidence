import { describe, expect, it } from "vitest";
import { leftoverOf } from "./money.js";
import {
  leftoverFromCustom,
  missPrimaryPrint,
  needsSetup,
  NOMSA_PROFILE,
  packedProfile,
  restorePrimaryPrint,
  suggestedSplit,
  tapeFromAnswers,
} from "./profile.js";

describe("tapeFromAnswers", () => {
  it("builds Thabo's leftover from the taxi hustle defaults", () => {
    const tape = tapeFromAnswers({ hustle: "taxi" });
    expect(leftoverOf(tape.income, tape.obligated)).toBe(180);
  });

  it("sizes a custom tape from scratch with no Thabo defaults", () => {
    const leftover = leftoverFromCustom(
      [{ label: "Shift", amount: 1000 }],
      [{ label: "Rent", amount: 700 }],
    );
    expect(leftover).toBe(300);
  });
});

describe("suggestedSplit", () => {
  it("keeps a R50 buffer before paper", () => {
    const split = suggestedSplit(180);
    expect(split.invest).toBe(50);
    expect(split.hold + split.save).toBeGreaterThanOrEqual(50);
    expect(split.hold + split.save + split.invest).toBe(180);
  });

  it("sits when leftover is zero", () => {
    expect(suggestedSplit(0)).toEqual({ hold: 0, save: 0, invest: 0 });
  });
});

describe("packed tapes", () => {
  it("builds Nomsa's leftover from the care tape", () => {
    expect(leftoverOf(NOMSA_PROFILE.income, NOMSA_PROFILE.obligated)).toBe(200);
    expect(packedProfile("care")).toBe(NOMSA_PROFILE);
  });

  it("zeros the primary print for an ugly week, then restores it", () => {
    const missed = missPrimaryPrint(NOMSA_PROFILE.income);
    expect(missed[0].amount).toBe(0);
    expect(missed[0].missed).toBe(true);
    expect(leftoverOf(missed, NOMSA_PROFILE.obligated)).toBe(-1200);
    expect(restorePrimaryPrint(missed)[0].amount).toBe(1400);
  });
});

describe("needsSetup", () => {
  it("skips Thabo and asks a new desk to answer", () => {
    expect(needsSetup({ demo: true, setupDone: true })).toBe(false);
    expect(needsSetup({ demo: false, setupDone: false })).toBe(true);
  });
});
