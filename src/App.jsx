import { useEffect, useMemo, useRef, useState } from "react";
import { ETF } from "./data/demo.js";
import { COPY, LANGS, fill, langMeta, readLang, saveLang } from "./i18n.js";
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
import { clearProgress, readProgress, saveProgress } from "./lib/progress.js";
import { appendWeek, forecastWeek, seededHistory, weekRecord } from "./lib/forecast.js";
import {
  EMPTY_ACCOUNTS,
  cleanAccounts,
  settleWeek,
  startingAccounts,
  weeksOfRent,
} from "./lib/accounts.js";
import {
  accountStatement,
  appendEntries,
  cleanLedger,
  isoDay,
  moneyTrade,
  moveDestinations,
  canMove,
  investRoom,
  seededLedger,
  transfer,
  weekEntries,
} from "./lib/ledger.js";
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
  canAllocateInvest,
  confidenceOf,
  formatRand,
  leftoverOf,
  roundRand,
  splitTotals,
  sumAmounts,
  validateSplit,
} from "./lib/money.js";
import { askCoach } from "./lib/coach.js";
import { flexStats } from "./lib/flex.js";
import { cleanGoals, defaultGoals, goalProgress, newGoal } from "./lib/goals.js";
import { billCalendar, cleanSchedule, safeToSpend } from "./lib/safe.js";
import { moneyWrap } from "./lib/wrap.js";
import { buyHolding, leftoverCash, portfolioOf, quoteMap, sellHolding, cleanHoldings } from "./lib/holdings.js";
import { loadMarket, offlineBoard } from "./lib/market.js";
import { BillCalendar, FlexStrip, GrowPage, SafeSpendCard, WrapCard } from "./Grow.jsx";
import { downloadAccountPdf } from "./lib/statementPdf.js";
import { MarketPage, MarketTeaser } from "./Market.jsx";
import "./App.css";

const VIEWS = ["home", "week", "split", "learn", "accounts", "coach", "grow", "market"];

