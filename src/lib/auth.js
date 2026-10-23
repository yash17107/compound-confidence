import { clearProgress, readProgress } from "./progress.js";
import { clearPin, clearSignInFails, recordSignInFail, signInGate } from "./security.js";
import { consentRecord } from "./privacy.js";
import {
  clearVault,
  hashSecret,
  isVaultUnlocked,
  lockVault,
  newSalt,
  patchVault,
  sameText,
  unlockVault,
} from "./vault.js";

const SESSION_KEY = "imali_session";
const USERS_KEY = "imali_users";

export const DEMO_ACCOUNTS = [
  {
    email: "thabo@imali.za",
    password: "leftover180",
    name: "Thabo M.",
    city: "Soweto",
    hustle: "taxi",
  },
  {
    email: "nomsa@imali.za",
    password: "wages200",
    name: "Nomsa D.",
    city: "Tembisa",
    hustle: "care",
  },
];

export const DEMO_ACCOUNT = DEMO_ACCOUNTS[0];

export function isDemoEmail(email) {
  const normalised = String(email || "").trim().toLowerCase();
  return DEMO_ACCOUNTS.some((account) => account.email === normalised);
}

function demoByEmail(email) {
  const normalised = String(email || "").trim().toLowerCase();
  return DEMO_ACCOUNTS.find((account) => account.email === normalised) || null;
}

function publicSession(user) {
  return {
    email: user.email,
    name: user.name,
    city: user.city || "",
    demo: Boolean(user.demo),
    setupDone: Boolean(user.setupDone),
    hustle: user.hustle || "",
  };
}

function stripSecrets(record) {
  if (!record || typeof record !== "object") return record;
  const { password, passHash, passSalt, _pinHash, ...safe } = record;
  return safe;
}

