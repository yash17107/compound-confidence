import { describe, expect, it, beforeEach } from "vitest";
import { continueAsDemo, continueAsNomsa, deleteAccount, listAccounts, readSession, signIn, signOut, signUp } from "./auth.js";

describe("auth", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("signs in the Thabo demo account", () => {
    const result = signIn("thabo@imali.za", "leftover180");
    expect(result.ok).toBe(true);
    expect(readSession().name).toBe("Thabo M.");
  });

  it("rejects a wrong password", () => {
    expect(signIn("thabo@imali.za", "wrong").ok).toBe(false);
  });

  it("creates an account and keeps a session", () => {
    const result = signUp({
      name: "Aisha K.",
      email: "aisha@imali.za",
      password: "safebuffer",
    });
    expect(result.ok).toBe(true);
    expect(readSession().email).toBe("aisha@imali.za");
    expect(readSession().setupDone).toBe(false);
  });

  it("clears the session on sign out", () => {
    continueAsDemo();
    signOut();
    expect(readSession()).toBeNull();
  });

  it("deletes a saved desk so the email can be used again", () => {
    signUp({ name: "Aisha K.", email: "aisha@imali.za", password: "safebuffer" });
    expect(deleteAccount("aisha@imali.za").ok).toBe(true);
    expect(listAccounts()).toHaveLength(0);
    expect(readSession()).toBeNull();
    const again = signUp({
      name: "Aisha K.",
      email: "aisha@imali.za",
      password: "safebuffer",
    });
    expect(again.ok).toBe(true);
  });

  it("does not delete packed demo desks", () => {
    expect(deleteAccount("thabo@imali.za").ok).toBe(false);
    expect(deleteAccount("nomsa@imali.za").ok).toBe(false);
    expect(signIn("thabo@imali.za", "leftover180").ok).toBe(true);
    expect(continueAsNomsa().ok).toBe(true);
    expect(readSession().name).toBe("Nomsa D.");
  });

  it("refuses to sign up over Nomsa's packed email", () => {
    expect(
      signUp({
        name: "Copycat",
        email: "nomsa@imali.za",
        password: "safebuffer",
      }).ok,
    ).toBe(false);
  });
});
