"use client";
import { useActionState } from "react";
import { createUser } from "./actions";

type State = { error?: string; ok?: boolean };

export default function CreateUserForm() {
  const [state, action, pending] = useActionState<State, FormData>(
    async (_prev, form) => createUser(form),
    {}
  );
  const field = "rounded bg-neutral-800 px-3 py-2";
  return (
    <form action={action} className="grid grid-cols-2 gap-3">
      <input name="username" placeholder="Username" required className={field} />
      <input name="password" type="password" placeholder="Password (≥8)" required className={field} />
      <input name="displayName" placeholder="Display name" className={field} />
      <input name="email" type="email" placeholder="Email" className={field} />
      <select name="role" className={field}><option value="USER">USER</option><option value="ADMIN">ADMIN</option></select>
      <button disabled={pending} className="rounded bg-emerald-600 px-3 py-2 disabled:opacity-50">
        {pending ? "Creating…" : "Create user"}
      </button>
      {state?.error ? <p className="col-span-2 text-sm text-red-400">{state.error}</p> : null}
      {state?.ok ? <p className="col-span-2 text-sm text-emerald-400">User created</p> : null}
    </form>
  );
}
