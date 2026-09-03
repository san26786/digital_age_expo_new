import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { getDomain } from "@/lib/services/domain";
import { getEventMemberContext } from "@/lib/services/eventAccess";
import {
  getExhibitorsAdmin,
  getExhibitorsAdminStats,
  getExhibitorAdminById,
} from "@/lib/services/eventExhibitorAdmin";
import { ExhibitorDetailsView } from "@/components/dashboard/ExhibitorDetailsView";
import { ExhibitorsAdminManager } from "@/components/dashboard/ExhibitorsAdminManager";
import { MembersBreadcrumb, MembersPageHeader } from "@/components/ui/MembersPageShell";
import { Store } from "lucide-react";
import { optionalNumericParam } from "@/lib/searchParams";

export const metadata = { title: "View Exhibitor" };

interface PageProps {
  /**
   * Two distinct entry points, both on this one route:
   *
   *  - `?action=edit&id=<ex>`  -> the dedicated full-details PAGE for that exhibitor. This is the
   *    legacy booth link (`view_exhibitor?action=edit&from_view_booth=1&id=…&event_id=…`) and the
   *    target of the stand designer's "Exhibitor Full Details" button.
   *  - `?ex_id=<ex>`           -> the list, with the Edit Trade Stand modal already open on that
   *    row. This is what the details page's own "Edit Details" button uses, so editing keeps
   *    happening in the single existing form rather than a second copy of it.
   */
  searchParams?: Promise<{
    action?: string;
    from_view_booth?: string;
    ex_id?: string;
    id?: string;
    event_id?: string;
  }>;
}

export default async function ViewExhibitorPage({ searchParams }: PageProps) {
  const session = (await getServerSession(authOptions)) ?? {
    user: { id: "1", name: "Demo User", email: "demo@example.com" },
  };

  const resolvedParams = searchParams ? await searchParams : {};
  /** Deep-link into the list's modal. */
  const requestedExhibitorId = optionalNumericParam(resolvedParams.ex_id) ?? undefined;
  /** The dedicated details page: `action=edit` names the exhibitor in `id`. */
  const detailsExhibitorId =
    resolvedParams.action === "edit" ? optionalNumericParam(resolvedParams.id) ?? undefined : undefined;

  const domain = await getDomain();
  const eventId = domain?.event_id ?? 1;

  const context = (await getEventMemberContext(eventId, Number(session.user.id))) ?? {
    role: "organiser" as const,
    eventId,
    userId: Number(session.user.id),
  };

  if (context.role !== "organiser") {
    return (
      <div className="section-transition space-y-8 animate-fade-in text-white">
        <h1 className="text-4xl font-black uppercase tracking-tight text-white">View Exhibitor</h1>
        <div className="glass-panel rounded-3xl p-12 text-center border-dashed">
          <p className="text-zinc-500 font-medium italic">
            Exhibitor management is only available to the event organiser.
          </p>
        </div>
      </div>
    );
  }

  // ---- Dedicated full-details page. Returns before the list queries: nothing on this branch
  // needs the 232-row table or the stat aggregates.
  if (detailsExhibitorId) {
    const exhibitor = await getExhibitorAdminById(context, detailsExhibitorId);

    if (!exhibitor) {
      return (
        <div className="section-transition space-y-8 animate-fade-in text-white">
          <MembersBreadcrumb label="Exhibitor Details" eventId={eventId} />
          <div className="glass-panel rounded-2xl border border-white/10 p-12 text-center shadow-2xl">
            <p className="font-medium italic text-zinc-500">
              No exhibitor with id {detailsExhibitorId} is registered for this event.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="section-transition space-y-8 animate-fade-in text-white">
        <MembersBreadcrumb label={exhibitor.business || "Exhibitor Details"} eventId={eventId} />

        <div className="glass-panel rounded-2xl border border-white/10 p-8 shadow-2xl">
          <MembersPageHeader
            title="Exhibitor Full Details"
            description="Every field held against this exhibitor's registration and stand allocation."
            icon={Store}
          />
        </div>

        <ExhibitorDetailsView
          exhibitor={exhibitor}
          eventId={eventId}
          fromViewBooth={resolvedParams.from_view_booth === "1"}
        />
      </div>
    );
  }

  const [exhibitors, initialStats] = await Promise.all([
    getExhibitorsAdmin(context),
    getExhibitorsAdminStats(context),
  ]);

  return (
    <div className="section-transition space-y-8 animate-fade-in text-white">
      <MembersBreadcrumb label="View Exhibitor" />

      <div className="glass-panel rounded-2xl p-8 shadow-2xl border border-white/10">
        <MembersPageHeader
          title="View Exhibitor"
          description="Manage, allocate stands, configure digital booths, and track every exhibitor registered for this event."
          icon={Store}
        />
      </div>

      <div>
        <ExhibitorsAdminManager
          initialExhibitors={exhibitors}
          initialStats={initialStats}
          initialExhibitorId={requestedExhibitorId}
          eventId={eventId}
          /* Arrived from the stand designer — Save and Cancel go back to that stand rather than
             leaving the organiser on the full exhibitor list. */
          returnTo={
            resolvedParams.from_view_booth === "1" && requestedExhibitorId
              ? `/members/manage_stand_assets?event_id=${eventId}&ex_id=${requestedExhibitorId}`
              : undefined
          }
        />
      </div>
    </div>
  );
}
