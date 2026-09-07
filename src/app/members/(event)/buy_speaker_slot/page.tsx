import { numericParam } from "@/lib/searchParams";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Megaphone, Receipt } from "lucide-react";
import { authOptions } from "@/lib/auth/options";
import { getDomain } from "@/lib/services/domain";
import { getEventMemberContext } from "@/lib/services/eventAccess";
import { getSpeakerSlotFormOptions } from "@/lib/services/eventSpeakerSlotPurchase";
import { MembersPageShell } from "@/components/ui/MembersPageShell";
import { BuySpeakerSlotForm } from "@/components/dashboard/BuySpeakerSlotForm";

/**
 * ---------------------------------------------------------------------------
 * /members/buy_speaker_slot — "Choose Speaker Slot Payment".
 * ---------------------------------------------------------------------------
 *
 * The Next equivalent of advertise.php?action=add&type=speaker_slot&event_id=<id>. The
 * "Buy Speaker Slot" tile previously pointed at /members/manage_speakers — the speaker admin
 * screen — so clicking it showed "Manage Speaker" instead of a purchase form.
 *
 * NOT organiser-gated: a member is buying a slot for their own business.
 */

export const dynamic = "force-dynamic";
export const metadata = { title: "Buy Speaker Slot | Event Management" };

export default async function BuySpeakerSlotPage({
  searchParams,
}: {
  searchParams: Promise<{ event_id?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const resolvedParams = searchParams ? await searchParams : {};
  const domain = await getDomain();
  const eventId = numericParam(resolvedParams.event_id, domain?.event_id ?? 852);
  const userId = Number(session.user.id);

  const context = (await getEventMemberContext(eventId, userId)) ?? {
    role: "visitor" as const,
    eventId,
    userId,
  };

  const initial = await getSpeakerSlotFormOptions(context);

  return (
    <MembersPageShell
      title="Choose Speaker Slot Payment"
      breadcrumbLabel="Buy Speaker Slot"
      description="Book a speaking slot at this event for one of your businesses. An invoice is raised for you to settle."
      icon={Megaphone}
      pill={`${initial.slots.length} slot${initial.slots.length === 1 ? "" : "s"}`}
      pillIcon={Receipt}
      eventId={eventId}
      bare
    >
      <BuySpeakerSlotForm eventId={eventId} initial={initial} />
    </MembersPageShell>
  );
}
