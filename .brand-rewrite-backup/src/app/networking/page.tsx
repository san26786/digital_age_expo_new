import { getDomain } from "@/lib/services/domain";
import { createOutageCollector } from "@/lib/db-errors";
import { getEventById } from "@/lib/services/events";
import { getEventSchedule } from "@/lib/services/schedule";
import { EventDaysTabSection } from "@/components/events/EventDaysTabSection";
import { Sparkles } from "lucide-react";

export const metadata = {
  title: "Speed Networking | Digital Age Expo",
  description: "Connect 1-on-1 with industry peers, buyers, and partners in our virtual speed networking lounge.",
};

export default async function NetworkingPage() {
  const domain = await getDomain();
  // Guarded so a database refusing service (plan quota, asleep, pool exhausted) degrades
  // instead of 500-ing this route — see src/lib/db-errors.ts. Keep the collector object intact:
  // `current` is a getter, so destructuring would snapshot the still-null value.
  const collector = createOutageCollector();
  const guard = collector.guard;

  const event = domain.event_id ? await guard(() => getEventById(domain.event_id), null) : null;
  const days = event ? await guard(() => getEventSchedule(event.id), []) : [];

  return (
    <div className="w-full bg-slate-950 text-white min-h-screen">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-b from-purple-950 via-slate-950 to-slate-950 px-6 py-16 text-center border-b border-white/10">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-fuchsia-500/20 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-fuchsia-300 border border-fuchsia-500/30">
            <Sparkles className="w-4 h-4" />
            <span>Digital Age Expo 2026</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white">
            Speed <span className="brand-gradient-text">Networking</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto font-medium">
            AI-driven 1-on-1 video networking sessions connecting you with like-minded professionals in 3-minute speed rounds.
          </p>
        </div>
      </div>

      <EventDaysTabSection categoryTitle="NETWORKING SPEAKERS" enrollText="Enroll as Networking Speaker" days={days} zoneKeyword="networking" />
    </div>
  );
}
