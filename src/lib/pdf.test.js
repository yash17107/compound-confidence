import { describe, expect, it } from "vitest";
import { stampName } from "./pdf.js";
import { buildStatementPdf } from "./statementPdf.js";

const sample = {
  brand: "Compound Confidence",
  slogan: "Stack it, track it, flex it.",
  paper: "Paper statement. Not a live FNB document.",
  who: "Thabo M. Soweto",
  asOf: "2026-10-22",
  pockets: [
    {
      name: "Main account",
      rail: "Easy Zero",
      balance: "R180",
      moneyIn: "+R1 420",
      moneyOut: "-R1 240",
      opening: "R0",
      rows: [
        {
          date: "2026-10-14",
          title: "To Savings",
          detail: "Transfer",
          delta: -50,
          balance: "R180",
        },
        {
          date: "2026-10-13",
          title: "Taxi gig",
          detail: "Money in",
          delta: 1070,
          balance: "R230",
        },
      ],
    },
  ],
};

describe("statement PDF", () => {
  it("writes a bank-style statement with debit and credit columns", () => {
    const bytes = buildStatementPdf(sample);
    const text = new TextDecoder().decode(bytes);
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain("Helvetica-Bold");
    expect(text).toContain("Compound Confidence");
    expect(text).toContain("Statement of account");
    expect(text).toContain("Main account");
    expect(text).toContain("Available balance");
    expect(text).toContain("Debit");
    expect(text).toContain("Credit");
    expect(text).toContain("CC-MAINACCO-20261022");
    expect(text).toContain("Confidential");
    expect(text).toContain("/Creator (Compound Confidence)");
    expect(text).toContain("%%EOF");
    expect(stampName("Main account", new Date("2026-10-22T10:00:00Z"))).toBe("main-account-2026-10-22.pdf");
  });
});
