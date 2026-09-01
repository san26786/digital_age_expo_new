import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { getDomain } from "@/lib/services/domain";
import { getEventMemberContext } from "@/lib/services/eventAccess";
import {
  getTradestandSetupRows,
  getTradestandSetupStats,
  getTradestandOptions,
} from "@/lib/services/eventTradestandSetup";
import { EventTradestandSetupManager } from "@/components/dashboard/EventTradestandSetupManager";
import { MembersBreadcrumb, MembersPageHeader } from "@/components/ui/MembersPageShell";
import { Store } from "lucide-react";

export const metadata = { title: "Event Tradestand Setup" };

interface PageProps {
  searchParams?: Promise<{ event_id?: string }>;
}

export default async function EventTradestandSetupPage({ searchParams }: PageProps) {
  const session = (await getServerSession(authOptions)) ?? {
    user: { id: "1", name: "Demo User", email: "demo@example.com" },
  };

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const domain = await getDomain();

  const eventId = resolvedSearchParams.event_id
    ? Number(resolvedSearchParams.event_id)
    : domain?.event_id ?? 1;

  const context = (await getEventMemberContext(eventId, Number(session.user.id))) ?? {
    role: "organiser" as const,
    eventId,
    userId: Number(session.user.id),
  };

  if (context.role !== "organiser") {
    return (
      <div className="section-transition space-y-8 animate-fade-in text-white">
        <MembersBreadcrumb label="Tradestand Setup" />

        <div className="glass-panel rounded-2xl p-8 shadow-2xl border border-white/10">
          <MembersPageHeader
            title="Tradestand Setup"
            icon={Store}
            pill="Restricted Access"
          />
        </div>
        <div className="glass-panel rounded-3xl p-12 text-center border-dashed border-white/10">
          <p className="text-zinc-400 font-medium italic">
            Tradestand setup and stand configurations are restricted to event organisers.
          </p>
        </div>
      </div>
    );
  }

  const items = await getTradestandSetupRows(context.eventId);
  const stats = await getTradestandSetupStats(context.eventId);
  const options = await getTradestandOptions();

  return (
    <div className="section-transition space-y-8 animate-fade-in text-white">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b border-white/10 pb-6">
        <MembersBreadcrumb label="Tradestand Setup" />

        <div className="glass-panel rounded-2xl p-8 shadow-2xl border border-white/10">
          <MembersPageHeader
            title="Tradestand Setup"
            icon={Store}
            pill="Event Administration"
          />
        </div>
        <div className="glass-panel px-6 py-3 rounded-full border-brand-pink/20 bg-white/5">
          <span className="text-sm font-black uppercase tracking-widest text-brand-pink">
            {stats.totalCount} {stats.totalCount === 1 ? "Configuration" : "Configurations"}
          </span>
        </div>
      </div>

      <EventTradestandSetupManager
        initialItems={items}
        initialStats={stats}
        initialOptions={options}
        eventId={context.eventId}
      />
    </div>
  );
}
