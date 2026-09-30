"use client";
import { useActionState } from "react";
import { deleteUser } from "./actions";

type State = { error?: string; ok?: boolean };

export default function DeleteUserButton({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState<State, FormData>(
    async () => deleteUser(userId),
    {}
  );
  return (
    <form action={action} className="flex items-center gap-1">
      <button disabled={pending} className="text-red-400 disabled:opacity-50">
        {pending ? "Deleting…" : "Delete"}
      </button>
      {state?.error ? <span className="text-sm text-red-400">{state.error}</span> : null}
    </form>
  );
}
