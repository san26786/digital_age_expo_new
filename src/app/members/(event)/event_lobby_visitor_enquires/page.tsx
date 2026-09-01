import { optionalNumericParam } from "@/lib/searchParams";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { getDomain } from "@/lib/services/domain";
import { getEventMemberContext } from "@/lib/services/eventAccess";
import { getEnquiries } from "@/lib/services/eventLobbyVisitorEnquiry";
import { LobbyVisitorEnquiriesManager } from "@/components/dashboard/LobbyVisitorEnquiriesManager";
import { DEFAULT_EVENT_ID } from "@/lib/site-config";
import { MembersBreadcrumb, MembersPageHeader } from "@/components/ui/MembersPageShell";
import { MessageSquare } from "lucide-react";

export const metadata = { title: "Lobby Visitor Enquiries" };

export default async function EventLobbyVisitorEnquiriesPage({
  searchParams,
}: {
  searchParams?: Promise<{ event_id?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const queryEventId = optionalNumericParam(resolvedParams.event_id);

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ? Number(session.user.id) : -30;

  const domain = await getDomain();
  const eventId = queryEventId || domain?.event_id || DEFAULT_EVENT_ID;

  const context = (await getEventMemberContext(eventId, userId)) ?? {
    role: "organiser",
    eventId,
    userId,
  };

  const enquiries = await getEnquiries(context);

  return (
    <div className="section-transition space-y-8 animate-fade-in text-white">
      <MembersBreadcrumb label="Lobby Visitor Enquiries" />

      <div className="glass-panel rounded-2xl p-8 shadow-2xl border border-white/10">
        <MembersPageHeader
          title="Lobby Visitor Enquiries"
          description="Manage, answer, and review enquiries sent by visitors in the event lobby."
          icon={MessageSquare}
        />
      </div>

      <LobbyVisitorEnquiriesManager initialEnquiries={enquiries} eventId={eventId} />
    </div>
  );
}
