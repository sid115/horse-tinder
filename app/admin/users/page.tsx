import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createUser, setUserDisabled, deleteUser } from "../actions";

export default async function AdminUsersPage() {
  await requireAdmin();
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
  const field = "rounded bg-neutral-800 px-3 py-2";
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Users</h1>
      <form action={async (formData) => { await createUser(formData); }} className="grid grid-cols-2 gap-3">
        <input name="username" placeholder="Username" required className={field} />
        <input name="password" type="password" placeholder="Password (≥8)" required className={field} />
        <input name="displayName" placeholder="Display name" className={field} />
        <input name="email" type="email" placeholder="Email" className={field} />
        <select name="role" className={field}><option value="USER">USER</option><option value="ADMIN">ADMIN</option></select>
        <button className="rounded bg-emerald-600 px-3 py-2">Create user</button>
      </form>
      <ul className="divide-y divide-neutral-800">
        {users.map((u) => (
          <li key={u.id} className="flex items-center justify-between py-3">
            <span>{u.username} <span className="text-neutral-500">({u.role}{u.disabled ? ", disabled" : ""})</span></span>
            <span className="flex gap-2 text-sm">
              <form action={setUserDisabled.bind(null, u.id, !u.disabled)}>
                <button className="text-neutral-300">{u.disabled ? "Enable" : "Disable"}</button>
              </form>
              <form action={deleteUser.bind(null, u.id)}><button className="text-red-400">Delete</button></form>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
