import { beforeEach, describe, expect, it } from "vitest";
import { clearProgress, readProgress, saveProgress } from "./progress.js";
import { dumpStorage, unlockVault } from "./vault.js";

describe("desk progress", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("remembers lesson and rug catch per email", () => {
    unlockVault("thabo@imali.za", "thabo-secret");
    saveProgress("thabo@imali.za", { lessonDone: true, rugCaught: true });
    expect(readProgress("thabo@imali.za").lessonDone).toBe(true);
    expect(dumpStorage()).not.toMatch(/lessonDone|thabo-secret/);
    unlockVault("nomsa@imali.za", "nomsa-secret");
    expect(readProgress("nomsa@imali.za")).toBeNull();
    expect(readProgress("thabo@imali.za")).toBeNull();
  });

  it("can wipe a desk's progress", () => {
    unlockVault("yash@housemoney.za", "yash-secret");
    saveProgress("yash@housemoney.za", { lessonDone: true });
    clearProgress("yash@housemoney.za");
    expect(readProgress("yash@housemoney.za")).toBeNull();
  });
});
