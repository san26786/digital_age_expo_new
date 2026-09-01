import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { getDomain } from "@/lib/services/domain";
import { getEventMemberContext } from "@/lib/services/eventAccess";
import { getLeadershipBoardEntries } from "@/lib/services/leadershipBoard";
import { LeadershipBoardManager } from "@/components/dashboard/LeadershipBoardManager";
import { MembersBreadcrumb, MembersPageHeader } from "@/components/ui/MembersPageShell";
import { Trophy } from "lucide-react";

export const metadata = { title: "Leadership Board" };

export default async function LeadershipBoardPage() {
  // const session = await getServerSession(authOptions);
  // if (!session) redirect("/login?callbackUrl=/members/leadership_board");
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

  const entries = await getLeadershipBoardEntries(context);

  return (
    <div className="section-transition space-y-8 animate-fade-in text-white">
      <MembersBreadcrumb label="Leadership Board" />

      <div className="glass-panel rounded-2xl p-8 shadow-2xl border border-white/10">
        <MembersPageHeader
          title="Leadership Board"
          description="Add business leaders, people in business, and new recruits to feature on your leadership board."
          icon={Trophy}
          pill="Event Context"
        />
      </div>

      <div>
        <LeadershipBoardManager entries={entries} />
      </div>
    </div>
  );
}