export default function App() {
  const [session, setSession] = useState(() => readSession());
  const [lang, setLangState] = useState(readLang);
  const [view, setView] = useState("home");
  const [income, setIncome] = useState(DEMO_PROFILE.income);
  const [obligated, setObligated] = useState(DEMO_PROFILE.obligated);
  const [split, setSplit] = useState(DEMO_PROFILE.split);
  const [lessonDone, setLessonDone] = useState(false);
  const [lessonStep, setLessonStep] = useState(0);
  const [navOpen, setNavOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [authMode, setAuthMode] = useState("signin");
  const [history, setHistory] = useState([]);
  const [weekClosed, setWeekClosed] = useState(false);
  const [accounts, setAccounts] = useState(EMPTY_ACCOUNTS);
  const [lastMoves, setLastMoves] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [openAccount, setOpenAccount] = useState(null);
  const [goals, setGoals] = useState([]);
  const [schedule, setSchedule] = useState(() => cleanSchedule());
  const [holdings, setHoldings] = useState([]);
  const [board, setBoard] = useState(() => offlineBoard());

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
    setLessonStep(Number(progress.lessonStep ?? record?.lessonStep) || 0);

    const nextIncome = progress.income || record?.income || packed?.income || DEMO_PROFILE.income;
    const nextObligated =
      progress.obligated || record?.obligated || packed?.obligated || DEMO_PROFILE.obligated;
    const nextSplit = progress.split || record?.split || packed?.split || DEMO_PROFILE.split;
    setIncome(nextIncome);
    setObligated(nextObligated);
    setSplit(nextSplit);
    setHistory(
      progress.history || record?.history || (packed ? seededHistory(session.hustle) : []),
    );
    setWeekClosed(false);
    const savedAccounts = progress.accounts || record?.accounts;
    setAccounts(
      cleanAccounts(savedAccounts || (packed ? startingAccounts(session.hustle) : EMPTY_ACCOUNTS)),
    );
    const savedLedger = progress.ledger || record?.ledger;
    setLedger(
      savedLedger
        ? cleanLedger(savedLedger)
        : packed && !savedAccounts
          ? seededLedger(session.hustle)
          : [],
    );
    const savedGoals = progress.goals || record?.goals;
    setGoals(savedGoals ? cleanGoals(savedGoals) : defaultGoals(nextObligated));
    setSchedule(cleanSchedule(progress.schedule || record?.schedule));
    setHoldings(cleanHoldings(progress.holdings || record?.holdings));
    setLastMoves(null);
    setOpenAccount(null);
  }, [session?.email]);

  useEffect(() => {
    if (!session) return;
    let on = true;
    loadMarket().then((data) => {
      if (on && data.ok) setBoard(data.board);
    });
    return () => {
      on = false;
    };
  }, [session?.email]);

  const forecast = useMemo(
    () => forecastWeek({ history, income, obligated }),
    [history, income, obligated],
  );
  const confidence = confidenceOf({
    lessonDone,
    split,
    leftover,
    forecast,
  });
  const investCheck = canAllocateInvest({
    leftover: Math.max(leftover, 0),
    split,
    lessonDone,
    forecast,
  });
  const settleSplit = investCheck.ok
    ? split
    : investCheck.reason === "cap"
      ? { ...split, invest: Math.max(0, Number(forecast.investCap) || 0) }
      : { ...split, invest: 0 };

  const persistDesk = (patch = {}) => {
    if (!session) return;
    const snapshot = {
      lessonDone,
      lessonStep,
      income,
      obligated,
      split,
      history,
      accounts,
      ledger,
      goals,
      schedule,
      holdings,
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
        lessonStep: snapshot.lessonStep,
        history: snapshot.history,
        accounts: snapshot.accounts,
        ledger: snapshot.ledger,
        goals: snapshot.goals,
        schedule: snapshot.schedule,
        holdings: snapshot.holdings,
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
    persistDesk({ income: next, split: nextSplit });
  };

  const restorePrint = () => {
    if (!uglyWeek) return;
    const next = restorePrimaryPrint(income);
    const packed = session.demo ? packedProfile(session.hustle) : null;
    const nextSplit = packed?.split || suggestedSplit(leftoverOf(next, obligated));
    setIncome(next);
    setSplit(nextSplit);
    persistDesk({ income: next, split: nextSplit });
  };

  const closeWeek = () => {
    const settled = settleWeek(accounts, { moneyIn, moneyOut, split: settleSplit });
    const nextHistory = appendWeek(history, { ...weekRecord(income, obligated), short: settled.moves.short });
    const nextIncome = restorePrimaryPrint(income).filter((item) => item.id !== "extra");
    const packed = session.demo ? packedProfile(session.hustle) : null;
    const nextSplit = packed?.split || suggestedSplit(leftoverOf(nextIncome, obligated));
    setHistory(nextHistory);
    setIncome(nextIncome);
    setSplit(nextSplit);
    setWeekClosed(true);
    const nextLedger = appendEntries(
      ledger,
      weekEntries({ income, obligated, moves: settled.moves, date: isoDay(new Date()) }),
    );
    setAccounts(settled.accounts);
    setLastMoves(settled.moves);
    setLedger(nextLedger);
    persistDesk({
      history: nextHistory,
      income: nextIncome,
      split: nextSplit,
      accounts: settled.accounts,
      ledger: nextLedger,
    });
  };

  const moveMoney = ({ from, to, amount }) => {
    const planned = canMove({
      from,
      to,
      amount,
      accounts,
      leftover,
      lessonDone,
      forecast,
      holdings,
      ledger,
    });
    if (!planned.ok) return planned;
    if (to === "shares") {
      const featured = board.find((row) => row.featured) || board[0];
      if (!featured?.price) return { ok: false, reason: "price" };
      return buySlice({ ticker: featured.ticker, amount, price: featured.price });
    }
    const available = from === "invest" ? leftoverCash(accounts.invest, holdings) : undefined;
    const result = transfer(accounts, { from, to, amount, available });
    if (!result.ok) return result;
    const nextLedger = appendEntries(ledger, [result.entry]);
    setAccounts(result.accounts);
    setLedger(nextLedger);
    persistDesk({ accounts: result.accounts, ledger: nextLedger });
    return result;
  };

  const addGoal = (draft) => {
    const result = newGoal(draft, goals);
    if (!result.ok) return result;
    const next = [...goals, result.goal];
    setGoals(next);
    persistDesk({ goals: next });
    return result;
  };

  const removeGoal = (id) => {
    const next = goals.filter((goal) => goal.id !== id);
    setGoals(next);
    persistDesk({ goals: next });
  };

  const setPayday = (day) => {
    const next = cleanSchedule({ ...schedule, payday: day });
    setSchedule(next);
    persistDesk({ schedule: next });
  };

  const setDueDay = (id, day) => {
    const next = cleanSchedule({ ...schedule, due: { ...schedule.due, [id]: day } });
    setSchedule(next);
    persistDesk({ schedule: next });
  };

  const buySlice = ({ ticker, amount, price }) => {
    const result = buyHolding({
      invest: accounts.invest,
      holdings,
      ticker,
      amount,
      price,
      lessonDone,
    });
    if (!result.ok) return result;
    const nextLedger = appendEntries(ledger, [
      moneyTrade({ date: isoDay(new Date()), side: "buy", ...result.trade }),
    ]);
    setHoldings(result.holdings);
    setLedger(nextLedger);
    persistDesk({ holdings: result.holdings, ledger: nextLedger });
    return result;
  };

  const sellSlice = ({ ticker, units, price }) => {
    const result = sellHolding({ invest: accounts.invest, holdings, ticker, units, price });
    if (!result.ok) return result;
    const nextLedger = appendEntries(ledger, [
      moneyTrade({ date: isoDay(new Date()), side: "sell", ...result.trade }),
    ]);
    const nextAccounts = { ...accounts, invest: result.accountsInvest };
    setHoldings(result.holdings);
    setAccounts(nextAccounts);
    setLedger(nextLedger);
    persistDesk({ holdings: result.holdings, accounts: nextAccounts, ledger: nextLedger });
    return result;
  };

  const showAccount = (id) => {
    setOpenAccount(id);
    setView("accounts");
    setNavOpen(false);
  };

  const changeSplit = (key, value) => {
    const amount = Math.max(0, Number(value) || 0);
    setSplit((prev) => ({ ...prev, [key]: amount }));
    persistTape(income, obligated, { ...split, [key]: amount });
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

  const resetPackedDesk = () => {
    if (!session?.demo) return;
    const packed = packedProfile(session.hustle);
    clearProgress(session.email);
    setIncome(packed.income);
    setObligated(packed.obligated);
    setSplit(packed.split);
    setLessonDone(false);
    setLessonStep(0);
    setHistory(seededHistory(session.hustle));
    setWeekClosed(false);
    setAccounts(startingAccounts(session.hustle));
    setLedger(seededLedger(session.hustle));
    setGoals(defaultGoals(packed.obligated));
    setSchedule(cleanSchedule());
    setHoldings([]);
    setOpenAccount(null);
    setLastMoves(null);
    setView("home");
    setNavOpen(false);
    setConfirmDelete(false);
  };

  const finishSetup = (profile) => {
    const result = saveUserProfile(session.email, profile);
    if (!result.ok) return;
    setIncome(profile.income);
    setObligated(profile.obligated);
    setSplit(profile.split);
    setHistory([]);
    setAccounts(EMPTY_ACCOUNTS);
    setLedger([]);
    setGoals(defaultGoals(profile.obligated));
    setSchedule(cleanSchedule());
    setHoldings([]);
    setLastMoves(null);
    saveProgress(session.email, {
      lessonDone: false,
      lessonStep: 0,
      income: profile.income,
      obligated: profile.obligated,
      split: profile.split,
      history: [],
      accounts: EMPTY_ACCOUNTS,
      ledger: [],
      goals: defaultGoals(profile.obligated),
      holdings: [],
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
    setOpenAccount(null);
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

  const preview = settleWeek(accounts, { moneyIn, moneyOut, split: settleSplit });
  const quotes = quoteMap(board);
  const portfolio = portfolioOf({ invest: accounts.invest, holdings, quotes });
  const goalRows = goalProgress(goals, accounts, {
    pace: { savings: preview.moves.toSavings, invest: preview.moves.toInvest },
    odds: forecast.odds,
  });

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
    investCheck,
    confidence,
    lessonStep,
    income,
    obligated,
    hustle: session.hustle,
    history,
    forecast,
    weekClosed,
    accounts,
    holdings,
    board,
    portfolio,
    lastMoves,
    ledger,
    openAccount,
    worth: roundRand(accounts.main + accounts.savings + portfolio.live),
    rentWeeks: weeksOfRent(accounts.savings, obligated),
    preview,
    goalRows,
    flex: flexStats({
      history,
      ledger,
      lessonDone,
      accounts,
      obligated,
      goalsDone: goalRows.filter((goal) => goal.done).length,
    }),
    safe: safeToSpend({ main: accounts.main, schedule, forecast }),
    bills: billCalendar({ obligated, moneyIn, savings: accounts.savings, schedule }),
    wrap: moneyWrap(ledger),
    who: session.name,
    city: session.city,
  };

  const actions = {
    addGig,
    closeWeek,
    missPrint,
    restorePrint,
    changeSplit,
    completeLesson,
    setLessonStep,
    setView: go,
    showAccount,
    closeAccount: () => setOpenAccount(null),
    moveMoney,
    addGoal,
    removeGoal,
    setPayday,
    setDueDay,
    buySlice,
    sellSlice,
  };

  return (
    <div className="app">
      {navOpen && (
        <button className="scrim" type="button" aria-label={t.close} onClick={() => setNavOpen(false)} />
      )}
      <aside className={navOpen ? "sidebar open" : "sidebar"}>
        <div className="brand-block">
          <img className="brand-mark" src="/icon.svg" alt="" width="44" height="44" />
          <div>
            <p className="brand">{t.brand}</p>
            <p className="tag">{t.tag}</p>
          </div>
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
          {session.demo && (
            <button type="button" className="btn ghost" onClick={resetPackedDesk}>
              {t.resetWeek}
            </button>
          )}
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
          {view === "home" && <Overview t={t} money={money} actions={actions} htmlLang={htmlLang} />}
          {view === "week" && <Week t={t} money={money} actions={actions} htmlLang={htmlLang} />}
          {view === "grow" && <GrowPage t={t} money={money} actions={actions} htmlLang={htmlLang} />}
          {view === "split" && <Split t={t} money={money} actions={actions} />}
          {view === "learn" && <Learn t={t} money={money} actions={actions} />}
          {view === "accounts" && (
            <AccountsPage t={t} lang={lang} money={money} actions={actions} htmlLang={htmlLang} />
          )}
          {view === "market" && (
            <MarketPage t={t} money={money} actions={actions}>
              <MoveMoney t={t} money={money} actions={actions} accountId="invest" />
            </MarketPage>
          )}
          {view === "coach" && <Coach t={t} lang={lang} money={money} />}
          <p className="fine">{t.disclaimer}</p>
        </main>
      </div>
      <nav className="dock" aria-label={t.menu}>
        {[
          ["home", t.dockDesk, "desk"],
          ["week", t.dockTape, "tape"],
          ["accounts", t.dockAccounts, "wallet"],
          ["market", t.dockMarket, "chart"],
          ["coach", t.dockCoach, "chat"],
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
    wallet: "M4 7h16v12H4zM4 11h16",
    grow: "M5 19V14M10 19V11M15 19V8M4 10l6-4 4 3 6-5M16 4h4v4",
    chart: "M4 19V11M10 19V7M16 19v-8M20 19V5",
    chat: "M5 6h14v9H10l-4 3v-3H5z",
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
          <img className="brand-mark login-mark" src="/icon.svg" alt="" width="72" height="72" />
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

function BotFace() {
  return (
    <span className="bot-face" aria-hidden="true">
      <svg viewBox="0 0 36 36">
        <rect x="6" y="10" width="24" height="18" rx="8" fill="#1b6b56" />
        <circle cx="18" cy="8" r="3" fill="#c8891a" />
        <rect x="16.5" y="8" width="3" height="4" fill="#c8891a" />
        <circle cx="14" cy="18" r="2.2" fill="#eef6f2" />
        <circle cx="22" cy="18" r="2.2" fill="#eef6f2" />
        <path d="M14 24c1.4 1.4 6.6 1.4 8 0" fill="none" stroke="#c8891a" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function Coach({ t, lang, money }) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState([{ from: "desk", text: t.coachHello }]);
  const [busy, setBusy] = useState(false);
  const thread = useRef(null);
  const badge = { ai: t.coachAi, rules: t.coachRules, offline: t.coachOffline };

  useEffect(() => {
    const node = thread.current;
    if (node && typeof node.scrollTo === "function") {
      node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
    }
  }, [messages, busy]);

  const send = async (text) => {
    const question = String(text || "").trim();
    if (!question || busy) return;
    setDraft("");
    setBusy(true);
    setMessages((prev) => [...prev, { from: "me", text: question }]);
    const answer = await askCoach({
      question,
      lang,
      income: money.income,
      obligated: money.obligated,
      history: money.history,
      leftover: money.leftover,
      forecast: money.forecast,
    });
    setMessages((prev) => [...prev, { from: "desk", text: answer.reply, source: answer.source }]);
    setBusy(false);
  };

  return (
    <section className="coach-page">
      <div className="page-head">
        <h1>{t.coachTitle}</h1>
        <p className="lede">{t.coachSub}</p>
      </div>
      <div className="phone" data-testid="coach-phone">
        <div className="phone-notch" aria-hidden="true" />
        <div className="phone-screen">
          <header className="imessage-bar">
            <span className="imessage-time">9:41</span>
            <div className="imessage-who">
              <BotFace />
              <div>
                <strong>{t.coachBot}</strong>
                <small>{t.coachBotStatus}</small>
              </div>
            </div>
          </header>
          <ol className="chat" aria-live="polite" data-testid="coach-chat" ref={thread}>
            {messages.map((m, index) => (
              <li key={index} className={m.from}>
                {m.from === "desk" && <BotFace />}
                <div className="bubble">
                  <p>{m.text}</p>
                  {m.source && <span className="src">{badge[m.source]}</span>}
                </div>
              </li>
            ))}
            {busy && (
              <li className="desk typing">
                <BotFace />
                <div className="bubble dots" aria-label={t.coachThinking}>
                  <i />
                  <i />
                  <i />
                </div>
              </li>
            )}
          </ol>
          <div className="chips">
            {[t.coachQ1, t.coachQ2, t.coachQ3].map((q) => (
              <button key={q} type="button" className="chip" onClick={() => send(q)} disabled={busy}>
                {q}
              </button>
            ))}
          </div>
          <form
            className="chat-input"
            onSubmit={(event) => {
              event.preventDefault();
              send(draft);
            }}
          >
            <label className="sr-only" htmlFor="coach-q">
              {t.coachPlaceholder}
            </label>
            <input
              id="coach-q"
              value={draft}
              maxLength={500}
              placeholder={t.coachPlaceholder}
              onChange={(event) => setDraft(event.target.value)}
            />
            <button type="submit" className="send-pill" disabled={busy || !draft.trim()}>
              {t.coachSend}
            </button>
          </form>
          <p className="phone-home" aria-hidden="true" />
        </div>
      </div>
      <p className="hint coach-safety">{t.coachSafety}</p>
    </section>
  );
}

function Accounts({ t, money, actions }) {
  const after = money.preview.accounts;
  const shown = {
    main: money.accounts.main,
    savings: money.accounts.savings,
    invest: money.portfolio.live,
  };
  const cards = [
    ["main", t.acctMain, t.acctMainSub],
    ["savings", t.acctSavings, t.acctSavingsSub],
    ["invest", t.acctInvest, t.acctInvestSub],
  ];
  return (
    <section className="accounts" aria-label={t.acctTitle}>
      {cards.map(([id, name, sub]) => {
        const change = after[id] - money.accounts[id];
        return (
          <button
            key={id}
            type="button"
            className={`account ${id}`}
            data-testid={`account-${id}`}
            aria-label={`${name} ${formatRand(shown[id])}. ${id === "invest" ? t.mktOpen : t.txOpen}`}
            onClick={() => (id === "invest" ? actions.setView("market") : actions.showAccount(id))}
          >
            <span className="account-name">{name}</span>
            <b>{formatRand(shown[id])}</b>
            <span className="account-sub">{sub}</span>
            {change !== 0 && (
              <span className={change > 0 ? "account-change up" : "account-change down"}>
                {fill(t.acctAfter, { amount: formatRand(after[id]) })}
              </span>
            )}
          </button>
        );
      })}
    </section>
  );
}

function accountName(t, id) {
  return { main: t.acctMain, savings: t.acctSavings, invest: t.acctInvest }[id] || id;
}

function txTitle(t, row) {
  if (row.kind === "buy") return fill(t.txBuy, { name: row.label || row.ticker });
  if (row.kind === "sell") return fill(t.txSell, { name: row.label || row.ticker });
  if (row.kind === "in" || row.kind === "out") {
    return t.items?.[row.item] || row.label || (row.item === "extra" ? t.extraGig : t.txOther);
  }
  const reason = { save: t.txSave, invest: t.txInvest, cover: t.txCover }[row.reason] || t.txManual;
  return reason;
}

function txDetail(t, row, accountId) {
  if (row.kind === "buy") return t.txBuyDetail;
  if (row.kind === "sell") return fill(t.txSellDetail, { amount: formatRand(row.pnl) });
  if (row.kind === "in") return t.txIncome;
  if (row.kind === "out") {
    return row.unpaid > 0 ? fill(t.txUnpaid, { amount: formatRand(row.unpaid) }) : t.txBill;
  }
  return row.from === accountId
    ? fill(t.txTo, { name: accountName(t, row.to) })
    : fill(t.txFrom, { name: accountName(t, row.from) });
}

function formatDay(iso, htmlLang) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(htmlLang || "en-ZA", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function pocketStatement(t, money, accountId) {
  const book = money.accounts[accountId];
  const statement = accountStatement(money.ledger, accountId, book);
  const balance = accountId === "invest" ? money.portfolio.live : book;
  return {
    name: accountName(t, accountId),
    rail: { main: t.easyZero, savings: t.ewallet, invest: t.sharesZero }[accountId],
    balance: formatRand(balance),
    moneyIn: `+${formatRand(statement.moneyIn)}`,
    moneyOut: `-${formatRand(statement.moneyOut)}`,
    opening: formatRand(statement.opening),
    empty: accountId === "invest" ? t.txEmptyInvest : t.txEmpty,
    rows: statement.rows.map((row) => ({
      date: row.date,
      title: txTitle(t, row),
      detail: txDetail(t, row, accountId),
      delta: row.delta,
      balance: formatRand(row.balance),
    })),
  };
}

function saveAccountPdf(t, money, accountId) {
  const pocket = pocketStatement(t, money, accountId);
  return downloadAccountPdf({
    brand: t.brand,
    slogan: t.tag,
    paper: t.txPdfPaper,
    who: [money.who, money.city].filter(Boolean).join(" · "),
    pockets: [pocket],
    filename: `${accountId}-statement.pdf`,
  });
}

function saveAllPdfs(t, money) {
  return downloadAccountPdf({
    brand: t.brand,
    slogan: t.tag,
    paper: t.txPdfPaper,
    who: [money.who, money.city].filter(Boolean).join(" · "),
    pockets: ACCOUNT_ORDER.map((id) => pocketStatement(t, money, id)),
    filename: "compound-confidence-statements.pdf",
  });
}

function destName(t, id) {
  if (id === "shares") return t.txMoveShares;
  return accountName(t, id);
}

function pocketAvailable(money, from) {
  if (from === "invest") return leftoverCash(money.accounts.invest, money.holdings);
  return money.accounts[from];
}

function MoveMoney({ t, money, actions, accountId, pickFrom = false }) {
  const [fromPick, setFromPick] = useState(accountId);
  const from = pickFrom ? fromPick : accountId;
  const destinations = moveDestinations(from);
  const [to, setTo] = useState(destinations[0]);
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState(null);

  const changeFrom = (id) => {
    setFromPick(id);
    setTo(moveDestinations(id)[0]);
    setStatus(null);
  };

  if (!destinations.length) return null;
  const destination = destinations.includes(to) ? to : destinations[0];

  const available = pocketAvailable(money, from);
  const room = investRoom({ leftover: money.leftover, forecast: money.forecast, ledger: money.ledger });
  const submit = (event) => {
    event.preventDefault();
    const result = actions.moveMoney({ from, to: destination, amount });
    if (result.ok) {
      const moved = result.entry?.amount ?? result.trade?.amount;
      const name = result.trade?.name || destName(t, destination);
      setStatus({ ok: true, text: fill(t.txMoved, { amount: formatRand(moved), name }) });
      setAmount("");
    } else {
      const reasons = {
        funds: t.txNoFunds,
        amount: t.txNoAmount,
        invest: t.txNoInvest,
        lesson: t.txNoLesson,
        "no-leftover": t.txNoLeftover,
        cap: fill(t.txNoCap, { amount: formatRand(room) }),
        buffer: t.txNoBuffer,
        price: t.mktNoPrice,
      };
      setStatus({ ok: false, text: reasons[result.reason] || t.txNoAmount });
    }
  };

  return (
    <form
      className="card move-money"
      onSubmit={submit}
      data-testid={pickFrom ? "move-money-hub" : "move-money"}
    >
      <h2>{t.txMoveTitle}</h2>
      <p className="hint">
        {fill(t.txMoveHint, { amount: formatRand(available) })}
        {destination === "invest" ? ` ${fill(t.txNoCap, { amount: formatRand(room) })}` : ""}
      </p>
      <div className={`move-row${pickFrom ? " with-from" : ""}`}>
        {pickFrom && (
          <label>
            <span>{t.txMoveFrom}</span>
            <select value={from} onChange={(event) => changeFrom(event.target.value)} aria-label={t.txMoveFrom}>
              {ACCOUNT_ORDER.map((id) => (
                <option key={id} value={id}>
                  {accountName(t, id)}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          <span>{t.txMoveTo}</span>
          <select value={destination} onChange={(event) => setTo(event.target.value)} aria-label={t.txMoveTo}>
            {destinations.map((id) => (
              <option key={id} value={id}>
                {destName(t, id)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t.txAmount}</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="10"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            aria-label={t.txAmount}
            placeholder="R0"
          />
        </label>
        <button className="btn primary" type="submit">
          {destination === "shares" ? t.txMoveBuy : t.txMoveBtn}
        </button>
      </div>
      <p className="hint">{t.txInvestNote}</p>
      {status && (
        <p className={status.ok ? "ok" : "alert"} role="status" data-testid="move-status">
          {status.text}
        </p>
      )}
    </form>
  );
}

const ACCOUNT_ORDER = ["main", "savings", "invest"];

function AccountDetail({ t, money, actions, accountId, htmlLang }) {
  const book = money.accounts[accountId];
  const balance = accountId === "invest" ? money.portfolio.live : book;
  const statement = useMemo(
    () => accountStatement(money.ledger, accountId, book),
    [money.ledger, accountId, book],
  );
  const days = [];
  for (const row of statement.rows) {
    const last = days[days.length - 1];
    if (last && last.date === row.date) last.rows.push(row);
    else days.push({ date: row.date, rows: [row] });
  }
  const sub = { main: t.acctMainSub, savings: t.acctSavingsSub, invest: t.acctInvestSub }[accountId];

  return (
    <section data-testid={`account-detail-${accountId}`}>
      <div className="page-head">
        <button className="btn ghost back" type="button" onClick={actions.closeAccount}>
          ← {t.txBack}
        </button>
        <h1>{accountName(t, accountId)}</h1>
        <p className="lede">{sub}</p>
        <div className="actions">
          <button
            className="btn"
            type="button"
            data-testid={`download-pdf-${accountId}`}
            onClick={() => saveAccountPdf(t, money, accountId)}
          >
            {t.txPdf}
          </button>
        </div>
      </div>

      <article className={`card account-hero ${accountId}`}>
        <p className="kicker">{t.txBalance}</p>
        <b className="account-balance" data-testid="detail-balance">
          {formatRand(balance)}
        </b>
        <div className="tx-totals">
          <span>
            <small>{t.txIn30}</small>
            <b className="up">+{formatRand(statement.moneyIn)}</b>
          </span>
          <span>
            <small>{t.txOut30}</small>
            <b className="down">-{formatRand(statement.moneyOut)}</b>
          </span>
          <span>
            <small>{t.txOpening}</small>
            <b>{formatRand(statement.opening)}</b>
          </span>
        </div>
        <div className="account-tabs" role="tablist" aria-label={t.acctTitle}>
          {ACCOUNT_ORDER.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={id === accountId}
              className={id === accountId ? "active" : ""}
              onClick={() => actions.showAccount(id)}
            >
              {accountName(t, id)}
            </button>
          ))}
        </div>
      </article>

      <MoveMoney key={accountId} t={t} money={money} actions={actions} accountId={accountId} />
      {accountId === "invest" && <MarketTeaser t={t} money={money} actions={actions} />}

      <article className="card">
        <h2>{t.txTitle}</h2>
        {days.length === 0 ? (
          <p className="hint" data-testid="tx-empty">
            {accountId === "invest" ? t.txEmptyInvest : t.txEmpty}
          </p>
        ) : (
          <div className="tx-list" data-testid="tx-list">
            {days.map((day) => (
              <section key={day.date} className="tx-day">
                <h3>{formatDay(day.date, htmlLang)}</h3>
                <ul>
                  {day.rows.map((row) => (
                    <li key={row.id} className={`tx ${row.kind}`} data-testid="tx-row">
                      <span className={`tx-icon ${row.delta > 0 ? "up" : "down"}`} aria-hidden="true">
                        {row.kind === "move" ? "⇄" : row.delta > 0 ? "↓" : "↑"}
                      </span>
                      <span className="tx-text">
                        <b>{txTitle(t, row)}</b>
                        <small>{txDetail(t, row, accountId)}</small>
                      </span>
                      <span className="tx-amount">
                        <b className={row.delta > 0 ? "up" : "down"}>
                          {row.delta > 0 ? "+" : "-"}
                          {formatRand(Math.abs(row.delta))}
                        </b>
                        <small>{formatRand(row.balance)}</small>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}

function WeekMoves({ t, moves }) {
  if (moves.leftover < 0) {
    return (
      <p className={moves.short > 0 ? "alert" : "ok"} data-testid="week-moves">
        {fill(t.movesCovered, {
          main: formatRand(moves.fromMain),
          savings: formatRand(moves.fromSavings),
        })}{" "}
        {moves.short > 0 ? fill(t.movesShort, { amount: formatRand(moves.short) }) : t.movesSaved}
      </p>
    );
  }
  return (
    <p className="ok" data-testid="week-moves">
      {fill(t.movesSplit, {
        savings: formatRand(moves.toSavings),
        invest: formatRand(moves.toInvest),
        main: formatRand(moves.toMain),
      })}
    </p>
  );
}

function ForecastCard({ t, money, actions }) {
  const f = money.forecast;
  const pastLeftovers = money.history.map((item) => item.moneyIn - item.moneyOut);
  const scale = Math.max(1, ...pastLeftovers.map(Math.abs), Math.abs(f.goodLeftover), Math.abs(f.badLeftover));
  const height = (value) => `${Math.max(6, (Math.abs(value) / scale) * 100)}%`;
  const headline = { sit: t.fcSit, light: t.fcLight, go: t.fcGo }[f.call];

  return (
    <article className={`card forecast ${f.call}`} data-testid="forecast">
      <p className="kicker">{t.fcTitle}</p>
      <h2 data-testid="forecast-call">{headline}</h2>
      {money.history.length > 0 && (
        <div className="spark" aria-hidden="true">
          {pastLeftovers.map((value, index) => (
            <span
              key={index}
              className={value < 0 ? "neg" : "pos"}
              style={{ height: height(value) }}
            />
          ))}
          <span className="next" style={{ height: height(f.goodLeftover * f.odds) }} />
        </div>
      )}
      <ul className="fc-lines">
        {f.weeks > 0 && (
          <li data-testid="forecast-odds">
            {fill(t.fcOdds, { landed: f.landed, weeks: f.weeks, odds: f.oddsPct })}
          </li>
        )}
        <li>
          {fill(t.fcIfLands, { amount: formatRand(f.goodLeftover) })}{" "}
          {f.badLeftover < 0
            ? fill(t.fcIfMissShort, { amount: formatRand(-f.badLeftover) })
            : fill(t.fcIfMiss, { amount: formatRand(f.badLeftover) })}
        </li>
        {f.riskPct > 0 && <li>{fill(t.fcRisk, { risk: f.riskPct })}</li>}
        {f.streak >= 2 && <li>{fill(t.fcStreak, { n: f.streak })}</li>}
        <li data-testid="forecast-cap">
          <b>
            {f.call === "sit"
              ? t.fcCapSit
              : fill(t.fcCap, { cap: formatRand(f.investCap), aside: formatRand(f.setAside) })}
          </b>
        </li>
        {f.lowData && <li className="hint">{fill(t.fcLowData, { n: f.weeks })}</li>}
      </ul>
      <div className="actions">
        <button type="button" className="btn" onClick={actions.closeWeek} data-testid="close-week">
          {t.fcCloseWeek}
        </button>
      </div>
      {money.weekClosed && (
        <div role="status">
          <p className="ok" data-testid="week-closed">
            {t.fcClosed}
          </p>
          {money.lastMoves && <WeekMoves t={t} moves={money.lastMoves} />}
        </div>
      )}
      <p className="hint">{t.fcHow}</p>
    </article>
  );
}

function Overview({ t, money, actions, htmlLang }) {
  const leftoverSafe = Math.max(money.leftover, 0);
  const bar = (value) => `${leftoverSafe ? Math.min(100, (value / leftoverSafe) * 100) : 0}%`;

  return (
    <section>
      <div className="page-head">
        <h1>{t.overviewTitle}</h1>
        <p className="lede">{t.overviewSub}</p>
      </div>
      <Accounts t={t} money={money} actions={actions} />
      <MarketTeaser t={t} money={money} actions={actions} />
      <SafeSpendCard t={t} money={money} actions={actions} htmlLang={htmlLang} />
      <FlexStrip t={t} money={money} actions={actions} />
      <WeekSwitch t={t} money={money} actions={actions} />
      <article className="walk-card">
        <h2>{t.walkTitle}</h2>
        <ol>
          <li>{t.walk1}</li>
          <li>{t.walk2}</li>
          <li>{t.walk3}</li>
          <li>{t.walk4}</li>
          <li>{t.walk5}</li>
          <li>{t.walk6}</li>
        </ol>
      </article>
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
          <span>{t.acctWorth}</span>
          <b data-testid="net-worth">{formatRand(money.worth)}</b>
        </article>
      </div>
      <ForecastCard t={t} money={money} actions={actions} />
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
            <button className="btn" type="button" onClick={() => actions.setView("split")}>
              {t.openSplit}
            </button>
            <button className="btn primary" type="button" onClick={() => actions.setView("accounts")}>
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
        <li className={checks.cap ? "on" : ""}>{t.confidenceCap}</li>
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
        {!checks.cap && (
          <button className="btn" type="button" onClick={() => actions.setView("split")}>
            {t.openSplit}
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

function Week({ t, money, actions, htmlLang }) {
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
        <p className="hint">
          {t.acctMain}: {formatRand(money.preview.accounts.main)} · {t.acctSavings}:{" "}
          {formatRand(money.preview.accounts.savings)} · {t.acctInvest}:{" "}
          {formatRand(money.preview.accounts.invest)}
        </p>
        <div className="actions">
          <button className="btn primary" type="button" onClick={actions.addGig} disabled={money.extraGig}>
            {t.addGig}
          </button>
        </div>
      </article>
      <BillCalendar t={t} money={money} actions={actions} htmlLang={htmlLang} />
    </section>
  );
}

function Split({ t, money, actions }) {
  const leftoverSafe = Math.max(money.leftover, 0);
  const after = money.preview.accounts;
  const splitAlert =
    leftoverSafe <= 0
      ? t.blockedLeftover
      : !money.splitCheck.ok
        ? t.blockedLeftover
        : !money.investCheck.ok
          ? { lesson: t.blockedLesson, buffer: t.blockedBuffer, cap: t.blockedCap, "no-leftover": t.blockedLeftover }[
              money.investCheck.reason
            ]
          : "";

  return (
    <section>
      <div className="page-head">
        <h1>{t.splitTitle}</h1>
        <p className="lede">{t.splitHint}</p>
      </div>
      <article className="card">
        <p className="hint">
          {t.leftover}: {formatRand(leftoverSafe)} · {t.used} {formatRand(money.assigned)} · {t.remaining}{" "}
          {formatRand(Math.max(leftoverSafe - money.assigned, 0))}
        </p>
        {money.forecast.weeks > 0 && (
          <p className="hint" data-testid="invest-forecast">
            {money.forecast.call === "sit"
              ? t.fcCapSit
              : fill(t.fcCap, {
                  cap: formatRand(money.forecast.investCap),
                  aside: formatRand(money.forecast.setAside),
                })}
          </p>
        )}
        {[
          ["hold", t.hold, t.acctMain],
          ["save", t.save, t.acctSavings],
          ["invest", t.invest, t.acctInvest],
        ].map(([key, label, dest]) => (
          <label className="field" key={key}>
            {label}
            <small className="field-hint">{dest}</small>
            <input
              type="number"
              min="0"
              aria-label={label}
              value={money.split[key]}
              onChange={(event) => actions.changeSplit(key, event.target.value)}
            />
          </label>
        ))}
        {splitAlert && (
          <p className="alert" role="alert" data-testid="split-status">
            {splitAlert}
          </p>
        )}
        <ul className="split-preview">
          <li>
            {t.acctMain}: {formatRand(after.main)}
          </li>
          <li>
            {t.acctSavings}: {formatRand(after.savings)}
          </li>
          <li>
            {t.acctInvest}: {formatRand(after.invest)}
          </li>
        </ul>
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
    </section>
  );
}

function AccountsPage({ t, lang, money, actions, htmlLang }) {
  if (money.openAccount) {
    return (
      <AccountDetail
        t={t}
        money={money}
        actions={actions}
        accountId={money.openAccount}
        htmlLang={htmlLang}
      />
    );
  }
  const after = money.preview.accounts;
  const move = money.preview.moves;
  const rows = [
    {
      id: "main",
      name: t.acctMain,
      sub: t.acctMainSub,
      rail: t.easyZero,
      body: t.acctMainBody,
      now: money.accounts.main,
      next: after.main,
      thisWeek:
        money.leftover < 0
          ? fill(t.acctMainOut, { amount: formatRand(move.fromMain) })
          : fill(t.acctMainIn, { amount: formatRand(move.toMain) }),
    },
    {
      id: "savings",
      name: t.acctSavings,
      sub: t.acctSavingsSub,
      rail: t.ewallet,
      body: fill(t.acctSavingsBody, { weeks: money.rentWeeks }),
      now: money.accounts.savings,
      next: after.savings,
      thisWeek:
        money.leftover < 0
          ? fill(t.acctSavingsOut, { amount: formatRand(move.fromSavings) })
          : fill(t.acctSavingsIn, { amount: formatRand(move.toSavings) }),
    },
    {
      id: "invest",
      name: t.acctInvest,
      sub: t.acctInvestSub,
      rail: t.sharesZero,
      body: t.acctInvestBody,
      now: money.portfolio.live,
      next: after.invest,
      thisWeek: fill(t.acctInvestIn, { amount: formatRand(move.toInvest) }),
    },
  ];

  return (
    <section>
      <div className="page-head">
        <h1>{t.graduateTitle}</h1>
        <p className="lede">
          {t.acctWorth} {formatRand(money.worth)} · {t.leftover} {formatRand(Math.max(money.leftover, 0))}
        </p>
        <div className="actions">
          <button className="btn" type="button" data-testid="download-pdf-all" onClick={() => saveAllPdfs(t, money)}>
            {t.txPdfAll}
          </button>
        </div>
      </div>
      <WrapCard t={t} lang={lang} money={money} />
      <article className="card fnb-story">
        <h2>{t.fnbInsideTitle}</h2>
        <p>{t.fnbInsideBody}</p>
      </article>
      <MoveMoney t={t} money={money} actions={actions} accountId="main" pickFrom />
      {rows.map((row) => (
        <article key={row.id} className={`card account-detail ${row.id}`} data-testid={`account-page-${row.id}`}>
          <p className="kicker">{row.rail}</p>
          <h2>{row.name}</h2>
          <b className="account-balance">{formatRand(row.now)}</b>
          <p>{row.body}</p>
          <p className="hint">{row.sub}</p>
          <p className={row.next >= row.now ? "ok" : "alert"}>{row.thisWeek}</p>
          {row.next !== row.now && (
            <p className="hint">{fill(t.acctAfter, { amount: formatRand(row.next) })}</p>
          )}
          <div className="actions">
            <button
              className="btn"
              type="button"
              onClick={() => actions.showAccount(row.id)}
              data-testid={`open-account-${row.id}`}
            >
              {t.txOpen}
            </button>
            <button
              className="btn"
              type="button"
              data-testid={`download-pdf-${row.id}`}
              onClick={() => saveAccountPdf(t, money, row.id)}
            >
              {t.txPdf}
            </button>
            {row.id === "invest" && (
              <button className="btn primary" type="button" onClick={() => actions.setView("market")}>
                {t.mktOpen}
              </button>
            )}
          </div>
        </article>
      ))}
      <MarketTeaser t={t} money={money} actions={actions} />
      <article className="card">
        <p className="hint">
          {ETF.name} · {ETF.code} · {t.feeBuy}
        </p>
        <div className="actions">
          <button className="btn" type="button" onClick={() => actions.setView("split")}>
            {t.openSplit}
          </button>
          <button className="btn primary" type="button" onClick={actions.closeWeek} data-testid="accounts-close-week">
            {t.fcCloseWeek}
          </button>
        </div>
      </article>
    </section>
  );
}
