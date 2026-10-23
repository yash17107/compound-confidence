export const LANG_IDS = ["af", "zu", "xh", "nr", "ss", "st", "nso", "tn", "ts", "ve", "sfs"];

export function row(values) {
  if (values.length !== LANG_IDS.length) {
    throw new Error(`i18n rest row expected ${LANG_IDS.length}, got ${values.length}: ${values[0]}`);
  }
  return Object.fromEntries(LANG_IDS.map((id, index) => [id, values[index]]));
}

export function fromRows(rows) {
  const packs = Object.fromEntries(LANG_IDS.map((id) => [id, {}]));
  for (const [key, byLang] of Object.entries(rows)) {
    for (const id of LANG_IDS) packs[id][key] = byLang[id];
  }
  return packs;
}