function readUsers() {
  try {
    const parsed = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeUsers(users) {
  const safe = users.map((user) => ({
    email: user.email,
    name: user.name,
    setupDone: Boolean(user.setupDone),
    passSalt: user.passSalt,
    passHash: user.passHash,
  }));
  localStorage.setItem(USERS_KEY, JSON.stringify(safe));
}

export function readSession() {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    if (!session?.email) return null;
    if (session.demo) {
      const demo = demoByEmail(session.email);
      if (demo) unlockVault(demo.email, demo.password);
      return session;
    }
    if (!isVaultUnlocked(session.email)) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

function writeSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(publicSession(session)));
  return publicSession(session);
}

function verifyPassword(user, password) {
  if (user.passHash && user.passSalt) {
    return sameText(user.passHash, hashSecret(password, user.passSalt, user.email));
  }
  if (user.password && user.password === password) return true;
  return false;
}

function migratePassword(user, password) {
  if (user.passHash && user.passSalt && !user.password) return user;
  const passSalt = user.passSalt || newSalt();
  return {
    email: user.email,
    name: user.name,
    setupDone: Boolean(user.setupDone),
    passSalt,
    passHash: hashSecret(password, passSalt, user.email),
  };
}

function openDesk(user, password, extras = {}) {
  unlockVault(user.email, password);
  const vault = readProgress(user.email) || {};
  return writeSession(
    publicSession({
      email: user.email,
      name: user.name || vault.name,
      city: extras.city || vault.city || "",
      demo: Boolean(extras.demo),
      setupDone: extras.setupDone ?? vault.setupDone ?? user.setupDone,
      hustle: extras.hustle || vault.hustle || "",
    }),
  );
}

export function signIn(email, password) {
  const normalised = String(email || "").trim().toLowerCase();
  if (!normalised || !password) {
    return { ok: false, reason: "missing" };
  }

  const gate = signInGate(normalised);
  if (!gate.ok) return gate;

  const demo = demoByEmail(normalised);
  if (demo && password === demo.password) {
    clearSignInFails(normalised);
    return {
      ok: true,
      session: openDesk(demo, demo.password, {
        demo: true,
        setupDone: true,
        city: demo.city,
        hustle: demo.hustle,
      }),
    };
  }

  const users = readUsers();
  const index = users.findIndex((user) => user.email === normalised);
  const match = index === -1 ? null : users[index];
  if (!match || !verifyPassword(match, password)) {
    const fail = recordSignInFail(normalised);
    return { ok: false, reason: fail.reason || "invalid" };
  }

  users[index] = migratePassword(match, password);
  writeUsers(users);
  clearSignInFails(normalised);
  return { ok: true, session: openDesk(users[index], password) };
}

export function readUserRecord(email) {
  const normalised = String(email || "").trim().toLowerCase();
  const listed = readUsers().find((user) => user.email === normalised);
  if (!listed) return null;
  const vault = stripSecrets(readProgress(normalised) || {});
  return stripSecrets({
    ...vault,
    email: normalised,
    name: listed.name || vault.name,
    setupDone: Boolean(listed.setupDone || vault.setupDone),
  });
}

export function saveUserProfile(email, profile) {
  const normalised = String(email || "").trim().toLowerCase();
  const users = readUsers();
  const index = users.findIndex((user) => user.email === normalised);
  if (index === -1) {
    return { ok: false, reason: "missing" };
  }
  const { password, passHash, passSalt, _pinHash, ...safeProfile } = profile || {};
  users[index] = {
    email: normalised,
    name: safeProfile.name || users[index].name,
    setupDone: true,
    passSalt: users[index].passSalt,
    passHash: users[index].passHash,
  };
  writeUsers(users);
  const written = patchVault(normalised, { ...safeProfile, email: normalised, setupDone: true });
  if (!written.ok) return written;
  const record = readUserRecord(normalised);
  return {
    ok: true,
    session: writeSession(publicSession({ ...record, demo: false })),
    record,
  };
}

export function signUp({ name, email, password, consent = false }) {
  const normalised = String(email || "").trim().toLowerCase();
  const displayName = String(name || "").trim();
  if (!displayName || !normalised || !password) {
    return { ok: false, reason: "missing" };
  }
  if (!consent) {
    return { ok: false, reason: "consent" };
  }
  if (isDemoEmail(normalised) || readUsers().some((user) => user.email === normalised)) {
    return { ok: false, reason: "exists" };
  }
  if (String(password).length < 6) {
    return { ok: false, reason: "short" };
  }

  const passSalt = newSalt();
  const users = readUsers();
  users.push({
    name: displayName,
    email: normalised,
    setupDone: false,
    passSalt,
    passHash: hashSecret(password, passSalt, normalised),
  });
  writeUsers(users);
  unlockVault(normalised, password);
  patchVault(normalised, {
    name: displayName,
    email: normalised,
    city: "",
    setupDone: false,
    hustle: "",
    ...consentRecord(),
  });
  return {
    ok: true,
    session: writeSession(
      publicSession({
        email: normalised,
        name: displayName,
        city: "",
        demo: false,
        setupDone: false,
        hustle: "",
      }),
    ),
  };
}

export function listAccounts() {
  return readUsers().map((user) => ({
    email: user.email,
    name: user.name,
    city: "",
    setupDone: Boolean(user.setupDone),
  }));
}

export function deleteAccount(email) {
  const normalised = String(email || "").trim().toLowerCase();
  if (!normalised) {
    return { ok: false, reason: "missing" };
  }
  if (isDemoEmail(normalised)) {
    return { ok: false, reason: "demo" };
  }

  writeUsers(readUsers().filter((user) => user.email !== normalised));
  clearProgress(normalised);
  clearVault(normalised);
  clearPin(normalised);
  clearSignInFails(normalised);

  const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  if (session?.email === normalised) {
    signOut();
  }
  return { ok: true };
}

export function signOut() {
  lockVault();
  localStorage.removeItem(SESSION_KEY);
}

export function continueAsDemo() {
  return signIn(DEMO_ACCOUNT.email, DEMO_ACCOUNT.password);
}

export function continueAsNomsa() {
  const nomsa = DEMO_ACCOUNTS[1];
  return signIn(nomsa.email, nomsa.password);
}
