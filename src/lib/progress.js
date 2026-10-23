import { clearVault, isVaultUnlocked, readVault, vaultKey, writeVault } from "./vault.js";

const PREFIX = "imali_progress_";

export function progressKey(email) {
  return `${PREFIX}${String(email || "").trim().toLowerCase()}`;
}

function takeLegacy(email) {
  try {
    const raw = localStorage.getItem(progressKey(email));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || parsed.ct) return null;
    localStorage.removeItem(progressKey(email));
    return parsed;
  } catch {
    return null;
  }
}

export function readProgress(email) {
  const vault = readVault(email);
  if (vault) return vault;
  if (!isVaultUnlocked(email)) return null;
  const legacy = takeLegacy(email);
  if (!legacy) return null;
  writeVault(email, legacy);
  return legacy;
}

export function saveProgress(email, progress) {
  const normalised = String(email || "").trim().toLowerCase();
  if (!normalised) return { ok: false, reason: "missing" };
  localStorage.removeItem(progressKey(normalised));
  const current = readVault(normalised) || {};
  const kept = {};
  if (current._pinHash) kept._pinHash = current._pinHash;
  return writeVault(normalised, { ...kept, ...(progress || {}) });
}

export function clearProgress(email) {
  localStorage.removeItem(progressKey(email));
  localStorage.removeItem(vaultKey(email));
  clearVault(email);
}
