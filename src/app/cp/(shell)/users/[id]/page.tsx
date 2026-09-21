import { notFound } from "next/navigation";
import { requireCpPermission, CP_PERMISSIONS } from "@/lib/cp/rbac";
import { getUserForEdit } from "@/lib/cp/users/usersRepository";
import { prisma } from "@/lib/prisma";
import { updateUserAction } from "../actions";
import {
  listUserOrganiserEvents,
  listEventsForOrganiserPicker,
} from "@/lib/cp/events/organisersRepository";
import { revokeOrganiserAction } from "../../events/organiserActions";
import { OrganiserGrantForm } from "@/components/cp/OrganiserGrantForm";

const FIELD_CLASS =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-brand-pink focus:outline-none transition-colors";
const LABEL_CLASS = "text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500";

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireCpPermission(CP_PERMISSIONS.USERS_EDIT);
  // Granting organiser access is an EVENT change, so it carries the events permission even
  // here — otherwise this page would be a way around it.
  const canEditEvents = session.perms.includes(CP_PERMISSIONS.EVENTS_EDIT);
  const { id } = await params;
  const userId = Number(id);

  const [user, allGroups, organiserEvents, pickerEvents] = await Promise.all([
    getUserForEdit(userId),
    prisma.find_users_groups.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    listUserOrganiserEvents(userId),
    listEventsForOrganiserPicker(),
  ]);
  if (!user) notFound();

  const updateWithId = updateUserAction.bind(null, userId);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-black uppercase tracking-wider text-white">Edit User</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {user.login} &middot; find_users.id={user.id} &middot; status: {user.user_status}
        </p>
      </div>

      <form action={updateWithId} className="space-y-5 rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className={LABEL_CLASS}>First Name</label>
            <input name="user_first_name" defaultValue={user.user_first_name} className={FIELD_CLASS} />
          </div>
          <div className="space-y-2">
            <label className={LABEL_CLASS}>Last Name</label>
            <input name="user_last_name" defaultValue={user.user_last_name} className={FIELD_CLASS} />
          </div>
        </div>

        <div className="space-y-2">
          <label className={LABEL_CLASS}>Email</label>
          <input name="user_email" type="email" defaultValue={user.user_email} className={FIELD_CLASS} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className={LABEL_CLASS}>Phone</label>
            <input name="user_phone" defaultValue={user.user_phone} className={FIELD_CLASS} />
          </div>
          <div className="space-y-2">
            <label className={LABEL_CLASS}>Organization</label>
            <input name="user_organization" defaultValue={user.user_organization} className={FIELD_CLASS} />
          </div>
        </div>

        <div className="space-y-2">
          <label className={LABEL_CLASS}>Role(s)</label>
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/5 p-4">
            {allGroups.map((group) => (
              <label key={group.id} className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  name="groupIds"
                  value={group.id}
                  defaultChecked={user.groupIds.includes(group.id)}
                  className="rounded border-white/20 bg-transparent"
                />
                {group.name}
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end border-t border-white/5 pt-6">
          <button
            type="submit"
            className="rounded-full bg-brand-pink px-10 py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-brand-pink/20 transition hover:scale-[1.02] active:scale-95"
          >
            Save
          </button>
        </div>
      </form>

      <section className="space-y-4 rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider text-zinc-300">Event Roles</h2>
          <p className="mt-1 max-w-2xl text-xs text-zinc-500">
            Separate from the Role(s) above. Those are ADMIN CP permissions; these decide what the
            member portal shows this person at{" "}
            <code className="text-zinc-400">/members/user_event_summary</code> — organiser instead of
            visitor. Owned events come from <code className="text-zinc-400">find_events.user_id</code>{" "}
            and can&apos;t be revoked here.
          </p>
        </div>

        <ul className="divide-y divide-white/5 rounded-xl border border-white/10">
          {organiserEvents.length === 0 && (
            <li className="px-4 py-6 text-center text-xs text-zinc-600">
              Not an organiser of any event — the member portal will show this account as a visitor.
            </li>
          )}
          {organiserEvents.map((e) => (
            <li key={e.eventId} className="flex items-center gap-4 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{e.title}</p>
                <p className="truncate text-xs text-zinc-500">find_events.id={e.eventId}</p>
              </div>
              {e.isOwner ? (
                <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase text-amber-400">
                  Owner
                </span>
              ) : (
                <>
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase text-emerald-400">
                    Organiser
                  </span>
                  {canEditEvents && (
                    <form action={revokeOrganiserAction.bind(null, e.eventId, userId)}>
                      <button type="submit" className="text-xs font-bold text-zinc-400 hover:text-white">
                        Revoke
                      </button>
                    </form>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>

        {canEditEvents ? (
          <OrganiserGrantForm
            eventOptions={pickerEvents.map((e) => ({ id: e.id, title: e.title }))}
            fixedUser={{ id: user.id, label: user.login }}
          />
        ) : (
          <p className="text-xs text-zinc-600">
            You need the events edit permission to change who organises an event.
          </p>
        )}
      </section>
    </div>
  );
}
