"use client";
import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { login } from "./actions";

function LoginForm() {
  const [state, action, pending] = useActionState(login, { error: "" });
  const next = useSearchParams().get("next") ?? "";
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <input name="username" placeholder="Username" autoComplete="username"
        className="w-full rounded bg-neutral-800 px-3 py-2" />
      <input name="password" type="password" placeholder="Password" autoComplete="current-password"
        className="w-full rounded bg-neutral-800 px-3 py-2" />
      {state?.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
      <button disabled={pending} className="w-full rounded bg-emerald-600 px-3 py-2 font-semibold disabled:opacity-50">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="mx-auto mt-24 max-w-sm p-6">
      <h1 className="mb-6 text-2xl font-bold">Horse Tinder</h1>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
