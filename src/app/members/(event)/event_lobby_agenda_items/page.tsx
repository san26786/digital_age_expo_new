import { numericParam } from "@/lib/searchParams";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { getDomain } from "@/lib/services/domain";
import { getEventMemberContext } from "@/lib/services/eventAccess";
import { getPrimaryLobby } from "@/lib/services/eventLobby";
import { getMasterOptions } from "@/lib/services/eventServices";
import {
  getEventAgendas,
  getAgendaLayoutOptions,
  getAgendaItems,
  getAgendaAssignableSpeakers,
} from "@/lib/services/eventLobbyAgendaItems";
import { AgendaTrackTable } from "@/components/dashboard/AgendaTrackTable";
import { AgendaItemManager } from "@/components/dashboard/AgendaItemManager";
import { LobbySubNav } from "@/components/dashboard/LobbySubNav";
import { Home, ChevronRight, CalendarDays, ListChecks } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lobby Agenda | Event Management" };

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
      <span className="text-brand-pink font-bold">Lobby Agenda</span>
      {eventId ? <span className="text-zinc-500"> (Event #{eventId})</span> : null}
    </nav>
  );
}

export default async function EventLobbyAgendaItemsPage({
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
      <div className="section-transition space-y-6">
        <Breadcrumb eventId={eventId} />
        <h1 className="text-3xl font-black uppercase text-white">Lobby Agenda</h1>
        <div className="glass-panel rounded-2xl p-8 text-center border-dashed border-white/10">
          <p className="text-zinc-400 font-medium italic">
            The lobby agenda is only available to the event organiser.
          </p>
        </div>
      </div>
    );
  }

  /*
   * The agenda list is event-scoped, exactly like the legacy
   * `select * from find_event_lobby_agenda where event_id = ?`. It deliberately does NOT depend
   * on a parent lobby existing, and is not filtered by layout — agendas are routinely attached
   * to a CHILD layout, and filtering on the parent's id hid them.
   *
   * The session schedule below still needs the parent lobby, because a new session's
   * layout_type_setup_id is taken from it.
   */
  const [agendas, layouts, lobby, sessionMasters, hallTypeMasters] = await Promise.all([
    getEventAgendas(context),
    getAgendaLayoutOptions(context),
    getPrimaryLobby(context),
    getMasterOptions("TST"),
    getMasterOptions("AGTYPE"),
  ]);

  const [items, speakers] = await Promise.all([
    getAgendaItems(context),
    getAgendaAssignableSpeakers(context),
  ]);

  return (
    <div className="section-transition space-y-6 animate-fade-in">
      <Breadcrumb eventId={eventId} />
      <LobbySubNav eventId={eventId} active="agenda" />

      {/* ------------------------------ Agenda list ------------------------------ */}
      <div className="glass-panel rounded-2xl p-6 md:p-8 shadow-2xl border border-white/10 text-white">
        <div className="border-b border-white/10 pb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-purple to-brand-pink">
            <ListChecks className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-white">Lobby Agenda</h1>
            <p className="mt-1 text-xs font-medium text-zinc-400">
              The halls and tracks visitors can enter in Event #{eventId} — Keynote Forums, Seminar Halls, Workshops.
              Sessions are scheduled underneath each one.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <AgendaTrackTable
            agendas={agendas}
            layouts={layouts}
            sessionMasters={sessionMasters}
            hallTypeMasters={hallTypeMasters}
          />
        </div>

        {layouts.length === 0 && (
          <p className="mt-5 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs font-medium text-amber-300">
            No lobby layout is configured for this event yet, so a new agenda has nothing to attach to.{" "}
            <Link
              href={`/members/event_lobby_layout_manager?event_id=${eventId}`}
              className="font-bold underline underline-offset-2 hover:text-amber-200"
            >
              Configure the parent lobby
            </Link>{" "}
            first.
          </p>
        )}
      </div>
    </div>
  );
}
