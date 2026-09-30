import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import DataForm from "./DataForm";

export default async function AdminPage() {
  await requireAdmin();
  const [users, horses, matches] = await Promise.all([
    prisma.user.count(), prisma.horse.count(), prisma.match.count(),
  ]);
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Admin</h1>
        <p className="text-neutral-400">{users} users · {horses} horses · {matches} matches</p>
        <nav className="flex gap-3 text-emerald-400">
          <Link href="/admin/users">Users</Link>
          <Link href="/admin/horses">Horses</Link>
          <Link href="/admin/matches">Matches</Link>
        </nav>
      </div>
      <section className="space-y-3">
        <h2 className="font-semibold">Data</h2>
        <DataForm />
      </section>
    </div>
  );
}
