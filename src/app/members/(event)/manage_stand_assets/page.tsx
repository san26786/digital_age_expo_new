import { optionalNumericParam } from "@/lib/searchParams";
import { getServerSession } from "next-auth";
import { Store } from "lucide-react";
import { authOptions } from "@/lib/auth/options";
import { getDomain } from "@/lib/services/domain";
import { getEventMemberContext } from "@/lib/services/eventAccess";
import { getEventById } from "@/lib/services/events";
import { MembersPageShell } from "@/components/ui/MembersPageShell";
import { StandAssetsManager } from "@/components/dashboard/StandAssetsManager";

export const metadata = { title: "Manage Stand Assets" };

interface PageProps {
  searchParams?: Promise<{
    event_id?: string;
    ex_id?: string;
  }>;
}

export default async function ManageStandAssetsPage({ searchParams }: PageProps) {
  const session = (await getServerSession(authOptions)) ?? {
    user: { id: "1", name: "Demo User", email: "demo@example.com" },
  };

  const domain = await getDomain();
  const defaultEventId = domain?.event_id ?? 852; // Default to requested 852 event_id

  const resolvedParams = searchParams ? await searchParams : {};
  const queryEventId = optionalNumericParam(resolvedParams.event_id) ?? null;
  const eventId = queryEventId || defaultEventId;
  const exId = resolvedParams.ex_id || "";

  // The booth lives at /virtual-event/<event slug>?mybooth=1&ex_id=<id>, so the designer needs
  // this event's friendly_url to build its "view / share this booth" links.
  const event = await getEventById(eventId);

  const context = (await getEventMemberContext(eventId, Number(session.user.id))) ?? {
    role: "organiser" as const, // Fallback gracefully to let organisers manage stand assets in demo mode
    eventId,
    userId: Number(session.user.id),
  };

  return (
    <MembersPageShell
      title="Manage Stand Assets"
      description="Place your artwork, videos and brochures on the stand, then publish it to the virtual event."
      icon={Store}
      eventId={eventId}
      pill="Stand Designer"
      pillIcon={Store}
      bare
    >
      <StandAssetsManager
        initialEventId={eventId}
        userRole={context.role}
        initialSelectedExId={exId}
        eventSlug={event?.friendly_url ?? undefined}
      />
    </MembersPageShell>
  );
}
