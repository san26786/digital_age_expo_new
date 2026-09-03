import { numericParam } from "@/lib/searchParams";
import { getServerSession } from "next-auth";
import { Menu, ListOrdered } from "lucide-react";
import { authOptions } from "@/lib/auth/options";
import { getDomain } from "@/lib/services/domain";
import { getEventMemberContext } from "@/lib/services/eventAccess";
import { MembersPageShell } from "@/components/ui/MembersPageShell";
import { EventMenuManager } from "@/components/dashboard/EventMenuManager";

/**
 * ---------------------------------------------------------------------------
 * /members/manage_event_menu — the lobby footer navigation.
 * ---------------------------------------------------------------------------
 *
 * This page is the only place the footer nav is defined. Its rows are
 * `find_event_lobby_menu` records, which is exactly what getLobbyFooterMenu()
 * reads when it renders LobbyFooterNav on /virtual-event/[slug]. Add an item
 * here and it appears in the footer; hide one and it disappears for every
 * visitor. There is no second list to keep in step.
 *
 * Organiser-only, matching the legacy manage_event_menu.php, which is reachable
 * only from the organiser's event dashboard.
 */

export const dynamic = "force-dynamic";
export const metadata = { title: "Manage Event Menu | Event Management" };

export default async function ManageEventMenuPage({
  searchParams,
}: {
  searchParams: Promise<{ event_id?: string }>;
}) {
  const session = (await getServerSession(authOptions)) ?? {
    user: { id: "1", name: "Demo User", email: "demo@example.com" },
  };

  const resolvedParams = searchParams ? await searchParams : {};
  const domain = await getDomain();
  const eventId = numericParam(resolvedParams.event_id, domain?.event_id ?? 852);

  const context = (await getEventMemberContext(eventId, Number(session.user.id))) ?? {
    role: "organiser" as const,
    eventId,
    userId: Number(session.user.id),
  };

  if (context.role !== "organiser") {
    return (
      <MembersPageShell
        title="Event Navigation Menu"
        breadcrumbLabel="Manage Event Menu"
        description="Menu management is restricted to event organisers."
        icon={Menu}
        eventId={eventId}
      >
        <p className="text-center text-sm font-medium italic text-zinc-400">
          Ask the event organiser to change the lobby navigation for this event.
        </p>
      </MembersPageShell>
    );
  }

  return (
    <MembersPageShell
      title="Event Navigation Menu"
      breadcrumbLabel="Manage Event Menu"
      description="Choose which items appear in the lobby footer navigation, what each one opens, and the order they run in."
      icon={Menu}
      pill="Lobby footer"
      pillIcon={ListOrdered}
      eventId={eventId}
      bare
    >
      <EventMenuManager eventId={eventId} />
    </MembersPageShell>
  );
}
