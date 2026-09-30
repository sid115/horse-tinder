import type { Sex } from "./constants";

export function wantedSexes(viewerSexes: Sex[]): Sex[] {
  const set = new Set(viewerSexes.filter((s) => s !== "GELDING"));
  const wanted: Sex[] = [];
  if (set.has("STALLION")) wanted.push("MARE");
  if (set.has("MARE")) wanted.push("STALLION");
  return wanted;
}

import { prisma } from "./db";
import { haversineMiles } from "./geo";

export type StackFilters = { breed?: string; discipline?: string; maxDistanceMiles?: number };

export async function getStackForUser(userId: string, filters: StackFilters = {}) {
  const viewerHorses = await prisma.horse.findMany({ where: { ownerId: userId, active: true } });
  const wanted = wantedSexes(viewerHorses.map((h) => h.sex as Sex));
  if (wanted.length === 0) return [];

  const swiped = await prisma.swipe.findMany({ where: { swiperUserId: userId }, select: { horseId: true } });
  const swipedIds = swiped.map((s) => s.horseId);

  const where: Record<string, unknown> = {
    active: true,
    ownerId: { not: userId },
    owner: { disabled: false },
    sex: { in: wanted },
    id: { notIn: swipedIds.length ? swipedIds : ["__none__"] },
  };
  if (filters.breed) where.breedName = filters.breed;
  if (filters.discipline) where.discipline = filters.discipline;

  let horses = await prisma.horse.findMany({
    where,
    include: { photos: { orderBy: { sortOrder: "asc" }, take: 1 }, owner: true },
  });

  if (filters.maxDistanceMiles != null) {
    const origin = viewerHorses.find((h) => h.lat != null && h.lng != null);
    if (!origin) return [];
    horses = horses.filter(
      (h) => h.lat != null && h.lng != null &&
        haversineMiles(origin.lat!, origin.lng!, h.lat, h.lng) <= filters.maxDistanceMiles!,
    );
  }
  return horses;
}

import type { SwipeDirection } from "./constants";

export async function recordSwipe(
  swiperUserId: string,
  horseId: string,
  direction: SwipeDirection,
): Promise<{ matched: boolean; matchId: string | null }> {
  return prisma.$transaction(async (tx) => {
    const horse = await tx.horse.findUnique({ where: { id: horseId } });
    if (!horse) throw new Error("Horse not found");
    if (horse.ownerId === swiperUserId) throw new Error("Cannot swipe your own horse");

    await tx.swipe.upsert({
      where: { swiperUserId_horseId: { swiperUserId, horseId } },
      create: { swiperUserId, horseId, direction },
      update: { direction },
    });

    if (direction !== "LIKE") return { matched: false, matchId: null };

    const reciprocal = await tx.swipe.findFirst({
      where: { direction: "LIKE", swiperUserId: horse.ownerId, horse: { ownerId: swiperUserId } },
    });
    if (!reciprocal) return { matched: false, matchId: null };

    const [userAId, userBId] = [swiperUserId, horse.ownerId].sort();
    const existing = await tx.match.findUnique({ where: { userAId_userBId: { userAId, userBId } } });
    if (existing) return { matched: true, matchId: existing.id };

    const match = await tx.match.create({ data: { userAId, userBId } });
    return { matched: true, matchId: match.id };
  });
}
