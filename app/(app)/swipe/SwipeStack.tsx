"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { swipe } from "./actions";
import { DISCIPLINE_LABELS, type Discipline } from "@/lib/constants";
import { ageFromDob, formatHands } from "@/lib/format";

export type Card = {
  id: string; name: string; breedName: string; sex: string; dob: string;
  heightHands: number | null; discipline: string; location: string | null;
  studFee: number | null; breedHistory: string | null; sireName: string | null;
  damName: string | null; allergies: string | null; healthIssues: string | null;
  temperament: string | null; photo: string | null; ownerName: string;
};

export default function SwipeStack({ cards }: { cards: Card[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [matchedId, setMatchedId] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const card = cards[index];

  function act(direction: "LIKE" | "PASS") {
    if (!card) return;
    start(async () => {
      const res = await swipe(card.id, direction);
      if (res.matched && res.matchId) setMatchedId(res.matchId);
      setExpanded(false);
      setIndex((i) => i + 1);
      router.refresh();
    });
  }

  if (!card) {
    return <p className="text-neutral-400">No more horses. <Link href="/horses" className="text-emerald-400">Add or activate a horse</Link> to see compatible matches.</p>;
  }

  return (
    <div className="space-y-4">
      {matchedId && (
        <div className="rounded bg-emerald-900/60 p-3 text-center">
          <p className="font-bold">It&apos;s a match! 🐴</p>
          <Link href={`/matches/${matchedId}`} className="text-sm text-emerald-300">Send a message</Link>
        </div>
      )}
      <div className="overflow-hidden rounded-xl border border-neutral-800">
        {card.photo
          ? <img src={card.photo} alt={card.name} className="h-72 w-full object-cover" />
          : <div className="flex h-72 items-center justify-center bg-neutral-800 text-neutral-500">No photo</div>}
        <div className="space-y-1 p-4">
          <h2 className="text-lg font-bold">{card.name} · {card.sex}</h2>
          <p className="text-sm text-neutral-400">
            {card.breedName} · {ageFromDob(new Date(card.dob))}y · {formatHands(card.heightHands)} ·{" "}
            {DISCIPLINE_LABELS[card.discipline as Discipline] ?? card.discipline}
          </p>
          <p className="text-sm text-neutral-400">{card.location ?? "Location unknown"}{card.studFee ? ` · $${card.studFee} stud fee` : ""}</p>
          <button onClick={() => setExpanded((e) => !e)} className="text-xs text-emerald-400">
            {expanded ? "Hide details" : "Show full profile"}
          </button>
          {expanded && (
            <dl className="mt-2 space-y-1 text-sm text-neutral-300">
              <div><dt className="font-semibold">Owner</dt><dd>{card.ownerName}</dd></div>
              <div><dt className="font-semibold">Breed history</dt><dd>{card.breedHistory ?? "—"}</dd></div>
              <div><dt className="font-semibold">Sire / Dam</dt><dd>{card.sireName ?? "—"} / {card.damName ?? "—"}</dd></div>
              <div><dt className="font-semibold">Temperament</dt><dd>{card.temperament ?? "—"}</dd></div>
              <div><dt className="font-semibold">Allergies</dt><dd>{card.allergies ?? "—"}</dd></div>
              <div><dt className="font-semibold">Health issues</dt><dd>{card.healthIssues ?? "—"}</dd></div>
            </dl>
          )}
        </div>
      </div>
      <div className="flex justify-center gap-6">
        <button onClick={() => act("PASS")} disabled={pending} className="rounded-full bg-neutral-700 px-8 py-3 text-lg">✕</button>
        <button onClick={() => act("LIKE")} disabled={pending} className="rounded-full bg-emerald-600 px-8 py-3 text-lg">♥</button>
      </div>
    </div>
  );
}
