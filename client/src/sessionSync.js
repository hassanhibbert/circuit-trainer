// Saving a finished workout must never fail silently: the gym may have no signal, or the
// server may be asleep. Failed saves go to a per-user "outbox" in localStorage and are retried
// on the next app start. Each payload carries its own completedAt, so a retry keeps the real
// time, and the server's (workout, completedAt) uniqueness turns an accidental double send
// into a harmless 409 instead of a duplicate.
import { api } from "./api";

const outboxKey = (username) => `circuit-trainer:outbox:${username}`;

const isRetryable = (err) => err.status === 0 || err.status === 401 || err.status >= 500;

const readOutbox = (username) => {
  try {
    return JSON.parse(localStorage.getItem(outboxKey(username))) ?? [];
  } catch {
    return [];
  }
};

const writeOutbox = (username, items) => {
  try {
    if (items.length) localStorage.setItem(outboxKey(username), JSON.stringify(items));
    else localStorage.removeItem(outboxKey(username));
  } catch {
    // storage unavailable: nothing more we can do
  }
};

/** Returns the saved session, or null if it was queued for later. */
export async function recordSession(username, payload) {
  try {
    return await api.post("/api/v1/sessions", payload);
  } catch (err) {
    if (!isRetryable(err)) throw err;
    writeOutbox(username, [...readOutbox(username), payload]);
    return null;
  }
}

// One flush at a time: React StrictMode runs start-up effects twice in development, and two
// concurrent flushes would both send the same queued items.
let flushInFlight = null;

/** Sends queued sessions. Returns how many were saved. */
export function flushOutbox(username) {
  if (!flushInFlight) {
    flushInFlight = sendOutbox(username).finally(() => {
      flushInFlight = null;
    });
  }
  return flushInFlight;
}

async function sendOutbox(username) {
  const items = readOutbox(username);
  if (!items.length) return 0;
  const remaining = [];
  let sent = 0;
  for (const payload of items) {
    try {
      await api.post("/api/v1/sessions", payload);
      sent++;
    } catch (err) {
      // Other 4xx (e.g. 409: it already arrived) will never succeed, so they're dropped.
      if (isRetryable(err)) remaining.push(payload);
    }
  }
  writeOutbox(username, remaining);
  return sent;
}
