import Link from "next/link";
import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-screen">
      <header className="flex items-center gap-4 border-b border-neutral-800 px-4 py-3">
        <span className="font-bold">🐴 Horse Tinder Admin</span>
        <nav className="flex gap-3 text-sm">
          <Link href="/admin">Admin</Link>
          <Link href="/admin/users">Users</Link>
          <Link href="/admin/horses">Horses</Link>
          <Link href="/admin/matches">Matches</Link>
        </nav>
        <Link href="/swipe" className="ml-auto text-sm text-neutral-400">Back to app</Link>
      </header>
      <main className="mx-auto max-w-3xl p-4">{children}</main>
    </div>
  );
}
