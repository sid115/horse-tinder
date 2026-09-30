"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

function parseForm(form: FormData) {
  const num = (k: string) => { const v = String(form.get(k) ?? "").trim(); return v ? Number(v) : null; };
  const str = (k: string) => { const v = String(form.get(k) ?? "").trim(); return v || null; };
  return {
    name: String(form.get("name") ?? "").trim(),
    sex: String(form.get("sex") ?? "MARE"),
    dob: new Date(String(form.get("dob") ?? "")),
    breedName: String(form.get("breedName") ?? "").trim(),
    breedHistory: str("breedHistory"),
    heightHands: num("heightHands"),
    color: str("color"),
    markings: str("markings"),
    discipline: String(form.get("discipline") ?? "OTHER"),
    temperament: str("temperament"),
    registrationNumber: str("registrationNumber"),
    sireName: str("sireName"),
    damName: str("damName"),
    allergies: str("allergies"),
    healthIssues: str("healthIssues"),
    location: str("location"),
    lat: num("lat"),
    lng: num("lng"),
    studFee: num("studFee"),
    breedingTerms: str("breedingTerms"),
  };
}

export async function createHorse(form: FormData) {
  const session = await requireUser();
  const horse = await prisma.horse.create({ data: { ...parseForm(form), ownerId: session.userId } });
  redirect(`/horses/${horse.id}/edit`);
}

export async function updateHorse(horseId: string, form: FormData) {
  const session = await requireUser();
  const horse = await prisma.horse.findUnique({ where: { id: horseId } });
  if (!horse || (horse.ownerId !== session.userId && session.role !== "ADMIN")) throw new Error("Forbidden");
  await prisma.horse.update({ where: { id: horseId }, data: parseForm(form) });
  revalidatePath(`/horses/${horseId}/edit`);
  revalidatePath("/horses");
}

export async function toggleHorseActive(horseId: string) {
  const session = await requireUser();
  const horse = await prisma.horse.findUnique({ where: { id: horseId } });
  if (!horse || (horse.ownerId !== session.userId && session.role !== "ADMIN")) throw new Error("Forbidden");
  await prisma.horse.update({ where: { id: horseId }, data: { active: !horse.active } });
  revalidatePath("/horses");
}

export async function deleteHorse(horseId: string) {
  const session = await requireUser();
  const horse = await prisma.horse.findUnique({ where: { id: horseId } });
  if (!horse || (horse.ownerId !== session.userId && session.role !== "ADMIN")) throw new Error("Forbidden");
  await prisma.horse.delete({ where: { id: horseId } });
  revalidatePath("/horses");
  redirect("/horses");
}

export async function setPrimaryPhoto(horseId: string, photoId: string) {
  const session = await requireUser();
  const photo = await prisma.photo.findUnique({ where: { id: photoId }, include: { horse: true } });
  if (!photo || photo.horseId !== horseId || (photo.horse.ownerId !== session.userId && session.role !== "ADMIN"))
    throw new Error("Forbidden");
  await prisma.$transaction([
    prisma.photo.updateMany({ where: { horseId }, data: { isPrimary: false } }),
    prisma.photo.update({ where: { id: photoId }, data: { isPrimary: true } }),
  ]);
  revalidatePath(`/horses/${horseId}/edit`);
}

export async function deletePhoto(horseId: string, photoId: string) {
  const session = await requireUser();
  const photo = await prisma.photo.findUnique({ where: { id: photoId }, include: { horse: true } });
  if (!photo || photo.horseId !== horseId || (photo.horse.ownerId !== session.userId && session.role !== "ADMIN"))
    throw new Error("Forbidden");
  await prisma.photo.delete({ where: { id: photoId } });
  revalidatePath(`/horses/${horseId}/edit`);
}
