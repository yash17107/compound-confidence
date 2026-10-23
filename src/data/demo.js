export const DEMO_USER = {
  name: "Thabo M.",
  city: "Soweto",
  story: "Taxi gig + SASSA. The print does not land on the 25th. Rent still does.",
};

export const INITIAL_INCOME = [
  { id: "gig", label: "Taxi gig", amount: 1070 },
  { id: "sassa", label: "SASSA grant", amount: 350 },
];

export const INITIAL_OBLIGATED = [
  { id: "rent", label: "Rent share", amount: 700, locked: true },
  { id: "food", label: "Food", amount: 320, locked: true },
  { id: "airtime", label: "Airtime", amount: 70, locked: true },
  { id: "stokvel", label: "Stokvel", amount: 150, locked: true },
];

export const ETF = {
  name: "FNB Top 40 ETF",
  code: "ETFT40",
  feeBuy: "0% brokerage on Shares Zero",
  lesson:
    "An ETF is a basket of many companies. You buy a slice, not one risky stock. FNB Shares Zero has no monthly fee and 0% brokerage when you buy FNB ETFs. There is no minimum balance.",
};

export const SCAM_SAMPLES = [
  {
    id: "crypto",
    from: "WhatsApp · unknown bro",
    text: "Bro send Bitcoin now, guaranteed 30% this week",
  },
  {
    id: "mashonisa",
    from: "Mashonisa · local alpha",
    text: "Borrow R500 from the mashonisa and invest it in stocks, pay me Friday",
  },
  {
    id: "otp",
    from: "SMS · definitely-not-FNB",
    text: "Send me your OTP so I can unlock Shares Zero",
  },
  {
    id: "frozen",
    from: "SMS · FNB-not-FNB",
    text: "Your FNB account is frozen. Send OTP now to verify your account",
  },
  {
    id: "agent",
    from: "WhatsApp · FNB agent",
    text: "Hi I'm the FNB WhatsApp agent, click this link to verify your account",
  },
  {
    id: "official",
    from: "FNB · actual product note",
    text: "FNB Shares Zero: R0 monthly fee when you buy FNB ETFs",
  },
];

export const STEPS = [
  { id: "week", label: "This week" },
  { id: "split", label: "Split" },
  { id: "learn", label: "Learn" },
  { id: "accounts", label: "Accounts" },
  { id: "coach", label: "Ask the desk" },
];
