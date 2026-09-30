import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { updateProfile } from "./actions";
import PasswordForm from "./PasswordForm";

export default async function ProfilePage() {
  const session = await requireUser();
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return null;
  const field = "w-full rounded bg-neutral-800 px-3 py-2";

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-xl font-bold">Profile</h1>
        <form action={updateProfile} className="space-y-3">
          <label className="block text-sm">Display name<input name="displayName" defaultValue={user.displayName} className={field} /></label>
          <label className="block text-sm">Email<input name="email" type="email" defaultValue={user.email ?? ""} className={field} /></label>
          <label className="block text-sm">Phone<input name="phone" defaultValue={user.phone ?? ""} className={field} /></label>
          <button className="rounded bg-emerald-600 px-3 py-2">Save profile</button>
        </form>
      </section>
      <section className="space-y-3">
        <h2 className="font-semibold">Change password</h2>
        <PasswordForm />
      </section>
    </div>
  );
}
