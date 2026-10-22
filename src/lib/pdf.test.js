import { describe, expect, it } from "vitest";
import { buildPdf, stampName } from "./pdf.js";
import { statementLines } from "./statementPdf.js";

describe("buildPdf", () => {
  it("writes a real PDF with the leftover statement", () => {
    const lines = statementLines({
      brand: "Compound Confidence",
      slogan: "Stack it, track it, flex it.",
      paper: "Paper statement. Not a live FNB document.",
      who: "Thabo M. · Soweto",
      asOf: "2026-10-22",
      pockets: [
        {
          name: "Main account",
          rail: "Easy Zero",
          balance: "R180",
          moneyIn: "+R1420",
          moneyOut: "-R1240",
          opening: "R0",
          rows: [
            {
              date: "2026-10-14",
              title: "To Savings",
              detail: "Transfer",
              delta: -50,
              balance: "R180",
            },
          ],
        },
      ],
    });
    const bytes = buildPdf(lines, { title: "Main account" });
    const text = new TextDecoder().decode(bytes);
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain("Compound Confidence");
    expect(text).toContain("Main account");
    expect(text).toContain("%%EOF");
    expect(stampName("Main account", new Date("2026-10-22T10:00:00Z"))).toBe("main-account-2026-10-22.pdf");
  });
});
