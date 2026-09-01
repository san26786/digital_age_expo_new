import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { getDomain } from "@/lib/services/domain";
import { getEventMemberContext } from "@/lib/services/eventAccess";
import { getShowInfo } from "@/lib/services/eventShowInfo";
import { ShowInfoManager } from "@/components/dashboard/ShowInfoManager";
import { MembersBreadcrumb, MembersPageHeader } from "@/components/ui/MembersPageShell";
import { Info } from "lucide-react";

export const metadata = { title: "Show Info" };

export default async function EventShowInfoPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  // const session = await getServerSession(authOptions);
  // if (!session) redirect("/login?callbackUrl=/members/event_show_info");
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

  const { action } = await searchParams;
  const showInfo = await getShowInfo(context);
  const canManage = context.role === "organiser";

  return (
    <div className="section-transition space-y-8 animate-fade-in text-white">
      <MembersBreadcrumb label="Show Information" />

      <div className="glass-panel rounded-2xl p-8 shadow-2xl border border-white/10">
        <MembersPageHeader
          title="Show Information"
          description={canManage ? "Publish and manage general show guidelines, dates, and information visible to your exhibitors." : "General event information and guidelines published by the organiser."}
          icon={Info}
          pill="Event Context"
        />
      </div>

      <div>
        <ShowInfoManager
          showInfo={showInfo}
          canManage={canManage}
          startInEditMode={canManage && (action === "edit" || !showInfo?.id)}
        />
      </div>
    </div>
  );
}
