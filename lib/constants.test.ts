import { describe, it, expect } from "vitest";
import { DISCIPLINES, DISCIPLINE_LABELS } from "./constants";
describe("constants", () => {
  it("has a label for every discipline", () => {
    for (const d of DISCIPLINES) expect(DISCIPLINE_LABELS[d]).toBeTruthy();
  });
});
