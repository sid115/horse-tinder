import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/db";
import { createUserCore, resetUserPasswordCore, deleteUserCore } from "@/lib/admin";

function userForm(overrides: Record<string, string> = {}) {
  const form = new FormData();
  const fields = { username: "newuser", password: "password123", role: "USER", displayName: "New User", email: "", ...overrides };
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  return form;
}

describe("admin user creation hashing", () => {
  it("hashes passwords verifiably", async () => {
    const h = await hashPassword("password123");
    expect(await verifyPassword("password123", h)).toBe(true);
  });
});

describe("createUserCore", () => {
  it("rejects a password shorter than 8 characters", async () => {
    const res = await createUserCore(userForm({ username: "shortpw", password: "short" }));
    expect(res).toEqual({ error: "Username required; password ≥ 8 chars" });
    expect(await prisma.user.findUnique({ where: { username: "shortpw" } })).toBeNull();
  });

  it("rejects a duplicate username", async () => {
    await prisma.user.create({ data: { username: "dupe", passwordHash: "x", displayName: "Dupe" } });
    const res = await createUserCore(userForm({ username: "dupe" }));
    expect(res).toEqual({ error: "Username already taken" });
  });

  it("creates a user with a hashed password", async () => {
    const res = await createUserCore(userForm({ username: "created", password: "password123" }));
    expect(res).toEqual({ ok: true });
    const user = await prisma.user.findUnique({ where: { username: "created" } });
    expect(user).not.toBeNull();
    expect(user!.passwordHash).not.toBe("password123");
    expect(await verifyPassword("password123", user!.passwordHash)).toBe(true);
  });

  it("rejects an invalid role", async () => {
    const res = await createUserCore(userForm({ username: "badrole", role: "SUPERUSER" }));
    expect(res).toEqual({ error: "Invalid role" });
    expect(await prisma.user.findUnique({ where: { username: "badrole" } })).toBeNull();
  });
});

describe("deleteUserCore", () => {
  it("refuses to delete the last remaining admin", async () => {
    const admin = await prisma.user.create({ data: { username: "soleadmin", passwordHash: "x", role: "ADMIN", displayName: "Sole" } });
    const res = await deleteUserCore(admin.id);
    expect(res).toEqual({ error: "Cannot delete the last admin" });
    expect(await prisma.user.findUnique({ where: { id: admin.id } })).not.toBeNull();
  });

  it("deletes a non-admin user", async () => {
    const user = await prisma.user.create({ data: { username: "deletable", passwordHash: "x", displayName: "Delete" } });
    const res = await deleteUserCore(user.id);
    expect(res).toEqual({ ok: true });
    expect(await prisma.user.findUnique({ where: { id: user.id } })).toBeNull();
  });
});

describe("resetUserPasswordCore", () => {
  it("rejects a password shorter than 8 characters", async () => {
    const user = await prisma.user.create({ data: { username: "resetme", passwordHash: "x", displayName: "Reset" } });
    const res = await resetUserPasswordCore(user.id, "short");
    expect(res).toEqual({ error: "Password must be at least 8 characters" });
    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after!.passwordHash).toBe("x");
  });

  it("updates the password hash", async () => {
    const user = await prisma.user.create({ data: { username: "resetok", passwordHash: "x", displayName: "Reset" } });
    const res = await resetUserPasswordCore(user.id, "newpassword");
    expect(res).toEqual({ ok: true });
    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(await verifyPassword("newpassword", after!.passwordHash)).toBe(true);
  });
});
