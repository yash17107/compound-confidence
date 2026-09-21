import { leftoverOf, roundRand } from "./money.js";
import { INITIAL_INCOME, INITIAL_OBLIGATED } from "../data/demo.js";

export const HUSTLES = [
  {
    id: "taxi",
    income: [
      { id: "gig", defaultAmount: 1070 },
      { id: "sassa", defaultAmount: 350 },
    ],
    bills: [
      { id: "rent", defaultAmount: 700 },
      { id: "food", defaultAmount: 320 },
      { id: "airtime", defaultAmount: 70 },
      { id: "stokvel", defaultAmount: 150 },
    ],
  },
  {
    id: "sassa",
    income: [
      { id: "sassa", defaultAmount: 350 },
      { id: "gig", defaultAmount: 600 },
    ],
    bills: [
      { id: "rent", defaultAmount: 500 },
      { id: "food", defaultAmount: 280 },
      { id: "airtime", defaultAmount: 60 },
      { id: "stokvel", defaultAmount: 80 },
    ],
  },
  {
    id: "job",
    income: [{ id: "salary", defaultAmount: 2200 }],
    bills: [
      { id: "rent", defaultAmount: 900 },
      { id: "food", defaultAmount: 400 },
      { id: "airtime", defaultAmount: 80 },
      { id: "transport", defaultAmount: 250 },
    ],
  },
  {
    id: "student",
    income: [
      { id: "allowance", defaultAmount: 800 },
      { id: "gig", defaultAmount: 400 },
    ],
    bills: [
      { id: "rent", defaultAmount: 500 },
      { id: "food", defaultAmount: 250 },
      { id: "airtime", defaultAmount: 60 },
      { id: "school", defaultAmount: 150 },
    ],
  },
  {
    id: "spaza",
    income: [{ id: "till", defaultAmount: 1600 }],
    bills: [
      { id: "rent", defaultAmount: 700 },
      { id: "stock", defaultAmount: 400 },
      { id: "food", defaultAmount: 300 },
      { id: "airtime", defaultAmount: 50 },
    ],
  },
  {
    id: "care",
    income: [{ id: "wages", defaultAmount: 1400 }],
    bills: [
      { id: "rent", defaultAmount: 650 },
      { id: "food", defaultAmount: 300 },
      { id: "airtime", defaultAmount: 70 },
      { id: "transport", defaultAmount: 180 },
    ],
  },
];

export const DEMO_PROFILE = {
  hustle: "taxi",
  city: "Soweto",
  income: INITIAL_INCOME,
  obligated: INITIAL_OBLIGATED,
  split: { hold: 80, save: 50, invest: 50 },
  setupDone: true,
};

export const NOMSA_PROFILE = {
  hustle: "care",
  city: "Tembisa",
  income: [{ id: "wages", amount: 1400 }],
  obligated: [
    { id: "rent", amount: 650, locked: true },
    { id: "food", amount: 300, locked: true },
    { id: "airtime", amount: 70, locked: true },
    { id: "transport", amount: 180, locked: true },
  ],
  split: { hold: 90, save: 60, invest: 50 },
  setupDone: true,
};

export function packedProfile(hustle) {
  return hustle === "care" ? NOMSA_PROFILE : DEMO_PROFILE;
}

export function missPrimaryPrint(income) {
  const target = (income || []).find(
    (item) => item.id !== "extra" && !item.missed && Number(item.amount) > 0,
  );
  if (!target) return income || [];
  return income.map((item) =>
    item.id === target.id
      ? { ...item, missed: true, was: item.amount, amount: 0 }
      : item,
  );
}

export function restorePrimaryPrint(income) {
  return (income || []).map((item) =>
    item.missed
      ? { ...item, amount: item.was ?? item.amount, missed: false, was: undefined }
      : item,
  );
}

export function hasMissedPrint(income) {
  return (income || []).some((item) => item.missed);
}

export function hustleSpec(id) {
  return HUSTLES.find((item) => item.id === id) || HUSTLES[0];
}

export function defaultsFor(hustle) {
  const spec = hustleSpec(hustle);
  return {
    incomeAmounts: Object.fromEntries(spec.income.map((item) => [item.id, item.defaultAmount])),
    billAmounts: Object.fromEntries(spec.bills.map((item) => [item.id, item.defaultAmount])),
  };
}

export function tapeFromAnswers({ hustle, incomeAmounts, billAmounts }) {
  const spec = hustleSpec(hustle);
  const income = spec.income
    .map((item) => ({
      id: item.id,
      amount: roundRand(Math.max(0, Number(incomeAmounts?.[item.id] ?? item.defaultAmount) || 0)),
    }))
    .filter((item) => item.amount > 0);
  const obligated = spec.bills
    .map((item) => ({
      id: item.id,
      amount: roundRand(Math.max(0, Number(billAmounts?.[item.id] ?? item.defaultAmount) || 0)),
      locked: true,
    }))
    .filter((item) => item.amount > 0);
  return { hustle: spec.id, income, obligated };
}

export function suggestedSplit(leftover) {
  const dry = Math.max(0, roundRand(leftover));
  if (dry <= 0) return { hold: 0, save: 0, invest: 0 };
  if (dry < 50) return { hold: dry, save: 0, invest: 0 };
  if (dry < 100) return { hold: 50, save: roundRand(dry - 50), invest: 0 };
  const invest = Math.min(50, roundRand(dry - 50));
  const rest = roundRand(dry - invest);
  const hold = roundRand(Math.round(rest * 0.62));
  const save = roundRand(rest - hold);
  return { hold, save, invest };
}

export function newLine(kind, index) {
  return { id: `${kind}-${index}`, label: "", amount: "" };
}

export function blankCustomTape() {
  return {
    hustle: "custom",
    income: [newLine("in", 0)],
    obligated: [newLine("out", 0)],
  };
}

export function tapeFromCustom({ income = [], obligated = [] }) {
  const clean = (rows, locked) =>
    rows
      .map((row, index) => ({
        id: row.id || `${locked ? "out" : "in"}-${index}`,
        label: String(row.label || "").trim(),
        amount: roundRand(Math.max(0, Number(row.amount) || 0)),
        ...(locked ? { locked: true } : {}),
      }))
      .filter((row) => row.amount > 0);
  return {
    hustle: "custom",
    income: clean(income, false),
    obligated: clean(obligated, true),
  };
}

export function leftoverFromCustom(income, obligated) {
  const tape = tapeFromCustom({ income, obligated });
  return leftoverOf(tape.income, tape.obligated);
}

export function needsSetup(session) {
  return Boolean(session && !session.demo && !session.setupDone);
}
