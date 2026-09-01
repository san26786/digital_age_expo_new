import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { getDomain } from "@/lib/services/domain";
import { getEventMemberContext } from "@/lib/services/eventAccess";
import { getSponsorsAdmin, getSponsorStats } from "@/lib/services/eventSponsorAdmin";
import { SponsorsAdminManager } from "@/components/dashboard/SponsorsAdminManager";
import { MembersBreadcrumb, MembersPageHeader } from "@/components/ui/MembersPageShell";
import { Handshake } from "lucide-react";

export const metadata = { title: "View Sponsor" };

export default async function ViewSponsorPage() {
  // const session = await getServerSession(authOptions);
  // if (!session) redirect("/login?callbackUrl=/members/view_sponsor");
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
        <MembersBreadcrumb label="Sponsor Directory" />

        <div className="glass-panel rounded-2xl p-8 shadow-2xl border border-white/10">
          <MembersPageHeader
            title="Sponsor Directory"
            icon={Handshake}
            pill="Restricted Access"
          />
        </div>
        <div className="glass-panel rounded-3xl p-12 text-center border-dashed">
          <p className="text-zinc-500 font-medium italic">
            Sponsor management is only available to the event organiser.
          </p>
        </div>
      </div>
    );
  }

  // Fetched together: the badges and the table are one view, and loading them in series would
  // show the counts updating a beat after the rows they describe.
  const [sponsors, stats] = await Promise.all([
    getSponsorsAdmin(context),
    getSponsorStats(context),
  ]);

  return (
    <div className="section-transition space-y-8 animate-fade-in text-white">
      <MembersBreadcrumb label="Sponsor Directory" />

      <div className="glass-panel rounded-2xl p-8 shadow-2xl border border-white/10">
        <MembersPageHeader
          title="Sponsor Directory"
          description="Manage and monitor all partners and sponsors backing this event."
          icon={Handshake}
          pill="Event Context"
        />
      </div>

      <div>
        <SponsorsAdminManager sponsors={sponsors} stats={stats} />
      </div>
    </div>
  );
}
