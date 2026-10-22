function latin(text) {
  return String(text ?? "")
    .replace(/\u00a0/g, " ")
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, (char) => {
      const map = { "—": "-", "–": "-", "’": "'", "‘": "'", "“": '"', "”": '"', "…": "..." };
      return map[char] || " ";
    })
    .replace(/\s+/g, " ")
    .trim();
}

function pdfEscape(text) {
  return latin(text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapLine(text, width = 92) {
  const clean = latin(text);
  if (clean.length <= width) return clean ? [clean] : [""];
  const words = clean.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > width && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function buildPdf(lines, { title = "Statement" } = {}) {
  const pages = [];
  const perPage = 46;
  const wrapped = [];
  for (const line of lines) wrapped.push(...wrapLine(line));
  for (let index = 0; index < wrapped.length; index += perPage) {
    pages.push(wrapped.slice(index, index + perPage));
  }
  if (!pages.length) pages.push([""]);

  const objects = [];
  const catalogId = 1;
  const pagesId = 2;
  const fontId = 3;
  const pageIds = pages.map((_, index) => 4 + index * 2);
  const contentIds = pages.map((_, index) => 5 + index * 2);

  objects[catalogId] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId] =
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  objects[fontId] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

  pages.forEach((pageLines, index) => {
    const commands = ["BT", "/F1 11 Tf", "14 TL", "48 792 Td", `(${pdfEscape(pageLines[0] || "")}) Tj`];
    for (const line of pageLines.slice(1)) {
      commands.push("T*", `(${pdfEscape(line)}) Tj`);
    }
    commands.push("ET");
    const stream = commands.join("\n");
    objects[contentIds[index]] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    objects[pageIds[index]] =
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Contents ${contentIds[index]} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> /Annots [] >>`;
  });

  const header = `%PDF-1.4\n% ${latin(title)}\n`;
  let body = header;
  const offsets = [0];
  const maxId = Math.max(...Object.keys(objects).map(Number));
  for (let id = 1; id <= maxId; id += 1) {
    offsets[id] = body.length;
    body += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xrefAt = body.length;
  let xref = `xref\n0 ${maxId + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= maxId; id += 1) {
    xref += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  const trailer =
    `trailer\n<< /Size ${maxId + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;
  return new TextEncoder().encode(body + xref + trailer);
}

export function downloadPdf(bytes, filename) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.addEventListener("click", (event) => event.stopPropagation());
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 800);
}

export function stampName(prefix, when = new Date()) {
  const day = when.toISOString().slice(0, 10);
  return `${latin(prefix).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${day}.pdf`;
}
