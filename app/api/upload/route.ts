import { NextResponse, type NextRequest } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const session = await requireUser();
  const form = await req.formData();
  const horseId = String(form.get("horseId") ?? "");
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: "Unsupported type" }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ error: "File too large" }, { status: 400 });

  const horse = await prisma.horse.findUnique({ where: { id: horseId } });
  if (!horse) return NextResponse.json({ error: "Horse not found" }, { status: 404 });
  if (horse.ownerId !== session.userId && session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", horseId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, safe), Buffer.from(await file.arrayBuffer()));

  const count = await prisma.photo.count({ where: { horseId } });
  await prisma.photo.create({
    data: { horseId, path: `/uploads/${horseId}/${safe}`, sortOrder: count, isPrimary: count === 0 },
  });

  return NextResponse.json({ path: `/uploads/${horseId}/${safe}` });
}
