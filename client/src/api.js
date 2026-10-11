const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8080").replace(/\/$/, "");
const AUTH_KEY = "circuit-trainer:auth";
const SLOW_REQUEST_MS = 4000;

let unauthorizedHandler = null;
let slowRequestHandler = null;

export const setUnauthorizedHandler = (fn) => {
  unauthorizedHandler = fn;
};

export const setSlowRequestHandler = (fn) => {
  slowRequestHandler = fn;
};

export class ApiError extends Error {
  constructor(status, problem) {
    super(problem?.detail || problem?.title || `Request failed (${status})`);
    this.status = status;
    this.title = problem?.title;
    this.fieldErrors = problem?.errors ?? null;
  }
}

export const errorMessage = (err) => {
  if (err?.fieldErrors) {
    const [field, message] = Object.entries(err.fieldErrors)[0];
    return `${field} ${message}`;
  }
  return err?.message || "Something went wrong.";
};

export function readStoredAuth() {
  try {
    const auth = JSON.parse(localStorage.getItem(AUTH_KEY));
    if (auth?.token && auth.expiresAt > Date.now()) return auth;
  } catch {
    // ignore
  }
  return null;
}

export function storeAuth(auth) {
  try {
    localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
  } catch {
    // ignore
  }
}

export function clearStoredAuth() {
  try {
    localStorage.removeItem(AUTH_KEY);
  } catch {
    // ignore
  }
}

export async function apiFetch(path, { method = "GET", body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const stored = readStoredAuth();
    if (stored) headers.Authorization = `Bearer ${stored.token}`;
  }

  const slowTimer = setTimeout(() => slowRequestHandler?.(), SLOW_REQUEST_MS);
  let response;
  try {
    response = await fetch(API_URL + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, { title: "Network error", detail: "Couldn't reach the server. Check your connection." });
  } finally {
    clearTimeout(slowTimer);
  }

  if (response.status === 204) return null;
  const isJson = response.headers.get("content-type")?.includes("json");
  const data = isJson ? await response.json() : null;
  if (!response.ok) {
    if (response.status === 401 && auth) unauthorizedHandler?.();
    throw new ApiError(response.status, data);
  }
  return data;
}

export const api = {
  get: (path) => apiFetch(path),
  post: (path, body) => apiFetch(path, { method: "POST", body }),
  put: (path, body) => apiFetch(path, { method: "PUT", body }),
  del: (path, body) => apiFetch(path, { method: "DELETE", body }),
};

export const userTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
