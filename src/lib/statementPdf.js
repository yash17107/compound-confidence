import { isoDay } from "./ledger.js";
import { formatRand } from "./money.js";
import { assemblePdf, downloadPdf, drawLine, drawRect, drawText, stampName } from "./pdf.js";

const PAGE = { w: 595, h: 842, left: 40, right: 555, top: 802 };
const COL = { date: 48, desc: 118, debit: 400, credit: 470, balance: 555 };

function prettyDate(iso) {
  const [year, month, day] = String(iso || "").split("-").map(Number);
  if (!year) return iso;
  return new Date(year, month - 1, day).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function refCode(name, asOf) {
  const slug = String(name || "ACC").replace(/[^A-Za-z0-9]/g, "").slice(0, 8).toUpperCase() || "ACC";
  return `CC-${slug}-${String(asOf).replace(/-/g, "")}`;
}

function header(page, pages, spec) {
  return [
    drawRect(0, 770, PAGE.w, 72, "#10241f"),
    drawRect(0, 768, PAGE.w, 3, "#c8891a"),
    drawText(PAGE.left, 812, spec.brand || "Compound Confidence", { font: "F2", size: 16, color: "#ffffff" }),
    drawText(PAGE.left, 794, spec.slogan || "Stack it, track it, flex it.", { size: 9, color: "#c5ddd4" }),
    drawText(PAGE.right, 812, "Statement of account", { font: "F2", size: 11, color: "#ffffff", align: "right" }),
    drawText(PAGE.right, 794, prettyDate(spec.asOf), { size: 9, color: "#c5ddd4", align: "right" }),
    drawText(PAGE.right, 778, "Confidential", { size: 8, color: "#c8891a", align: "right" }),
    drawRect(0, 0, PAGE.w, 40, "#10241f"),
    drawRect(0, 40, PAGE.w, 2, "#c8891a"),
    drawText(PAGE.left, 16, spec.paper || "Paper statement. Not a live FNB document. Leftover only.", {
      size: 7.5,
      color: "#c5ddd4",
      max: 420,
    }),
    drawText(PAGE.right, 16, `Page ${page} of ${pages}`, { size: 8, color: "#c5ddd4", align: "right" }),
  ];
}

function metaBlock(y, spec, pocket) {
  const rows = [
    ["Account holder", spec.who || "Desk"],
    ["Account", pocket.name],
    ["Product", pocket.rail || ""],
    ["Period", `30 days ending ${prettyDate(spec.asOf)}`],
    ["Statement no.", refCode(pocket.name, spec.asOf)],
  ];
  const ops = [
    drawRect(PAGE.left, y - 78, 515, 86, "#f6f9f7"),
    drawRect(PAGE.left, y - 78, 3, 86, "#1b6b56"),
  ];
  rows.forEach(([label, value], index) => {
    const rowY = y - 8 - index * 14;
    ops.push(drawText(52, rowY, label, { size: 8, color: "#5d6f67" }));
    ops.push(drawText(150, rowY, value, { font: "F2", size: 9, color: "#13211c", max: 390 }));
  });
  return { ops, y: y - 96 };
}

function summaryBlock(y, pocket) {
  const tiles = [
    ["Available balance", pocket.balance],
    ["Money in (30 days)", pocket.moneyIn],
    ["Money out (30 days)", pocket.moneyOut],
    ["Opening balance", pocket.opening],
  ];
  const ops = [];
  const gap = 8;
  const width = (515 - gap * 3) / 4;
  tiles.forEach(([label, value], index) => {
    const x = PAGE.left + index * (width + gap);
    ops.push(drawRect(x, y - 46, width, 50, "#d4ddd8"));
    ops.push(drawRect(x + 0.6, y - 45.4, width - 1.2, 48.8, "#f6f9f7"));
    ops.push(drawText(x + 8, y - 8, label, { size: 7, color: "#5d6f67", max: width - 14 }));
    ops.push(drawText(x + 8, y - 28, value, { font: "F2", size: 11, color: "#10241f", max: width - 14 }));
  });
  return { ops, y: y - 62 };
}

function tableHead(y) {
  return {
    ops: [
      drawRect(PAGE.left, y - 6, 515, 18, "#1b6b56"),
      drawText(COL.date, y, "Date", { font: "F2", size: 8, color: "#ffffff" }),
      drawText(COL.desc, y, "Description", { font: "F2", size: 8, color: "#ffffff" }),
      drawText(COL.debit, y, "Debit", { font: "F2", size: 8, color: "#ffffff", align: "right" }),
      drawText(COL.credit, y, "Credit", { font: "F2", size: 8, color: "#ffffff", align: "right" }),
      drawText(COL.balance, y, "Balance", { font: "F2", size: 8, color: "#ffffff", align: "right" }),
    ],
    y: y - 22,
  };
}

function tableRow(y, row, stripe) {
  const ops = [];
  if (stripe) ops.push(drawRect(PAGE.left, y - 5, 515, 16, "#f6f9f7"));
  const debit = row.delta < 0 ? formatRand(Math.abs(row.delta)) : "";
  const credit = row.delta > 0 ? formatRand(row.delta) : "";
  ops.push(drawText(COL.date, y, prettyDate(row.date), { size: 8, color: "#5d6f67" }));
  ops.push(drawText(COL.desc, y, row.title, { size: 8, color: "#13211c", max: 250 }));
  if (debit) ops.push(drawText(COL.debit, y, debit, { size: 8, color: "#9f2d2d", align: "right" }));
  if (credit) ops.push(drawText(COL.credit, y, credit, { size: 8, color: "#176848", align: "right" }));
  ops.push(drawText(COL.balance, y, row.balance, { font: "F2", size: 8, color: "#13211c", align: "right" }));
  const next = y - 16;
  if (!row.detail) return { ops, y: next };
  ops.push(drawText(COL.desc, next, row.detail, { size: 7.5, color: "#5d6f67", max: 250 }));
  return { ops, y: next - 12 };
}

function newPage(pages) {
  const page = [];
  pages.push(page);
  return { page, y: 748 };
}

export function buildStatementPdf(spec) {
  const asOf = spec.asOf || isoDay(new Date());
  const data = { ...spec, asOf };
  const pages = [];
  let current = newPage(pages);

  const startPocket = (pocket) => {
    if (current.y < 430) current = newPage(pages);
    const meta = metaBlock(current.y, data, pocket);
    current.page.push(...meta.ops);
    current.y = meta.y;
    const summary = summaryBlock(current.y, pocket);
    current.page.push(...summary.ops);
    current.y = summary.y;
    const head = tableHead(current.y);
    current.page.push(...head.ops);
    current.y = head.y;
  };

  for (const pocket of data.pockets || []) {
    startPocket(pocket);
    if (!pocket.rows.length) {
      current.page.push(drawText(COL.desc, current.y, pocket.empty || "No transactions in the last 30 days.", {
        size: 9,
        color: "#5d6f67",
        max: 400,
      }));
      current.y -= 28;
      continue;
    }
    pocket.rows.forEach((row, index) => {
      if (current.y < 72) {
        current = newPage(pages);
        const head = tableHead(current.y);
        current.page.push(...head.ops);
        current.y = head.y;
      }
      const drawn = tableRow(current.y, row, index % 2 === 1);
      current.page.push(...drawn.ops);
      current.y = drawn.y;
    });
    current.page.push(drawLine(PAGE.left, current.y + 6, PAGE.right, "#1b6b56", 1));
    current.y -= 24;
  }

  const streams = pages.map((ops, index) => [...header(index + 1, pages.length, data), ...ops].join("\n"));
  return assemblePdf(streams, { title: data.pockets?.[0]?.name || "Statement" });
}

export function downloadAccountPdf(spec) {
  const asOf = spec.asOf || isoDay(new Date());
  const bytes = buildStatementPdf({ ...spec, asOf });
  const slug = spec.filename || stampName(spec.pockets?.[0]?.name || "statement");
  downloadPdf(bytes, slug);
  return { ok: true, bytes, filename: slug };
}
