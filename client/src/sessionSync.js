// failed saves get queued per user and retried on the next start
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
    // ignore
  }
};

export async function recordSession(username, payload) {
  try {
    return await api.post("/api/v1/sessions", payload);
  } catch (err) {
    if (!isRetryable(err)) throw err;
    writeOutbox(username, [...readOutbox(username), payload]);
    return null;
  }
}

// strict mode runs effects twice in dev, don't send the queue twice
let flushInFlight = null;

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
      // any other 4xx (like a 409, already saved) won't ever succeed
      if (isRetryable(err)) remaining.push(payload);
    }
  }
  writeOutbox(username, remaining);
  return sent;
}
