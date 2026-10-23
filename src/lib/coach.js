import { COPY, fill } from "../i18n.js";
import { formatRand } from "./money.js";
import { minimiseDesk, minimiseQuestion } from "./privacy.js";
import { inspectMessage } from "./scam.js";

const CREDIT_WORDS = /\b(borrow|loan|mashonisa|credit card|lend|owe|payday)\b/i;

export function localReply(question, leftover, forecast, t = COPY.en) {
  if (CREDIT_WORDS.test(question)) {
    return t.coachCredit || COPY.en.coachCredit;
  }
  const scan = inspectMessage(question, t);
  if (scan.blocked) {
    return scan.headline;
  }
  if (leftover <= 0) {
    return t.coachNoLeftover || COPY.en.coachNoLeftover;
  }
  if (forecast.call === "sit") {
    return fill(t.coachSitPattern || COPY.en.coachSitPattern, {
      leftover: formatRand(leftover),
    });
  }
  const lead = forecast.call === "light" ? t.coachLightLead || COPY.en.coachLightLead : t.coachGoLead || COPY.en.coachGoLead;
  return fill(t.coachSize || COPY.en.coachSize, {
    lead,
    leftover: formatRand(leftover),
    landed: forecast.landed,
    weeks: forecast.weeks,
    cap: formatRand(forecast.investCap),
    aside: formatRand(forecast.setAside),
  });
}

export async function askCoach({ question, lang, income, obligated, history, leftover, forecast, t }) {
  const copy = t || COPY[lang] || COPY.en;
  try {
    const response = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: minimiseQuestion(question),
        lang,
        desk: minimiseDesk({ income, obligated, history }),
      }),
    });
    const data = await response.json();
    if (response.ok && data.ok && data.reply) {
      return { reply: data.reply, source: data.source === "ai" ? "ai" : "rules" };
    }
  } catch {
    /* offline or no API: answer on the phone */
  }
  return { reply: localReply(question, leftover, forecast, copy), source: "offline" };
}
