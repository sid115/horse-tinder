import { redirect } from "next/navigation";
import { prisma } from "./db";
import { getSession, type SessionPayload } from "./session";
import type { Role } from "./constants";

export async function requireUser(): Promise<SessionPayload> {
  const s = await getSession();
  if (!s) redirect("/login");
  const user = await prisma.user.findUnique({ where: { id: s.userId } });
  if (!user || user.disabled) redirect("/login");
  return { userId: user.id, username: user.username, role: user.role as Role };
}

export async function requireAdmin(): Promise<SessionPayload> {
  const s = await requireUser();
  if (s.role !== "ADMIN") redirect("/swipe");
  return s;
}
