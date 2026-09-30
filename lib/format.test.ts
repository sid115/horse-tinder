import { describe, it, expect } from "vitest";
import { ageFromDob, formatHands } from "./format";
describe("format", () => {
  it("computes age with birthday adjustment", () => {
    expect(ageFromDob(new Date("2015-06-01"), new Date("2026-05-31"))).toBe(10);
    expect(ageFromDob(new Date("2015-06-01"), new Date("2026-06-01"))).toBe(11);
  });
  it("formats hands", () => { expect(formatHands(15.5)).toBe("15.6 hh"); });
  it("handles null hands", () => { expect(formatHands(null)).toBe("—"); });
});
