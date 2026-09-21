import { describe, expect, it } from "vitest";
import { inspectMessage, looksLikeOfficialProduct } from "./scam.js";

describe("inspectMessage", () => {
  it("blocks a guaranteed Bitcoin tip", () => {
    const result = inspectMessage(
      "Bro send Bitcoin now, guaranteed 30% this week",
    );
    expect(result.blocked).toBe(true);
    expect(result.flags.map((flag) => flag.id)).toEqual(
      expect.arrayContaining(["guaranteed-return", "crypto-urgency"]),
    );
  });

  it("blocks a mashonisa invest pitch", () => {
    const result = inspectMessage(
      "Borrow R500 from the mashonisa and invest it in stocks, pay me Friday",
    );
    expect(result.blocked).toBe(true);
    expect(result.flags.some((flag) => flag.id === "borrow-to-invest")).toBe(
      true,
    );
  });

  it("blocks OTP harvesting", () => {
    const result = inspectMessage("Send me your OTP so I can unlock Shares Zero");
    expect(result.blocked).toBe(true);
    expect(result.flags.some((flag) => flag.id === "otp-harvest")).toBe(true);
  });

  it("allows a plain FNB product note", () => {
    const text = "FNB Shares Zero: R0 monthly fee when you buy FNB ETFs";
    expect(inspectMessage(text).blocked).toBe(false);
    expect(looksLikeOfficialProduct(text)).toBe(true);
  });
});
