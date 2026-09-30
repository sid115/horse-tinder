import Link from "next/link";
import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth";
import { destroySession } from "@/lib/session";
import { redirect } from "next/navigation";

async function logout() {
  "use server";
  await destroySession();
  redirect("/login");
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await requireUser();
  return (
    <div className="min-h-screen">
      <header className="flex items-center gap-4 border-b border-neutral-800 px-4 py-3">
        <span className="font-bold">🐴 Horse Tinder</span>
        <nav className="flex gap-3 text-sm">
          <Link href="/swipe">Swipe</Link>
          <Link href="/matches">Matches</Link>
          <Link href="/horses">My Horses</Link>
          <Link href="/profile">Profile</Link>
          {session.role === "ADMIN" && <Link href="/admin">Admin</Link>}
        </nav>
        <form action={logout} className="ml-auto">
          <button className="text-sm text-neutral-400">Sign out ({session.username})</button>
        </form>
      </header>
      <main className="mx-auto max-w-3xl p-4">{children}</main>
    </div>
  );
}
