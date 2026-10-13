import { describe, expect, it } from "vitest";
import { getCueDuration, getFormattedCountdown } from "./utils";

describe("getFormattedCountdown", () => {
  it("pads minutes and seconds", () => {
    expect(getFormattedCountdown(1, 5)).toBe("01:05");
    expect(getFormattedCountdown(12, 30)).toBe("12:30");
  });
});

describe("getCueDuration", () => {
  it("beeps short at 3, 2, 1 and long at 0", () => {
    expect([3, 2, 1].map(getCueDuration)).toEqual([0.3, 0.3, 0.3]);
    expect(getCueDuration(0)).toBe(1.5);
  });

  it("stays quiet otherwise", () => {
    expect(getCueDuration(4)).toBeNull();
    expect(getCueDuration(-1)).toBeNull();
  });
});
