import { numericParam } from "@/lib/searchParams";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { Home, ChevronRight, Table, Download, Plus } from "lucide-react";
import { authOptions } from "@/lib/auth/options";
import { getDomain } from "@/lib/services/domain";
import { getEventMemberContext } from "@/lib/services/eventAccess";
import { getPrimaryLobby } from "@/lib/services/eventLobby";
import { getSpots } from "@/lib/services/eventLobbySpots";
import { LobbySubNav } from "@/components/dashboard/LobbySubNav";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tabular Spots | Event Management" };

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
      <span className="text-brand-pink font-bold">Tabular Spots</span>
      {eventId ? <span className="text-zinc-500"> (Event #{eventId})</span> : null}
    </nav>
  );
}

export default async function EventLobbySpotsTabularPage({
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
        <h1 className="text-3xl font-black uppercase text-white">Tabular Spots</h1>
        <div className="glass-panel rounded-2xl p-8 text-center border-dashed border-white/10">
          <p className="text-zinc-400 font-medium italic">
            Tabular spot management is restricted to event organisers.
          </p>
        </div>
      </div>
    );
  }

  const lobby = await getPrimaryLobby(context);
  const spots = lobby ? await getSpots(context, { eventLayoutId: lobby.id, childId: null }) : [];

  return (
    <div className="section-transition space-y-6 animate-fade-in">
      <Breadcrumb eventId={eventId} />
      <LobbySubNav eventId={eventId} active="spots" />

      <div className="glass-panel rounded-2xl p-8 shadow-2xl border border-white/10 text-white space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-purple to-brand-pink shadow-lg shadow-brand-pink/20">
              <Table className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-white">Tabular Spots Manager</h1>
              <p className="text-xs font-medium text-zinc-400">
                Manage all lobby hotspots and coordinate positions in a structured tabular view for Event #{eventId}.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/members/event_lobby_spots?event_id=${eventId}`}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:bg-white/10 hover:text-white transition"
            >
              Visual Canvas View
            </Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 glass-panel shadow-2xl">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-gradient-to-r from-brand-purple to-brand-pink text-white">
                <th className="px-6 py-4 font-black uppercase tracking-wider text-center">ID</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Spot Title</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Coordinates (X, Y)</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider">Target Link / Action</th>
                <th className="px-6 py-4 font-black uppercase tracking-wider text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {spots.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-400 italic font-medium">
                    No spots configured yet for this event lobby.
                  </td>
                </tr>
              ) : (
                spots.map((spot) => (
                  <tr key={spot.id} className="hover:bg-white/5 transition-colors text-zinc-200">
                    <td className="px-6 py-4 text-center font-mono font-bold text-brand-pink">#{spot.id}</td>
                    <td className="px-6 py-4 font-bold text-white">{spot.title}</td>
                    <td className="px-6 py-4 font-mono text-zinc-400">X: {spot.x}%, Y: {spot.y}%</td>
                    <td className="px-6 py-4 text-fuchsia-300 truncate max-w-xs">{spot.link || "—"}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Active
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
