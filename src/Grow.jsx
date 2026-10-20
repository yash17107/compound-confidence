import { useMemo, useState } from "react";
import { fill } from "./i18n.js";
import { shareFlexCard } from "./lib/flexCard.js";
import { GROWTH_RATES, MAX_GOALS, projection } from "./lib/goals.js";
import { formatRand } from "./lib/money.js";
import { askWrap } from "./lib/wrap.js";

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];
const MILESTONES = [1, 5, 10, 20];

export function weekdayName(day, htmlLang, style = "long") {
  return new Date(2026, 0, 4 + day).toLocaleDateString(htmlLang || "en-ZA", { weekday: style });
}

function shortDate(date, htmlLang) {
  return new Date(date).toLocaleDateString(htmlLang || "en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

function plainName(t, id, label) {
  return String(t.items?.[id] || label || id).replace(/\s*\([^)]*\)\s*$/, "");
}

function billName(t, bill) {
  return plainName(t, bill.id, bill.label);
}

function dueText(t, days) {
  if (days === 0) return t.dueToday;
  if (days === 1) return t.dueTomorrow;
  return fill(t.dueIn, { days });
}

export function SafeSpendCard({ t, money, actions, htmlLang }) {
  const { safe, bills } = money;
  const next = bills.slice(0, 3);
  return (
    <article className={safe.careful ? "card safe careful" : "card safe"} data-testid="safe-spend">
      <div className="safe-head">
        <div>
          <p className="kicker">{t.safeTitle}</p>
          <b className="safe-amount" data-testid="safe-amount">
            {formatRand(safe.perDay)}
          </b>
          <p className="hint">
            {fill(t.safeSub, { days: safe.daysLeft, payday: weekdayName(safe.payday, htmlLang) })}
          </p>
        </div>
        <label className="payday">
          <span>{t.payday}</span>
          <select
            value={safe.payday}
            aria-label={t.payday}
            onChange={(event) => actions.setPayday(Number(event.target.value))}
          >
            {WEEKDAYS.map((day) => (
              <option key={day} value={day}>
                {weekdayName(day, htmlLang)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className={safe.careful ? "alert" : "ok"}>
        {safe.careful
          ? fill(t.safeCareful, { held: formatRand(safe.held) })
          : fill(t.safeOk, { pool: formatRand(safe.pool), held: formatRand(safe.held) })}
      </p>
      {next.length > 0 && (
        <ul className="bill-chips" aria-label={t.calTitle}>
          {next.map((bill) => (
            <li key={bill.id} className={bill.status}>
              <b>{billName(t, bill)}</b>
              <span>
                {formatRand(bill.amount)} · {dueText(t, bill.days)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="actions">
        <button className="btn" type="button" onClick={() => actions.setView("week")}>
          {t.billsOpen}
        </button>
      </div>
    </article>
  );
}

export function BillCalendar({ t, money, actions, htmlLang }) {
  const statusText = { covered: t.billCovered, savings: t.billSavings, short: t.billShort };
  return (
    <article className="card bills" data-testid="bill-calendar">
      <h2>{t.calTitle}</h2>
      <p className="hint">{t.calSub}</p>
      <ul className="bill-list">
        {money.bills.map((bill) => (
          <li key={bill.id} className={`bill ${bill.status}`} data-testid={`bill-${bill.id}`}>
            <span className="bill-when">
              <b>{weekdayName(bill.day, htmlLang, "short")}</b>
              <small>{dueText(t, bill.days)}</small>
            </span>
            <span className="bill-what">
              <b>{billName(t, bill)}</b>
              <small>{statusText[bill.status]}</small>
            </span>
            <span className="bill-amount">{formatRand(bill.amount)}</span>
            <select
              aria-label={fill(t.billDueLabel, { name: billName(t, bill) })}
              value={bill.day}
              onChange={(event) => actions.setDueDay(bill.id, Number(event.target.value))}
            >
              {WEEKDAYS.map((day) => (
                <option key={day} value={day}>
                  {weekdayName(day, htmlLang, "short")}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>
    </article>
  );
}

function goalName(t, goal) {
  return goal.preset ? t[`goal_${goal.preset}`] || goal.preset : goal.name;
}

function goalStatus(t, goal, money, htmlLang) {
  if (goal.done) return t.goalDone;
  if (goal.weeks === null) {
    return goal.account === "invest" && !money.lessonDone ? t.goalLocked : t.goalPaused;
  }
  return fill(t.goalEta, {
    weeks: goal.weeks,
    weekly: formatRand(goal.weekly),
    date: shortDate(goal.eta, htmlLang),
  });
}

function GoalForm({ t, actions, full }) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [account, setAccount] = useState("savings");
  const [error, setError] = useState("");

  const submit = (event) => {
    event.preventDefault();
    const result = actions.addGoal({ name, target, account });
    if (result.ok) {
      setName("");
      setTarget("");
      setError("");
    } else {
      setError(result.reason === "full" ? fill(t.goalFull, { max: MAX_GOALS }) : t.goalInvalid);
    }
  };

  return (
    <form className="goal-form" onSubmit={submit} data-testid="goal-form">
      <label>
        <span>{t.goalName}</span>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder={t.goalNameHint} maxLength={40} />
      </label>
      <label>
        <span>{t.goalTarget}</span>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="50"
          value={target}
          onChange={(event) => setTarget(event.target.value)}
          placeholder="R0"
        />
      </label>
      <label>
        <span>{t.goalAccount}</span>
        <select value={account} onChange={(event) => setAccount(event.target.value)}>
          <option value="savings">{t.acctSavings}</option>
          <option value="invest">{t.acctInvest}</option>
        </select>
      </label>
      <button className="btn primary" type="submit" disabled={full}>
        {t.goalAdd}
      </button>
      {error && (
        <p className="alert" role="status">
          {error}
        </p>
      )}
    </form>
  );
}

function Goals({ t, money, actions, htmlLang }) {
  return (
    <article className="card goals" data-testid="goals">
      <h2>{t.goalsTitle}</h2>
      <p className="hint">{t.goalsSub}</p>
      <ul className="goal-list">
        {money.goalRows.map((goal) => (
          <li key={goal.id} className={goal.done ? "goal done" : `goal ${goal.account}`} data-testid="goal-row">
            <div className="goal-top">
              <b>{goalName(t, goal)}</b>
              <span>
                {formatRand(goal.have)} / {formatRand(goal.target)}
              </span>
            </div>
            <div className="track">
              <i style={{ width: `${Math.min(100, goal.pct)}%` }} />
            </div>
            <div className="goal-foot">
              <small>
                {goal.account === "invest" ? t.acctInvest : t.acctSavings} · {goal.pct}%
              </small>
              <small className={goal.done ? "ok" : ""}>{goalStatus(t, goal, money, htmlLang)}</small>
              <button
                type="button"
                className="link-btn"
                onClick={() => actions.removeGoal(goal.id)}
                aria-label={fill(t.goalRemove, { name: goalName(t, goal) })}
              >
                ×
              </button>
            </div>
          </li>
        ))}
      </ul>
      <GoalForm t={t} actions={actions} full={money.goalRows.length >= MAX_GOALS} />
    </article>
  );
}

function GrowthChart({ points }) {
  const width = 600;
  const height = 200;
  const pad = 8;
  const max = Math.max(1, ...points.map((point) => point.value));
  const x = (index) => pad + (index / Math.max(1, points.length - 1)) * (width - pad * 2);
  const y = (value) => height - pad - (value / max) * (height - pad * 2);
  const line = (key) => points.map((point, index) => `${index ? "L" : "M"}${x(index)},${y(point[key])}`).join(" ");
  const area = `${line("value")} L${x(points.length - 1)},${height - pad} L${x(0)},${height - pad} Z`;
  return (
    <svg className="growth-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-hidden="true" preserveAspectRatio="none">
      <path d={area} className="growth-area" />
      <path d={line("value")} className="growth-line" />
      <path d={line("contributed")} className="growth-paid" />
    </svg>
  );
}

function Compound({ t, money }) {
  const suggested = money.preview.moves.toInvest || money.forecast.investCap || 50;
  const [weekly, setWeekly] = useState(Math.max(10, Math.round(suggested / 10) * 10));
  const [rateKey, setRateKey] = useState("mid");
  const points = useMemo(
    () => projection({ weekly, start: money.accounts.invest, years: 20, rate: GROWTH_RATES[rateKey] }),
    [weekly, rateKey, money.accounts.invest],
  );
  const ten = points[10];

  return (
    <article className="card compound" data-testid="compound">
      <p className="kicker">{t.compoundKicker}</p>
      <h2 className="compound-title">{t.compoundTitle}</h2>
      <p className="compound-hero">
        {fill(t.compoundHero, { weekly: formatRand(weekly), value: formatRand(ten.value) })}
      </p>
      <label className="slider">
        <span>
          {t.compoundWeekly} <b data-testid="compound-weekly">{formatRand(weekly)}</b>
        </span>
        <input
          type="range"
          min="10"
          max="500"
          step="10"
          value={weekly}
          aria-label={t.compoundWeekly}
          onChange={(event) => setWeekly(Number(event.target.value))}
        />
      </label>
      <div className="rate-toggle" role="radiogroup" aria-label={t.compoundRate}>
        {Object.keys(GROWTH_RATES).map((key) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={rateKey === key}
            className={rateKey === key ? "on" : ""}
            onClick={() => setRateKey(key)}
          >
            {fill(t[`rate_${key}`], { pct: Math.round(GROWTH_RATES[key] * 100) })}
          </button>
        ))}
      </div>
      <GrowthChart points={points} />
      <div className="milestones">
        {MILESTONES.map((year) => (
          <span key={year} data-testid={`milestone-${year}`}>
            <small>{fill(t.compoundYears, { years: year })}</small>
            <b>{formatRand(points[year].value)}</b>
            <small className="up">+{formatRand(points[year].growth)}</small>
          </span>
        ))}
      </div>
      <p className="hint">
        <span className="legend value" /> {t.compoundValue} <span className="legend paid" /> {t.compoundPaid}
      </p>
      <p className="hint">{t.compoundNote}</p>
    </article>
  );
}

function flexCardData(t, money) {
  const { flex } = money;
  const levelName = t[`level_${flex.level.id}`];
  return {
    brand: t.brand,
    tag: t.tag,
    level: levelName,
    streakLabel: t.flexStreak,
    streak: flex.streak,
    stats: [
      [t.flexXp, flex.xp],
      [t.flexBadges, `${flex.earnedCount}/${flex.badges.length}`],
      [t.flexRentWeeks, flex.rentWeeks],
    ],
    badges: flex.badges
      .filter((badge) => badge.on)
      .map((badge) => t[`badge_${badge.id}`])
      .join("  ·  "),
    footer: t.flexFooter,
    shareText: fill(t.flexShareText, { level: levelName, streak: flex.streak }),
  };
}

function Flex({ t, money }) {
  const { flex } = money;
  const [status, setStatus] = useState("");
  const card = flexCardData(t, money);

  const share = async () => {
    const result = await shareFlexCard(card);
    setStatus({ shared: t.flexShared, downloaded: t.flexDownloaded, cancelled: "", unsupported: t.flexUnsupported }[result] || "");
  };

  return (
    <article className="card flex" data-testid="flex">
      <div className="flex-card" aria-label={t.flexPreview}>
        <div className="flex-brand">
          <img src="/icon.svg" alt="" width="40" height="40" />
          <span>
            <b>{t.brand}</b>
            <small>{t.tag}</small>
          </span>
        </div>
        <small className="flex-label">{t.flexStreak}</small>
        <b className="flex-streak" data-testid="flex-streak">
          {flex.streak}
        </b>
        <b className="flex-level" data-testid="flex-level">
          {card.level}
        </b>
        <div className="flex-stats">
          {card.stats.map(([label, value]) => (
            <span key={label}>
              <b>{value}</b>
              <small>{label}</small>
            </span>
          ))}
        </div>
      </div>

      <div className="flex-side">
        <h2>{t.flexTitle}</h2>
        <p className="hint">{t.flexSub}</p>
        <div className="xp">
          <span>
            {flex.xp} XP
            {flex.level.next
              ? ` · ${fill(t.flexToNext, { xp: flex.level.toNext, level: t[`level_${flex.level.next.id}`] })}`
              : ` · ${t.flexMax}`}
          </span>
          <div className="track">
            <i style={{ width: `${flex.level.pct}%` }} />
          </div>
        </div>
        <ul className="badges">
          {flex.badges.map((badge) => (
            <li key={badge.id} className={badge.on ? "on" : ""} data-testid={`badge-${badge.id}`}>
              <b>{t[`badge_${badge.id}`]}</b>
              <small>{t[`badgeHow_${badge.id}`]}</small>
            </li>
          ))}
        </ul>
        <div className="actions">
          <button className="btn primary" type="button" onClick={share} data-testid="flex-share">
            {t.flexShare}
          </button>
        </div>
        <p className="hint">{t.flexPrivacy}</p>
        {status && (
          <p className="ok" role="status">
            {status}
          </p>
        )}
      </div>
    </article>
  );
}

export function GrowPage({ t, money, actions, htmlLang }) {
  return (
    <section>
      <div className="page-head">
        <h1>{t.growTitle}</h1>
        <p className="lede">{t.growSub}</p>
      </div>
      <Flex t={t} money={money} />
      <Goals t={t} money={money} actions={actions} htmlLang={htmlLang} />
      <Compound t={t} money={money} />
    </section>
  );
}

export function FlexStrip({ t, money, actions }) {
  const { flex } = money;
  return (
    <button type="button" className="flex-strip" onClick={() => actions.setView("grow")} data-testid="flex-strip">
      <span>
        <small>{t.flexLevel}</small>
        <b>{t[`level_${flex.level.id}`]}</b>
      </span>
      <span>
        <small>{t.flexStreak}</small>
        <b>{flex.streak}</b>
      </span>
      <span>
        <small>{t.flexBadges}</small>
        <b>
          {flex.earnedCount}/{flex.badges.length}
        </b>
      </span>
      <span className="flex-strip-go">{t.flexOpen} →</span>
    </button>
  );
}

export function WrapCard({ t, lang, money }) {
  const { wrap } = money;
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(false);
  const names = (id) => plainName(t, id);

  const write = async () => {
    setLoading(true);
    const result = await askWrap({ wrap, lang, billName: names });
    setStory(result);
    setLoading(false);
  };

  const tiles = [
    [t.wrapIn, formatRand(wrap.moneyIn), "up"],
    [t.wrapOut, formatRand(wrap.moneyOut), "down"],
    [t.wrapSaved, formatRand(wrap.toSavings), "up"],
    [t.wrapRate, `${wrap.saveRate}%`, ""],
    [t.wrapTop, wrap.top ? `${names(wrap.top.id)} · ${wrap.topShare}%` : "-", ""],
    [t.wrapCovered, String(wrap.badWeeks), ""],
  ];

  return (
    <article className={`card wrap ${wrap.vibe}`} data-testid="wrap">
      <p className="kicker">{t.wrapKicker}</p>
      <h2 className="wrap-vibe">{t[`vibe_${wrap.vibe}`]}</h2>
      <p className="hint">{t[`vibeHow_${wrap.vibe}`]}</p>
      <div className="wrap-tiles">
        {tiles.map(([label, value, tone]) => (
          <span key={label}>
            <small>{label}</small>
            <b className={tone}>{value}</b>
          </span>
        ))}
      </div>
      {wrap.topBills.length > 0 && (
        <div className="wrap-bars" aria-label={t.wrapWhere}>
          {wrap.topBills.slice(0, 4).map((bill) => (
            <div key={bill.id} className="bar-row">
              <span>
                {names(bill.id)}
                <b>{formatRand(bill.amount)}</b>
              </span>
              <div className="track">
                <i style={{ width: `${wrap.moneyOut ? (bill.amount / wrap.moneyOut) * 100 : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="actions">
        <button className="btn primary" type="button" onClick={write} disabled={loading} data-testid="wrap-write">
          {loading ? t.wrapWriting : story ? t.wrapAgain : t.wrapWrite}
        </button>
      </div>
      {story && (
        <blockquote className="wrap-story" data-testid="wrap-story">
          <p>{story.text}</p>
          <small>{story.source === "ai" ? t.wrapByAi : t.wrapByRules}</small>
        </blockquote>
      )}
    </article>
  );
}
