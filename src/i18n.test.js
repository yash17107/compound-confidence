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
      expect(COPY[lang.id].nav).toHaveLength(6);
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
});
