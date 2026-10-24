import { describe, expect, it } from "vitest";
import { COPY, LANGS } from "./i18n.js";

const OFFICIAL = ["en", "af", "zu", "xh", "nr", "ss", "st", "nso", "tn", "ts", "ve", "sfs"];

describe("official languages", () => {
  it("covers all 12 official South African languages", () => {
    expect(LANGS.map((item) => item.id)).toEqual(OFFICIAL);
    expect(LANGS).toHaveLength(12);
  });

  it("keeps the same copy keys in every pack", () => {
    const keys = Object.keys(COPY.en).sort();
    const itemKeys = Object.keys(COPY.en.items).sort();
    for (const lang of LANGS) {
      expect(Object.keys(COPY[lang.id]).sort(), lang.id).toEqual(keys);
      expect(Object.keys(COPY[lang.id].items).sort(), `${lang.id}.items`).toEqual(itemKeys);
      expect(COPY[lang.id].nav).toHaveLength(COPY.en.nav.length);
    }
  });

  it("keeps SASL captioned instead of fake written sign", () => {
    expect(COPY.sfs.saslNote).toMatch(/visual/i);
    expect(LANGS.find((item) => item.id === "sfs").html).toBe("en");
  });

  it("ships a five-slide leftover lesson", () => {
    expect(COPY.en.guide).toHaveLength(5);
    expect(COPY.zu.guide).toHaveLength(5);
  });

  it("ships translated scam and stay-safe tracks in every pack", () => {
    const reasonKeys = Object.keys(COPY.en.scamReasons).sort();
    for (const lang of LANGS) {
      expect(lang.short).toBeTruthy();
      expect(COPY[lang.id].guide).toHaveLength(5);
      expect(COPY[lang.id].scamGuide).toHaveLength(6);
      expect(COPY[lang.id].safeRules).toHaveLength(6);
      expect(Object.keys(COPY[lang.id].scamReasons).sort()).toEqual(reasonKeys);
      expect(COPY[lang.id].learnTrackScam).toBeTruthy();
      expect(COPY[lang.id].secLocked).toBeTruthy();
    }
    expect(COPY.af.learnTrackScam).toMatch(/swendel/i);
    expect(COPY.zu.learnTrackScam).toMatch(/isihlangu|ubuqili/i);
    expect(COPY.zu.guide[0].title).not.toEqual(COPY.en.guide[0].title);
  });

  it("ships a POPIA notice in every pack", () => {
    for (const lang of LANGS) {
      expect(COPY[lang.id].popiaConsent).toBeTruthy();
      expect(COPY[lang.id].popiaRules).toHaveLength(6);
    }
    expect(COPY.af.popiaTitle).toMatch(/POPIA/i);
    expect(COPY.zu.popiaWipe).toMatch(/POPIA|lungelo/i);
  });

  it("translates judge-facing leftover copy out of English", () => {
    const spoken = ["af", "zu", "xh", "nr", "ss", "st", "nso", "tn", "ts", "ve"];
    for (const id of spoken) {
      expect(COPY[id].nav).toHaveLength(8);
      expect(COPY[id].nav[6]).not.toEqual(COPY.en.nav[6]);
      expect(COPY[id].acctMain).not.toEqual(COPY.en.acctMain);
      expect(COPY[id].sitTitle).not.toEqual(COPY.en.sitTitle);
      expect(COPY[id].fcSit).not.toEqual(COPY.en.fcSit);
      expect(COPY[id].coachTitle).not.toEqual(COPY.en.coachTitle);
      expect(COPY[id].missGig).not.toEqual(COPY.en.missGig);
      expect(COPY[id].pulseSit).not.toEqual(COPY.en.pulseSit);
      expect(COPY[id].popiaRules[0].title).not.toEqual(COPY.en.popiaRules[0].title);
      expect(COPY[id].mktOpen).not.toEqual(COPY.en.mktOpen);
    }
    expect(COPY.sfs.sitTitle).not.toEqual(COPY.en.sitTitle);
    expect(COPY.sfs.saslCallSit).toMatch(/sit/i);
    expect(COPY.af.walkStart).not.toEqual(COPY.en.walkStart);
    expect(COPY.zu.appLive).toMatch(/Vercel/i);
  });
});
