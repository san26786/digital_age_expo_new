import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { getDomain } from "@/lib/services/domain";
import { getEventMemberContext } from "@/lib/services/eventAccess";
import { getSpeakerSlots, getAssignableSpeakers } from "@/lib/services/eventSpeakerSlots";
import { SpeakerSlotsManager } from "@/components/dashboard/SpeakerSlotsManager";
import { MembersBreadcrumb, MembersPageHeader } from "@/components/ui/MembersPageShell";
import { CalendarClock } from "lucide-react";

export const metadata = { title: "Manage Speaker Slots" };

export default async function ManageSpeakerSlotsPage() {
  const session = (await getServerSession(authOptions)) ?? {
    user: { id: "1", name: "Demo User", email: "demo@example.com" },
  };

  const domain = await getDomain();
  const eventId = domain?.event_id ?? 852;

  const context = (await getEventMemberContext(eventId, Number(session.user.id))) ?? {
    role: "organiser" as const,
    eventId,
    userId: Number(session.user.id),
  };

  if (context.role !== "organiser") {
    return (
      <div className="section-transition space-y-8 animate-fade-in text-white">
        <h1 className="text-4xl font-black uppercase tracking-tight text-white">Manage Speaker Slots</h1>
        <div className="glass-panel rounded-3xl p-12 text-center border-dashed border-white/10">
          <p className="text-zinc-500 font-medium italic">
            Slot allocation is only available to the event organiser.
          </p>
        </div>
      </div>
    );
  }

  const [slots, speakers] = await Promise.all([getSpeakerSlots(context), getAssignableSpeakers(context)]);

  return (
    <div className="section-transition space-y-8 animate-fade-in text-white">
      <MembersBreadcrumb label="Manage Speaker&apos;s Slots" />

      <div className="glass-panel rounded-2xl p-8 shadow-2xl border border-white/10">
        <MembersPageHeader
          title="Manage Speaker&apos;s Slots"
          description="Allocate keynote sessions, workshops, and presentation slots to active speakers across event venues and halls."
          icon={CalendarClock}
        />
      </div>

      <div>
        <SpeakerSlotsManager initialSlots={slots} initialSpeakers={speakers} />
      </div>
    </div>
  );
}
