import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { getDomain } from "@/lib/services/domain";
import { getEventMemberContext } from "@/lib/services/eventAccess";
import {
  getMagazineSetupRows,
  getMagazineSetupStats,
  getMagazineOptions,
} from "@/lib/services/eventMagazineSetup";
import { EventMagazineSetupManager } from "@/components/dashboard/EventMagazineSetupManager";
import { MembersBreadcrumb, MembersPageHeader } from "@/components/ui/MembersPageShell";
import { BookOpen } from "lucide-react";

export const metadata = { title: "Manage Magazine Page Setup" };

interface PageProps {
  searchParams?: Promise<{ event_id?: string; keyword?: string }>;
}

export default async function EventMagazineSetupPage({ searchParams }: PageProps) {
  const session = (await getServerSession(authOptions)) ?? {
    user: { id: "1", name: "Demo User", email: "demo@example.com" },
  };

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const domain = await getDomain();

  const eventId = resolvedSearchParams.event_id
    ? Number(resolvedSearchParams.event_id)
    : domain?.event_id ?? 852;

  const context = (await getEventMemberContext(eventId, Number(session.user.id))) ?? {
    role: "organiser" as const,
    eventId,
    userId: Number(session.user.id),
  };

  if (context.role !== "organiser") {
    return (
      <div className="section-transition space-y-8 animate-fade-in text-white">
        <MembersBreadcrumb label="Magazine Page Setup" />

        <div className="glass-panel rounded-2xl p-8 shadow-2xl border border-white/10">
          <MembersPageHeader
            title="Magazine Page Setup"
            icon={BookOpen}
            pill="Restricted Access"
          />
        </div>
        <div className="glass-panel rounded-3xl p-12 text-center border-dashed border-white/10">
          <p className="text-zinc-400 font-medium italic">
            Magazine page configuration is restricted to event organisers.
          </p>
        </div>
      </div>
    );
  }

  const initialItems = await getMagazineSetupRows(context.eventId, resolvedSearchParams.keyword);
  const initialStats = await getMagazineSetupStats(context.eventId);
  const initialOptions = await getMagazineOptions();

  return (
    <div className="section-transition space-y-8 animate-fade-in text-white">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b border-white/10 pb-6">
        <MembersBreadcrumb label="Manage Magazine Page Setup" />

        <div className="glass-panel rounded-2xl p-8 shadow-2xl border border-white/10">
          <MembersPageHeader
            title="Manage Magazine Page Setup"
            icon={BookOpen}
            pill="Event Administration"
          />
        </div>
      </div>

      <EventMagazineSetupManager
        initialItems={initialItems}
        initialStats={initialStats}
        initialOptions={initialOptions}
        eventId={context.eventId}
      />
    </div>
  );
}
