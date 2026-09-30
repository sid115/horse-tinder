import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";
describe("profile password change hashing", () => {
  it("hashes the new password verifiably", async () => {
    const h = await hashPassword("newpassword");
    expect(await verifyPassword("newpassword", h)).toBe(true);
  });
});
