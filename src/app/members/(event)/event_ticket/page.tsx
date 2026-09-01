import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { getDomain } from "@/lib/services/domain";
import { getEventMemberContext } from "@/lib/services/eventAccess";
import { getEventTickets } from "@/lib/services/eventTickets";
import { EventTicketsManager } from "@/components/dashboard/EventTicketsManager";
import { MembersBreadcrumb, MembersPageHeader } from "@/components/ui/MembersPageShell";
import { Ticket } from "lucide-react";

export const metadata = { title: "Event Tickets" };

export default async function EventTicketPage() {
  // const session = await getServerSession(authOptions);
  // if (!session) redirect("/login?callbackUrl=/members/event_ticket");
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
        <MembersBreadcrumb label="Event Tickets" />

        <div className="glass-panel rounded-2xl p-8 shadow-2xl border border-white/10">
          <MembersPageHeader
            title="Event Tickets"
            icon={Ticket}
            pill="Restricted Access"
          />
        </div>
        <div className="glass-panel rounded-3xl p-12 text-center border-dashed border-white/10">
          <p className="text-zinc-500 font-medium italic">
            Ticket setup is only available to the event organiser.
          </p>
        </div>
      </div>
    );
  }

  const tickets = await getEventTickets(context);

  return (
    <div className="section-transition space-y-8 animate-fade-in text-white">
      <MembersBreadcrumb label="Event Tickets" />

      <div className="glass-panel rounded-2xl p-8 shadow-2xl border border-white/10">
        <MembersPageHeader
          title="Event Tickets"
          description="Set up the ticket types attendees can purchase for this event."
          icon={Ticket}
          pill="Revenue"
        />
      </div>

      <div className="glass-panel rounded-3xl p-8 border-white/10 shadow-2xl backdrop-blur-md">
        <EventTicketsManager tickets={tickets} />
      </div>
    </div>
  );
}
