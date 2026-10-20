import { describe, expect, it } from "vitest";
import { seededHistory } from "./forecast.js";
import { flexStats, levelFor, rentSafeStreak } from "./flex.js";
import { cleanGoals, defaultGoals, goalProgress, newGoal, projection } from "./goals.js";
import { seededLedger } from "./ledger.js";
import { DEMO_PROFILE } from "./profile.js";
import { billCalendar, cleanSchedule, daysUntil, safeToSpend } from "./safe.js";
import { moneyWrap, offlineWrap } from "./wrap.js";

const TUESDAY = new Date("2026-10-20T10:00:00");
const THABO = { main: 180, savings: 760, invest: 0 };

describe("goals", () => {
  it("seeds a four-weeks-of-rent buffer and a first investment goal", () => {
    const goals = defaultGoals(DEMO_PROFILE.obligated);
    expect(goals.map((goal) => [goal.preset, goal.target, goal.account])).toEqual([
      ["buffer", 2800, "savings"],
      ["firstInvest", 1000, "invest"],
    ]);
  });

  it("fills goals from balances and paces them by the forecast odds", () => {
    const [buffer, invest] = goalProgress(defaultGoals(DEMO_PROFILE.obligated), THABO, {
      pace: { savings: 50, invest: 0 },
      odds: 0.65,
      today: TUESDAY,
    });
    expect(buffer).toMatchObject({ have: 760, left: 2040, pct: 27, weekly: 32.5, weeks: 63 });
    expect(invest).toMatchObject({ have: 0, weeks: null, done: false });
  });

  it("queues later goals behind earlier ones on the same account", () => {
    const goals = [
      { id: "a", name: "Shoes", target: 500, account: "savings" },
      { id: "b", name: "Phone", target: 1000, account: "savings" },
    ];
    const [shoes, phone] = goalProgress(goals, THABO, { pace: { savings: 100 }, odds: 1 });
    expect(shoes.done).toBe(true);
    expect(phone).toMatchObject({ have: 260, left: 740, weeks: 8 });
  });

  it("rejects empty goals and caps the list", () => {
    expect(newGoal({ name: "", target: 100 }).ok).toBe(false);
    expect(newGoal({ name: "Fees", target: 0 }).ok).toBe(false);
    expect(newGoal({ name: "Fees", target: 900, account: "nope" }).goal.account).toBe("savings");
    expect(cleanGoals("junk")).toEqual([]);
  });

  it("compounds weekly money and splits growth from contributions", () => {
    const flat = projection({ weekly: 50, years: 10, rate: 0 });
    expect(flat[10]).toMatchObject({ value: 26000, contributed: 26000, growth: 0 });
    const grown = projection({ weekly: 50, years: 10, rate: 0.1 });
    expect(grown[10].contributed).toBe(26000);
    expect(grown[10].value).toBeGreaterThan(42000);
    expect(grown[10].value).toBeLessThan(44000);
  });
});

describe("flex", () => {
  it("rewards landed weeks and smart sits", () => {
    const stats = flexStats({
      history: seededHistory("taxi"),
      ledger: seededLedger("taxi", TUESDAY),
      lessonDone: false,
      accounts: THABO,
      obligated: DEMO_PROFILE.obligated,
    });
    expect(stats.xp).toBe(780);
    expect(stats.level.id).toBe("tracker");
    expect(stats.streak).toBe(6);
    const on = stats.badges.filter((badge) => badge.on).map((badge) => badge.id);
    expect(on).toEqual(["firstStack", "rentSafe4", "satItOut"]);
  });

  it("breaks the streak on a short week", () => {
    expect(rentSafeStreak([{ short: 0 }, { short: 120 }, { short: 0 }, {}])).toBe(2);
  });

  it("tops out at Compounder", () => {
    expect(levelFor(0).id).toBe("starter");
    expect(levelFor(1200)).toMatchObject({ id: "flexer", pct: 0, toNext: 800 });
    expect(levelFor(9999)).toMatchObject({ id: "compounder", next: null, pct: 100 });
  });
});

describe("safe to spend and bills", () => {
  it("counts days to payday and splits Main after the buffer", () => {
    expect(daysUntil(5, TUESDAY)).toBe(3);
    const safe = safeToSpend({ main: 180, forecast: { call: "light" }, today: TUESDAY });
    expect(safe).toMatchObject({ daysLeft: 3, pool: 130, perDay: 43, held: 50 });
  });

  it("holds back half when the forecast says sit", () => {
    const safe = safeToSpend({ main: 180, forecast: { call: "sit" }, today: TUESDAY });
    expect(safe).toMatchObject({ pool: 65, perDay: 21, careful: true });
  });

  it("orders bills by due day and flags the ones money in can't cover", () => {
    const good = billCalendar({ obligated: DEMO_PROFILE.obligated, moneyIn: 1420, savings: 760, today: TUESDAY });
    expect(good.map((bill) => bill.id)).toEqual(["airtime", "food", "stokvel", "rent"]);
    expect(good.every((bill) => bill.status === "covered")).toBe(true);

    const bad = billCalendar({ obligated: DEMO_PROFILE.obligated, moneyIn: 350, savings: 300, today: TUESDAY });
    expect(bad.map((bill) => bill.status)).toEqual(["covered", "savings", "savings", "short"]);
  });

  it("cleans a junk schedule", () => {
    expect(cleanSchedule({ payday: 9, due: { rent: "x", food: 2 } })).toEqual({ payday: 5, due: { food: 2 } });
  });
});

describe("money wrap", () => {
  it("tells Thabo's month from the ledger", () => {
    const wrap = moneyWrap(seededLedger("taxi", TUESDAY), { today: TUESDAY });
    expect(wrap.moneyIn).toBe(4810);
    expect(wrap.moneyOut).toBe(4960);
    expect(wrap.toSavings).toBe(450);
    expect(wrap.badWeeks).toBe(1);
    expect(wrap.top).toEqual({ id: "rent", amount: 2800 });
    expect(wrap.vibe).toBe("survivor");
    expect(offlineWrap(wrap)).toMatch(/buffer did its job/);
  });

  it("has a friendly empty state", () => {
    expect(offlineWrap(moneyWrap([]))).toMatch(/no money moved/i);
  });
});
