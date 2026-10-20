import { describe, expect, it } from "vitest";
import { DEMO_PROFILE, NOMSA_PROFILE, missPrimaryPrint } from "./profile.js";
import {
  HISTORY_LIMIT,
  appendWeek,
  forecastWeek,
  landingOdds,
  missStreak,
  seededHistory,
  weekRecord,
} from "./forecast.js";

const thabo = (history) =>
  forecastWeek({ history, income: DEMO_PROFILE.income, obligated: DEMO_PROFILE.obligated });

describe("forecast", () => {
  it("weights recent weeks more than old ones", () => {
    const missedLongAgo = [{ missed: true }, { missed: false }, { missed: false }];
    const missedLately = [{ missed: false }, { missed: false }, { missed: true }];
    expect(landingOdds(missedLongAgo)).toBeGreaterThan(landingOdds(missedLately));
  });

  it("tells Thabo to size lightly because his gig misses a third of the time", () => {
    const f = thabo(seededHistory("taxi"));
    expect(f.call).toBe("light");
    expect(f.landed).toBe(4);
    expect(f.weeks).toBe(6);
    expect(f.goodLeftover).toBe(180);
    expect(f.badLeftover).toBeLessThan(0);
    expect(f.investCap).toBeLessThan(DEMO_PROFILE.split.invest + 1);
  });

  it("lets steady Nomsa size up to a cap", () => {
    const f = forecastWeek({
      history: seededHistory("care"),
      income: NOMSA_PROFILE.income,
      obligated: NOMSA_PROFILE.obligated,
    });
    expect(f.call).toBe("go");
    expect(f.investCap).toBeGreaterThan(0);
    expect(f.investCap).toBeLessThanOrEqual(150);
  });

  it("flips Thabo to sit after another missed week is logged", () => {
    const missedWeek = weekRecord(missPrimaryPrint(DEMO_PROFILE.income), DEMO_PROFILE.obligated);
    expect(missedWeek.missed).toBe(true);
    const f = thabo(appendWeek(seededHistory("taxi"), missedWeek));
    expect(f.call).toBe("sit");
    expect(f.investCap).toBe(0);
  });

  it("is careful after a miss streak", () => {
    const history = [{ missed: false }, { missed: true }, { missed: true }];
    expect(missStreak(history)).toBe(2);
    expect(thabo(history).call).toBe("sit");
  });

  it("forecasts the same week whether this week's print is toggled missed or not", () => {
    const history = seededHistory("taxi");
    const missedNow = forecastWeek({
      history,
      income: missPrimaryPrint(DEMO_PROFILE.income),
      obligated: DEMO_PROFILE.obligated,
    });
    expect(missedNow.goodLeftover).toBe(thabo(history).goodLeftover);
  });

  it("flags low data and keeps a new desk light", () => {
    const f = thabo([]);
    expect(f.lowData).toBe(true);
    expect(f.call).toBe("light");
  });

  it("keeps only the last weeks", () => {
    let history = [];
    for (let i = 0; i < HISTORY_LIMIT + 5; i += 1) {
      history = appendWeek(history, { moneyIn: i, moneyOut: 0, missed: false });
    }
    expect(history).toHaveLength(HISTORY_LIMIT);
    expect(history.at(-1).moneyIn).toBe(HISTORY_LIMIT + 4);
  });
});
