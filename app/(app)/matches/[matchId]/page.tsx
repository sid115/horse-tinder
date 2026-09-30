import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import ChatThread from "../ChatThread";

export default async function MatchPage({ params }: { params: Promise<{ matchId: string }> }) {
  const session = await requireUser();
  const { matchId } = await params;
  const match = await prisma.match.findUnique({
    where: { id: matchId }, include: { userA: true, userB: true, messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!match || (match.userAId !== session.userId && match.userBId !== session.userId)) notFound();

  const other = match.userAId === session.userId ? match.userB : match.userA;
  const initial = match.messages.map((m) => ({
    id: m.id, senderUserId: m.senderUserId, body: m.body, createdAt: m.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">{other.displayName}</h1>
        <p className="text-sm text-neutral-400">
          {other.email ?? "no email"} · {other.phone ?? "no phone"}
        </p>
      </div>
      <ChatThread matchId={match.id} meId={session.userId} initial={initial} />
    </div>
  );
}
