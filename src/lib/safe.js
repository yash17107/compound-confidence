import { BUFFER } from "./forecast.js";
import { roundRand } from "./money.js";

// Weekdays use JavaScript numbering: 0 is Sunday.
export const DEFAULT_PAYDAY = 5;
export const DEFAULT_DUE = {
  rent: 1,
  food: 6,
  airtime: 3,
  stokvel: 0,
  transport: 1,
  school: 5,
  stock: 2,
};
const FALLBACK_DUE = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

function weekday(value) {
  const day = Math.round(Number(value));
  return Number.isInteger(day) && day >= 0 && day <= 6 ? day : null;
}

export function cleanSchedule(schedule) {
  const source = schedule && typeof schedule === "object" ? schedule : {};
  const due = {};
  Object.entries(source.due && typeof source.due === "object" ? source.due : {}).forEach(([id, value]) => {
    const day = weekday(value);
    if (day !== null) due[String(id).slice(0, 40)] = day;
  });
  return { payday: weekday(source.payday) ?? DEFAULT_PAYDAY, due };
}

export function dueDayFor(id, schedule) {
  return schedule?.due?.[id] ?? DEFAULT_DUE[id] ?? FALLBACK_DUE;
}

export function daysUntil(day, today = new Date()) {
  return (day - new Date(today).getDay() + 7) % 7;
}

// Bills in the order they fall due. Money in pays them first, then Savings, then they're short.
export function billCalendar({ obligated = [], moneyIn = 0, savings = 0, schedule, today = new Date() }) {
  let paid = 0;
  const income = Math.max(0, Number(moneyIn) || 0);
  const backup = Math.max(0, Number(savings) || 0);

  return obligated
    .map((item) => {
      const day = dueDayFor(item.id, schedule);
      const days = daysUntil(day, today);
      return { item, day, days };
    })
    .sort((a, b) => a.days - b.days)
    .map(({ item, day, days }) => {
      const amount = roundRand(Math.max(0, Number(item.amount) || 0));
      paid = roundRand(paid + amount);
      const status = paid <= income ? "covered" : paid <= income + backup ? "savings" : "short";
      return {
        id: item.id,
        label: item.label,
        amount,
        day,
        days,
        date: new Date(new Date(today).getTime() + days * DAY_MS),
        status,
      };
    });
}

export function safeToSpend({ main = 0, schedule, forecast, today = new Date() }) {
  const payday = cleanSchedule(schedule).payday;
  const daysLeft = daysUntil(payday, today) || 7;
  const free = Math.max(0, roundRand((Number(main) || 0) - BUFFER));
  const careful = forecast?.call === "sit";
  const pool = careful ? roundRand(free / 2) : free;
  return {
    perDay: Math.floor(pool / daysLeft),
    daysLeft,
    pool,
    held: roundRand(Math.max(0, Number(main) || 0) - pool),
    careful,
    payday,
  };
}
