import { cookies } from "next/headers";
import { signSession, verifySession } from "./session-token";
import type { SessionPayload } from "./session-token";

const COOKIE = "session";

export { signSession, verifySession };
export type { SessionPayload };

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await signSession(payload);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  return token ? verifySession(token) : null;
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
