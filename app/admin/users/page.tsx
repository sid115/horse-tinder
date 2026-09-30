import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { setUserDisabled } from "../actions";
import CreateUserForm from "../CreateUserForm";
import ResetPasswordForm from "../ResetPasswordForm";
import DeleteUserButton from "../DeleteUserButton";

export default async function AdminUsersPage() {
  await requireAdmin();
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Users</h1>
      <CreateUserForm />
      <ul className="divide-y divide-neutral-800">
        {users.map((u) => (
          <li key={u.id} className="space-y-2 py-3">
            <div className="flex items-center justify-between">
              <span>{u.username} <span className="text-neutral-500">({u.role}{u.disabled ? ", disabled" : ""})</span></span>
              <span className="flex gap-2 text-sm">
                <form action={setUserDisabled.bind(null, u.id, !u.disabled)}>
                  <button className="text-neutral-300">{u.disabled ? "Enable" : "Disable"}</button>
                </form>
                <DeleteUserButton userId={u.id} />
              </span>
            </div>
            <ResetPasswordForm userId={u.id} />
          </li>
        ))}
      </ul>
    </div>
  );
}
