"use client";
import { useActionState } from "react";
import { changePassword } from "./actions";

type State = { error?: string; ok?: boolean };

export default function PasswordForm() {
  const [state, action, pending] = useActionState<State, FormData>(
    async (_prev, form) => changePassword(form),
    {}
  );
  const field = "w-full rounded bg-neutral-800 px-3 py-2";
  return (
    <form action={action} className="space-y-3">
      <input name="current" type="password" placeholder="Current password" className={field} />
      <input name="next" type="password" placeholder="New password" className={field} />
      {state?.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
      {state?.ok ? <p className="text-sm text-emerald-400">Password updated</p> : null}
      <button disabled={pending} className="rounded bg-emerald-600 px-3 py-2 disabled:opacity-50">
        {pending ? "Changing…" : "Change password"}
      </button>
    </form>
  );
}
