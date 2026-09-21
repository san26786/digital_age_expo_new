import { notFound } from "next/navigation";
import { requireCpPermission, CP_PERMISSIONS } from "@/lib/cp/rbac";
import { getEventForEdit, getActiveEventId } from "@/lib/cp/events/eventsRepository";
import { updateEventAction, setEventStatusAction, setActiveEventAction } from "../actions";
import { DuplicateEventForm } from "./DuplicateEventForm";
import { listEventOrganisers } from "@/lib/cp/events/organisersRepository";
import { revokeOrganiserAction } from "../organiserActions";
import { OrganiserGrantForm } from "@/components/cp/OrganiserGrantForm";

const FIELD_CLASS =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-brand-pink focus:outline-none transition-colors";
const LABEL_CLASS = "text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500";

function toDateInputValue(date: Date | null | undefined): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireCpPermission(CP_PERMISSIONS.EVENTS_VIEW);
  const canEdit = session.perms.includes(CP_PERMISSIONS.EVENTS_EDIT);
  const { id } = await params;
  const eventId = Number(id);

  const [event, activeEventId, organisers] = await Promise.all([
    getEventForEdit(eventId),
    getActiveEventId(),
    listEventOrganisers(eventId),
  ]);
  if (!event) notFound();

  const updateWithId = updateEventAction.bind(null, eventId);
  const statusWithId = setEventStatusAction.bind(null, eventId);
  const activateWithId = setActiveEventAction.bind(null, eventId);
  const isActive = activeEventId === eventId;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-black uppercase tracking-wider text-white">{event.title}</h1>
        <p className="mt-1 text-sm text-zinc-500">find_events.id={event.id}</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-zinc-300">Active Event</h2>
            <p className="mt-1 max-w-xl text-xs text-zinc-500">
              {isActive
                ? "This is the site-wide active event — the public/member site's getDomain() resolves this event's data everywhere."
                : "Marking this active changes what the ENTIRE public/member site shows — getDomain() (src/lib/services/domain.ts) resolves"}
              {!isActive && " event_id from this exact setting."} Falls back to{" "}
              <code className="text-zinc-400">DEFAULT_EVENT_ID</code> in <code className="text-zinc-400">src/lib/site-config.ts</code>{" "}
              only if this setting is ever unset or unreadable. The same setting can also be changed from{" "}
              <code className="text-zinc-400">General Settings</code>&apos;s Event dropdown — both write here.
            </p>
          </div>
          {canEdit && !isActive && (
            <form action={activateWithId}>
              <button
                type="submit"
                className="whitespace-nowrap rounded-full bg-brand-pink px-6 py-2.5 text-[11px] font-black uppercase tracking-widest text-white shadow-lg shadow-brand-pink/20"
              >
                Mark Active
              </button>
            </form>
          )}
        </div>
      </div>

      <form action={updateWithId} className="space-y-5 rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className={LABEL_CLASS}>Title</label>
            <input name="title" defaultValue={event.title} disabled={!canEdit} className={FIELD_CLASS} />
          </div>
          <div className="space-y-2">
            <label className={LABEL_CLASS}>Subtitle</label>
            <input name="subtitle" defaultValue={event.subtitle} disabled={!canEdit} className={FIELD_CLASS} />
          </div>
        </div>

        <div className="space-y-2">
          <label className={LABEL_CLASS}>Friendly URL</label>
          <input name="friendly_url" defaultValue={event.friendly_url} disabled={!canEdit} className={FIELD_CLASS} />
        </div>

        <div className="space-y-2">
          <label className={LABEL_CLASS}>Short Description</label>
          <textarea name="description_short" defaultValue={event.description_short} disabled={!canEdit} rows={2} className={FIELD_CLASS} />
        </div>
        <div className="space-y-2">
          <label className={LABEL_CLASS}>Full Description</label>
          <textarea name="description" defaultValue={event.description} disabled={!canEdit} rows={5} className={FIELD_CLASS} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className={LABEL_CLASS}>Venue</label>
            <input name="venue" defaultValue={event.venue} disabled={!canEdit} className={FIELD_CLASS} />
          </div>
          <div className="space-y-2">
            <label className={LABEL_CLASS}>Location</label>
            <input name="location" defaultValue={event.location} disabled={!canEdit} className={FIELD_CLASS} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className={LABEL_CLASS}>Start Date</label>
            <input type="date" name="date_start" defaultValue={toDateInputValue(event.date_start)} disabled={!canEdit} className={FIELD_CLASS} />
          </div>
          <div className="space-y-2">
            <label className={LABEL_CLASS}>End Date</label>
            <input type="date" name="date_end" defaultValue={toDateInputValue(event.date_end)} disabled={!canEdit} className={FIELD_CLASS} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className={LABEL_CLASS}>Contact Name</label>
            <input name="contact_name" defaultValue={event.contact_name} disabled={!canEdit} className={FIELD_CLASS} />
          </div>
          <div className="space-y-2">
            <label className={LABEL_CLASS}>Email</label>
            <input name="email" defaultValue={event.email} disabled={!canEdit} className={FIELD_CLASS} />
          </div>
          <div className="space-y-2">
            <label className={LABEL_CLASS}>Phone</label>
            <input name="phone" defaultValue={event.phone} disabled={!canEdit} className={FIELD_CLASS} />
          </div>
        </div>

        <div className="space-y-2">
          <label className={LABEL_CLASS}>Website</label>
          <input name="website" defaultValue={event.website} disabled={!canEdit} className={FIELD_CLASS} />
        </div>

        {canEdit && (
          <div className="flex justify-end border-t border-white/5 pt-6">
            <button
              type="submit"
              className="rounded-full bg-brand-pink px-10 py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-brand-pink/20 transition hover:scale-[1.02] active:scale-95"
            >
              Save
            </button>
          </div>
        )}
      </form>

      {canEdit && (
        <form action={statusWithId} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
          <label className={LABEL_CLASS}>Status</label>
          <input name="status" defaultValue={event.status} className={`${FIELD_CLASS} max-w-xs`} />
          <span className="text-xs text-zinc-600">Free text — matches whatever your existing events use (e.g. active, pending, archived).</span>
          <button
            type="submit"
            className="ml-auto whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-6 py-2.5 text-[11px] font-black uppercase tracking-widest text-zinc-300 hover:bg-white/10 hover:text-white"
          >
            Update Status
          </button>
        </form>
      )}

      <section className="space-y-4 rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider text-zinc-300">Organisers</h2>
          <p className="mt-1 max-w-2xl text-xs text-zinc-500">
            Who the member portal treats as an organiser of this event — these accounts get the
            organiser view at <code className="text-zinc-400">/members/user_event_summary</code> instead
            of the visitor one. The owner comes from <code className="text-zinc-400">find_events.user_id</code>{" "}
            and can&apos;t be removed here; everyone else is a team row and can.
          </p>
        </div>

        <ul className="divide-y divide-white/5 rounded-xl border border-white/10">
          {organisers.length === 0 && (
            <li className="px-4 py-6 text-center text-xs text-zinc-600">
              No organisers yet — this event has no owner and no organiser team rows.
            </li>
          )}
          {organisers.map((o) => (
            <li key={`${o.userId}-${o.memberRowId ?? "owner"}`} className="flex items-center gap-4 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{o.name}</p>
                <p className="truncate text-xs text-zinc-500">
                  {o.email || "—"} &middot; find_users.id={o.userId}
                </p>
              </div>
              {o.isOwner ? (
                <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase text-amber-400">
                  Owner
                </span>
              ) : (
                <>
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase text-emerald-400">
                    {o.joiningStatus ?? "Active"}
                  </span>
                  {canEdit && (
                    <form action={revokeOrganiserAction.bind(null, eventId, o.userId)}>
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

        {canEdit && <OrganiserGrantForm eventId={eventId} />}
      </section>

      {canEdit && <DuplicateEventForm sourceEventId={eventId} />}
    </div>
  );
}
