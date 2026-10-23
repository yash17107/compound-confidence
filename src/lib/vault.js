const VAULT_PREFIX = "imali_vault_";
const ACTIVE_KEY = "imali_active_vault";
const ROUNDS = 1200;

export function normEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function vaultKey(email) {
  return `${VAULT_PREFIX}${normEmail(email)}`;
}

export function newSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

function toHex(bytes) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex) {
  const clean = String(hex || "");
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function mix(text) {
  let hash = 2166136261;
  for (const char of String(text)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function stretch(secret, salt, extra = "") {
  let acc = `${salt}:${secret}:${extra}`;
  for (let i = 0; i < ROUNDS; i += 1) {
    acc = mix(`${acc}:${i}`).toString(16) + acc.slice(0, 24);
  }
  return acc;
}

export function hashSecret(secret, salt, extra = "") {
  return mix(stretch(secret, salt, extra)).toString(16).padStart(8, "0") + mix(`x:${stretch(secret, salt, extra)}`).toString(16).padStart(8, "0");
}

export function sameText(left, right) {
  const a = String(left || "");
  const b = String(right || "");
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function keystream(seed, length) {
  let a = mix(`${seed}:a`) || 1;
  let b = mix(`${seed}:b`) || 1;
  const out = new Uint8Array(length);
  for (let i = 0; i < length; i += 1) {
    a = (Math.imul(a, 1664525) + 1013904223) >>> 0;
    b = (Math.imul(b, 22695477) + 1) >>> 0;
    out[i] = (a ^ (b >>> 8)) & 255;
  }
  return out;
}

function xorBytes(bytes, stream) {
  const out = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i += 1) out[i] = bytes[i] ^ stream[i];
  return out;
}

function bytesToB64(bytes) {
  let bin = "";
  bytes.forEach((byte) => {
    bin += String.fromCharCode(byte);
  });
  return btoa(bin);
}

function b64ToBytes(text) {
  const bin = atob(text);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function sealJson(value, secret) {
  const iv = newSalt();
  const body = new TextEncoder().encode(JSON.stringify(value ?? {}));
  const stream = keystream(stretch(secret, iv, "seal"), body.length);
  return { v: 1, iv, ct: bytesToB64(xorBytes(body, stream)) };
}

export function openJson(blob, secret) {
  if (!blob || blob.v !== 1 || !blob.iv || !blob.ct) return null;
  try {
    const body = b64ToBytes(blob.ct);
    const stream = keystream(stretch(secret, blob.iv, "seal"), body.length);
    const json = new TextDecoder().decode(xorBytes(body, stream));
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function readActive() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(ACTIVE_KEY) || "null");
    if (!parsed?.email || !parsed?.secret) return null;
    return { email: normEmail(parsed.email), secret: String(parsed.secret) };
  } catch {
    return null;
  }
}

export function unlockVault(email, secret) {
  const normalised = normEmail(email);
  if (!normalised || !secret) return { ok: false, reason: "missing" };
  sessionStorage.setItem(ACTIVE_KEY, JSON.stringify({ email: normalised, secret: String(secret) }));
  return { ok: true };
}

export function lockVault() {
  sessionStorage.removeItem(ACTIVE_KEY);
}

export function isVaultUnlocked(email) {
  const active = readActive();
  return Boolean(active && active.email === normEmail(email) && active.secret);
}

function material(email, secret) {
  return `${normEmail(email)}::${secret}::cc-vault`;
}

export function activeSecret(email) {
  const active = readActive();
  if (!active || active.email !== normEmail(email)) return "";
  return active.secret;
}

export function readVault(email, secret = activeSecret(email)) {
  const normalised = normEmail(email);
  if (!normalised || !secret) return null;
  try {
    const raw = localStorage.getItem(vaultKey(normalised));
    if (!raw) return null;
    const blob = JSON.parse(raw);
    return openJson(blob, material(normalised, secret));
  } catch {
    return null;
  }
}

export function writeVault(email, data, secret = activeSecret(email)) {
  const normalised = normEmail(email);
  if (!normalised) return { ok: false, reason: "missing" };
  if (!secret) return { ok: false, reason: "locked" };
  localStorage.setItem(vaultKey(normalised), JSON.stringify(sealJson(data || {}, material(normalised, secret))));
  return { ok: true };
}

export function patchVault(email, patch, secret = activeSecret(email)) {
  const current = readVault(email, secret) || {};
  return writeVault(email, { ...current, ...patch }, secret);
}

export function clearVault(email) {
  localStorage.removeItem(vaultKey(email));
  const active = readActive();
  if (active?.email === normEmail(email)) lockVault();
}

export function dumpStorage() {
  const parts = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    parts.push(`${key}=${localStorage.getItem(key)}`);
  }
  return parts.join("\n");
}
