import { describe, it, expect } from "vitest";
import { wantedSexes } from "./matching";
describe("wantedSexes", () => {
  it("a mare owner wants stallions", () => { expect(wantedSexes(["MARE"])).toEqual(["STALLION"]); });
  it("a stallion owner wants mares", () => { expect(wantedSexes(["STALLION"])).toEqual(["MARE"]); });
  it("an owner with both wants both", () => { expect(wantedSexes(["STALLION", "MARE"]).sort()).toEqual(["MARE", "STALLION"]); });
  it("a gelding-only owner wants nothing", () => { expect(wantedSexes(["GELDING"])).toEqual([]); });
});

import { prisma } from "./db";
import { getStackForUser } from "./matching";

async function mkUser(username: string) {
  return prisma.user.create({ data: { username, passwordHash: "x", displayName: username } });
}
async function mkHorse(ownerId: string, over: Partial<{ sex: string; breedName: string; active: boolean }> = {}) {
  return prisma.horse.create({
    data: {
      ownerId, name: "H", sex: over.sex ?? "MARE", dob: new Date("2015-01-01"),
      breedName: over.breedName ?? "Thoroughbred", discipline: "RACING",
      active: over.active ?? true,
    },
  });
}

describe("getStackForUser", () => {
  it("shows only opposite-sex, unswiped, active horses from enabled owners", async () => {
    const viewer = await mkUser("viewer");
    const other = await mkUser("other");
    await mkHorse(viewer.id, { sex: "MARE" });
    const stallion = await mkHorse(other.id, { sex: "STALLION" });
    await mkHorse(other.id, { sex: "MARE" });
    await mkHorse(other.id, { sex: "STALLION", active: false });

    const stack = await getStackForUser(viewer.id);
    expect(stack.map((h) => h.id)).toEqual([stallion.id]);
  });
});

import { recordSwipe } from "./matching";

describe("recordSwipe", () => {
  it("creates a match on reciprocal owner likes", async () => {
    const a = await mkUser("a");
    const b = await mkUser("b");
    const aHorse = await mkHorse(a.id, { sex: "STALLION" });
    const bHorse = await mkHorse(b.id, { sex: "MARE" });

    const first = await recordSwipe(a.id, bHorse.id, "LIKE");
    expect(first.matched).toBe(false);

    const second = await recordSwipe(b.id, aHorse.id, "LIKE");
    expect(second.matched).toBe(true);
    expect(second.matchId).toBeTruthy();

    const again = await recordSwipe(b.id, aHorse.id, "LIKE");
    expect(again.matchId).toBe(second.matchId);
  });

  it("rejects swiping your own horse", async () => {
    const a = await mkUser("solo");
    const h = await mkHorse(a.id);
    await expect(recordSwipe(a.id, h.id, "LIKE")).rejects.toThrow("Cannot swipe your own horse");
  });
});
