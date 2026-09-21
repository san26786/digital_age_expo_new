import { getDomain } from "@/lib/services/domain";
import { getEventById } from "@/lib/services/events";
import { formatDateLocation } from "@/lib/format";
import { SpeakerRegistrationForm } from "@/components/speakers/SpeakerRegistrationForm";
import { Mic, Calendar, MapPin } from "lucide-react";

export const metadata = {
  title: "Speaker Registration - Digital Age Expo",
  description: "Register as a speaker for Digital Age Expo 2026. Share your expertise with over 10,000 SME business leaders.",
};

export default async function SpeakerRegistrationPage() {
  const domain = await getDomain();
  const event = domain.event_id ? await getEventById(domain.event_id) : null;

  return (
    <div className="w-full bg-slate-950 text-white min-h-screen pb-20">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-b from-purple-950 via-slate-950 to-slate-950 px-6 py-16 sm:py-24 text-center border-b border-white/10">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-fuchsia-500/20 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-fuchsia-300 border border-fuchsia-500/30">
            <Mic className="w-4 h-4" />
            <span>Digital Age Expo 2026</span>
          </div>

          <h1 className="text-3xl sm:text-6xl font-black uppercase tracking-tight text-white leading-none">
            Speaker <span className="brand-gradient-text">Registration</span>
          </h1>

          {event && (
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs sm:text-sm text-slate-300 font-semibold pt-2">
              <span className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full">
                <Calendar className="w-4 h-4 text-fuchsia-400" />
                {formatDateLocation(event.date_start, event.date_end, event.venue)}
              </span>
              <span className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full">
                <MapPin className="w-4 h-4 text-fuchsia-400" />
                {event.venue || "Virtual Exhibition Hall"}
              </span>
            </div>
          )}

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto font-medium pt-2">
            Become a featured speaker at the largest digital transformation expo for SMEs. Complete your details below to submit your topic proposal.
          </p>
        </div>
      </div>

      {/* Main Form Container */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6 pt-10 sm:pt-16">
        <SpeakerRegistrationForm />
      </div>
    </div>
  );
}

