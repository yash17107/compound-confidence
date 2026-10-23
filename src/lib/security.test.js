import { beforeEach, describe, expect, it } from "vitest";
import { checkPin, clearPin, hasPin, MAX_SIGNIN_FAILS, pinLooksValid, recordSignInFail, setPin, signInGate } from "./security.js";
import { signIn } from "./auth.js";
import { dumpStorage, unlockVault } from "./vault.js";

describe("desk PIN", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("stores a 4-digit PIN without keeping the digits", () => {
    expect(pinLooksValid("12")).toBe(false);
    unlockVault("thabo@imali.za", "leftover180");
    expect(setPin("thabo@imali.za", "1234").ok).toBe(true);
    expect(hasPin("thabo@imali.za")).toBe(true);
    expect(dumpStorage()).not.toMatch(/1234/);
    expect(checkPin("thabo@imali.za", "1234").ok).toBe(true);
    expect(checkPin("thabo@imali.za", "0000").ok).toBe(false);
    clearPin("thabo@imali.za");
    expect(hasPin("thabo@imali.za")).toBe(false);
  });
});

describe("sign-in lockout", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("locks after too many wrong passwords", () => {
    for (let i = 0; i < MAX_SIGNIN_FAILS; i += 1) {
      signIn("thabo@imali.za", "nope");
    }
    const gated = signInGate("thabo@imali.za");
    expect(gated.ok).toBe(false);
    expect(signIn("thabo@imali.za", "leftover180").reason).toBe("lockedOut");
  });

  it("counts a fail without locking on the first try", () => {
    expect(recordSignInFail("aisha@imali.za").fails).toBe(1);
    expect(signInGate("aisha@imali.za").ok).toBe(true);
  });
});
