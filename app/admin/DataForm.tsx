"use client";
import { useActionState } from "react";
import { seedDemoData, resetDatabase } from "./actions";

type State = { error?: string; ok?: boolean };

function useDataAction(fn: () => Promise<{ ok: true }>) {
  return useActionState<State, FormData>(async () => fn(), {});
}

export default function DataForm() {
  const [seedState, seedAction, seedPending] = useDataAction(seedDemoData);
  const [resetState, resetAction, resetPending] = useDataAction(resetDatabase);
  return (
    <div className="space-y-3">
      <form action={seedAction} className="flex items-center gap-3">
        <button disabled={seedPending} className="rounded bg-emerald-600 px-3 py-2 text-sm disabled:opacity-50">
          {seedPending ? "Seeding…" : "Seed demo data"}
        </button>
        {seedState?.ok ? <span className="text-sm text-emerald-400">Demo data seeded</span> : null}
      </form>
      <form action={resetAction} className="flex items-center gap-3">
        <button disabled={resetPending} className="rounded bg-red-700 px-3 py-2 text-sm disabled:opacity-50">
          {resetPending ? "Resetting…" : "Reset database"}
        </button>
        <span className="text-sm text-neutral-500">Destructive: deletes all users, horses, matches, and messages.</span>
        {resetState?.ok ? <span className="text-sm text-emerald-400">Database reset</span> : null}
      </form>
    </div>
  );
}
