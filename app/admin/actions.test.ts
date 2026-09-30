import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";
describe("admin user creation hashing", () => {
  it("hashes passwords verifiably", async () => {
    const h = await hashPassword("password123");
    expect(await verifyPassword("password123", h)).toBe(true);
  });
});
