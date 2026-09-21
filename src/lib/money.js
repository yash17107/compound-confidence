export function sumAmounts(items) {
  return items.reduce((total, item) => total + Number(item.amount || 0), 0);
}

export function leftoverOf(income, obligated) {
  return roundRand(sumAmounts(income) - sumAmounts(obligated));
}

export function roundRand(value) {
  return Math.round(Number(value) * 100) / 100;
}

export function hasEmergencyBuffer(split, leftover) {
  const buffer = Number(split.hold || 0) + Number(split.save || 0);
  return leftover <= 0 ? false : buffer >= Math.min(50, leftover);
}

export function splitTotals(split) {
  return roundRand(
    Number(split.hold || 0) + Number(split.save || 0) + Number(split.invest || 0),
  );
}

export function validateSplit(leftover, split) {
  const hold = Number(split.hold || 0);
  const save = Number(split.save || 0);
  const invest = Number(split.invest || 0);
  const total = roundRand(hold + save + invest);

  if (hold < 0 || save < 0 || invest < 0) {
    return { ok: false, reason: "negative" };
  }
  if (total > leftover) {
    return { ok: false, reason: "exceeds-leftover" };
  }
  if (invest > 0 && leftover <= 0) {
    return { ok: false, reason: "no-leftover" };
  }
  return { ok: true, remaining: roundRand(leftover - total), total };
}

export function paperWeekPnl(amount) {
  const start = roundRand(amount);
  const change = roundRand(start * 0.024);
  return { start, change, value: roundRand(start + change) };
}

export function confidenceOf({ lessonDone, split, leftover, rugCaught }) {
  const checks = {
    lesson: Boolean(lessonDone),
    buffer: hasEmergencyBuffer(split, Math.max(leftover, 0)),
    rug: Boolean(rugCaught),
  };
  const score = Number(checks.lesson) + Number(checks.buffer) + Number(checks.rug);
  return {
    checks,
    score,
    max: 3,
    ready: score === 3,
  };
}

export function canPaperInvest({ leftover, split, lessonDone, usingCredit }) {
  if (usingCredit) {
    return { ok: false, reason: "credit" };
  }
  if (Number(leftover) <= 0) {
    return { ok: false, reason: "no-leftover" };
  }
  if (!lessonDone) {
    return { ok: false, reason: "lesson" };
  }
  const splitCheck = validateSplit(leftover, split);
  if (!splitCheck.ok) {
    return splitCheck;
  }
  if (Number(split.invest || 0) <= 0) {
    return { ok: false, reason: "zero-invest" };
  }
  if (!hasEmergencyBuffer(split, leftover)) {
    return { ok: false, reason: "buffer" };
  }
  return { ok: true };
}

export function formatRand(value, digits = 0) {
  const amount = Number(value) || 0;
  const formatted = amount.toLocaleString("en-ZA", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return `R${formatted}`;
}
