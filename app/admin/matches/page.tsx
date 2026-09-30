import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function AdminMatchesPage() {
  await requireAdmin();
  const matches = await prisma.match.findMany({
    orderBy: { createdAt: "desc" }, include: { userA: true, userB: true, messages: true },
  });
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Matches</h1>
      <ul className="divide-y divide-neutral-800">
        {matches.map((m) => (
          <li key={m.id} className="py-3">
            {m.userA.username} ↔ {m.userB.username} · {m.messages.length} messages
          </li>
        ))}
      </ul>
    </div>
  );
}
