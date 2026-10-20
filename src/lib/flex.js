import { weeksOfRent } from "./accounts.js";

export const LEVELS = [
  { id: "starter", xp: 0 },
  { id: "stacker", xp: 300 },
  { id: "tracker", xp: 700 },
  { id: "flexer", xp: 1200 },
  { id: "compounder", xp: 2000 },
];

export const XP = {
  landed: 100,
  satSafe: 150,
  lesson: 200,
  save: 20,
  invest: 30,
  goal: 300,
};

export const BADGES = ["firstStack", "rentSafe4", "satItOut", "lesson", "firstInvest", "buffer2", "goalHit"];

export function rentSafeStreak(history) {
  let streak = 0;
  for (let index = (history || []).length - 1; index >= 0; index -= 1) {
    if (Number(history[index]?.short) > 0) break;
    streak += 1;
  }
  return streak;
}

export function levelFor(xp) {
  let index = 0;
  LEVELS.forEach((level, i) => {
    if (xp >= level.xp) index = i;
  });
  const level = LEVELS[index];
  const next = LEVELS[index + 1] || null;
  const pct = next ? Math.round(((xp - level.xp) / (next.xp - level.xp)) * 100) : 100;
  return { ...level, index, next, pct, toNext: next ? next.xp - xp : 0 };
}

export function flexStats({ history = [], ledger = [], lessonDone = false, accounts, obligated, goalsDone = 0 }) {
  const weeks = history || [];
  const landed = weeks.filter((week) => !week.missed).length;
  const satSafe = weeks.filter((week) => week.missed && !(Number(week.short) > 0)).length;
  const saves = (ledger || []).filter((entry) => entry.kind === "move" && entry.to === "savings").length;
  const invests = (ledger || []).filter((entry) => entry.kind === "move" && entry.to === "invest").length;

  const xp =
    landed * XP.landed +
    satSafe * XP.satSafe +
    (lessonDone ? XP.lesson : 0) +
    saves * XP.save +
    invests * XP.invest +
    goalsDone * XP.goal;

  const streak = rentSafeStreak(weeks);
  const rentWeeks = weeksOfRent(accounts?.savings, obligated);
  const earned = {
    firstStack: saves > 0,
    rentSafe4: streak >= 4,
    satItOut: satSafe > 0,
    lesson: Boolean(lessonDone),
    firstInvest: invests > 0 || Number(accounts?.invest) > 0,
    buffer2: rentWeeks >= 2,
    goalHit: goalsDone > 0,
  };

  return {
    xp,
    level: levelFor(xp),
    streak,
    landed,
    satSafe,
    rentWeeks,
    badges: BADGES.map((id) => ({ id, on: earned[id] })),
    earnedCount: BADGES.filter((id) => earned[id]).length,
  };
}
