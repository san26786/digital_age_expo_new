import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { getDomain } from "@/lib/services/domain";
import { getEventMemberContext } from "@/lib/services/eventAccess";
import { getEventDetails } from "@/lib/services/eventDetails";
import { EventDetailsManager } from "@/components/dashboard/EventDetailsManager";
import { MembersBreadcrumb, MembersPageHeader } from "@/components/ui/MembersPageShell";
import { CalendarDays } from "lucide-react";

export const metadata = { title: "Event Details" };

export default async function EventDetailsPage() {
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
      <div className="space-y-6">
        <h1 className="text-3xl font-black uppercase text-white">Event Details</h1>
        <div className="glass-panel rounded-2xl p-8 text-center border-dashed border-white/10">
          <p className="text-zinc-400 font-medium italic">Editing event details is restricted to event organisers.</p>
        </div>
      </div>
    );
  }

  const details = await getEventDetails(context);

  if (!details) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-black uppercase text-white">Event Details</h1>
        <div className="glass-panel rounded-2xl p-8 text-center border-dashed border-white/10">
          <p className="text-zinc-400 font-medium italic">This event could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="section-transition space-y-8 animate-fade-in text-white">
      <MembersBreadcrumb label="Event Details" />

      <div className="glass-panel rounded-2xl p-8 shadow-2xl border border-white/10">
        <MembersPageHeader
          title="Event Details"
          description="Core event information, descriptions, SEO/social links, section visibility, and the stats shown on your marketing pages."
          icon={CalendarDays}
          pill="Event Context"
        />
      </div>

      <EventDetailsManager eventId={eventId} details={details} />
    </div>
  );
}
