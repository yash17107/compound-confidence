import { isoDay } from "./ledger.js";
import { formatSignedRand } from "./money.js";
import { buildPdf, downloadPdf, stampName } from "./pdf.js";

function moneyLine(label, value) {
  return `${label.padEnd(22, " ")} ${value}`;
}

export function statementLines({
  brand,
  slogan,
  paper,
  who,
  asOf,
  pockets,
}) {
  const lines = [
    brand,
    slogan,
    paper,
    "",
    who ? `Desk: ${who}` : "Desk",
    `As of ${asOf}`,
    "",
  ];

  for (const pocket of pockets) {
    lines.push(pocket.name.toUpperCase());
    if (pocket.rail) lines.push(pocket.rail);
    lines.push(moneyLine("Balance", pocket.balance));
    lines.push(moneyLine("In · 30 days", pocket.moneyIn));
    lines.push(moneyLine("Out · 30 days", pocket.moneyOut));
    lines.push(moneyLine("30 days ago", pocket.opening));
    lines.push("");
    if (!pocket.rows.length) {
      lines.push(pocket.empty || "No transactions in the last 30 days.");
      lines.push("");
      continue;
    }
    lines.push("Date         Movement                         Amount     Balance");
    for (const row of pocket.rows) {
      const amount = formatSignedRand(row.delta);
      const left = `${row.date}  ${row.title}`.slice(0, 42).padEnd(42, " ");
      lines.push(`${left} ${amount.padStart(8, " ")}  ${row.balance}`);
      if (row.detail) lines.push(`             ${row.detail}`);
    }
    lines.push("");
  }

  lines.push("Never rent. Leftover only. Sitting is the strategy.");
  return lines;
}

export function downloadAccountPdf(spec) {
  const asOf = spec.asOf || isoDay(new Date());
  const bytes = buildPdf(
    statementLines({ ...spec, asOf }),
    { title: spec.pockets?.[0]?.name || "Statement" },
  );
  const slug = spec.filename || stampName(spec.pockets?.[0]?.name || "statement");
  downloadPdf(bytes, slug);
  return { ok: true, bytes, filename: slug };
}
