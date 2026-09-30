"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { recordSwipe } from "@/lib/matching";
import type { SwipeDirection } from "@/lib/constants";

export async function swipe(horseId: string, direction: SwipeDirection) {
  const session = await requireUser();
  const result = await recordSwipe(session.userId, horseId, direction);
  revalidatePath("/swipe");
  return result;
}
