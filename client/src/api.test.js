import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  apiFetch,
  errorMessage,
  readStoredAuth,
  setSlowRequestHandler,
  setUnauthorizedHandler,
  storeAuth,
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
  });

  it("sends the stored token and json body", async () => {
    storeAuth({ token: "abc", username: "demo", expiresAt: Date.now() + 60_000 });
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));

    const result = await apiFetch("/api/v1/sessions", { method: "POST", body: { totalSeconds: 60 } });

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8080/api/v1/sessions");
    expect(options.headers.Authorization).toBe("Bearer abc");
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

  it("calls the unauthorized handler on 401", async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    fetchMock.mockResolvedValue(jsonResponse(401));

    await expect(apiFetch("/api/v1/workouts")).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).toHaveBeenCalledOnce();
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

describe("readStoredAuth", () => {
  it("ignores expired tokens", () => {
    storeAuth({ token: "old", username: "demo", expiresAt: Date.now() - 1 });

    expect(readStoredAuth()).toBeNull();
  });

  it("ignores corrupt storage", () => {
    localStorage.setItem("circuit-trainer:auth", "{not json");

    expect(readStoredAuth()).toBeNull();
  });
});
