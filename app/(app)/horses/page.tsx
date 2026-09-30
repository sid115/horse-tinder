import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ageFromDob } from "@/lib/format";

export default async function HorsesPage() {
  const session = await requireUser();
  const horses = await prisma.horse.findMany({ where: { ownerId: session.userId }, orderBy: { createdAt: "desc" } });
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">My Horses</h1>
        <Link href="/horses/new" className="rounded bg-emerald-600 px-3 py-1 text-sm">Add horse</Link>
      </div>
      {horses.length === 0 && <p className="text-neutral-400">No horses yet.</p>}
      <ul className="divide-y divide-neutral-800">
        {horses.map((h) => (
          <li key={h.id} className="flex items-center justify-between py-3">
            <div>
              <p className="font-semibold">{h.name} {h.active ? "" : "(inactive)"}</p>
              <p className="text-sm text-neutral-400">{h.breedName} · {h.sex} · {ageFromDob(h.dob)}y</p>
            </div>
            <Link href={`/horses/${h.id}/edit`} className="text-sm text-emerald-400">Edit</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
