import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { getDomain } from "@/lib/services/domain";
import { getEventMemberContext } from "@/lib/services/eventAccess";
import { getSpeakers, getSpeakerStats } from "@/lib/services/eventSpeakers";
import { SpeakersManager } from "@/components/dashboard/SpeakersManager";
import { Mic } from "lucide-react";

export const metadata = { title: "Manage Speakers" };

export default async function ManageSpeakersPage() {
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
      <div className="p-8">
        <h1 className="text-2xl font-black uppercase tracking-wider text-white">Manage Speakers</h1>
        <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-8 text-zinc-400 backdrop-blur-md">
          Speaker management is only available to the event organiser.
        </p>
      </div>
    );
  }

  const [speakers, stats] = await Promise.all([
    getSpeakers(context),
    getSpeakerStats(context),
  ]);

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-purple to-brand-pink shadow-lg shadow-brand-pink/20">
            <Mic className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-2">Manage Speaker</h1>
            <p className="text-xs font-medium text-zinc-400 mt-1">Review speaker registrations, allocate session slots, manage passes, and configure event speakers.</p>
          </div>
        </div>
      </div>

      <SpeakersManager initialSpeakers={speakers} initialStats={stats} />
    </div>
  );
}

