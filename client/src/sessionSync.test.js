import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./api";
import { flushOutbox, recordSession } from "./sessionSync";

vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, api: { post: vi.fn() } };
});

const { api } = await import("./api");

const OUTBOX = "circuit-trainer:outbox:demo";
const payload = (minute) => ({ workoutId: 5, workoutTitle: "Kettlebell", completedAt: `2026-10-13T10:0${minute}:00Z`, totalSeconds: 1800 });
const outbox = () => JSON.parse(localStorage.getItem(OUTBOX) ?? "[]");

describe("recordSession", () => {
  beforeEach(() => {
    api.post.mockReset();
  });

  it("returns the saved session when the server is reachable", async () => {
    api.post.mockResolvedValue({ id: 1 });

    expect(await recordSession("demo", payload(0))).toEqual({ id: 1 });
    expect(outbox()).toEqual([]);
  });

  it.each([
    ["offline", 0],
    ["server asleep or down", 503],
    ["token expired mid workout", 401],
  ])("queues the workout when %s", async (_, status) => {
    api.post.mockRejectedValue(new ApiError(status, null));

    expect(await recordSession("demo", payload(0))).toBeNull();
    expect(outbox()).toEqual([payload(0)]);
  });

  it("doesn't queue requests that can never succeed", async () => {
    api.post.mockRejectedValue(new ApiError(400, { detail: "bad" }));

    await expect(recordSession("demo", payload(0))).rejects.toMatchObject({ status: 400 });
    expect(outbox()).toEqual([]);
  });

  it("keeps each user's queue separate", async () => {
    api.post.mockRejectedValue(new ApiError(0, null));

    await recordSession("someone-else", payload(0));

    expect(outbox()).toEqual([]);
  });
});

describe("flushOutbox", () => {
  beforeEach(() => {
    api.post.mockReset();
  });

  it("sends queued workouts and clears the queue", async () => {
    localStorage.setItem(OUTBOX, JSON.stringify([payload(0), payload(1)]));
    api.post.mockResolvedValue({});

    expect(await flushOutbox("demo")).toBe(2);
    expect(api.post).toHaveBeenCalledWith("/api/v1/sessions", payload(0));
    expect(localStorage.getItem(OUTBOX)).toBeNull();
  });

  it("keeps what still can't be sent and drops what already arrived", async () => {
    localStorage.setItem(OUTBOX, JSON.stringify([payload(0), payload(1), payload(2)]));
    api.post
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new ApiError(409, null))
      .mockRejectedValueOnce(new ApiError(0, null));

    expect(await flushOutbox("demo")).toBe(1);
    expect(outbox()).toEqual([payload(2)]);
  });

  it("only sends once when called twice at the same time", async () => {
    localStorage.setItem(OUTBOX, JSON.stringify([payload(0)]));
    api.post.mockResolvedValue({});

    const [first, second] = await Promise.all([flushOutbox("demo"), flushOutbox("demo")]);

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(first).toBe(1);
    expect(second).toBe(1);
  });

  it("does nothing with an empty queue", async () => {
    expect(await flushOutbox("demo")).toBe(0);
    expect(api.post).not.toHaveBeenCalled();
  });
});
