export const ROLES = ["ADMIN", "USER"] as const;
export type Role = (typeof ROLES)[number];

export const SEXES = ["STALLION", "MARE", "GELDING"] as const;
export type Sex = (typeof SEXES)[number];

export const DISCIPLINES = [
  "DRESSAGE", "SHOW_JUMPING", "EVENTING", "WESTERN", "RACING", "TRAIL", "PLEASURE", "DRIVING", "OTHER",
] as const;
export type Discipline = (typeof DISCIPLINES)[number];

export const SWIPE_DIRECTIONS = ["LIKE", "PASS"] as const;
export type SwipeDirection = (typeof SWIPE_DIRECTIONS)[number];

export const DISCIPLINE_LABELS: Record<Discipline, string> = {
  DRESSAGE: "Dressage", SHOW_JUMPING: "Show Jumping", EVENTING: "Eventing",
  WESTERN: "Western", RACING: "Racing", TRAIL: "Trail", PLEASURE: "Pleasure",
  DRIVING: "Driving", OTHER: "Other",
};
