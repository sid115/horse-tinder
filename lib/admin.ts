import { prisma } from "./db";
import { hashPassword } from "./password";
import { ROLES, type Role } from "./constants";

export type ActionResult = { error: string } | { ok: true };

export function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters";
  return null;
}

export function validateNewUser(username: string, password: string): string | null {
  if (!username.trim() || password.length < 8) return "Username required; password ≥ 8 chars";
  return null;
}

export function validateRole(role: string): role is Role {
  return (ROLES as readonly string[]).includes(role);
}

export async function createUserCore(form: FormData): Promise<ActionResult> {
  const username = String(form.get("username") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const roleInput = String(form.get("role") ?? "USER");
  if (!validateRole(roleInput)) return { error: "Invalid role" };
  const role: Role = roleInput;
  const invalid = validateNewUser(username, password);
  if (invalid) return { error: invalid };
  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) return { error: "Username already taken" };
  await prisma.user.create({
    data: {
      username, role,
      passwordHash: await hashPassword(password),
      displayName: String(form.get("displayName") ?? username).trim() || username,
      email: String(form.get("email") ?? "").trim() || null,
    },
  });
  return { ok: true };
}

export async function resetUserPasswordCore(userId: string, password: string): Promise<ActionResult> {
  const invalid = validatePassword(password);
  if (invalid) return { error: invalid };
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(password) } });
  return { ok: true };
}

export async function deleteUserCore(userId: string): Promise<ActionResult> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "User not found" };
  if (user.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) return { error: "Cannot delete the last admin" };
  }
  await prisma.user.delete({ where: { id: userId } });
  return { ok: true };
}
