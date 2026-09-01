import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { getDomain } from "@/lib/services/domain";
import { getEventMemberContext, roleLabel } from "@/lib/services/eventAccess";
import EventAdminNavbar from "@/components/EventAdminNavbar";
import { DEFAULT_EVENT_ID } from "@/lib/site-config";

/**
 * Route group (no URL segment) for every event-scoped member page — keeps URLs matching the
 * legacy PHP paths exactly (/members/event_member, /members/event_show_info, ...) while sharing
 * one auth gate + the real EventAdminNavbar.
 */
export default async function MembersEventLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ? Number(session.user.id) : -30;

  const domain = await getDomain();
  const eventId = domain?.event_id ?? DEFAULT_EVENT_ID;

  const context = (await getEventMemberContext(eventId, userId)) ?? {
    role: "organiser",
    eventId,
    userId,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12 min-h-screen text-white section-transition">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/10 mb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-brand-pink animate-pulse" />
            <p className="text-xs font-extrabold uppercase tracking-widest text-brand-pink">
              Event Member Area • Event #{eventId}
            </p>
          </div>
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white flex items-center gap-2">
            <span className="sophisticated-gradient-text">
              Signed in as {roleLabel(context.role)}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-zinc-400 normal-case">
              ({session?.user?.name || session?.user?.email || "Oliver Organiser"})
            </span>
          </h2>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-4 sm:p-6 shadow-2xl mb-8 border border-white/10">
        <EventAdminNavbar eventId={eventId} />
      </div>

      <div className="mt-8 animate-slide-up">{children}</div>
    </div>
  );
}
