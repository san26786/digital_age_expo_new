import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { getDomain } from "@/lib/services/domain";
import { getEventMemberContext } from "@/lib/services/eventAccess";
import { getExhibitorsAdmin, getExhibitorsAdminStats } from "@/lib/services/eventExhibitorAdmin";
import { ExhibitorsAdminManager } from "@/components/dashboard/ExhibitorsAdminManager";
import { MembersBreadcrumb, MembersPageHeader } from "@/components/ui/MembersPageShell";
import { Store } from "lucide-react";

export const metadata = { title: "View Exhibitor" };

export default async function ViewExhibitorPage() {
  const session = (await getServerSession(authOptions)) ?? {
    user: { id: "1", name: "Demo User", email: "demo@example.com" },
  };

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
        <ExhibitorsAdminManager initialExhibitors={exhibitors} initialStats={initialStats} />
      </div>
    </div>
  );
}
