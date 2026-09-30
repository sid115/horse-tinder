import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/db";
import { assertMember } from "@/lib/matches";

describe("assertMember", () => {
  it("throws for non-members", async () => {
    const a = await prisma.user.create({ data: { username: "m1", passwordHash: "x", displayName: "A" } });
    const b = await prisma.user.create({ data: { username: "m2", passwordHash: "x", displayName: "B" } });
    const c = await prisma.user.create({ data: { username: "m3", passwordHash: "x", displayName: "C" } });
    const match = await prisma.match.create({ data: { userAId: a.id, userBId: b.id } });
    await expect(assertMember(match.id, c.id)).rejects.toThrow("Forbidden");
    await expect(assertMember(match.id, a.id)).resolves.toBeTruthy();
  });
});
