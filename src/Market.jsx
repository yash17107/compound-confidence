import { useState } from "react";
import { fill } from "./i18n.js";
import { leftoverCash } from "./lib/holdings.js";
import { displayAmount, formatPct, formatRand, formatSignedRand } from "./lib/money.js";

function sparkPath(spark) {
  const points = (spark || []).filter((point) => Number(point.close) > 0);
  if (points.length < 2) return "";
  const width = 72;
  const height = 28;
  const values = points.map((point) => point.close);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - ((point.close - min) / span) * height;
      return `${index ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function Spark({ spark, up }) {
  const d = sparkPath(spark);
  if (!d) return null;
  return (
    <svg className="market-spark" viewBox="0 0 72 28" aria-hidden="true">
      <path d={d} fill="none" stroke={up ? "#176848" : "#9f2d2d"} strokeWidth="2" />
    </svg>
  );
}

function reasonText(t, reason) {
  return (
    {
      lesson: t.mktNeedLesson,
      funds: t.mktNoCash,
      amount: t.mktNoAmount,
      price: t.mktNoPrice,
      unknown: t.mktUnknown,
      blocked: t.mktBlocked,
      holding: t.mktNoHolding,
      units: t.mktNoUnits,
    }[reason] || t.mktNoAmount
  );
}

function leftoverHint(t, { lessonDone, cash, hasHoldings }) {
  if (!lessonDone) return { kind: "alert", text: t.mktNeedLesson };
  if (cash > 0) return { kind: "ok", text: fill(t.mktReady, { amount: formatRand(cash) }) };
  if (hasHoldings) return { kind: "hint", text: t.mktInMarket };
  return { kind: "hint", text: t.mktNeedLeftover };
}

function BuyForm({ t, money, actions, row }) {
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState(null);
  const cash = leftoverCash(money.accounts.invest, money.holdings);

  const submit = (event) => {
    event.preventDefault();
    const result = actions.buySlice({ ticker: row.ticker, amount, price: row.price });
    if (result.ok) {
      setStatus({
        ok: true,
        text: fill(t.mktBought, { amount: formatRand(result.trade.amount), name: row.name }),
      });
      setAmount("");
    } else {
      setStatus({ ok: false, text: reasonText(t, result.reason) });
    }
  };

  return (
    <form className="mkt-buy" onSubmit={submit}>
      <label>
        <span className="sr-only">{t.mktAmount}</span>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="10"
          value={amount}
          placeholder={t.mktAmount}
          aria-label={`${t.mktAmount} ${row.code}`}
          onChange={(event) => setAmount(event.target.value)}
        />
      </label>
      <button className="btn primary" type="submit" disabled={cash <= 0 || !money.lessonDone}>
        {t.mktBuy}
      </button>
      {status && (
        <p className={status.ok ? "ok" : "alert"} role="status">
          {status.text}
        </p>
      )}
    </form>
  );
}

export function MarketTeaser({ t, money, actions }) {
  const cash = leftoverCash(money.accounts.invest, money.holdings);
  return (
    <article className="card market-teaser" data-testid="market-teaser">
      <p className="kicker">{t.sharesZero}</p>
      <h2>{t.mktPageTitle}</h2>
      <p>{t.mktWhatBody}</p>
      <dl className="mkt-fees">
        <div>
          <dt>{t.mktFeeTitle}</dt>
          <dd>{t.mktFeeMonthly}</dd>
        </div>
        <div>
          <dt>{t.fee}</dt>
          <dd>{t.mktFeeBroker}</dd>
        </div>
        <div>
          <dt>{t.mktCash}</dt>
          <dd data-testid="teaser-cash">{formatRand(cash)}</dd>
        </div>
      </dl>
      <div className="actions">
        <button className="btn primary" type="button" onClick={() => actions.setView("market")}>
          {t.mktOpen}
        </button>
      </div>
    </article>
  );
}

export function MarketBoard({ t, money, actions }) {
  const { portfolio, board, lessonDone } = money;
  const featured = board.find((row) => row.featured) || board[0];
  const cash = leftoverCash(money.accounts.invest, money.holdings);
  const hint = leftoverHint(t, {
    lessonDone,
    cash,
    hasHoldings: portfolio.rows.length > 0,
  });

  return (
    <article className="card market" data-testid="market-board">
      <p className="kicker">{t.acctMarketTitle}</p>
      <h2>{t.mktTitle}</h2>
      <p className="hint">{t.mktSub}</p>

      <div className="mkt-cash">
        <span>
          <small>{t.mktCash}</small>
          <b data-testid="invest-cash">{formatRand(cash)}</b>
        </span>
        <span>
          <small>{t.mktLive}</small>
          <b data-testid="invest-live">{formatRand(portfolio.live)}</b>
        </span>
        <span>
          <small>{t.mktPnl}</small>
          <b className={displayAmount(portfolio.pnl) >= 0 ? "up" : "down"} data-testid="invest-pnl">
            {formatSignedRand(portfolio.pnl)}
          </b>
        </span>
      </div>

      <p className={hint.kind} data-testid="mkt-hint">
        {hint.text}
      </p>

      {featured && (
        <div className={`mkt-featured ${featured.tape?.heat || "mixed"}`} data-testid="mkt-featured">
          <div>
            <p className="kicker">{featured.rail}</p>
            <h3>
              {featured.name} · {featured.code}
            </h3>
            <b>{formatRand(featured.price)}</b>
            <small className={featured.change >= 0 ? "up" : "down"}>
              {formatPct(featured.changePct)}
            </small>
            <p className="hint">{featured.tape?.note}</p>
          </div>
          <Spark spark={featured.spark} up={featured.change >= 0} />
        </div>
      )}

      {portfolio.rows.length > 0 && (
        <ul className="mkt-holdings" data-testid="mkt-holdings">
          {portfolio.rows.map((row) => (
            <li key={row.ticker}>
              <span className="mkt-name">
                <b>{row.name}</b>
                <small>
                  {row.units.toFixed(3)} units · {row.code}
                </small>
              </span>
              <span className="mkt-value">
                <b>{formatRand(row.market)}</b>
                <small className={displayAmount(row.pnl) >= 0 ? "up" : "down"}>{formatSignedRand(row.pnl)}</small>
              </span>
              <button
                className="btn ghost"
                type="button"
                onClick={() => actions.sellSlice({ ticker: row.ticker, units: row.units, price: row.price })}
              >
                {t.mktSell}
              </button>
            </li>
          ))}
        </ul>
      )}

      <ul className="mkt-board">
        {board.map((row) => (
          <li key={row.ticker} className={row.featured ? "featured" : ""} data-testid={`mkt-${row.code}`}>
            <span className="mkt-name">
              <b>{row.name}</b>
              <small>
                {row.code} · {row.rail}
              </small>
            </span>
            <Spark spark={row.spark} up={row.change >= 0} />
            <span className="mkt-price">
              <b>{formatRand(row.price)}</b>
              <small className={row.change >= 0 ? "up" : "down"}>{formatPct(row.changePct)}</small>
            </span>
            <BuyForm t={t} money={money} actions={actions} row={row} />
          </li>
        ))}
      </ul>
      <p className="hint">{t.mktDisclaimer}</p>
    </article>
  );
}

export function MarketPage({ t, money, actions, children }) {
  const steps = [
    [t.mktStep1, t.mktStep1Body],
    [t.mktStep2, t.mktStep2Body],
    [t.mktStep3, t.mktStep3Body],
    [t.mktStep4, t.mktStep4Body],
  ];

  return (
    <section data-testid="market-page">
      <div className="page-head">
        <h1>{t.mktPageTitle}</h1>
        <p className="lede">{t.mktPageSub}</p>
      </div>

      <article className="card shares-zero">
        <p className="kicker">{t.sharesZero}</p>
        <h2>{t.mktWhatTitle}</h2>
        <p>{t.mktWhatBody}</p>
        <ol className="mkt-steps">
          {steps.map(([title, body]) => (
            <li key={title}>
              <b>{title}</b>
              <span>{body}</span>
            </li>
          ))}
        </ol>
        <dl className="facts">
          <div>
            <dt>{t.mktFeeTitle}</dt>
            <dd>{t.mktFeeMonthly}</dd>
          </div>
          <div>
            <dt>{t.fee}</dt>
            <dd>{t.mktFeeBroker}</dd>
          </div>
        </dl>
        <p className="hint">{t.mktFeePaper}</p>
        <div className="actions">
          <button className="btn" type="button" onClick={() => actions.showAccount("invest")}>
            {t.mktOpenTx}
          </button>
        </div>
      </article>

      {children}

      <MarketBoard t={t} money={money} actions={actions} />
    </section>
  );
}
