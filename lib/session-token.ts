import { SignJWT, jwtVerify } from "jose";
import type { Role } from "./constants";

const sessionSecret = process.env.SESSION_SECRET ?? (process.env.NODE_ENV !== "production" ? "dev-secret-change-me" : undefined);
if (!sessionSecret) {
  throw new Error("SESSION_SECRET environment variable is required in production");
}
const secret = new TextEncoder().encode(sessionSecret);

export type SessionPayload = { userId: string; username: string; role: Role };

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
