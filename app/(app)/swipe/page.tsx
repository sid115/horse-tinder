import { requireUser } from "@/lib/auth";
import { getStackForUser } from "@/lib/matching";
import FilterBar from "./FilterBar";
import SwipeStack from "./SwipeStack";

type Search = { breed?: string; discipline?: string; maxDistanceMiles?: string };

export default async function SwipePage({ searchParams }: { searchParams: Promise<Search> }) {
  const session = await requireUser();
  const sp = await searchParams;
  const horses = await getStackForUser(session.userId, {
    breed: sp.breed || undefined,
    discipline: sp.discipline || undefined,
    maxDistanceMiles: sp.maxDistanceMiles ? Number(sp.maxDistanceMiles) : undefined,
  });

  const cards = horses.map((h) => ({
    id: h.id,
    name: h.name,
    breedName: h.breedName,
    sex: h.sex,
    dob: h.dob.toISOString(),
    heightHands: h.heightHands,
    discipline: h.discipline,
    location: h.location,
    studFee: h.studFee,
    breedHistory: h.breedHistory,
    sireName: h.sireName,
    damName: h.damName,
    allergies: h.allergies,
    healthIssues: h.healthIssues,
    temperament: h.temperament,
    photo: h.photos[0]?.path ?? null,
    ownerName: h.owner.displayName,
  }));

  return (
    <div className="space-y-4">
      <FilterBar />
      <SwipeStack cards={cards} />
    </div>
  );
}
