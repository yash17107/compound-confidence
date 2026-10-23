const RULES = [
  {
    id: "guaranteed-return",
    severity: "block",
    test: (text) =>
      /guaranteed|sure profit|no risk|risk.?free|30%\s*(this week|in a week|return)/i.test(text),
  },
  {
    id: "otp-harvest",
    severity: "block",
    test: (text) =>
      /(send|share|give).{0,24}(otp|pin|password)|whats?app.{0,16}(pin|otp)|otp.{0,16}(unlock|verify)/i.test(
        text,
      ),
  },
  {
    id: "borrow-to-invest",
    severity: "block",
    test: (text) =>
      /(borrow|loan|mashonisa).{0,40}(invest|stock|share|crypto|bitcoin)/i.test(text) ||
      /(invest|stock|share).{0,40}(borrow|loan|mashonisa)/i.test(text),
  },
  {
    id: "crypto-urgency",
    severity: "block",
    test: (text) =>
      /(bitcoin|crypto).{0,30}(now|today|urgent|send)/i.test(text) &&
      /(guaranteed|profit|double|30%)/i.test(text),
  },
  {
    id: "fake-bank",
    severity: "block",
    test: (text) =>
      /(fnb|bank).{0,28}(otp|pin|password)/i.test(text) ||
      /account (is )?(frozen|blocked|suspended)/i.test(text) ||
      /verify your (fnb )?account/i.test(text),
  },
  {
    id: "whatsapp-agent",
    severity: "block",
    test: (text) => /whats?app.{0,28}(agent|consultant|advisor|fnb)/i.test(text),
  },
  {
    id: "fake-link",
    severity: "block",
    test: (text) =>
      /(click|tap|open).{0,20}(link|http)|bit\.ly|tinyurl/i.test(text) &&
      /(verify|unlock|refund|prize|otp|account)/i.test(text),
  },
  {
    id: "send-now",
    severity: "block",
    test: (text) =>
      /(send|pay|deposit|transfer).{0,40}(now|today|urgent)/i.test(text) &&
      /(account|bitcoin|crypto|wallet)/i.test(text),
  },
];

const FALLBACK = {
  "guaranteed-return": "Guaranteed 30% is not a thesis. It's a rug with a WhatsApp pic.",
  "otp-harvest": "Banks don't DM for OTPs. That's not FNB. That's a fishing trip.",
  "borrow-to-invest": "Borrowed money isn't dry powder. It's a margin call wearing takkies.",
  "crypto-urgency": "Urgent crypto + promised bag = group-chat casino, not investing.",
  "fake-bank": "FNB will not freeze you by SMS and ask for an OTP. Hang up. Delete. Sit.",
  "whatsapp-agent": "There is no FNB WhatsApp agent who DMs first. That's a costume.",
  "fake-link": "A link that wants your PIN is not a bank. It is a trap with a progress bar.",
  "send-now": "Urgency plus 'send now' is how leftover leaves the account. Don't.",
  clean: "Clean tape. Still not a buy rec.",
};

export function inspectMessage(raw, t) {
  const text = String(raw || "").trim();
  if (!text) {
    return { blocked: false, flags: [], severity: "none", official: false };
  }

  const flags = RULES.filter((rule) => rule.test(text)).map((rule) => ({
    id: rule.id,
    severity: rule.severity,
    reason: reasonCopy(t, { id: rule.id, reason: FALLBACK[rule.id] }),
  }));

  const blocked = flags.some((flag) => flag.severity === "block");
  const official = looksLikeOfficialProduct(text) && !blocked;
  return {
    blocked,
    flags,
    official,
    severity: blocked ? "block" : "none",
    headline: blocked ? flags[0].reason : t?.safeMsg || FALLBACK.clean,
  };
}

export function looksLikeOfficialProduct(text) {
  return /shares zero|easy zero|ewallet|payshap/i.test(text);
}

export function reasonCopy(t, flag) {
  const table = t?.scamReasons || {};
  return table[flag?.id] || flag?.reason || FALLBACK.clean;
}
