import { numericParam } from "@/lib/searchParams";
import { getServerSession } from "next-auth";
import { Activity, Users } from "lucide-react";
import { authOptions } from "@/lib/auth/options";
import { getDomain } from "@/lib/services/domain";
import { getEventMemberContext, canManageLobby, LOBBY_ACCESS_DENIED } from "@/lib/services/eventAccess";
import {
  getActivityFeed,
  getActivityUsers,
  ACTIVITY_PAGE_SIZE,
} from "@/lib/services/eventActivityReport";
import { MembersPageShell } from "@/components/ui/MembersPageShell";
import { ActivityReportManager } from "@/components/dashboard/ActivityReportManager";

/**
 * ---------------------------------------------------------------------------
 * /members/event_user_activity_report — what visitors did in the lobby.
 * ---------------------------------------------------------------------------
 *
 * Ports members/event_user_activity_report.php. The first page of the feed and the attendee list
 * are fetched here so the report is readable in the initial HTML; "Load More" and every filter
 * change go through /api/members/event-activity instead of reloading the page.
 *
 * The list this replaced was a hardcoded `sampleActivities` array — five invented rows that
 * looked like a working report and never touched the database.
 */

export const dynamic = "force-dynamic";
export const metadata = { title: "User Activity Report | Event Management" };

export default async function EventUserActivityReportPage({
  searchParams,
}: {
  searchParams: Promise<{ event_id?: string; u?: string; f?: string; t?: string }>;
}) {
  const session = (await getServerSession(authOptions)) ?? {
    user: { id: "1", name: "Demo User", email: "demo@example.com" },
  };

  const resolvedParams = searchParams ? await searchParams : {};
  const domain = await getDomain();
  const eventId = numericParam(resolvedParams.event_id, domain?.event_id ?? 852);

  const context = (await getEventMemberContext(eventId, Number(session.user.id))) ?? {
    role: "organiser" as const,
    eventId,
    userId: Number(session.user.id),
  };

  if (!canManageLobby(context)) {
    return (
      <MembersPageShell
        title="User Activity Report"
        description={LOBBY_ACCESS_DENIED}
        icon={Activity}
        eventId={eventId}
      >
        <p className="text-center text-sm font-medium italic text-zinc-400">
          Ask the event organiser for access to this event&apos;s reports.
        </p>
      </MembersPageShell>
    );
  }

  /*
   * The legacy accepted `u`, `f` and `t` on the URL (its filter form navigated rather than
   * fetched), so those are still honoured for any bookmarked or emailed report link — they seed
   * the first page, and the client takes over from there.
   */
  const initialUserId = resolvedParams.u ? Number(resolvedParams.u) || null : null;
  const isDate = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

  const [users, firstPage] = await Promise.all([
    getActivityUsers(context),
    getActivityFeed(context, {
      userId: initialUserId,
      from: isDate(resolvedParams.f),
      to: isDate(resolvedParams.t),
      offset: 0,
      limit: ACTIVITY_PAGE_SIZE,
    }),
  ]);

  return (
    <MembersPageShell
      title="User Activity Report"
      description="Every lobby interaction logged for this event — footer navigation, zone visits, booth views and resource downloads."
      icon={Activity}
      pill={`${users.length} attendee${users.length === 1 ? "" : "s"}`}
      pillIcon={Users}
      eventId={eventId}
      bare
    >
      <ActivityReportManager
        eventId={eventId}
        users={users}
        initialEntries={firstPage.entries}
        initialHasMore={firstPage.hasMore}
        available={firstPage.available}
      />
    </MembersPageShell>
  );
}
