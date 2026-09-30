import { describe, it, expect } from "vitest";
import { haversineMiles } from "./geo";
describe("haversineMiles", () => {
  it("is zero for the same point", () => {
    expect(haversineMiles(40, -74, 40, -74)).toBeCloseTo(0, 5);
  });
  it("matches a known distance (NYC to LA ~2451 mi)", () => {
    expect(haversineMiles(40.7128, -74.006, 34.0522, -118.2437)).toBeGreaterThan(2400);
    expect(haversineMiles(40.7128, -74.006, 34.0522, -118.2437)).toBeLessThan(2500);
  });
});
