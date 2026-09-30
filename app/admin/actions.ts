"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import type { Role } from "@/lib/constants";

export async function createUser(form: FormData) {
  await requireAdmin();
  const username = String(form.get("username") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const role = String(form.get("role") ?? "USER") as Role;
  if (!username || password.length < 8) return { error: "Username required; password ≥ 8 chars" };
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
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function setUserDisabled(userId: string, disabled: boolean) {
  await requireAdmin();
  await prisma.user.update({ where: { id: userId }, data: { disabled } });
  revalidatePath("/admin/users");
}

export async function deleteUser(userId: string) {
  await requireAdmin();
  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/admin/users");
}

export async function resetUserPassword(userId: string, password: string) {
  await requireAdmin();
  if (password.length < 8) return { error: "Password must be at least 8 characters" };
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(password) } });
  return { ok: true };
}

export async function adminToggleHorse(horseId: string) {
  await requireAdmin();
  const horse = await prisma.horse.findUnique({ where: { id: horseId } });
  if (horse) await prisma.horse.update({ where: { id: horseId }, data: { active: !horse.active } });
  revalidatePath("/admin/horses");
}

export async function adminDeleteHorse(horseId: string) {
  await requireAdmin();
  await prisma.horse.delete({ where: { id: horseId } });
  revalidatePath("/admin/horses");
}
