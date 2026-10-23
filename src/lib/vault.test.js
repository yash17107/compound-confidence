import { beforeEach, describe, expect, it } from "vitest";
import { dumpStorage, lockVault, openJson, readVault, sealJson, unlockVault, writeVault } from "./vault.js";
import { readProgress, saveProgress } from "./progress.js";
import { listAccounts, signIn, signOut, signUp } from "./auth.js";

describe("encrypted vault", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("round-trips JSON only with the matching secret", () => {
    const blob = sealJson({ leftover: 180, lessonDone: true }, "desk-key");
    expect(blob.ct).not.toMatch(/lessonDone/);
    expect(openJson(blob, "desk-key")).toEqual({ leftover: 180, lessonDone: true });
    expect(openJson(blob, "wrong")).toBeNull();
  });

  it("keeps one desk's tape closed to another login", () => {
    expect(signUp({ name: "Aisha K.", email: "aisha@imali.za", password: "safebuffer", consent: true }).ok).toBe(true);
    saveProgress("aisha@imali.za", { leftover: 220, city: "Durban", lessonDone: true });
    const stored = dumpStorage();
    expect(stored).not.toMatch(/safebuffer/);
    expect(stored).not.toMatch(/lessonDone/);
    expect(listAccounts()[0]).toEqual({
      email: "aisha@imali.za",
      name: "Aisha K.",
      city: "",
      setupDone: false,
    });

    signOut();
    expect(signUp({ name: "Bongi M.", email: "bongi@imali.za", password: "otherdesk", consent: true }).ok).toBe(true);
    expect(readProgress("aisha@imali.za")).toBeNull();
    expect(readVault("aisha@imali.za")).toBeNull();

    signOut();
    expect(signIn("aisha@imali.za", "safebuffer").ok).toBe(true);
    expect(readProgress("aisha@imali.za").city).toBe("Durban");
  });

  it("refuses to write a vault while locked", () => {
    lockVault();
    expect(writeVault("aisha@imali.za", { leftover: 1 }).ok).toBe(false);
    unlockVault("aisha@imali.za", "secret");
    expect(writeVault("aisha@imali.za", { leftover: 1 }).ok).toBe(true);
  });
});
