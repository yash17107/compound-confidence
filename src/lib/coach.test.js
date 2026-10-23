import { describe, expect, it } from "vitest";
import { COPY } from "../i18n.js";
import { localReply } from "./coach.js";

const light = { call: "light", landed: 4, weeks: 6, investCap: 40, setAside: 140 };
const sit = { call: "sit", landed: 2, weeks: 6, investCap: 0, setAside: 180 };

describe("localReply", () => {
  it("answers leftover questions in the active language", () => {
    const zu = localReply("Ngingatshala kuleli viki?", 180, light, COPY.zu);
    expect(zu).toMatch(/eseleyo/i);
    expect(zu).not.toMatch(/leftover this week is/i);

    const af = localReply("Kan ek hierdie week belê?", 180, sit, COPY.af);
    expect(af).toMatch(/oorskot/i);
    expect(af).toMatch(/R0/);
  });

  it("blocks mashonisa money in every pack", () => {
    const zu = localReply("Can I borrow R500 from the mashonisa to invest?", 180, light, COPY.zu);
    expect(zu).toMatch(/mashonisa/i);
    expect(zu).not.toMatch(/Borrowed money is not leftover/i);
  });
});
