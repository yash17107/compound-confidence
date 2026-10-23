import { describe, expect, it } from "vitest";
import { consentRecord, minimiseDesk, minimiseQuestion, minimiseWrap, POPIA_VERSION } from "./privacy.js";

describe("POPIA minimisation", () => {
  it("strips names, labels and extra fields before a coach call", () => {
    const slim = minimiseDesk({
      email: "thabo@imali.za",
      name: "Thabo M.",
      password: "leftover180",
      income: [{ id: "gig", label: "Taxi gig", amount: 1070, note: "Soweto" }],
      obligated: [{ id: "rent", label: "Rent share", amount: 700 }],
      history: [{ missed: false, leftover: 180, who: "Thabo" }],
    });
    expect(slim).toEqual({
      income: [{ id: "gig", amount: 1070 }],
      obligated: [{ id: "rent", amount: 700 }],
      history: [{ missed: false }],
    });
    expect(JSON.stringify(slim)).not.toMatch(/Thabo|leftover180|Soweto|Taxi/);
  });

  it("caps questions and replaces bill names on a wrap payload", () => {
    expect(minimiseQuestion("x".repeat(800))).toHaveLength(500);
    const wrap = minimiseWrap({
      moneyIn: 4000,
      vibe: "survivor",
      topBills: [{ id: "rent", amount: 700 }, { id: "school fees for Thabo", amount: 200 }],
    });
    expect(wrap.topBills[0].id).toBe("bill-1");
    expect(JSON.stringify(wrap)).not.toMatch(/Thabo|rent/);
  });

  it("stamps a consent record", () => {
    expect(consentRecord(new Date("2026-10-23T10:00:00Z"))).toEqual({
      popiaVersion: POPIA_VERSION,
      popiaAt: "2026-10-23T10:00:00.000Z",
    });
  });
});
