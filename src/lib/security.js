import { patchVault, readVault } from "./vault.js";

const LOCK_PREFIX = "imali_lock_";
const FAIL_KEY = "imali_auth_fails";

export const PIN_LENGTH = 4;
export const MAX_SIGNIN_FAILS = 5;
export const SIGNIN_LOCK_MS = 20_000;
export const IDLE_LOCK_MS = 120_000;

export function pinLooksValid(pin) {
  return /^\d{4}$/.test(String(pin || ""));
}

function lockKey(email) {
  return `${LOCK_PREFIX}${String(email || "").trim().toLowerCase()}`;
}

function hashPin(email, pin) {
  const input = `${String(email || "").trim().toLowerCase()}::${pin}::cc-desk-lock`;
  let hash = 2166136261;
  for (const char of input) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function readLock(email) {
  const vault = readVault(email);
  if (vault?._pinHash) return { hash: vault._pinHash };
  try {
    const parsed = JSON.parse(localStorage.getItem(lockKey(email)) || "null");
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function hasPin(email) {
  return Boolean(readLock(email)?.hash);
}

export function setPin(email, pin) {
  if (!String(email || "").trim()) return { ok: false, reason: "missing" };
  if (!pinLooksValid(pin)) return { ok: false, reason: "pin" };
  const hash = hashPin(email, pin);
  localStorage.removeItem(lockKey(email));
  const written = patchVault(email, { _pinHash: hash });
  if (!written.ok) return written;
  return { ok: true };
}

export function checkPin(email, pin) {
  const row = readLock(email);
  if (!row?.hash) return { ok: false, reason: "missing" };
  if (!pinLooksValid(pin) || row.hash !== hashPin(email, pin)) {
    return { ok: false, reason: "bad" };
  }
  return { ok: true };
}

export function clearPin(email) {
  localStorage.removeItem(lockKey(email));
  const vault = readVault(email);
  if (vault && "_pinHash" in vault) {
    patchVault(email, { _pinHash: "" });
  }
  return { ok: true };
}

function readFails() {
  try {
    const parsed = JSON.parse(localStorage.getItem(FAIL_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeFails(all) {
  localStorage.setItem(FAIL_KEY, JSON.stringify(all));
}

export function signInGate(email) {
  const key = String(email || "").trim().toLowerCase();
  const row = readFails()[key];
  if (!row?.until) return { ok: true, fails: Number(row?.n) || 0 };
  if (Date.now() < row.until) {
    return { ok: false, reason: "lockedOut", waitMs: row.until - Date.now() };
  }
  const all = readFails();
  delete all[key];
  writeFails(all);
  return { ok: true, fails: 0 };
}

export function recordSignInFail(email) {
  const key = String(email || "").trim().toLowerCase();
  const all = readFails();
  const n = (Number(all[key]?.n) || 0) + 1;
  if (n >= MAX_SIGNIN_FAILS) {
    all[key] = { n: 0, until: Date.now() + SIGNIN_LOCK_MS };
    writeFails(all);
    return { ok: false, reason: "lockedOut", waitMs: SIGNIN_LOCK_MS };
  }
  all[key] = { n, until: 0 };
  writeFails(all);
  return { ok: true, fails: n };
}

export function clearSignInFails(email) {
  const key = String(email || "").trim().toLowerCase();
  const all = readFails();
  if (!(key in all)) return;
  delete all[key];
  writeFails(all);
}
