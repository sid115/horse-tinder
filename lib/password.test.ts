import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password";
describe("password", () => {
  it("verifies a correct password", async () => {
    const h = await hashPassword("secret123");
    expect(await verifyPassword("secret123", h)).toBe(true);
  });
  it("rejects a wrong password", async () => {
    const h = await hashPassword("secret123");
    expect(await verifyPassword("nope", h)).toBe(false);
  });
});
