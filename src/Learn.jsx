import { useState } from "react";
import { ETF, SCAM_SAMPLES } from "./data/demo.js";
import { inspectMessage, reasonCopy } from "./lib/scam.js";
import { checkPin, clearPin, hasPin, pinLooksValid, setPin } from "./lib/security.js";

export default function Learn({ t, money, actions, track, email }) {
  const tracks = [
    ["lesson", t.learnTrackLesson],
    ["scam", t.learnTrackScam],
    ["safe", t.learnTrackSafe],
  ];

  return (
    <section>
      <div className="page-head">
        <h1>{t.learnTitle}</h1>
        <p className="lede">{t.learnSub}</p>
      </div>
      <div className="learn-tracks" role="tablist" aria-label={t.learnTitle}>
        {tracks.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={track === id}
            className={track === id ? "on" : ""}
            onClick={() => actions.setLearnTrack(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {track === "scam" ? (
        <ScamTrack t={t} money={money} actions={actions} />
      ) : track === "safe" ? (
        <SafeTrack t={t} money={money} email={email} actions={actions} />
      ) : (
        <LessonTrack t={t} money={money} actions={actions} />
      )}
    </section>
  );
}

function LessonTrack({ t, money, actions }) {
  const slides = t.guide || [];
  const last = Math.max(slides.length - 1, 0);
  const step = Math.min(money.lessonStep, last);
  const slide = slides[step] || { title: t.learnTitle, body: t.lesson };

  return (
    <article className="card">
      <ol className="guide-dots" aria-hidden="true">
        {slides.map((item, index) => (
          <li key={item.title} className={index === step ? "on" : index < step ? "done" : ""} />
        ))}
      </ol>
      <p className="kicker">
        {t.guideLabel} {step + 1}/{slides.length || 1}
      </p>
      <h2>{slide.title}</h2>
      <p className="guide-body">{slide.body}</p>
      <dl className="facts">
        <div>
          <dt>{t.product}</dt>
          <dd>{ETF.name}</dd>
        </div>
        <div>
          <dt>{t.fee}</dt>
          <dd>{t.feeBuy}</dd>
        </div>
      </dl>
      <div className="actions">
        <button
          className="btn"
          type="button"
          onClick={() => actions.setLessonStep((prev) => Math.max(prev - 1, 0))}
          disabled={step === 0}
        >
          {t.back}
        </button>
        {step < last ? (
          <button
            className="btn primary"
            type="button"
            onClick={() => actions.setLessonStep((prev) => Math.min(prev + 1, last))}
          >
            {t.guideNext}
          </button>
        ) : money.lessonDone ? (
          <button className="btn primary" type="button" onClick={() => actions.setView("market")}>
            {t.mktOpen}
          </button>
        ) : (
          <button type="button" className="btn primary" onClick={actions.completeLesson}>
            {t.learned}
          </button>
        )}
      </div>
    </article>
  );
}

function ScamTrack({ t, money, actions }) {
  const [draft, setDraft] = useState("");
  const [result, setResult] = useState(null);

  const run = (text) => {
    const scan = inspectMessage(text, t);
    setResult({ text, scan });
    if (scan.blocked) actions.catchRug();
  };

  return (
    <>
      <article className="card">
        <h2>{t.scamTitle}</h2>
        <p className="lede">{t.scamSub}</p>
        <ul className="scam-inbox" data-testid="scam-inbox">
          {SCAM_SAMPLES.map((sample) => (
            <li key={sample.id}>
              <button type="button" onClick={() => run(sample.text)}>
                <small>{sample.from}</small>
                <span>{sample.text}</span>
              </button>
            </li>
          ))}
        </ul>
        <label className="field">
          {t.pasteTip}
          <textarea
            data-testid="scam-paste"
            rows={3}
            value={draft}
            placeholder={t.pastePlaceholder}
            onChange={(event) => setDraft(event.target.value)}
          />
        </label>
        <div className="actions">
          <button
            className="btn primary"
            type="button"
            onClick={() => run(draft)}
          >
            {t.pasteCheck}
          </button>
        </div>
        {result ? <ScanResult t={t} result={result} caught={money.rugCaught} /> : null}
      </article>
      <article className="card">
        <h2>{t.scamTitle}</h2>
        <ol className="safe-list">
          {(t.scamGuide || []).map((rule) => (
            <li key={rule.title}>
              <strong>{rule.title}</strong>
              <p>{rule.body}</p>
            </li>
          ))}
        </ol>
      </article>
    </>
  );
}

function ScanResult({ t, result, caught }) {
  const { scan, text } = result;
  if (!String(text || "").trim()) {
    return (
      <p className="alert" role="alert">
        {t.pasteEmpty}
      </p>
    );
  }
  if (scan.blocked) {
    return (
      <div className="scan-result block" role="alert" data-testid="scam-result">
        <p className="kicker">{t.blocked}</p>
        <p>{reasonCopy(t, scan.flags[0])}</p>
        {scan.flags.slice(1).map((flag) => (
          <p key={flag.id}>{reasonCopy(t, flag)}</p>
        ))}
        {caught ? <p className="ok">{t.scamCaughtHint}</p> : null}
      </div>
    );
  }
  return (
    <div className="scan-result ok-box" data-testid="scam-result">
      <p className="ok">{scan.official ? t.scamOfficial : t.safeMsg}</p>
    </div>
  );
}

function SafeTrack({ t, money, email, actions }) {
  return (
    <>
      <article className="card">
        <h2>{t.safeTitle}</h2>
        <p className="lede">{t.safeSub}</p>
        <ol className="safe-list">
          {(t.safeRules || []).map((rule) => (
            <li key={rule.title}>
              <strong>{rule.title}</strong>
              <p>{rule.body}</p>
            </li>
          ))}
        </ol>
      </article>
      <PinCard t={t} email={email} actions={actions} locked={money.pinOn} />
      <article className="card" data-testid="popia-card">
        <h2>{t.popiaTitle}</h2>
        <p className="lede">{t.popiaSub}</p>
        <ol className="safe-list">
          {(t.popiaRules || []).map((rule) => (
            <li key={rule.title}>
              <strong>{rule.title}</strong>
              <p>{rule.body}</p>
            </li>
          ))}
        </ol>
        <p className="hint">{t.popiaWipe}</p>
      </article>
    </>
  );
}

function PinCard({ t, email, actions, locked }) {
  const [pin, setPinValue] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState("");
  const armed = hasPin(email);

  const save = () => {
    if (!pinLooksValid(pin) || !pinLooksValid(confirm)) {
      setStatus("bad");
      return;
    }
    if (pin !== confirm) {
      setStatus("mismatch");
      return;
    }
    const result = setPin(email, pin);
    if (!result.ok) {
      setStatus("bad");
      return;
    }
    setPinValue("");
    setConfirm("");
    setStatus("saved");
    actions.refreshLock();
  };

  const remove = () => {
    if (armed && pinLooksValid(pin) && !checkPin(email, pin).ok) {
      setStatus("wrong");
      return;
    }
    clearPin(email);
    setPinValue("");
    setConfirm("");
    setStatus("cleared");
    actions.refreshLock();
  };

  return (
    <article className="card" data-testid="desk-pin">
      <h2>{t.secTitle}</h2>
      <p className="lede">{t.secSub}</p>
      <p className="hint">{armed ? t.secHasPin : t.secNoPin}</p>
      <label className="field">
        {t.secPinNow}
        <input
          data-testid="pin-input"
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          value={pin}
          onChange={(event) => setPinValue(event.target.value.replace(/\D/g, "").slice(0, 4))}
        />
      </label>
      <label className="field">
        {t.secPinConfirm}
        <input
          data-testid="pin-confirm"
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          value={confirm}
          onChange={(event) => setConfirm(event.target.value.replace(/\D/g, "").slice(0, 4))}
        />
      </label>
      {status === "mismatch" && (
        <p className="alert" role="alert">
          {t.secPinMismatch}
        </p>
      )}
      {(status === "bad" || status === "wrong") && (
        <p className="alert" role="alert">
          {t.secPinBad}
        </p>
      )}
      {status === "saved" && (
        <p className="ok" role="status">
          {t.secPinSaved}
        </p>
      )}
      <div className="actions">
        <button className="btn primary" type="button" onClick={save}>
          {armed ? t.secPinChange : t.secPinSet}
        </button>
        {armed && (
          <button className="btn" type="button" onClick={remove}>
            {t.secPinClear}
          </button>
        )}
        {armed && (
          <button className="btn" type="button" onClick={actions.lockNow}>
            {t.secLockNow}
          </button>
        )}
      </div>
      {locked ? <p className="hint">{t.secIdle}</p> : null}
    </article>
  );
}
