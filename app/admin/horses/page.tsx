import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { adminToggleHorse, adminDeleteHorse } from "../actions";

export default async function AdminHorsesPage() {
  await requireAdmin();
  const horses = await prisma.horse.findMany({ orderBy: { createdAt: "desc" }, include: { owner: true } });
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Horses</h1>
      <ul className="divide-y divide-neutral-800">
        {horses.map((h) => (
          <li key={h.id} className="flex items-center justify-between py-3">
            <span>{h.name} <span className="text-neutral-500">({h.owner.username}{h.active ? "" : ", inactive"})</span></span>
            <span className="flex gap-2 text-sm">
              <form action={adminToggleHorse.bind(null, h.id)}>
                <button className="text-neutral-300">{h.active ? "Deactivate" : "Activate"}</button>
              </form>
              <form action={adminDeleteHorse.bind(null, h.id)}><button className="text-red-400">Delete</button></form>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
