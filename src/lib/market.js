export const MARKET = [
  {
    ticker: "ETFT40.JO",
    code: "ETFT40",
    name: "FNB Top 40 ETF",
    rail: "Shares Zero",
    kind: "etf",
    featured: true,
    fallback: 72.4,
  },
  {
    ticker: "STX40.JO",
    code: "STX40",
    name: "Satrix 40 ETF",
    rail: "JSE ETF",
    kind: "etf",
    featured: false,
    fallback: 84.2,
  },
  {
    ticker: "STXSWX.JO",
    code: "STXSWX",
    name: "Satrix SWIX Top 40",
    rail: "JSE ETF",
    kind: "etf",
    featured: false,
    fallback: 18.6,
  },
  {
    ticker: "STXFIN.JO",
    code: "STXFIN",
    name: "Satrix FINI",
    rail: "JSE ETF",
    kind: "etf",
    featured: false,
    fallback: 16.8,
  },
  {
    ticker: "STXIND.JO",
    code: "STXIND",
    name: "Satrix INDI",
    rail: "JSE ETF",
    kind: "etf",
    featured: false,
    fallback: 88.5,
  },
  {
    ticker: "STXDIV.JO",
    code: "STXDIV",
    name: "Satrix DIVI",
    rail: "JSE ETF",
    kind: "etf",
    featured: false,
    fallback: 22.1,
  },
  {
    ticker: "STXPRO.JO",
    code: "STXPRO",
    name: "Satrix Property",
    rail: "JSE ETF",
    kind: "etf",
    featured: false,
    fallback: 11.4,
  },
  {
    ticker: "GLD.JO",
    code: "GLD",
    name: "NewGold",
    rail: "JSE ETF",
    kind: "etf",
    featured: false,
    fallback: 310,
  },
  {
    ticker: "SYGWD.JO",
    code: "SYGWD",
    name: "Sygnia Itrix MSCI World",
    rail: "JSE ETF",
    kind: "etf",
    featured: false,
    fallback: 52.8,
  },
  {
    ticker: "SYGUS.JO",
    code: "SYGUS",
    name: "Sygnia Itrix S&P 500",
    rail: "JSE ETF",
    kind: "etf",
    featured: false,
    fallback: 95.3,
  },
];

export const FEATURED = MARKET[0];

export function offlineBoard() {
  return MARKET.map((item) => ({
    ...item,
    price: item.fallback,
    prevClose: roundish(item.fallback * 0.997),
    change: roundish(item.fallback - item.fallback * 0.997),
    changePct: 0.3,
    spark: Array.from({ length: 12 }, (_, index) => ({
      date: `seed-${index}`,
      close: roundish(item.fallback * (0.97 + index * 0.003)),
    })),
    tape: { heat: "mixed", note: "Offline tape. Leftover still decides." },
    source: "offline",
    currency: "ZAR",
    error: false,
  }));
}

function roundish(value) {
  return Math.round(value * 100) / 100;
}

export async function loadMarket(ticker) {
  const query = ticker ? `?ticker=${encodeURIComponent(ticker)}` : "";
  try {
    const response = await fetch(`/api/market${query}`);
    const data = await response.json();
    if (response.ok && data.ok && Array.isArray(data.board) && data.board.length) {
      return { ...data, source: data.board[0]?.source === "yahoo" ? "live" : "offline" };
    }
    if (data?.reason === "blocked") return data;
  } catch {
    /* offline board */
  }
  return { ok: true, board: offlineBoard(), featured: FEATURED.ticker, source: "offline" };
}
