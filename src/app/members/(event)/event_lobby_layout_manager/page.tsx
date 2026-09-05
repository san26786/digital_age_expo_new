// app/members/event_lobby_layout_manager/page.tsx
import { numericParam } from "@/lib/searchParams";
import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Home, ChevronRight, ExternalLink } from "lucide-react";
import { authOptions } from "@/lib/auth/options";
import { getDomain } from "@/lib/services/domain";
import { getEventMemberContext, canManageLobby, LOBBY_ACCESS_DENIED } from "@/lib/services/eventAccess";
import { getEventById } from "@/lib/services/events";
import { getLobbies, getPrimaryLobby, type LobbyRow } from "@/lib/services/eventLobby";
import { getAuditoriumChildLobby } from "@/lib/services/eventLobbyChild";
import { LobbyManager } from "@/components/dashboard/LobbyManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lobby Details | Event Management" };


function Breadcrumb({ eventId }: { eventId?: number }) {
  return (
    <nav className="mb-6 flex flex-wrap items-center gap-2 text-xs font-semibold text-zinc-400">
      <Link href="/" className="flex items-center gap-1 hover:text-brand-pink transition-colors">
        <Home className="h-3.5 w-3.5" />
        Home
      </Link>
      <ChevronRight className="h-3 w-3 text-zinc-600" />
      <Link href="/members/user_event_summary" className="hover:text-brand-pink transition-colors">
        My Account
      </Link>
      <ChevronRight className="h-3 w-3 text-zinc-600" />
      <span className="text-brand-pink font-bold">Lobby Details</span>
      {eventId ? <span className="text-zinc-500"> (Event #{eventId})</span> : null}
    </nav>
  );
}

function NoticeCard({ title, eventId, children }: { title: string; eventId?: number; children: ReactNode }) {
  return (
    <div className="section-transition space-y-6">
      <Breadcrumb eventId={eventId} />
      <h1 className="text-3xl font-black uppercase tracking-tight text-white">{title}</h1>
      <div className="glass-panel rounded-2xl p-8 border border-white/10 flex items-start gap-4">
        <ExternalLink className="mt-0.5 h-6 w-6 flex-shrink-0 text-brand-pink" />
        <div className="text-zinc-300 leading-relaxed text-sm font-medium">{children}</div>
      </div>
    </div>
  );
}

export default async function EventLobbyLayoutManagerPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; event_id?: string; id?: string; ex_id?: string; visit_photobooth?: string }>;
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

  // Not `role === "organiser"`: the lobby is run by the event's team, not only by the single
  // account that owns the event row. canManageLobby() is the one place that rule lives.
  if (!canManageLobby(context)) {
    return (
      <div className="section-transition space-y-6">
        <Breadcrumb eventId={eventId} />
        <h1 className="text-3xl font-black uppercase text-white">Lobby Details</h1>
        <div className="glass-panel rounded-2xl p-8 text-center border-dashed border-white/10">
          <p className="text-zinc-400 font-medium italic">{LOBBY_ACCESS_DENIED}</p>
        </div>
      </div>
    );
  }

  const { action, id: lobbyIdParam } = resolvedParams;

  if (action === "change_auditiorium_link") {
    const lobby = await getPrimaryLobby(context);
    const auditorium = lobby ? await getAuditoriumChildLobby(context, lobby.id) : null;
    if (auditorium) {
      redirect(`/members/event_lobby_spots?child_id=${auditorium.id}&event_id=${eventId}`);
    }
    return (
      <NoticeCard title="Change Auditorium Link" eventId={eventId}>
        No auditorium zone has been set up for this event yet. Add one from{" "}
        <Link href={`/members/event_lobby_layout_child?event_id=${eventId}`} className="font-semibold text-brand-pink hover:underline">
          Configure Lobby Child
        </Link>{" "}
        first, then this link will jump straight to its spot editor.
      </NoticeCard>
    );
  }

  if (action === "view_my_booth") {
    /*
     * Straight to the public lobby that already exists in this app:
     *   /virtual-event/<event friendly_url>
     *
     * This previously resolved the member's find_event_exhibitor row and redirected to
     * /virtual-directory/<exhibitor friendly_url>, which is a different route keyed on a
     * different table — and on the many migrated exhibitor rows whose friendly_url is empty it
     * fell through to a "your booth has no public link yet" notice instead of going anywhere.
     * The event's own slug is the one the live site uses and the one the lobby route reads, so
     * this now behaves exactly like the "view_lobby" branch below.
     */
    const event = await getEventById(eventId);
    if (event?.friendly_url) {
      redirect(`/virtual-event/${event.friendly_url}`);
    }

    return (
      <NoticeCard title="View My Booth" eventId={eventId}>
        This event doesn&apos;t have its public link (friendly_url) set up yet, so the virtual
        event page can&apos;t be opened. Use Configure Lobby below, or contact support to have the
        event&apos;s public URL configured.
      </NoticeCard>
    );
  }

  if (action === "view_lobby") {
    const event = await getEventById(eventId);
    if (event?.friendly_url) {
      // Now a native route in this app (see src/app/virtual-event/[slug]/page.tsx) rather than
      // the legacy lobby.php, so this jumps straight there instead of out to PUBLIC_SITE_URL.
      // visit_photobooth isn't wired up on the new page yet (no Photo Booth page exists),
      // so that suffix is intentionally dropped here rather than passed to a page that ignores it.
      redirect(`/virtual-event/${event.friendly_url}`);
    }

    return (
      <NoticeCard title="Enter the Show" eventId={eventId}>
        This event doesn&apos;t have a public virtual-event page configured yet (missing friendly_url).
      </NoticeCard>
    );
  }

  const lobbies: LobbyRow[] = await getLobbies(context);

  return (
    <div className="section-transition space-y-6">
      <Breadcrumb eventId={eventId} />

      <div className="glass-panel rounded-2xl p-6 border border-white/10 shadow-2xl">
        <LobbyManager
          lobbies={lobbies}
          eventId={eventId}
          initialAction={action}
          initialLobbyId={lobbyIdParam ? Number(lobbyIdParam) : undefined}
        />
      </div>
    </div>
  );
}

