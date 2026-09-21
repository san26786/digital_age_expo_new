import { getDomain } from "@/lib/services/domain";
import { createOutageCollector } from "@/lib/db-errors";
import { getEventById } from "@/lib/services/events";
import { formatDateLocation } from "@/lib/format";
import { FreeTicketForm } from "@/components/free-ticket/FreeTicketForm";
import { CheckCircle2, Ticket, Calendar, MapPin, Sparkles } from "lucide-react";

export const metadata = {
  title: "Get Your Free Ticket | Digital Age Expo",
  description: "Claim your complimentary visitor pass for Digital Age Expo. Access live keynotes, workshops, and virtual exhibition halls.",
};

export default async function FreeTicketPage() {
  const domain = await getDomain();
  // Guarded so a database refusing service (plan quota, asleep, pool exhausted) degrades
  // instead of 500-ing this route — see src/lib/db-errors.ts. Keep the collector object intact:
  // `current` is a getter, so destructuring would snapshot the still-null value.
  const collector = createOutageCollector();
  const guard = collector.guard;

  const event = domain.event_id ? await guard(() => getEventById(domain.event_id), null) : null;

  return (
    <div className="bg-slate-950 text-white min-h-screen pb-20">
      {/* Hero Header — same dark slate/fuchsia treatment as Exhibitor Registration */}
      <section className="relative overflow-hidden px-6 py-16 sm:py-20 text-center bg-gradient-to-b from-slate-900 via-violet-950/60 to-slate-950">
        <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-fuchsia-600/30 blur-3xl" />

        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fuchsia-500/20 text-fuchsia-300 text-xs font-bold uppercase tracking-widest mb-4 border border-fuchsia-500/30">
            <Sparkles className="w-3.5 h-3.5" /> Limited Time Free Entry Pass
          </div>
          <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white drop-shadow-md">
            Claim Your <span className="brand-gradient-text">Free Ticket</span>
          </h1>
          {event && (
            <p className="mt-3 text-sm sm:text-base text-slate-200 font-medium">
              {event.title} &mdash; {formatDateLocation(event.date_start, event.date_end, event.venue)}
            </p>
          )}
          <p className="mt-4 text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Join thousands of tech leaders, business founders, and digital innovators at {domain.name}. Complete the registration below for instant access.
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 -mt-8 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Registration Form Card */}
          <div className="lg:col-span-7">
            <div className="rounded-3xl border border-fuchsia-500/30 bg-slate-900/95 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
              <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <Ticket className="w-5 h-5 text-fuchsia-400" /> Pass Registration
              </h2>
              <p className="text-sm text-slate-300 mb-6">
                Fill in your details to receive your digital badge and login credentials.
              </p>

              <FreeTicketForm />
            </div>
          </div>

          {/* Ticket Inclusions & Info */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-3xl border border-white/10 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-md">
              <h3 className="text-lg font-black uppercase tracking-tight text-white mb-4 flex items-center gap-2">
                What Your Pass Includes
              </h3>
              <ul className="space-y-3 text-sm text-slate-200 font-medium">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-fuchsia-400 shrink-0 mt-0.5" />
                  <span>Full access to Virtual Exhibition Halls & Booths</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-fuchsia-400 shrink-0 mt-0.5" />
                  <span>Attendance to all Keynotes & Masterclasses</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-fuchsia-400 shrink-0 mt-0.5" />
                  <span>Interactive Speed Networking Lounge access</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-fuchsia-400 shrink-0 mt-0.5" />
                  <span>On-demand session recordings for 30 days</span>
                </li>
              </ul>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-md space-y-4">
              <div className="flex items-center gap-3 text-slate-200 text-sm">
                <Calendar className="w-5 h-5 text-fuchsia-400 shrink-0" />
                <div>
                  <div className="font-bold text-white">Date & Time</div>
                  <div className="text-xs text-slate-400">
                    {event ? formatDateLocation(event.date_start, event.date_end, null) : "Live Virtual Event Days"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-slate-200 text-sm">
                <MapPin className="w-5 h-5 text-fuchsia-400 shrink-0" />
                <div>
                  <div className="font-bold text-white">Location</div>
                  <div className="text-xs text-slate-400">{event?.venue || "Global Virtual Event Platform"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
