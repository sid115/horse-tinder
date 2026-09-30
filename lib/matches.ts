import { prisma } from "@/lib/db";

export async function assertMember(matchId: string, userId: string) {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || (match.userAId !== userId && match.userBId !== userId)) throw new Error("Forbidden");
  return match;
}
