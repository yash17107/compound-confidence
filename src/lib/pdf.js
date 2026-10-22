const HELV = {
  " ": 278, "!": 278, '"': 355, "#": 556, $: 556, "%": 889, "&": 667, "'": 191,
  "(": 333, ")": 333, "*": 389, "+": 584, ",": 278, "-": 333, ".": 278, "/": 278,
  0: 556, 1: 556, 2: 556, 3: 556, 4: 556, 5: 556, 6: 556, 7: 556, 8: 556, 9: 556,
  ":": 278, ";": 278, "<": 584, "=": 584, ">": 584, "?": 556, "@": 1015,
  A: 667, B: 667, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722, I: 278, J: 500,
  K: 667, L: 556, M: 833, N: 722, O: 778, P: 667, Q: 778, R: 722, S: 667, T: 611,
  U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611,
  a: 556, b: 556, c: 500, d: 556, e: 556, f: 278, g: 556, h: 556, i: 222, j: 222,
  k: 500, l: 222, m: 833, n: 556, o: 556, p: 556, q: 556, r: 333, s: 500, t: 278,
  u: 556, v: 500, w: 722, x: 500, y: 500, z: 500,
};

export function latin(text) {
  return String(text ?? "")
    .replace(/\u00a0/g, " ")
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, (char) => {
      const map = { "—": "-", "–": "-", "’": "'", "‘": "'", "“": '"', "”": '"', "…": "...", "·": "|" };
      return map[char] || " ";
    })
    .replace(/\s+/g, " ")
    .trim();
}

function pdfEscape(text) {
  return latin(text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function textWidth(text, size = 10) {
  let width = 0;
  for (const char of latin(text)) width += HELV[char] ?? 556;
  return (width * size) / 1000;
}

export function rgb(hex) {
  const value = hex.replace("#", "");
  return [
    Number.parseInt(value.slice(0, 2), 16) / 255,
    Number.parseInt(value.slice(2, 4), 16) / 255,
    Number.parseInt(value.slice(4, 6), 16) / 255,
  ]
    .map((n) => n.toFixed(3))
    .join(" ");
}

export function drawRect(x, y, w, h, color) {
  return `${rgb(color)} rg ${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re f`;
}

export function drawLine(x1, y, x2, color = "#dbe3de", width = 0.6) {
  return `${rgb(color)} RG ${width} w ${x1.toFixed(1)} ${y.toFixed(1)} m ${x2.toFixed(1)} ${y.toFixed(1)} l S`;
}

export function drawText(x, y, text, { font = "F1", size = 10, color = "#13211c", align = "left", max = 0 } = {}) {
  let value = latin(text);
  if (max && textWidth(value, size) > max) {
    while (value.length > 1 && textWidth(`${value}...`, size) > max) value = value.slice(0, -1);
    value = `${value}...`;
  }
  let left = x;
  if (align === "right") left = x - textWidth(value, size);
  if (align === "center") left = x - textWidth(value, size) / 2;
  return `${rgb(color)} rg BT /${font} ${size} Tf 1 0 0 1 ${left.toFixed(1)} ${y.toFixed(1)} Tm (${pdfEscape(value)}) Tj ET`;
}

export function assemblePdf(pageStreams, { title = "Statement" } = {}) {
  const pages = pageStreams.length ? pageStreams : ["BT ET"];
  const objects = [];
  const catalogId = 1;
  const pagesId = 2;
  const fontId = 3;
  const boldId = 4;
  const pageIds = pages.map((_, index) => 5 + index * 2);
  const contentIds = pages.map((_, index) => 6 + index * 2);

  objects[catalogId] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId] =
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  objects[fontId] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objects[boldId] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";

  pages.forEach((stream, index) => {
    objects[contentIds[index]] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    objects[pageIds[index]] =
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Contents ${contentIds[index]} 0 R /Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldId} 0 R >> >> >>`;
  });

  const header = `%PDF-1.4\n% ${latin(title)}\n`;
  let body = header;
  const offsets = [0];
  const maxId = Math.max(...Object.keys(objects).map(Number));
  for (let id = 1; id <= maxId; id += 1) {
    offsets[id] = body.length;
    body += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const infoId = maxId + 1;
  objects[infoId] = `<< /Title (${pdfEscape(title)}) /Creator (Compound Confidence) /Producer (Compound Confidence) >>`;
  offsets[infoId] = body.length;
  body += `${infoId} 0 obj\n${objects[infoId]}\nendobj\n`;
  const xrefAt = body.length;
  let xref = `xref\n0 ${infoId + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= infoId; id += 1) {
    xref += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  return new TextEncoder().encode(
    `${body}${xref}trailer\n<< /Size ${infoId + 1} /Root ${catalogId} 0 R /Info ${infoId} 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`,
  );
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
