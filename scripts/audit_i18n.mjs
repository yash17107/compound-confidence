import { COPY, LANGS } from "../src/i18n.js";

function flatten(value, prefix = "") {
  if (typeof value === "string") return { [prefix]: value };
  if (Array.isArray(value)) {
    return value.reduce((acc, item, index) => ({ ...acc, ...flatten(item, `${prefix}[${index}]`) }), {});
  }
  if (value && typeof value === "object") {
    return Object.entries(value).reduce(
      (acc, [key, item]) => ({ ...acc, ...flatten(item, prefix ? `${prefix}.${key}` : key) }),
      {},
    );
  }
  return {};
}

const en = flatten(COPY.en);
for (const lang of LANGS.filter((item) => item.id !== "en")) {
  const pack = flatten(COPY[lang.id]);
  const same = Object.keys(en).filter((key) => pack[key] === en[key] && en[key].length > 2);
  console.log(`\n# ${lang.id} ${same.length}/${Object.keys(en).length}`);
  console.log(same.slice(0, 80).join("\n"));
}
