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

export function confidenceOf({ lessonDone, split, leftover, forecast }) {
  const dry = Math.max(Number(leftover) || 0, 0);
  const invest = Number(split?.invest || 0);
  const cap = Number(forecast?.investCap);
  const splitCheck = validateSplit(dry, split || {});
  const checks = {
    lesson: Boolean(lessonDone),
    buffer: leftover <= 0 ? true : hasEmergencyBuffer(split, dry),
    cap: leftover <= 0 || (splitCheck.ok && (Number.isNaN(cap) || invest <= cap)),
  };
  const score = Number(checks.lesson) + Number(checks.buffer) + Number(checks.cap);
  return {
    checks,
    score,
    max: 3,
    ready: score === 3,
  };
}

export function canAllocateInvest({ leftover, split, lessonDone, forecast }) {
  const invest = Number(split?.invest || 0);
  if (invest <= 0) return { ok: true };
  if (Number(leftover) <= 0) {
    return { ok: false, reason: "no-leftover" };
  }
  if (!lessonDone) {
    return { ok: false, reason: "lesson" };
  }
  const splitCheck = validateSplit(leftover, split);
  if (!splitCheck.ok) return splitCheck;
  if (!hasEmergencyBuffer(split, leftover)) {
    return { ok: false, reason: "buffer" };
  }
  const cap = Number(forecast?.investCap);
  if (!Number.isNaN(cap) && invest > cap) {
    return { ok: false, reason: "cap" };
  }
  return { ok: true };
}

export function displayAmount(value, digits = 0) {
  const places = Math.max(0, Number(digits) || 0);
  const factor = 10 ** places;
  return Math.round((Number(value) || 0) * factor) / factor + 0;
}

export function formatRand(value, digits = 0) {
  const amount = displayAmount(value, digits);
  const formatted = amount.toLocaleString("en-ZA", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return `R${formatted}`;
}

export function formatSignedRand(value, digits = 0) {
  const amount = displayAmount(value, digits);
  if (amount === 0) return formatRand(0, digits);
  return `${amount > 0 ? "+" : "-"}${formatRand(Math.abs(amount), digits)}`;
}

export function formatPct(value) {
  const amount = Math.round((Number(value) || 0) * 10) / 10;
  if (amount === 0) return "0%";
  return `${amount > 0 ? "+" : ""}${amount}%`;
}
