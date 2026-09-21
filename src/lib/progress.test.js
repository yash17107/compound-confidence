import { beforeEach, describe, expect, it } from "vitest";
import { clearProgress, readProgress, saveProgress } from "./progress.js";

describe("desk progress", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("remembers lesson and rug catch per email", () => {
    saveProgress("thabo@imali.za", { lessonDone: true, rugCaught: true });
    expect(readProgress("thabo@imali.za").lessonDone).toBe(true);
    expect(readProgress("nomsa@imali.za")).toBeNull();
  });

  it("can wipe a desk's progress", () => {
    saveProgress("yash@housemoney.za", { lessonDone: true });
    clearProgress("yash@housemoney.za");
    expect(readProgress("yash@housemoney.za")).toBeNull();
  });
});
