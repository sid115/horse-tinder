"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertMember } from "@/lib/matches";

export async function sendMessage(matchId: string, body: string) {
  const session = await requireUser();
  await assertMember(matchId, session.userId);
  const trimmed = body.trim();
  if (!trimmed) return;
  await prisma.message.create({ data: { matchId, senderUserId: session.userId, body: trimmed } });
  revalidatePath(`/matches/${matchId}`);
}
