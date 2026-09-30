import { describe, it, expect } from "vitest";
import { signSession, verifySession } from "./session";
describe("session", () => {
  it("round-trips a payload", async () => {
    const token = await signSession({ userId: "u1", username: "ann", role: "USER" });
    const payload = await verifySession(token);
    expect(payload).toMatchObject({ userId: "u1", username: "ann", role: "USER" });
  });
  it("rejects a tampered token", async () => {
    expect(await verifySession("not.a.jwt")).toBeNull();
  });
});
