import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ photoId: string }> }) {
  const session = await requireUser();
  const { photoId } = await params;
  const photo = await prisma.photo.findUnique({ where: { id: photoId }, include: { horse: true } });
  if (!photo || (photo.horse.ownerId !== session.userId && session.role !== "ADMIN"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.photo.delete({ where: { id: photoId } });
  return NextResponse.json({ ok: true });
}
