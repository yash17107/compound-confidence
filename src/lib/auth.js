import { clearProgress } from "./progress.js";

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

function readUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function readSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

function writeSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function signIn(email, password) {
  const normalised = String(email || "").trim().toLowerCase();
  if (!normalised || !password) {
    return { ok: false, reason: "missing" };
  }

  const demo = demoByEmail(normalised);
  if (demo && password === demo.password) {
    return {
      ok: true,
      session: writeSession(
        publicSession({
          email: demo.email,
          name: demo.name,
          city: demo.city,
          demo: true,
          setupDone: true,
          hustle: demo.hustle,
        }),
      ),
    };
  }

  const match = readUsers().find(
    (user) => user.email === normalised && user.password === password,
  );
  if (!match) {
    return { ok: false, reason: "invalid" };
  }

  return {
    ok: true,
    session: writeSession(publicSession(match)),
  };
}

export function readUserRecord(email) {
  const normalised = String(email || "").trim().toLowerCase();
  return readUsers().find((user) => user.email === normalised) || null;
}

export function saveUserProfile(email, profile) {
  const normalised = String(email || "").trim().toLowerCase();
  const users = readUsers();
  const index = users.findIndex((user) => user.email === normalised);
  if (index === -1) {
    return { ok: false, reason: "missing" };
  }
  users[index] = {
    ...users[index],
    ...profile,
    email: normalised,
    setupDone: true,
  };
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  return {
    ok: true,
    session: writeSession(publicSession(users[index])),
    record: users[index],
  };
}

export function signUp({ name, email, password }) {
  const normalised = String(email || "").trim().toLowerCase();
  const displayName = String(name || "").trim();
  if (!displayName || !normalised || !password) {
    return { ok: false, reason: "missing" };
  }
  if (isDemoEmail(normalised) || readUsers().some((user) => user.email === normalised)) {
    return { ok: false, reason: "exists" };
  }
  if (String(password).length < 6) {
    return { ok: false, reason: "short" };
  }

  const users = readUsers();
  users.push({
    name: displayName,
    email: normalised,
    password,
    city: "",
    setupDone: false,
    hustle: "",
  });
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
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
    city: user.city || "",
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

  const users = readUsers().filter((user) => user.email !== normalised);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  clearProgress(normalised);

  const session = readSession();
  if (session?.email === normalised) {
    signOut();
  }
  return { ok: true };
}

export function signOut() {
  localStorage.removeItem(SESSION_KEY);
}

export function continueAsDemo() {
  return signIn(DEMO_ACCOUNT.email, DEMO_ACCOUNT.password);
}

export function continueAsNomsa() {
  const nomsa = DEMO_ACCOUNTS[1];
  return signIn(nomsa.email, nomsa.password);
}
