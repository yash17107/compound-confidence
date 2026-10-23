export const POPIA_VERSION = "POPIA-1";
export const QUESTION_MAX = 500;
export const LINE_MAX = 20;
export const HISTORY_MAX = 12;

function asAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.max(0, amount);
}

function slimLine(row) {
  if (!row || typeof row !== "object") return null;
  const line = {
    id: String(row.id || "").slice(0, 40),
    amount: asAmount(row.amount),
  };
  if (row.missed) {
    line.missed = true;
    if (row.was != null) line.was = asAmount(row.was);
  }
  return line;
}

export function minimiseDesk(desk) {
  const source = desk && typeof desk === "object" ? desk : {};
  const lines = (rows) =>
    (Array.isArray(rows) ? rows : []).slice(0, LINE_MAX).map(slimLine).filter(Boolean);
  return {
    income: lines(source.income),
    obligated: lines(source.obligated),
    history: (Array.isArray(source.history) ? source.history : [])
      .slice(-HISTORY_MAX)
      .map((week) => ({ missed: Boolean(week?.missed) })),
  };
}

export function minimiseQuestion(question) {
  return String(question || "").trim().slice(0, QUESTION_MAX);
}

export function minimiseWrap(wrap) {
  const source = wrap && typeof wrap === "object" ? wrap : {};
  const numbers = [
    "moneyIn",
    "moneyOut",
    "net",
    "unpaid",
    "toSavings",
    "fromSavings",
    "invested",
    "saveRate",
    "badWeeks",
    "paydays",
    "topShare",
    "count",
  ];
  const clean = Object.fromEntries(numbers.map((key) => [key, asAmount(source[key])]));
  clean.vibe = ["survivor", "compounder", "stacker", "starter"].includes(source.vibe)
    ? source.vibe
    : "starter";
  clean.topBills = (Array.isArray(source.topBills) ? source.topBills : []).slice(0, 5).map((bill, index) => ({
    id: `bill-${index + 1}`,
    amount: asAmount(bill?.amount),
  }));
  return clean;
}

export function consentRecord(when = new Date()) {
  return {
    popiaVersion: POPIA_VERSION,
    popiaAt: when.toISOString(),
  };
}
