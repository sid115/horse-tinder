import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import HorseForm from "../../HorseForm";
import PhotoManager from "../../PhotoManager";
import { updateHorse, deleteHorse, toggleHorseActive } from "../../actions";

export default async function EditHorsePage({ params }: { params: Promise<{ horseId: string }> }) {
  const session = await requireUser();
  const { horseId } = await params;
  const horse = await prisma.horse.findUnique({ where: { id: horseId }, include: { photos: { orderBy: { sortOrder: "asc" } } } });
  if (!horse || (horse.ownerId !== session.userId && session.role !== "ADMIN")) notFound();

  const update = updateHorse.bind(null, horseId);
  const toggle = toggleHorseActive.bind(null, horseId);
  const remove = deleteHorse.bind(null, horseId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Edit {horse.name}</h1>
        <div className="flex gap-2">
          <form action={toggle}><button className="text-sm text-neutral-300">{horse.active ? "Deactivate" : "Activate"}</button></form>
          <form action={remove}><button className="text-sm text-red-400">Delete</button></form>
        </div>
      </div>
      <section className="space-y-2"><h2 className="font-semibold">Photos</h2>
        <PhotoManager horseId={horse.id} photos={horse.photos} /></section>
      <HorseForm horse={horse} action={update} />
    </div>
  );
}
