"use client";
import { useActionState } from "react";
import { resetUserPassword } from "./actions";

type State = { error?: string; ok?: boolean };

export default function ResetPasswordForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState<State, FormData>(
    async (_prev, form) => resetUserPassword(userId, String(form.get("password") ?? "")),
    {}
  );
  return (
    <form action={action} className="flex items-center gap-1">
      <input name="password" type="password" placeholder="New password (≥8)" className="rounded bg-neutral-800 px-2 py-1 text-sm" />
      <button disabled={pending} className="text-neutral-300 disabled:opacity-50">
        {pending ? "Resetting…" : "Reset password"}
      </button>
      {state?.error ? <span className="text-sm text-red-400">{state.error}</span> : null}
      {state?.ok ? <span className="text-sm text-emerald-400">Reset</span> : null}
    </form>
  );
}
