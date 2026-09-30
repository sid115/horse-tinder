"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Photo = { id: string; path: string; isPrimary: boolean };

export default function PhotoManager({ horseId, photos }: { horseId: string; photos: Photo[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    setBusy(true);
    const body = new FormData();
    body.set("horseId", horseId);
    body.set("file", file);
    const res = await fetch("/api/upload", { method: "POST", body });
    setBusy(false);
    if (!res.ok) { alert((await res.json()).error ?? "Upload failed"); return; }
    router.refresh();
  }

  async function primary(photoId: string) {
    await fetch(`/api/photo/${photoId}/primary`, { method: "POST" });
    router.refresh();
  }
  async function remove(photoId: string) {
    await fetch(`/api/photo/${photoId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <input type="file" accept="image/jpeg,image/png,image/webp"
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} disabled={busy} />
      <div className="grid grid-cols-3 gap-3">
        {photos.map((p) => (
          <div key={p.id} className="space-y-1">
            <img src={p.path} alt="" className="h-28 w-full rounded object-cover" />
            <div className="flex gap-2 text-xs">
              <button onClick={() => primary(p.id)} disabled={p.isPrimary} className="text-emerald-400 disabled:text-neutral-600">
                {p.isPrimary ? "Primary" : "Make primary"}
              </button>
              <button onClick={() => remove(p.id)} className="text-red-400">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
