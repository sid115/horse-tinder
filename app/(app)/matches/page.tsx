import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export default async function MatchesPage() {
  const session = await requireUser();
  const matches = await prisma.match.findMany({
    where: { OR: [{ userAId: session.userId }, { userBId: session.userId }] },
    orderBy: { createdAt: "desc" },
    include: {
      userA: true, userB: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Matches</h1>
      {matches.length === 0 && <p className="text-neutral-400">No matches yet. Go swipe!</p>}
      <ul className="divide-y divide-neutral-800">
        {matches.map((m) => {
          const other = m.userAId === session.userId ? m.userB : m.userA;
          const last = m.messages[0];
          return (
            <li key={m.id} className="py-3">
              <Link href={`/matches/${m.id}`} className="flex items-center justify-between">
                <span className="font-semibold">{other.displayName}</span>
                <span className="text-sm text-neutral-400">{last?.body ?? "Say hello"}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
