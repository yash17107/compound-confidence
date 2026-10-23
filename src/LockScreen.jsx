import { useState } from "react";
import LangSwitch from "./LangSwitch.jsx";
import { checkPin } from "./lib/security.js";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "ok"];

export default function LockScreen({ t, lang, onLang, name, email, onUnlock, onLogout }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const tryUnlock = (value) => {
    const result = checkPin(email, value);
    if (result.ok) {
      setPin("");
      setError("");
      onUnlock();
      return;
    }
    setError(t.secPinBad);
    setPin("");
  };

  const press = (key) => {
    if (key === "clear") {
      setPin("");
      setError("");
      return;
    }
    if (key === "ok") {
      if (pin.length === 4) tryUnlock(pin);
      return;
    }
    const next = `${pin}${key}`.slice(0, 4);
    setPin(next);
    setError("");
    if (next.length === 4) tryUnlock(next);
  };

  return (
    <div className="lock-gate" role="dialog" aria-modal="true" aria-labelledby="lock-title" data-testid="desk-lock">
      <div className="lock-top">
        <LangSwitch lang={lang} onLang={onLang} label={t.langNow || t.language} dark />
      </div>
      <div className="lock-card">
        <p className="lock-kicker">{t.brand}</p>
        <h1 id="lock-title">{t.secLocked}</h1>
        <p className="lede">{t.secUnlockHint}</p>
        <p className="lock-who">{name}</p>
        <ol className="pin-dots" aria-hidden="true">
          {[0, 1, 2, 3].map((index) => (
            <li key={index} className={pin.length > index ? "on" : ""} />
          ))}
        </ol>
        {error ? (
          <p className="alert" role="alert">
            {error}
          </p>
        ) : null}
        <div className="pin-pad" data-testid="pin-pad">
          {KEYS.map((key) => (
            <button
              key={key}
              type="button"
              className={key === "clear" || key === "ok" ? "pin-key muted" : "pin-key"}
              onClick={() => press(key)}
            >
              {key === "clear" ? "C" : key === "ok" ? t.secUnlock : key}
            </button>
          ))}
        </div>
        <button type="button" className="btn ghost" onClick={onLogout}>
          {t.logout}
        </button>
      </div>
    </div>
  );
}
