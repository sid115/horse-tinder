export function ageFromDob(dob: Date, now: Date = new Date()): number {
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return Math.max(age, 0);
}

export function formatHands(h: number | null): string {
  if (h == null) return "—";
  const whole = Math.floor(h);
  const inches = Math.round((h - whole) * 12);
  return `${whole}.${inches} hh`;
}
