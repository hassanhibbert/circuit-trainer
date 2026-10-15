const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8080").replace(/\/$/, "");
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

// the access token only lives in memory. the refresh token is an httpOnly cookie the browser
// sends to /api/v1/auth, so page scripts never see it
let accessToken = null;
let refreshInFlight = null;

export const setAccessToken = (token) => {
  accessToken = token;
};

async function send(path, { method = "GET", body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const slowTimer = setTimeout(() => slowRequestHandler?.(), SLOW_REQUEST_MS);
  try {
    return await fetch(API_URL + path, {
      method,
      headers,
      credentials: "include",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, { title: "Network error", detail: "Couldn't reach the server. Check your connection." });
  } finally {
    clearTimeout(slowTimer);
  }
}

async function readBody(response) {
  if (response.status === 204) return null;
  return response.headers.get("content-type")?.includes("json") ? response.json() : null;
}

// returns the new token response, or null if there is no valid session
export function refreshSession() {
  if (!refreshInFlight) {
    refreshInFlight = send("/api/v1/auth/refresh", { method: "POST", auth: false })
      .then(async (response) => {
        const data = await readBody(response);
        if (!response.ok) {
          if (response.status === 401) return null;
          throw new ApiError(response.status, data);
        }
        setAccessToken(data.accessToken);
        return data;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

export async function apiFetch(path, options = {}) {
  const { auth = true } = options;
  let response = await send(path, options);

  // access tokens are short lived, so a 401 usually just means get a new one and try again
  if (response.status === 401 && auth) {
    const refreshed = await refreshSession().catch(() => null);
    if (refreshed) {
      response = await send(path, options);
    }
  }

  const data = await readBody(response);
  if (!response.ok) {
    if (response.status === 401 && auth) {
      setAccessToken(null);
      unauthorizedHandler?.();
    }
    throw new ApiError(response.status, data);
  }
  return data;
}

export async function logIn(path, username, password) {
  const data = await apiFetch(path, { method: "POST", body: { username, password }, auth: false });
  setAccessToken(data.accessToken);
  return data;
}

export async function startDemo() {
  const data = await apiFetch("/api/v1/auth/demo", { method: "POST", auth: false });
  setAccessToken(data.accessToken);
  return data;
}

export async function logOut() {
  setAccessToken(null);
  await send("/api/v1/auth/logout", { method: "POST", auth: false }).catch(() => {});
}

export const api = {
  get: (path) => apiFetch(path),
  post: (path, body) => apiFetch(path, { method: "POST", body }),
  put: (path, body) => apiFetch(path, { method: "PUT", body }),
  del: (path, body) => apiFetch(path, { method: "DELETE", body }),
};

export const userTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
