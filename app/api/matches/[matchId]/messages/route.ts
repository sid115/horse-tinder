import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertMember } from "@/lib/matches";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
  const session = await requireUser();
  const { matchId } = await params;
  await assertMember(matchId, session.userId);
  const messages = await prisma.message.findMany({
    where: { matchId }, orderBy: { createdAt: "asc" },
    select: { id: true, senderUserId: true, body: true, createdAt: true },
  });
  return NextResponse.json({ messages });
}
