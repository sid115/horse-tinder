"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { createUserCore, resetUserPasswordCore } from "@/lib/admin";

export async function createUser(form: FormData) {
  await requireAdmin();
  const result = await createUserCore(form);
  if ("error" in result) return result;
  revalidatePath("/admin/users");
  return result;
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
  const result = await resetUserPasswordCore(userId, password);
  if ("error" in result) return result;
  revalidatePath("/admin/users");
  return result;
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
