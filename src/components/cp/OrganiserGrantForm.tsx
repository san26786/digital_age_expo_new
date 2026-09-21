"use client";

import { useActionState } from "react";
import { grantOrganiserAction } from "@/app/cp/(shell)/events/organiserActions";
import { EMPTY_ORGANISER_STATE } from "@/app/cp/(shell)/events/organiserActionState";

const FIELD_CLASS =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-brand-pink focus:outline-none transition-colors";
const LABEL_CLASS = "text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500";

/**
 * The "make someone an organiser" form, shared by the event screen and the user screen.
 *
 * One component with two shapes rather than two components, because the only real difference is
 * which half of the (event, user) pair is already known:
 *
 *   - On /cp/events/[id] the event is fixed and the admin says WHO      -> pass `eventId`.
 *   - On /cp/users/[id]  the user is fixed and the admin says WHICH EVENT -> pass `fixedUser`
 *                                                                           and `eventOptions`.
 *
 * Both post the same two fields to the same action, so the two screens cannot end up meaning
 * different things by "grant".
 */
export function OrganiserGrantForm({
  eventId,
  eventOptions,
  fixedUser,
}: {
  /** Fixed event — event screen. Ignored when `eventOptions` is supplied. */
  eventId?: number;
  /** Selectable events — user screen. */
  eventOptions?: { id: number; title: string }[];
  /** Fixed user — user screen. When absent the admin types an identifier instead. */
  fixedUser?: { id: number; label: string };
}) {
  const [state, formAction, pending] = useActionState(grantOrganiserAction, EMPTY_ORGANISER_STATE);

  return (
    <form action={formAction} className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        {eventOptions ? (
          <div className="flex-1 space-y-2">
            <label className={LABEL_CLASS}>Event</label>
            <select name="eventId" className={FIELD_CLASS} defaultValue="">
              <option value="" className="bg-zinc-900">
                Select an event…
              </option>
              {eventOptions.map((e) => (
                <option key={e.id} value={e.id} className="bg-zinc-900">
                  {e.title} (#{e.id})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <input type="hidden" name="eventId" value={eventId ?? ""} />
        )}

        {fixedUser ? (
          <input type="hidden" name="user" value={fixedUser.id} />
        ) : (
          <div className="flex-1 space-y-2">
            <label className={LABEL_CLASS}>User</label>
            <input
              name="user"
              placeholder="Username, email, or user ID"
              className={FIELD_CLASS}
              autoComplete="off"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="whitespace-nowrap rounded-full bg-brand-pink px-8 py-3 text-[11px] font-black uppercase tracking-widest text-white shadow-lg shadow-brand-pink/20 transition hover:scale-[1.02] active:scale-95 disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add Organiser"}
        </button>
      </div>

      {state.error && (
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-xs text-red-300">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-300">
          {state.success}
        </p>
      )}
    </form>
  );
}
