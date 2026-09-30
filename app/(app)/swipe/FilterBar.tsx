"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { DISCIPLINES, DISCIPLINE_LABELS } from "@/lib/constants";

export default function FilterBar() {
  const router = useRouter();
  const sp = useSearchParams();
  const field = "rounded bg-neutral-800 px-2 py-1 text-sm";

  function set(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value); else params.delete(key);
    router.push(`/swipe?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <input placeholder="Breed" defaultValue={sp.get("breed") ?? ""} className={field}
        onBlur={(e) => set("breed", e.target.value)} />
      <select defaultValue={sp.get("discipline") ?? ""} className={field} onChange={(e) => set("discipline", e.target.value)}>
        <option value="">Any discipline</option>
        {DISCIPLINES.map((d) => <option key={d} value={d}>{DISCIPLINE_LABELS[d]}</option>)}
      </select>
      <input placeholder="Max miles" type="number" defaultValue={sp.get("maxDistanceMiles") ?? ""} className={field}
        onBlur={(e) => set("maxDistanceMiles", e.target.value)} />
    </div>
  );
}
