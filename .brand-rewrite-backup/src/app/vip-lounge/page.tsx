import { getDomain } from "@/lib/services/domain";
import { getEventById } from "@/lib/services/events";
import { getEventSchedule } from "@/lib/services/schedule";
import { EventDaysTabSection } from "@/components/events/EventDaysTabSection";
import { Sparkles } from "lucide-react";

export const metadata = {
  title: "VIP Lounge | Digital Age Expo",
  description: "Exclusive executive suite access for VIP pass holders, speakers, and headline sponsors.",
};

export default async function VipLoungePage() {
  const domain = await getDomain();
  const event = domain.event_id ? await getEventById(domain.event_id) : null;
  const days = event ? await getEventSchedule(event.id) : [];

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
            VIP Executive <span className="brand-gradient-text">Lounge</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto font-medium">
            Confidential virtual meeting rooms, investor discussions, and high-level C-Suite networking.
          </p>
        </div>
      </div>

      <EventDaysTabSection categoryTitle="VIP LOUNGE SPEAKERS" enrollText="Enroll as VIP Lounge Speaker" days={days} zoneKeyword="vip" />
    </div>
  );
}
