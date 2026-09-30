"use client";
import { DISCIPLINES, DISCIPLINE_LABELS, SEXES } from "@/lib/constants";

type Horse = Record<string, unknown> & { id?: string };

export default function HorseForm({
  horse, action,
}: { horse?: Horse; action: (form: FormData) => void | Promise<void> }) {
  const v = (k: string) => (horse?.[k] == null ? "" : String(horse[k]));
  const dob = horse?.dob ? new Date(horse.dob as string).toISOString().slice(0, 10) : "";
  const field = "w-full rounded bg-neutral-800 px-3 py-2";
  return (
    <form action={action} className="grid grid-cols-2 gap-3">
      <label className="col-span-2 text-sm">Name<input name="name" defaultValue={v("name")} required className={field} /></label>
      <label className="text-sm">Sex<select name="sex" defaultValue={v("sex") || "MARE"} className={field}>{SEXES.map((s) => <option key={s}>{s}</option>)}</select></label>
      <label className="text-sm">Date of birth<input type="date" name="dob" defaultValue={dob} required className={field} /></label>
      <label className="text-sm">Breed name<input name="breedName" defaultValue={v("breedName")} required className={field} /></label>
      <label className="text-sm">Discipline<select name="discipline" defaultValue={v("discipline") || "OTHER"} className={field}>{DISCIPLINES.map((d) => <option key={d} value={d}>{DISCIPLINE_LABELS[d]}</option>)}</select></label>
      <label className="text-sm">Height (hands)<input name="heightHands" type="number" step="0.1" defaultValue={v("heightHands")} className={field} /></label>
      <label className="text-sm">Color<input name="color" defaultValue={v("color")} className={field} /></label>
      <label className="text-sm">Markings<input name="markings" defaultValue={v("markings")} className={field} /></label>
      <label className="text-sm">Registration #<input name="registrationNumber" defaultValue={v("registrationNumber")} className={field} /></label>
      <label className="text-sm">Sire<input name="sireName" defaultValue={v("sireName")} className={field} /></label>
      <label className="text-sm">Dam<input name="damName" defaultValue={v("damName")} className={field} /></label>
      <label className="text-sm">Stud fee (USD)<input name="studFee" type="number" defaultValue={v("studFee")} className={field} /></label>
      <label className="text-sm">Location<input name="location" defaultValue={v("location")} className={field} /></label>
      <label className="text-sm">Latitude<input name="lat" type="number" step="any" defaultValue={v("lat")} className={field} /></label>
      <label className="text-sm">Longitude<input name="lng" type="number" step="any" defaultValue={v("lng")} className={field} /></label>
      <label className="col-span-2 text-sm">Breed history<textarea name="breedHistory" defaultValue={v("breedHistory")} className={field} /></label>
      <label className="col-span-2 text-sm">Temperament<textarea name="temperament" defaultValue={v("temperament")} className={field} /></label>
      <label className="col-span-2 text-sm">Allergies / known health issues<textarea name="allergies" defaultValue={v("allergies")} className={field} /></label>
      <label className="col-span-2 text-sm">Other health issues<textarea name="healthIssues" defaultValue={v("healthIssues")} className={field} /></label>
      <label className="col-span-2 text-sm">Breeding terms<textarea name="breedingTerms" defaultValue={v("breedingTerms")} className={field} /></label>
      <button className="col-span-2 rounded bg-emerald-600 px-3 py-2 font-semibold">Save</button>
    </form>
  );
}
