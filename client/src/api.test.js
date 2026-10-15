import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  apiFetch,
  errorMessage,
  logIn,
  logOut,
  startDemo,
  refreshSession,
  setAccessToken,
  setSlowRequestHandler,
  setUnauthorizedHandler,
} from "./api";

const jsonResponse = (status, body) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: body === undefined ? {} : { "Content-Type": "application/problem+json" },
  });

describe("apiFetch", () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    setUnauthorizedHandler(null);
    setSlowRequestHandler(null);
    setAccessToken(null);
  });

  it("sends the access token, the cookie and a json body", async () => {
    setAccessToken("abc");
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));

    const result = await apiFetch("/api/v1/sessions", { method: "POST", body: { totalSeconds: 60 } });

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8080/api/v1/sessions");
    expect(options.headers.Authorization).toBe("Bearer abc");
    expect(options.credentials).toBe("include");
    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(options.body)).toEqual({ totalSeconds: 60 });
    expect(result).toEqual({ ok: true });
  });

  it("returns null for 204 responses", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    expect(await apiFetch("/api/v1/goals/1", { method: "DELETE" })).toBeNull();
  });

  it("turns problem details into an ApiError with field errors", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, { title: "Validation failed", detail: "One or more fields are invalid", errors: { title: "must not be blank" } })
    );

    const error = await apiFetch("/api/v1/workouts").catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
    expect(errorMessage(error)).toBe("title must not be blank");
  });

  it("gets a new access token on 401 and retries once", async () => {
    setAccessToken("expired");
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401))
      .mockResolvedValueOnce(jsonResponse(200, { accessToken: "fresh", username: "demo" }))
      .mockResolvedValueOnce(jsonResponse(200, [{ id: 1 }]));

    expect(await apiFetch("/api/v1/workouts")).toEqual([{ id: 1 }]);
    expect(fetchMock.mock.calls[1][0]).toBe("http://localhost:8080/api/v1/auth/refresh");
    expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe("Bearer fresh");
  });

  it("signs out when the session can't be refreshed", async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    fetchMock.mockResolvedValueOnce(jsonResponse(401)).mockResolvedValueOnce(jsonResponse(401));

    await expect(apiFetch("/api/v1/workouts")).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shares one refresh between requests that fail at the same time", async () => {
    setAccessToken("expired");
    fetchMock.mockImplementation((url, options) => {
      if (url.endsWith("/auth/refresh")) return Promise.resolve(jsonResponse(200, { accessToken: "fresh", username: "demo" }));
      return Promise.resolve(options.headers.Authorization === "Bearer fresh" ? jsonResponse(200, []) : jsonResponse(401));
    });

    await Promise.all([apiFetch("/api/v1/workouts"), apiFetch("/api/v1/stats"), apiFetch("/api/v1/goals")]);

    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith("/auth/refresh"))).toHaveLength(1);
  });

  it("doesn't sign out when a login attempt fails", async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    fetchMock.mockResolvedValue(jsonResponse(401, { title: "Authentication failed", detail: "Invalid username or password" }));

    const error = await apiFetch("/api/v1/auth/login", { method: "POST", body: {}, auth: false }).catch((e) => e);

    expect(errorMessage(error)).toBe("Invalid username or password");
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("reports network failures as status 0", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(apiFetch("/api/v1/workouts")).rejects.toMatchObject({ status: 0 });
  });

  it("tells the app when a request is slow, like a sleeping render instance", async () => {
    vi.useFakeTimers();
    const onSlow = vi.fn();
    setSlowRequestHandler(onSlow);
    let respond;
    fetchMock.mockReturnValue(new Promise((resolve) => (respond = resolve)));

    const request = apiFetch("/api/v1/workouts");
    await vi.advanceTimersByTimeAsync(4000);
    expect(onSlow).toHaveBeenCalledOnce();

    respond(jsonResponse(200, []));
    await request;
  });
});

describe("session helpers", () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setAccessToken(null);
  });

  it("refreshSession returns null when there is no session", async () => {
    fetchMock.mockResolvedValue(jsonResponse(401));

    expect(await refreshSession()).toBeNull();
  });

  it("refreshSession throws when the server can't be reached, so the app doesn't log you out", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(refreshSession()).rejects.toMatchObject({ status: 0 });
  });

  it("logIn keeps the access token for later requests", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { accessToken: "abc", username: "demo" }))
      .mockResolvedValueOnce(jsonResponse(200, []));

    await logIn("/api/v1/auth/login", "demo", "secret-password");
    await apiFetch("/api/v1/workouts");

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe("Bearer abc");
  });

  it("startDemo opens a session without a password", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { accessToken: "demo-token", username: "Demo Trainer", readOnly: true }));

    expect(await startDemo()).toMatchObject({ readOnly: true });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8080/api/v1/auth/demo");
    expect(options.method).toBe("POST");
    expect(options.body).toBeUndefined();
  });

  it("logOut forgets the token and tells the server", async () => {
    setAccessToken("abc");
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await logOut();

    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:8080/api/v1/auth/logout");
    fetchMock.mockResolvedValue(jsonResponse(200, []));
    await apiFetch("/api/v1/workouts", { auth: false });
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBeUndefined();
  });
});
