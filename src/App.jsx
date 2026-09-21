import { useEffect, useMemo, useState } from "react";
import {
  ETF,
  SCAM_SAMPLES,
} from "./data/demo.js";
import { COPY, LANGS, langMeta, readLang, saveLang } from "./i18n.js";
import {
  continueAsDemo,
  continueAsNomsa,
  deleteAccount,
  listAccounts,
  readSession,
  readUserRecord,
  saveUserProfile,
  signIn,
  signOut,
  signUp,
} from "./lib/auth.js";
import { readProgress, saveProgress } from "./lib/progress.js";
import {
  DEMO_PROFILE,
  hasMissedPrint,
  missPrimaryPrint,
  needsSetup,
  packedProfile,
  restorePrimaryPrint,
  suggestedSplit,
} from "./lib/profile.js";
import Setup from "./Setup.jsx";
import {
  canPaperInvest,
  confidenceOf,
  formatRand,
  leftoverOf,
  paperWeekPnl,
  splitTotals,
  sumAmounts,
  validateSplit,
} from "./lib/money.js";
import { inspectMessage } from "./lib/scam.js";
import "./App.css";

const VIEWS = ["home", "week", "split", "learn", "invest", "scam", "graduate"];

export default function App() {
  const [session, setSession] = useState(() => readSession());
  const [lang, setLangState] = useState(readLang);
  const [view, setView] = useState("home");
  const [income, setIncome] = useState(DEMO_PROFILE.income);
  const [obligated, setObligated] = useState(DEMO_PROFILE.obligated);
  const [split, setSplit] = useState(DEMO_PROFILE.split);
  const [lessonDone, setLessonDone] = useState(false);
  const [usingCredit, setUsingCredit] = useState(false);
  const [bought, setBought] = useState(false);
  const [buyMessage, setBuyMessage] = useState("");
  const [ticketOpen, setTicketOpen] = useState(false);
  const [scamPick, setScamPick] = useState(null);
  const [rugCaught, setRugCaught] = useState(false);
  const [lessonStep, setLessonStep] = useState(0);
  const [rails, setRails] = useState({ easy: false, wallet: false, shares: false });
  const [railMessage, setRailMessage] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [authMode, setAuthMode] = useState("signin");

  const t = COPY[lang] || COPY.en;
  const leftover = leftoverOf(income, obligated);
  const moneyIn = sumAmounts(income);
  const moneyOut = sumAmounts(obligated);
  const extraGig = income.some((item) => item.id === "extra");
  const uglyWeek = hasMissedPrint(income);
  const splitCheck = validateSplit(Math.max(leftover, 0), split);
  const assigned = splitTotals(split);
  const htmlLang = langMeta(lang).html;

  const setLang = (id) => {
    setLangState(id);
    saveLang(id);
  };

  useEffect(() => {
    document.documentElement.lang = htmlLang;
  }, [htmlLang]);

  useEffect(() => {
    if (!session) return;
    const progress = readProgress(session.email) || {};
    const packed = session.demo ? packedProfile(session.hustle) : null;
    const record = session.demo ? null : readUserRecord(session.email);

    setLessonDone(Boolean(progress.lessonDone ?? record?.lessonDone));
    setBought(Boolean(progress.bought ?? record?.bought));
    setBuyMessage("");
    setTicketOpen(false);
    setScamPick(null);
    setRugCaught(Boolean(progress.rugCaught ?? record?.rugCaught));
    setLessonStep(Number(progress.lessonStep ?? record?.lessonStep) || 0);
    setRails(progress.rails || record?.rails || { easy: false, wallet: false, shares: false });
    setRailMessage("");
    setUsingCredit(false);

    const nextIncome = progress.income || record?.income || packed?.income || DEMO_PROFILE.income;
    const nextObligated =
      progress.obligated || record?.obligated || packed?.obligated || DEMO_PROFILE.obligated;
    const nextSplit = progress.split || record?.split || packed?.split || DEMO_PROFILE.split;
    setIncome(nextIncome);
    setObligated(nextObligated);
    setSplit(nextSplit);
  }, [session?.email]);

  const inspect = useMemo(
    () => (scamPick ? inspectMessage(scamPick.text) : null),
    [scamPick],
  );

  useEffect(() => {
    if (inspect?.blocked) setRugCaught(true);
  }, [inspect]);

  useEffect(() => {
    if (!session || !inspect?.blocked) return;
    persistDesk({ rugCaught: true });
  }, [inspect?.blocked, session?.email]);

  const confidence = confidenceOf({
    lessonDone,
    split,
    leftover,
    rugCaught,
  });
  const pnl = paperWeekPnl(split.invest);

  const persistDesk = (patch = {}) => {
    if (!session) return;
    const snapshot = {
      lessonDone,
      rugCaught,
      lessonStep,
      rails,
      bought,
      income,
      obligated,
      split,
      ...patch,
    };
    saveProgress(session.email, snapshot);
    if (!session.demo) {
      saveUserProfile(session.email, {
        hustle: session.hustle || "custom",
        city: session.city,
        income: snapshot.income,
        obligated: snapshot.obligated,
        split: snapshot.split,
        lessonDone: snapshot.lessonDone,
        rugCaught: snapshot.rugCaught,
        rails: snapshot.rails,
        bought: snapshot.bought,
        lessonStep: snapshot.lessonStep,
      });
    }
  };

  const persistTape = (nextIncome, nextObligated, nextSplit) => {
    persistDesk({
      income: nextIncome,
      obligated: nextObligated,
      split: nextSplit,
    });
  };

  const addGig = () => {
    if (extraGig) return;
    const next = [...income, { id: "extra", amount: 200 }];
    setIncome(next);
    persistTape(next, obligated, split);
  };

  const missPrint = () => {
    if (uglyWeek) return;
    const next = missPrimaryPrint(income);
    const nextSplit = { hold: 0, save: 0, invest: 0 };
    setIncome(next);
    setSplit(nextSplit);
    setBought(false);
    setTicketOpen(false);
    setBuyMessage("");
    persistDesk({ income: next, split: nextSplit, bought: false });
  };

  const restorePrint = () => {
    if (!uglyWeek) return;
    const next = restorePrimaryPrint(income);
    const packed = session.demo ? packedProfile(session.hustle) : null;
    const nextSplit = packed?.split || suggestedSplit(leftoverOf(next, obligated));
    setIncome(next);
    setSplit(nextSplit);
    setBought(false);
    setTicketOpen(false);
    setBuyMessage("");
    persistDesk({ income: next, split: nextSplit, bought: false });
  };

  const changeSplit = (key, value) => {
    const amount = Math.max(0, Number(value) || 0);
    setSplit((prev) => ({ ...prev, [key]: amount }));
    setBought(false);
    setTicketOpen(false);
    persistTape(income, obligated, { ...split, [key]: amount });
  };

  const tryBuy = () => {
    const result = canPaperInvest({
      leftover: Math.max(leftover, 0),
      split,
      lessonDone,
      usingCredit,
    });
    if (!result.ok) {
      const map = {
        credit: t.blockedCredit,
        lesson: t.blockedLesson,
        buffer: t.blockedBuffer,
        "exceeds-leftover": t.blockedLeftover,
        "no-leftover": t.blockedLeftover,
        "zero-invest": t.blockedLeftover,
      };
      setBuyMessage(map[result.reason] || t.blockedLeftover);
      setBought(false);
      setTicketOpen(false);
      return;
    }
    setBuyMessage("");
    setTicketOpen(true);
  };

  const confirmFill = () => {
    const result = canPaperInvest({
      leftover: Math.max(leftover, 0),
      split,
      lessonDone,
      usingCredit,
    });
    if (!result.ok) {
      setTicketOpen(false);
      tryBuy();
      return;
    }
    setBought(true);
    setTicketOpen(false);
    setBuyMessage(t.bought);
    persistDesk({ bought: true });
  };

  const openRail = (id) => {
    if (id === "easy") {
      const next = { ...rails, easy: true };
      setRails(next);
      setRailMessage(t.railEasyDone);
      persistDesk({ rails: next });
      return;
    }
    if (id === "wallet") {
      if (!rails.easy) {
        setRailMessage(t.railNeedEasy);
        return;
      }
      const next = { ...rails, wallet: true };
      setRails(next);
      setRailMessage(t.railWalletDone);
      persistDesk({ rails: next });
      return;
    }
    if (!rails.easy) {
      setRailMessage(t.railNeedEasy);
      return;
    }
    if (!rails.wallet) {
      setRailMessage(t.railNeedWallet);
      return;
    }
    const next = { ...rails, shares: true };
    setRails(next);
    setRailMessage(t.railSharesDone);
    persistDesk({ rails: next });
  };

  const completeLesson = () => {
    const last = Math.max((t.guide?.length || 1) - 1, 0);
    setLessonDone(true);
    setLessonStep(last);
    persistDesk({ lessonDone: true, lessonStep: last });
  };

  const logout = () => {
    signOut();
    setSession(null);
    setView("home");
    setNavOpen(false);
    setConfirmDelete(false);
    setAuthMode("signin");
  };

  const openNewDesk = () => {
    signOut();
    setSession(null);
    setView("home");
    setNavOpen(false);
    setConfirmDelete(false);
    setAuthMode("signup");
  };

  const wipeDesk = () => {
    if (!session || session.demo) return;
    deleteAccount(session.email);
    setSession(null);
    setView("home");
    setNavOpen(false);
    setConfirmDelete(false);
    setAuthMode("signup");
  };

  const finishSetup = (profile) => {
    const result = saveUserProfile(session.email, profile);
    if (!result.ok) return;
    setIncome(profile.income);
    setObligated(profile.obligated);
    setSplit(profile.split);
    saveProgress(session.email, {
      lessonDone: false,
      rugCaught: false,
      rails: { easy: false, wallet: false, shares: false },
      bought: false,
      lessonStep: 0,
      income: profile.income,
      obligated: profile.obligated,
      split: profile.split,
    });
    setSession(result.session);
    setView("home");
  };

  const redoTape = () => {
    setNavOpen(false);
    setSession((prev) => ({ ...prev, setupDone: false }));
  };

  const go = (id) => {
    setView(id);
    setNavOpen(false);
  };

  useEffect(() => {
    document.body.classList.toggle("nav-open", navOpen);
    return () => document.body.classList.remove("nav-open");
  }, [navOpen]);

  if (!session) {
    return (
      <Login
        t={t}
        lang={lang}
        onLang={setLang}
        initialMode={authMode}
        onSession={(next) => {
          setSession(next);
          setView("home");
        }}
      />
    );
  }

  if (needsSetup(session)) {
    return (
      <Setup
        t={t}
        lang={lang}
        onLang={setLang}
        session={session}
        draft={readUserRecord(session.email)}
        onDone={finishSetup}
        onNewDesk={openNewDesk}
        onWipe={wipeDesk}
      />
    );
  }

  const money = {
    leftover,
    moneyIn,
    moneyOut,
    extraGig,
    uglyWeek,
    split,
    splitCheck,
    assigned,
    lessonDone,
    usingCredit,
    bought,
    buyMessage,
    ticketOpen,
    scamPick,
    inspect,
    rugCaught,
    confidence,
    pnl,
    rails,
    railMessage,
    lessonStep,
    income,
    obligated,
    hustle: session.hustle,
  };

  const actions = {
    addGig,
    missPrint,
    restorePrint,
    changeSplit,
    tryBuy,
    confirmFill,
    setLessonDone,
    completeLesson,
    setLessonStep,
    setUsingCredit,
    setBuyMessage,
    setBought,
    setTicketOpen,
    setScamPick,
    openRail,
    setView: go,
  };

  return (
    <div className="app">
      {navOpen && (
        <button className="scrim" type="button" aria-label={t.close} onClick={() => setNavOpen(false)} />
      )}
      <aside className={navOpen ? "sidebar open" : "sidebar"}>
        <div className="brand-block">
          <p className="brand">{t.brand}</p>
          <p className="tag">{t.tag}</p>
        </div>
        <nav className="side-nav" aria-label="Main">
          {VIEWS.map((id, index) => (
            <button
              key={id}
              type="button"
              className={view === id ? "on" : ""}
              onClick={() => go(id)}
            >
              {t.nav[index]}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <button type="button" className="btn ghost" onClick={openNewDesk}>
            {t.newDesk}
          </button>
          {!session.demo && (
            <button type="button" className="btn ghost" onClick={redoTape}>
              {t.redoTape}
            </button>
          )}
          {!session.demo && !confirmDelete && (
            <button type="button" className="btn danger" onClick={() => setConfirmDelete(true)}>
              {t.deleteDesk}
            </button>
          )}
          {!session.demo && confirmDelete && (
            <div className="delete-box">
              <p className="hint">{t.deleteConfirm}</p>
              <button type="button" className="btn danger" onClick={wipeDesk}>
                {t.deleteYes}
              </button>
              <button type="button" className="btn ghost" onClick={() => setConfirmDelete(false)}>
                {t.deleteNo}
              </button>
            </div>
          )}
          <button type="button" className="btn ghost" onClick={logout}>
            {t.logout}
          </button>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="menu-btn"
              type="button"
              aria-expanded={navOpen}
              aria-label={t.menu}
              onClick={() => setNavOpen((open) => !open)}
            >
              <i />
              <i />
              <i />
            </button>
            <div className="who">
              <strong>{t.hello}, {session.name}</strong>
              <span>
                {session.city || session.email}
                {session.hustle && session.hustle !== "custom"
                  ? ` · ${t[`hustle_${session.hustle}`] || session.hustle}`
                  : ""}
              </span>
            </div>
          </div>
          <LangSelect lang={lang} onLang={setLang} label={t.language} />
        </header>

        <main className="content">
          {t.saslNote ? <p className="sasl-note">{t.saslNote}</p> : null}
          {view === "home" && <Overview t={t} money={money} actions={actions} />}
          {view === "week" && <Week t={t} money={money} actions={actions} />}
          {view === "split" && <Split t={t} money={money} actions={actions} />}
          {view === "learn" && <Learn t={t} money={money} actions={actions} />}
          {view === "invest" && <Invest t={t} money={money} actions={actions} />}
          {view === "scam" && <Scam t={t} money={money} actions={actions} />}
          {view === "graduate" && <Graduate t={t} money={money} actions={actions} />}
          <p className="fine">{t.disclaimer}</p>
        </main>
      </div>
      <nav className="dock" aria-label={t.menu}>
        {[
          ["home", t.dockDesk, "desk"],
          ["week", t.dockTape, "tape"],
          ["learn", t.dockGuide, "guide"],
          ["invest", t.dockTicket, "ticket"],
        ].map(([id, label, icon]) => (
          <button
            key={id}
            type="button"
            className={view === id && !navOpen ? "on" : ""}
            aria-current={view === id && !navOpen ? "page" : undefined}
            onClick={() => go(id)}
          >
            <DockIcon name={icon} />
            {label}
          </button>
        ))}
        <button
          type="button"
          className={navOpen ? "on" : ""}
          aria-expanded={navOpen}
          onClick={() => setNavOpen((open) => !open)}
        >
          <DockIcon name="more" />
          {t.dockMore}
        </button>
      </nav>
    </div>
  );
}

function DockIcon({ name }) {
  const paths = {
    desk: "M4 10.5 12 4l8 6.5V20H4z",
    tape: "M5 7h14v3H5zm0 7h9v3H5z",
    guide: "M6 5h12v14H6z M9 9h6 M9 13h6",
    ticket: "M4 8h16v3a2 2 0 0 0 0 2v3H4v-3a2 2 0 0 0 0-2z",
    more: "M6 12h.01M12 12h.01M18 12h.01",
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[name]} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function LangSelect({ lang, onLang, label, dark = false }) {
  return (
    <label className={dark ? "lang-select dark" : "lang-select"}>
      <span className="sr-only">{label}</span>
      <select
        data-testid="lang-select"
        aria-label="Language"
        value={lang}
        onChange={(event) => onLang(event.target.value)}
      >
        {LANGS.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function Login({ t, lang, onLang, onSession, initialMode = "signin" }) {
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [accounts, setAccounts] = useState(listAccounts);

  const fail = (reason) => {
    setError(t[reason] || t.invalid);
  };

  const refreshAccounts = () => setAccounts(listAccounts());

  const submit = (event) => {
    event.preventDefault();
    const result =
      mode === "signup"
        ? signUp({ name, email, password })
        : signIn(email, password);
    if (!result.ok) {
      fail(result.reason);
      return;
    }
    onSession(result.session);
  };

  const useSaved = (account) => {
    setMode("signin");
    setEmail(account.email);
    setName(account.name);
    setPassword("");
    setError("");
  };

  const removeSaved = (account) => {
    deleteAccount(account.email);
    refreshAccounts();
    if (email === account.email) {
      setEmail("");
      setName("");
    }
  };

  return (
    <div className="login">
      <section className="login-brand">
        <div>
          <p className="tag">{t.tag}</p>
          <h1>{t.brand}</h1>
          <p>{t.welcomeSub}</p>
        </div>
        <LangSelect lang={lang} onLang={onLang} label={t.language} dark />
      </section>
      <section className="login-panel">
        <form className="login-card" onSubmit={submit}>
          <h2>{mode === "signup" ? t.signUp : t.welcome}</h2>
          <p className="lede">{t.demoHint}</p>
          {accounts.length > 0 && (
            <div className="saved-desks">
              <h3>{t.savedDesks}</h3>
              <ul>
                {accounts.map((account) => (
                  <li key={account.email} className="account-row">
                    <div>
                      <strong>{account.name}</strong>
                      <span>{account.email}</span>
                    </div>
                    <div className="account-actions">
                      <button type="button" className="btn ghost" onClick={() => useSaved(account)}>
                        {t.useAccount}
                      </button>
                      <button type="button" className="btn danger" onClick={() => removeSaved(account)}>
                        {t.removeAccount}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {mode === "signup" && (
            <label className="field">
              {t.name}
              <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" />
            </label>
          )}
          <label className="field">
            {t.email}
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
            />
          </label>
          <label className="field">
            {t.password}
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </label>
          {error && (
            <p className="alert" role="alert">
              {error}
            </p>
          )}
          <div className="stack">
            <button className="btn primary" type="submit">
              {mode === "signup" ? t.signUp : t.signIn}
            </button>
            <div className="persona-grid">
              <button
                className="persona-card"
                type="button"
                data-testid="demo-login"
                onClick={() => {
                  const result = continueAsDemo();
                  if (result.ok) onSession(result.session);
                }}
              >
                <strong>Thabo M.</strong>
                <span>{t.personaThabo}</span>
                <em>{t.demo}</em>
              </button>
              <button
                className="persona-card"
                type="button"
                data-testid="nomsa-login"
                onClick={() => {
                  const result = continueAsNomsa();
                  if (result.ok) onSession(result.session);
                }}
              >
                <strong>Nomsa D.</strong>
                <span>{t.personaNomsa}</span>
                <em>{t.demoNomsa}</em>
              </button>
            </div>
            <button
              className="linkish"
              type="button"
              onClick={() => {
                setMode((prev) => (prev === "signin" ? "signup" : "signin"));
                setError("");
              }}
            >
              {mode === "signin" ? t.needAccount : t.haveAccount}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function WeekSwitch({ t, money, actions }) {
  return (
    <div className="week-switch" role="group" aria-label={t.weekToggle}>
      <button
        type="button"
        className={money.uglyWeek ? "" : "on"}
        disabled={!money.uglyWeek}
        onClick={actions.restorePrint}
      >
        {money.uglyWeek ? t.restoreGig : t.thisWeekMode}
      </button>
      <button
        type="button"
        className={money.uglyWeek ? "on" : ""}
        disabled={money.uglyWeek}
        onClick={actions.missPrint}
      >
        {t.missGig}
      </button>
    </div>
  );
}

function SitCard({ t }) {
  return (
    <article className="sit-card" data-testid="sit-status" role="status">
      <p className="kicker">{t.sitTitle}</p>
      <h2>{t.uglyNote}</h2>
      <p>{t.sitBody}</p>
    </article>
  );
}

function LeftoverReceipt({ t, money }) {
  return (
    <article className="receipt" data-testid="leftover-receipt">
      <header>
        <span>{t.brand}</span>
        <span>{t.paperBadge}</span>
      </header>
      <p className="kicker">{t.receiptTitle}</p>
      <b>{formatRand(money.leftover)}</b>
      <ul>
        <li>
          <span>{t.in}</span>
          <strong>{formatRand(money.moneyIn)}</strong>
        </li>
        <li>
          <span>{t.out}</span>
          <strong>{formatRand(money.moneyOut)}</strong>
        </li>
      </ul>
      <p className="receipt-rule">{t.receiptRule}</p>
    </article>
  );
}

function Overview({ t, money, actions }) {
  const leftoverSafe = Math.max(money.leftover, 0);
  const bar = (value) => `${leftoverSafe ? Math.min(100, (value / leftoverSafe) * 100) : 0}%`;

  return (
    <section>
      <div className="page-head">
        <h1>{t.overviewTitle}</h1>
        <p className="lede">{t.overviewSub}</p>
      </div>
      <WeekSwitch t={t} money={money} actions={actions} />
      {money.leftover <= 0 && <SitCard t={t} />}
      <div className="kpis">
        <article className={money.leftover <= 0 ? "kpi accent sit" : "kpi accent"}>
          <span>{t.leftover}</span>
          <b data-testid="leftover">{formatRand(money.leftover)}</b>
        </article>
        <article className="kpi">
          <span>{t.in}</span>
          <b>{formatRand(money.moneyIn)}</b>
        </article>
        <article className="kpi">
          <span>{t.out}</span>
          <b>{formatRand(money.moneyOut)}</b>
        </article>
        <article className="kpi">
          <span>{t.position}</span>
          <b>{money.bought ? formatRand(money.split.invest) : "—"}</b>
        </article>
      </div>
      <LeftoverReceipt t={t} money={money} />
      <Confidence t={t} money={money} actions={actions} />
      <div className="grid-2">
        <article className="card">
          <h2>{t.weekTitle}</h2>
          <Ledger t={t} money={money} />
          <div className="actions">
            <button className="btn" type="button" onClick={actions.addGig} disabled={money.extraGig}>
              {t.addGig}
            </button>
            <button className="btn primary" type="button" onClick={() => actions.setView("week")}>
              {t.openWeek}
            </button>
          </div>
        </article>
        <article className="card">
          <h2>{t.splitTitle}</h2>
          <div className="bars">
            <Bar label={t.hold} value={money.split.hold} width={bar(money.split.hold)} kind="hold" />
            <Bar label={t.save} value={money.split.save} width={bar(money.split.save)} kind="save" />
            <Bar label={t.invest} value={money.split.invest} width={bar(money.split.invest)} kind="invest" />
          </div>
          <p className="hint">
            {t.used} {formatRand(money.assigned)} · {t.remaining}{" "}
            {formatRand(Math.max(leftoverSafe - money.assigned, 0))}
          </p>
          <div className="actions">
            <button className="btn" type="button" onClick={() => actions.setView("scam")}>
              {t.openProtect}
            </button>
            <button className="btn" type="button" onClick={() => actions.setView("graduate")}>
              {t.openRails}
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}

function Confidence({ t, money, actions }) {
  const { checks, score, max, ready } = money.confidence;
  return (
    <article className="card confidence" data-testid="confidence">
      <div className="confidence-head">
        <h2>{t.confidenceTitle}</h2>
        <b>{score}/{max}</b>
      </div>
      <p className={ready ? "ok" : "hint"}>{ready ? t.confidenceReady : t.confidenceWait}</p>
      <ul className="checks">
        <li className={checks.lesson ? "on" : ""}>{t.confidenceLesson}</li>
        <li className={checks.buffer ? "on" : ""}>{t.confidenceBuffer}</li>
        <li className={checks.rug ? "on" : ""}>{t.confidenceRug}</li>
      </ul>
      <div className="track">
        <i style={{ width: `${(score / max) * 100}%` }} />
      </div>
      <div className="actions">
        {!checks.lesson && (
          <button className="btn" type="button" onClick={() => actions.setView("learn")}>
            {t.openLearn}
          </button>
        )}
        {!checks.rug && (
          <button className="btn" type="button" onClick={() => actions.setView("scam")}>
            {t.openProtect}
          </button>
        )}
      </div>
    </article>
  );
}

function Bar({ label, value, width, kind }) {
  return (
    <div className="bar-row">
      <span>
        {label}
        <b>{formatRand(value)}</b>
      </span>
      <div className={`track ${kind}`}>
        <i style={{ width }} />
      </div>
    </div>
  );
}

function Ledger({ t, money }) {
  const extraGig = money.extraGig;
  return (
    <ul className="ledger">
      {money.income.map((item) => (
        <li key={item.id} className={item.missed ? "missed" : ""}>
          <span>
            {t.items[item.id] || item.label || t.extraGig}
            {item.missed ? ` · ${t.missedLine}` : ""}
          </span>
          <b>+{formatRand(item.amount)}</b>
        </li>
      ))}
      {extraGig && !money.income.some((item) => item.id === "extra") && (
        <li>
          <span>{t.extraGig}</span>
          <b>+{formatRand(200)}</b>
        </li>
      )}
      {money.obligated.map((item) => (
        <li key={item.id} className="owed">
          <span>{t.items[item.id] || item.label}</span>
          <b>-{formatRand(item.amount)}</b>
        </li>
      ))}
    </ul>
  );
}

function Week({ t, money, actions }) {
  return (
    <section>
      <div className="page-head">
        <h1>{t.weekTitle}</h1>
        <p className="lede">{t.weekSub}</p>
      </div>
      <WeekSwitch t={t} money={money} actions={actions} />
      <div className="hero-row">
        <div className="hero-stat">
          <span>{t.leftover}</span>
          <b data-testid="leftover">{formatRand(money.leftover)}</b>
        </div>
        <div className="pair">
          <article>
            <h2>{t.in}</h2>
            <p>{formatRand(money.moneyIn)}</p>
          </article>
          <article>
            <h2>{t.out}</h2>
            <p>{formatRand(money.moneyOut)}</p>
          </article>
        </div>
      </div>
      <article className="card">
        <Ledger t={t} money={money} />
        {money.leftover <= 0 && (
          <p className="alert sit-banner" role="status">
            {t.uglyNote}
          </p>
        )}
        <div className="actions">
          <button className="btn primary" type="button" onClick={actions.addGig} disabled={money.extraGig}>
            {t.addGig}
          </button>
        </div>
      </article>
    </section>
  );
}

function Split({ t, money, actions }) {
  const leftoverSafe = Math.max(money.leftover, 0);
  return (
    <section>
      <div className="page-head">
        <h1>{t.splitTitle}</h1>
        <p className="lede">{t.splitHint}</p>
      </div>
      <article className="card">
        <p className="hint">
          {t.leftover}: {formatRand(leftoverSafe)} · {t.used} {formatRand(money.assigned)}
        </p>
        {[
          ["hold", t.hold],
          ["save", t.save],
          ["invest", t.invest],
        ].map(([key, label]) => (
          <label className="field" key={key}>
            {label}
            <input
              type="number"
              min="0"
              value={money.split[key]}
              onChange={(event) => actions.changeSplit(key, event.target.value)}
            />
          </label>
        ))}
        {!money.splitCheck.ok && (
          <p className="alert" role="alert">
            {t.blockedLeftover}
          </p>
        )}
      </article>
    </section>
  );
}

function Learn({ t, money, actions }) {
  const slides = t.guide || [];
  const last = Math.max(slides.length - 1, 0);
  const step = Math.min(money.lessonStep, last);
  const slide = slides[step] || { title: t.learnTitle, body: t.lesson };

  return (
    <section>
      <div className="page-head">
        <h1>{t.learnTitle}</h1>
        <p className="lede">
          {t.guideLabel} {step + 1}/{slides.length || 1}
        </p>
      </div>
      <article className="card">
        <ol className="guide-dots" aria-hidden="true">
          {slides.map((item, index) => (
            <li key={item.title} className={index === step ? "on" : index < step ? "done" : ""} />
          ))}
        </ol>
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
          ) : (
            <button
              type="button"
              className="btn primary"
              onClick={actions.completeLesson}
              disabled={money.lessonDone}
            >
              {money.lessonDone ? t.lessonDone : t.learned}
            </button>
          )}
        </div>
      </article>
    </section>
  );
}

function Invest({ t, money, actions }) {
  return (
    <section>
      <div className="page-head">
        <h1>{t.investTitle}</h1>
        <p className="lede">
          {ETF.name} · {t.paperLot} {formatRand(money.split.invest)} · {t.leftover}{" "}
          {formatRand(Math.max(money.leftover, 0))}
        </p>
      </div>
      <article className="card">
        <label className="check">
          <input
            type="checkbox"
            checked={money.usingCredit}
            onChange={() => {
              actions.setUsingCredit((prev) => !prev);
              actions.setBought(false);
              actions.setTicketOpen(false);
            }}
          />
          {t.mashonisa}
        </label>
        <button type="button" className="btn primary" onClick={actions.tryBuy} data-testid="paper-buy">
          {t.buy}
        </button>
        {money.buyMessage && (
          <p className={money.bought ? "ok" : "alert"} role="status" data-testid="buy-status">
            {money.buyMessage}
          </p>
        )}
      </article>
      {money.ticketOpen && (
        <article className="card ticket" data-testid="shares-ticket">
          <p className="paper-stamp">{t.paperBadge}</p>
          <h2>{t.ticketTitle}</h2>
          <dl className="ticket-rows">
            <div>
              <dt>{t.product}</dt>
              <dd>
                {ETF.name} · {ETF.code}
              </dd>
            </div>
            <div>
              <dt>{t.ticketVenue}</dt>
              <dd>{t.ticketSide}</dd>
            </div>
            <div>
              <dt>{t.ticketNotional}</dt>
              <dd>{formatRand(money.split.invest)}</dd>
            </div>
            <div>
              <dt>{t.fee}</dt>
              <dd>{t.ticketFeeLine}</dd>
            </div>
          </dl>
          <div className="actions">
            <button className="btn" type="button" onClick={() => actions.setTicketOpen(false)}>
              {t.ticketScratch}
            </button>
            <button
              className="btn primary"
              type="button"
              data-testid="ticket-confirm"
              onClick={actions.confirmFill}
            >
              {t.ticketConfirm}
            </button>
          </div>
        </article>
      )}
      {money.bought && (
        <article className="card fill" data-testid="paper-fill">
          <h2>{t.ticketFill}</h2>
          <p>
            {ETF.code} · {formatRand(money.split.invest)} · {t.opened}
          </p>
          <p className="ok" data-testid="paper-pnl">
            {t.pnlLabel}: {formatRand(money.pnl.value, 2)} ({money.pnl.change >= 0 ? "+" : ""}
            {formatRand(money.pnl.change, 2)})
          </p>
          <p className="hint">{t.pnlHint}</p>
        </article>
      )}
    </section>
  );
}

function Scam({ t, money, actions }) {
  const [draft, setDraft] = useState("");
  const [pasteError, setPasteError] = useState("");

  const checkPaste = () => {
    const text = draft.trim();
    if (!text) {
      setPasteError(t.pasteEmpty);
      return;
    }
    setPasteError("");
    actions.setScamPick({ id: "paste", from: t.inbox, text });
  };

  return (
    <section>
      <div className="page-head">
        <h1>{t.scamTitle}</h1>
        <p className="lede">{t.tapTip}</p>
      </div>
      <article className="card">
        <ul className="tips">
          {SCAM_SAMPLES.map((sample) => (
            <li key={sample.id}>
              <button type="button" onClick={() => actions.setScamPick(sample)}>
                <small>{sample.from}</small>
                {sample.text}
              </button>
            </li>
          ))}
        </ul>
        <div className="paste-box">
          <label className="field">
            {t.pasteTip}
            <textarea
              data-testid="paste-tip"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={t.pastePlaceholder}
            />
          </label>
          <button className="btn primary" type="button" data-testid="paste-check" onClick={checkPaste}>
            {t.pasteCheck}
          </button>
        </div>
        {pasteError && (
          <p className="alert" role="alert">
            {pasteError}
          </p>
        )}
        {money.inspect && (
          <p
            className={money.inspect.blocked ? "alert" : "ok"}
            role="status"
            data-testid="scam-status"
          >
            {money.inspect.blocked ? `${t.blocked}: ${money.inspect.headline}` : t.safeMsg}
          </p>
        )}
      </article>
    </section>
  );
}

function Graduate({ t, money, actions }) {
  const steps = [
    { id: "easy", label: t.railEasy, done: money.rails.easy, testid: "rail-easy" },
    { id: "wallet", label: t.railWallet, done: money.rails.wallet, testid: "rail-wallet" },
    { id: "shares", label: t.railShares, done: money.rails.shares, testid: "rail-shares" },
  ];

  return (
    <section>
      <div className="page-head">
        <h1>{t.graduateTitle}</h1>
        <p className="lede">
          {t.leftover} {formatRand(Math.max(money.leftover, 0))}. {t.hold} {formatRand(money.split.hold)},{" "}
          {t.save} {formatRand(money.split.save)}, {t.paperLot} {formatRand(money.split.invest)}
          {money.bought ? ` · ${t.opened}` : "."}
        </p>
      </div>
      <article className="card fnb-story">
        <h2>{t.fnbInsideTitle}</h2>
        <p>{t.fnbInsideBody}</p>
      </article>
      <article className="card">
        <ul className="rails">
          {steps.map((step) => (
            <li key={step.id}>
              <span>{step.label}</span>
              <button
                className={step.done ? "btn ghost" : "btn primary"}
                type="button"
                data-testid={step.testid}
                onClick={() => actions.openRail(step.id)}
                disabled={step.done}
              >
                {step.done ? t.railOpened : t.railOpen}
              </button>
            </li>
          ))}
        </ul>
        <p className="hint">
          {t.easyZero} {t.ewallet} {t.sharesZero}
        </p>
        {money.railMessage && (
          <p
            className={
              money.railMessage === t.railNeedEasy || money.railMessage === t.railNeedWallet
                ? "alert"
                : "ok"
            }
            role="status"
            data-testid="rail-status"
          >
            {money.railMessage}
          </p>
        )}
      </article>
    </section>
  );
}
