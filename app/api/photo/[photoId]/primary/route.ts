import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
export async function POST(_req: NextRequest, { params }: { params: Promise<{ photoId: string }> }) {
  const session = await requireUser();
  const { photoId } = await params;
  const photo = await prisma.photo.findUnique({ where: { id: photoId }, include: { horse: true } });
  if (!photo || (photo.horse.ownerId !== session.userId && session.role !== "ADMIN"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.$transaction([
    prisma.photo.updateMany({ where: { horseId: photo.horseId }, data: { isPrimary: false } }),
    prisma.photo.update({ where: { id: photoId }, data: { isPrimary: true } }),
  ]);
  return NextResponse.json({ ok: true });
}
