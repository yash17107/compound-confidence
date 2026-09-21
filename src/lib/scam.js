const RULES = [
  {
    id: "guaranteed-return",
    severity: "block",
    test: (text) =>
      /guaranteed|sure profit|no risk|30%\s*(this week|in a week|return)/i.test(text),
    reason: "Guaranteed 30% is not a thesis. It's a rug with a WhatsApp pic.",
  },
  {
    id: "otp-harvest",
    severity: "block",
    test: (text) =>
      /(send|share|give).{0,20}(otp|pin|password)|whats?app.{0,12}(pin|otp)/i.test(
        text,
      ),
    reason: "Banks don't DM for OTPs. That's not FNB. That's a fishing trip.",
  },
  {
    id: "borrow-to-invest",
    severity: "block",
    test: (text) =>
      /(borrow|loan|mashonisa).{0,40}(invest|stock|share|crypto|bitcoin)/i.test(
        text,
      ) ||
      /(invest|stock|share).{0,40}(borrow|loan|mashonisa)/i.test(text),
    reason: "Borrowed money isn't dry powder. It's a margin call wearing takkies.",
  },
  {
    id: "crypto-urgency",
    severity: "block",
    test: (text) =>
      /(bitcoin|crypto).{0,30}(now|today|urgent|send)/i.test(text) &&
      /(guaranteed|profit|double|30%)/i.test(text),
    reason: "Urgent crypto + promised bag = group-chat casino, not investing.",
  },
];

export function inspectMessage(raw) {
  const text = String(raw || "").trim();
  if (!text) {
    return { blocked: false, flags: [], severity: "none" };
  }

  const flags = RULES.filter((rule) => rule.test(text)).map((rule) => ({
    id: rule.id,
    severity: rule.severity,
    reason: rule.reason,
  }));

  const blocked = flags.some((flag) => flag.severity === "block");
  return {
    blocked,
    flags,
    severity: blocked ? "block" : "none",
    headline: blocked ? flags[0].reason : "Clean tape. Still not a buy rec.",
  };
}

export function looksLikeOfficialProduct(text) {
  return /shares zero|easy zero|ewallet|payshap/i.test(text);
}
