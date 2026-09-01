import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { getDomain } from "@/lib/services/domain";
import { getEventMemberContext } from "@/lib/services/eventAccess";
import { getVisitors, getVisitorStats, VISITORS_PAGE_SIZE } from "@/lib/services/eventVisitors";
import { VisitorsManager } from "@/components/dashboard/VisitorsManager";
import { MembersBreadcrumb, MembersPageHeader } from "@/components/ui/MembersPageShell";
import { Users } from "lucide-react";

export const metadata = { title: "View Visitor" };

export default async function ViewVisitorPage() {
  // const session = await getServerSession(authOptions);
  // if (!session) redirect("/login?callbackUrl=/members/view_visitor");
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
        <MembersBreadcrumb label="Attendee Directory" />

        <div className="glass-panel rounded-2xl p-8 shadow-2xl border border-white/10">
          <MembersPageHeader
            title="Attendee Directory"
            icon={Users}
            pill="Restricted Access"
          />
        </div>
        <div className="glass-panel rounded-3xl p-12 text-center border-dashed">
          <p className="text-zinc-500 font-medium italic">
            Visitor management is only available to the event organiser.
          </p>
        </div>
      </div>
    );
  }

  const [initialPage, stats] = await Promise.all([
    getVisitors(context, { page: 1, pageSize: VISITORS_PAGE_SIZE }),
    getVisitorStats(context),
  ]);

  return (
    <div className="section-transition space-y-8 animate-fade-in text-white">
      <MembersBreadcrumb label="Attendee Directory" />

      <div className="glass-panel rounded-2xl p-8 shadow-2xl border border-white/10">
        <MembersPageHeader
          title="Attendee Directory"
          description="Monitor and manage all visitors registered to attend this event."
          icon={Users}
          pill="Event Context"
        />
      </div>

      <div>
        <VisitorsManager initialPage={initialPage} initialStats={stats} />
      </div>
    </div>
  );
}
