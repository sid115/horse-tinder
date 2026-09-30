import { redirect } from "next/navigation";
import { getSession, type SessionPayload } from "./session";

export async function requireUser(): Promise<SessionPayload> {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}

export async function requireAdmin(): Promise<SessionPayload> {
  const s = await requireUser();
  if (s.role !== "ADMIN") redirect("/swipe");
  return s;
}
