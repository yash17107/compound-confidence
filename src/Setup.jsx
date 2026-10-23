import { useState } from "react";
import { blankCustomTape, leftoverFromCustom, newLine, suggestedSplit, tapeFromCustom } from "./lib/profile.js";
import { formatRand } from "./lib/money.js";
import LangSwitch from "./LangSwitch.jsx";

const STEPS = ["city", "income", "bills", "review"];

export default function Setup({ t, lang, onLang, session, draft, onDone, onNewDesk, onWipe }) {
  const blank = blankCustomTape();
  const customDraft = draft?.hustle === "custom";
  const [step, setStep] = useState(0);
  const [city, setCity] = useState(customDraft ? draft.city || "" : "");
  const [income, setIncome] = useState(
    customDraft && Array.isArray(draft.income) && draft.income.length
      ? draft.income.map((row) => ({ ...row, label: row.label || "" }))
      : blank.income,
  );
  const [obligated, setObligated] = useState(
    customDraft && Array.isArray(draft.obligated) && draft.obligated.length
      ? draft.obligated.map((row) => ({ ...row, label: row.label || "" }))
      : blank.obligated,
  );

  const leftover = leftoverFromCustom(income, obligated);
  const stage = STEPS[step];

  const changeLine = (setter) => (id, field, value) => {
    setter((prev) =>
      prev.map((row) =>
        row.id === id
          ? { ...row, [field]: field === "amount" ? eventValue(value) : value }
          : row,
      ),
    );
  };

  const addLine = (kind, setter) => {
    setter((prev) => [...prev, newLine(kind, prev.length)]);
  };

  const removeLine = (setter) => (id) => {
    setter((prev) => (prev.length <= 1 ? prev : prev.filter((row) => row.id !== id)));
  };

  const submit = (event) => {
    event.preventDefault();
    if (stage !== "review") {
      setStep((prev) => Math.min(prev + 1, STEPS.length - 1));
      return;
    }
    const tape = tapeFromCustom({ income, obligated });
    onDone({
      hustle: "custom",
      city: city.trim(),
      income: tape.income.map((row, index) => ({
        ...row,
        label: row.label || `${t.customIn} ${index + 1}`,
      })),
      obligated: tape.obligated.map((row, index) => ({
        ...row,
        label: row.label || `${t.customOut} ${index + 1}`,
      })),
      split: suggestedSplit(leftover),
    });
  };

  return (
    <div className="login">
      <section className="login-brand">
        <div>
          <p className="tag">{t.tag}</p>
          <h1>{t.setupTitle}</h1>
          <p>{t.setupSub}</p>
        </div>
        <LangSwitch lang={lang} onLang={onLang} label={t.langNow || t.language} dark />
      </section>
      <section className="login-panel">
        <form className="login-card setup-card" onSubmit={submit}>
          <p className="lede">
            {t.guideLabel} {step + 1}/{STEPS.length} · {session.name}
          </p>
          {stage === "city" && (
            <>
              <h2>{t.cityTitle}</h2>
              <p className="hint">{t.cityHint}</p>
              <label className="field">
                {t.cityLabel}
                <input
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  autoComplete="address-level2"
                />
              </label>
            </>
          )}
          {stage === "income" && (
            <>
              <h2>{t.incomeTitle}</h2>
              <p className="hint">{t.incomeSub}</p>
              <LineList
                t={t}
                rows={income}
                kind="in"
                onChange={changeLine(setIncome)}
                onRemove={removeLine(setIncome)}
              />
              <button className="linkish" type="button" onClick={() => addLine("in", setIncome)}>
                {t.addInflow}
              </button>
            </>
          )}
          {stage === "bills" && (
            <>
              <h2>{t.billsTitle}</h2>
              <p className="hint">{t.billsSub}</p>
              <LineList
                t={t}
                rows={obligated}
                kind="out"
                onChange={changeLine(setObligated)}
                onRemove={removeLine(setObligated)}
              />
              <button className="linkish" type="button" onClick={() => addLine("out", setObligated)}>
                {t.addBill}
              </button>
            </>
          )}
          {stage === "review" && (
            <>
              <h2>{t.reviewTitle}</h2>
              <p className="hint">{t.reviewSub}</p>
              <div className="hero-stat setup-stat">
                <span>{t.leftover}</span>
                <b data-testid="setup-leftover">{formatRand(leftover)}</b>
              </div>
              <p className="hint">
                {leftover <= 0 ? t.reviewSit : t.reviewSize} {city.trim() ? `· ${city.trim()}` : ""}
              </p>
            </>
          )}
          <div className="actions">
            <button
              className="btn"
              type="button"
              onClick={() => setStep((prev) => Math.max(prev - 1, 0))}
              disabled={step === 0}
            >
              {t.back}
            </button>
            <button className="btn primary" type="submit" data-testid="setup-next">
              {stage === "review" ? t.setupConfirm : t.setupNext}
            </button>
          </div>
          <div className="setup-escape">
            <button type="button" className="linkish" onClick={onNewDesk}>
              {t.newDesk}
            </button>
            <button type="button" className="linkish" onClick={onWipe}>
              {t.deleteDesk}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function eventValue(value) {
  if (value === "" || value === null || value === undefined) return "";
  const amount = Number(value);
  return Number.isNaN(amount) ? "" : Math.max(0, amount);
}

function LineList({ t, rows, kind, onChange, onRemove }) {
  return (
    <ul className="line-list">
      {rows.map((row, index) => (
        <li key={row.id} className="line-row">
          <label className="field">
            {t.lineName}
            <input
              data-testid={`${kind}-label-${index}`}
              value={row.label}
              onChange={(event) => onChange(row.id, "label", event.target.value)}
              placeholder={kind === "in" ? t.customIn : t.customOut}
            />
          </label>
          <label className="field">
            {t.lineAmount}
            <input
              data-testid={`${kind}-amount-${index}`}
              type="number"
              min="0"
              value={row.amount}
              onChange={(event) => onChange(row.id, "amount", event.target.value)}
            />
          </label>
          <button
            className="linkish"
            type="button"
            onClick={() => onRemove(row.id)}
            disabled={rows.length <= 1}
          >
            {t.removeLine}
          </button>
        </li>
      ))}
    </ul>
  );
}
