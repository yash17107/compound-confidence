const PREFIX = "imali_progress_";

export function progressKey(email) {
  return `${PREFIX}${String(email || "").trim().toLowerCase()}`;
}

export function readProgress(email) {
  try {
    const raw = localStorage.getItem(progressKey(email));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function saveProgress(email, progress) {
  const normalised = String(email || "").trim().toLowerCase();
  if (!normalised) return { ok: false };
  localStorage.setItem(progressKey(normalised), JSON.stringify(progress || {}));
  return { ok: true };
}

export function clearProgress(email) {
  localStorage.removeItem(progressKey(email));
}
