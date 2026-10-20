import { formatRand } from "./money.js";

const CREDIT_WORDS = /\b(borrow|loan|mashonisa|credit card|lend|owe|payday)\b/i;
const SCAM_WORDS = /\b(guaranteed|bitcoin|crypto|otp|double your|forex signal|pyramid)\b/i;

export function localReply(question, leftover, forecast) {
  if (CREDIT_WORDS.test(question)) {
    return "No. Borrowed money is not leftover. Never put a loan or a mashonisa's money into shares.";
  }
  if (SCAM_WORDS.test(question)) {
    return "That smells like a scam. Nobody can guarantee returns, and FNB will never ask for your OTP. Don't send a rand.";
  }
  if (leftover <= 0) {
    return "Sit this week. There is no leftover after rent and bills, so there is nothing to invest. Sitting is how the account survives.";
  }
  if (forecast.call === "sit") {
    return `You have ${formatRand(leftover)} leftover now, but your pattern says next week could squeeze the bills. Keep it in Main and Savings. Investment cap next week: R0.`;
  }
  const lead = forecast.call === "light" ? "Size lightly." : "You may size, within the cap.";
  return `${lead} Leftover this week is ${formatRand(leftover)}. Your main money landed ${forecast.landed} of the last ${forecast.weeks} weeks. Cap investments at ${formatRand(forecast.investCap)} and keep ${formatRand(forecast.setAside)} in Main and Savings.`;
}

export async function askCoach({ question, lang, income, obligated, history, leftover, forecast }) {
  try {
    const response = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, lang, desk: { income, obligated, history } }),
    });
    const data = await response.json();
    if (response.ok && data.ok && data.reply) {
      return { reply: data.reply, source: data.source === "ai" ? "ai" : "rules" };
    }
  } catch {
    /* offline or no API: answer on the phone */
  }
  return { reply: localReply(question, leftover, forecast), source: "offline" };
}
