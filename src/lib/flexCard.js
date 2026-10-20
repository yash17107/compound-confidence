const WIDTH = 1080;
const HEIGHT = 1350;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawMark(ctx, x, y, size) {
  const s = size / 512;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  roundRect(ctx, 0, 0, 512, 512, 112);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  [
    [128, 302, 90, 0.72],
    [220, 242, 150, 0.86],
    [312, 182, 210, 1],
  ].forEach(([bx, by, bh, alpha]) => {
    ctx.globalAlpha = alpha;
    roundRect(ctx, bx, by, 72, bh, 16);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 26;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(100, 258);
  ctx.quadraticCurveTo(250, 250, 392, 112);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(330, 108);
  ctx.lineTo(396, 106);
  ctx.lineTo(394, 172);
  ctx.stroke();
  ctx.restore();
}

// card: { brand, tag, level, streakLabel, streak, stats: [[label, value]], badges, footer }
export function drawFlexCard(canvas, card) {
  const ctx = canvas?.getContext?.("2d");
  if (!ctx) return false;
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  bg.addColorStop(0, "#1fa572");
  bg.addColorStop(1, "#0b5a41");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const font = (weight, size) => `${weight} ${size}px "IBM Plex Sans", "Segoe UI", Arial, sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "alphabetic";

  drawMark(ctx, 80, 80, 120);
  ctx.font = font(700, 44);
  ctx.fillText(card.brand, 230, 140);
  ctx.font = font(500, 28);
  ctx.globalAlpha = 0.8;
  ctx.fillText(card.tag, 230, 182);
  ctx.globalAlpha = 1;

  ctx.font = font(600, 34);
  ctx.globalAlpha = 0.85;
  ctx.fillText(card.streakLabel.toUpperCase(), 80, 380);
  ctx.globalAlpha = 1;
  ctx.font = font(800, 260);
  ctx.fillText(String(card.streak), 70, 620);
  ctx.font = font(700, 64);
  ctx.fillText(card.level, 80, 720);

  ctx.fillStyle = "rgba(255,255,255,0.14)";
  roundRect(ctx, 80, 780, WIDTH - 160, 300, 40);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  const colWidth = (WIDTH - 160) / card.stats.length;
  card.stats.forEach(([label, value], index) => {
    const x = 80 + colWidth * index + 40;
    ctx.font = font(800, 72);
    ctx.fillText(String(value), x, 920);
    ctx.font = font(500, 28);
    ctx.globalAlpha = 0.85;
    ctx.fillText(label, x, 970);
    ctx.globalAlpha = 1;
  });

  ctx.font = font(600, 34);
  ctx.fillText(card.badges, 80, 1170);
  ctx.font = font(500, 28);
  ctx.globalAlpha = 0.75;
  ctx.fillText(card.footer, 80, 1260);
  ctx.globalAlpha = 1;
  return true;
}

export async function shareFlexCard(card, filename = "compound-confidence-flex.png") {
  if (typeof document === "undefined") return "unsupported";
  const canvas = document.createElement("canvas");
  if (!drawFlexCard(canvas, card)) return "unsupported";
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return "unsupported";

  const file = typeof File === "function" ? new File([blob], filename, { type: "image/png" }) : null;
  if (file && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: card.brand, text: card.shareText });
      return "shared";
    } catch (error) {
      if (error?.name === "AbortError") return "cancelled";
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}
