import { LANGS } from "./i18n.js";

export default function LangSwitch({ lang, onLang, label, dark = false }) {
  const current = LANGS.find((item) => item.id === lang) || LANGS[0];
  return (
    <label className={dark ? "lang-switch dark" : "lang-switch"}>
      <span className="lang-switch-kicker">{label}</span>
      <span className="lang-switch-row">
        <b aria-hidden="true">{current.short}</b>
        <select
          data-testid="lang-select"
          aria-label={label}
          value={lang}
          onChange={(event) => onLang(event.target.value)}
        >
          {LANGS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.short} · {item.name}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}
