"use server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import type { Role } from "@/lib/constants";

function safeNext(next: string): string {
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return "/swipe";
  return next;
}

export async function login(_prev: unknown, formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/swipe");
  if (!username || !password) return { error: "Invalid credentials" };

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || user.disabled || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Invalid credentials" };
  }
  await createSession({ userId: user.id, username: user.username, role: user.role as Role });
  redirect(safeNext(next));
}
