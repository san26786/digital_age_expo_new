import { getDomain } from "@/lib/services/domain";
import { createOutageCollector } from "@/lib/db-errors";
import { getEventById } from "@/lib/services/events";
import { ContactForm } from "@/components/contact/ContactForm";
import Image from "next/image";
import { MapPin, Phone, Mail, Clock, Calendar } from "lucide-react";
import { staticAssetUrl } from "@/lib/assets";

export const metadata = {
  title: "Contact Us - Digital Age Expo 2026",
};

/**
 * Palette note: this page follows the site chrome rather than Tailwind's default
 * slate/fuchsia ramps. The Navbar sits on `zinc-900`/`surface-2` and the Footer on
 * `#03010a`, both purple-black — so a `slate-950` page (#020617, a blue-black) read
 * as a different colour sandwiched between them. Everything here now uses the
 * tokens declared in src/app/globals.css: `zinc-950` surfaces, `zinc-300/400/500`
 * body text, and `brand-pink` / `brand-purple` accents.
 */
export default async function ContactPage() {
  const domain = await getDomain();
  // Guarded so a database refusing service (plan quota, asleep, pool exhausted) degrades
  // instead of 500-ing this route — see src/lib/db-errors.ts. Keep the collector object intact:
  // `current` is a getter, so destructuring would snapshot the still-null value.
  const collector = createOutageCollector();
  const guard = collector.guard;

  const event = domain.event_id ? await guard(() => getEventById(domain.event_id), null) : null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950 text-white">
      {/* Ambient brand glow — same treatment as the footer, so the page reads as one surface */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute -left-40 top-32 h-[420px] w-[420px] rounded-full bg-brand-purple/20 blur-[140px]" />
        <div className="absolute -right-40 top-[45%] h-[420px] w-[420px] rounded-full bg-brand-pink/10 blur-[140px]" />
      </div>

      {/* Visual Cover Hero Section */}
      <div
        id="contact_hero"
        className="relative z-10 flex min-h-[50vh] w-full items-center justify-center px-4 py-20 sm:min-h-[60vh] sm:px-6"
      >
        {/* Background Image Wrapper */}
        <div className="absolute inset-0 z-0">
          
          <div className="absolute inset-0 z-10 bg-gradient-to-t from-zinc-950 via-zinc-950/55 to-brand-purple/50" />
        </div>

        {/* Floating glass card */}
        <div className="glass-panel animate-fade-in relative z-20 mx-auto w-full max-w-4xl space-y-6 rounded-3xl p-8 text-center sm:p-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-pink/30 bg-brand-pink/15 px-3.5 py-1.5 text-xs font-black uppercase tracking-widest text-pink-400">
            <Calendar className="h-3.5 w-3.5" /> 26th - 28th August 2026
          </div>
          <h1 className="text-2xl font-black uppercase leading-tight tracking-tight text-white sm:text-4xl md:text-5xl">
            Digital Age Expo 26th - 28th August 2026 |{" "}
            <span className="brand-gradient-text">Virtual Event</span>
          </h1>
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-zinc-300 sm:text-lg">
            26 to 28 August 2026, Online Virtual Event
          </p>
        </div>
      </div>

      {/* Main Form & Event Metadata Details */}
      <div className="container relative z-20 mx-auto -mt-10 max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-12">

          {/* Left Side: Structured Contact Form Container */}
          <div className="lg:col-span-8">
            <ContactForm />
          </div>

          {/* Right Side: Contact Details & Info Sidebar */}
          <div className="space-y-8 lg:col-span-4">
            <div className="glass-panel space-y-6 rounded-3xl p-6 sm:p-8">
              <h2 className="border-b border-white/10 pb-2 text-base font-black uppercase tracking-wide text-white">
                Contact Information
              </h2>
              <p className="text-xs leading-relaxed text-zinc-400">
                If you are looking to secure a stand, submit a seminar proposal, or need technical assistance regarding virtual booths, our support staff is available.
              </p>

              <div className="space-y-4 pt-2">
                {event?.email && (
                  <div className="flex items-start gap-3 text-xs">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-brand-pink/25 bg-brand-pink/10 text-pink-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Email Address</div>
                      <a
                        href={`mailto:${event.email}`}
                        className="mt-0.5 block break-all font-medium text-white transition hover:text-pink-400"
                      >
                        {event.email}
                      </a>
                    </div>
                  </div>
                )}

                {event?.phone && (
                  <div className="flex items-start gap-3 text-xs">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-brand-pink/25 bg-brand-pink/10 text-pink-400">
                      <Phone className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Call Support</div>
                      <a
                        href={`tel:${event.phone}`}
                        className="mt-0.5 block font-medium text-white transition hover:text-pink-400"
                      >
                        {event.phone}
                      </a>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3 text-xs">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-brand-pink/25 bg-brand-pink/10 text-pink-400">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Venue Location</div>
                    <p className="mt-0.5 font-medium text-white">
                      Online Virtual Platform &amp; Broadcasting Studio
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-xs">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-brand-pink/25 bg-brand-pink/10 text-pink-400">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Working Hours</div>
                    <p className="mt-0.5 font-medium text-white">
                      Mon - Fri: 09:00 AM - 05:00 PM BST
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Helper card */}
            <div className="space-y-3 rounded-3xl border border-brand-purple/40 bg-brand-purple/15 p-6 text-xs">
              <h3 className="font-bold uppercase tracking-wide text-purple-300">Fast Resolution</h3>
              <p className="leading-relaxed text-zinc-400">
                Most enquiries are resolved within 2 hours during normal broadcasting periods. We appreciate your participation in Digital Age Expo 2026.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
