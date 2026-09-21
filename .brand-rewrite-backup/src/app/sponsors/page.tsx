import Link from "next/link";
import { getDomain } from "@/lib/services/domain";
import { createOutageCollector } from "@/lib/db-errors";
import { DatabaseOutageNotice } from "@/components/common/DatabaseOutageNotice";
import { getEventById } from "@/lib/services/events";
import { getApprovedSponsors, getSponsorshipTiers } from "@/lib/services/sponsors";
import { SponsorsGrid } from "@/components/sponsors/SponsorsGrid";
import { SponsorshipTiersSection } from "@/components/sponsors/SponsorshipTiersSection";
import { WhySponsorSection } from "@/components/sponsors/WhySponsorSection";
import { Sparkles, Ticket, Play, Store } from "lucide-react";
import { staticAssetUrl } from "@/lib/assets";

export const metadata = {
  title: "Our Sponsors | Digital Age Expo",
  description: "Meet the official sponsors supporting Digital Age Expo 2026.",
};

export default async function SponsorsPage() {
  const domain = await getDomain();

  // Guarded so a database refusing service (plan quota, asleep, pool exhausted) degrades
  // instead of 500-ing this route — see src/lib/db-errors.ts. Keep the collector object intact:
  // `current` is a getter, so destructuring would snapshot the still-null value.
  const collector = createOutageCollector();
  const guard = collector.guard;

  const event = domain.event_id ? await guard(() => getEventById(domain.event_id), null) : null;

  const [sponsors, tiers] = await Promise.all([
    event ? guard(() => getApprovedSponsors(event.id), [] as any[]) : [],
    event ? guard(() => getSponsorshipTiers(event.id), [] as any[]) : [],
  ]);

  // Nothing loaded and the database is why — don't imply the event has no sponsors.
  if (sponsors.length === 0 && tiers.length === 0 && collector.current) {
    return <DatabaseOutageNotice outage={collector.current} />;
  }

  return (
    <div className="w-full bg-slate-950 text-white min-h-screen pb-20">
      {/* Top Banner Section */}
      <section className="relative w-full min-h-[60vh] flex items-center justify-center overflow-hidden border-b border-white/10 bg-slate-950">
        {/* Background Image Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40"
          style={{
            backgroundImage: `url('${staticAssetUrl("https://digitalageexpo.com/files/listing_pages/818073-dae_index_top_banner.jpg")}')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-purple-950/80 via-slate-950/80 to-slate-950" />

        <div className="relative z-10 max-w-5xl mx-auto px-6 py-20 text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-fuchsia-500/20 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-fuchsia-300 border border-fuchsia-500/30 backdrop-blur-md">
            <Sparkles className="w-4 h-4" />
            <span>Virtual Event 2026</span>
          </div>

          <h1 className="text-2xl sm:text-5xl font-black uppercase tracking-tight text-white leading-tight">
            DIGITAL AGE EXPO 26TH - 28TH AUGUST 2026 | <span className="brand-gradient-text">VIRTUAL EVENT</span>
          </h1>

          <p className="text-sm sm:text-lg text-slate-200 max-w-2xl mx-auto font-medium leading-relaxed">
            26 to 28 August 2026, Online Virtual Event
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/free-ticket"
              className="btn-brand-gradient inline-flex items-center gap-2 text-white font-extrabold text-xs sm:text-sm uppercase tracking-wider px-7 py-3.5 rounded-full shadow-xl transition-all duration-300 hover:scale-105"
            >
              <Ticket className="w-4 h-4" />
              <span>Get Free Tickets Now!</span>
            </Link>

            <Link
              href="/glimpse-of-the-show"
              className="rounded-full border border-white/20 bg-slate-800/90 hover:bg-slate-700 text-white font-extrabold text-xs sm:text-sm uppercase tracking-wider px-7 py-3.5 shadow-lg transition-all duration-300 hover:scale-105 inline-flex items-center gap-2"
            >
              <Play className="w-4 h-4 text-fuchsia-400" />
              <span>Enter The Show</span>
            </Link>

            <Link
              href="/exhibitor-registration"
              className="btn-brand-gradient inline-flex items-center gap-2 text-white font-extrabold text-xs sm:text-sm uppercase tracking-wider px-7 py-3.5 rounded-full shadow-xl transition-all duration-300 hover:scale-105"
            >
              <Store className="w-4 h-4" />
              <span>Book Your Stand</span>
            </Link>
          </div>
        </div>
      </section>

      <WhySponsorSection />

      {/* Main Sponsors Content */}
      <div className="max-w-6xl mx-auto px-6 pt-12 space-y-16">
        <SponsorsGrid sponsors={sponsors} />

        <SponsorshipTiersSection tiers={tiers} />

        {/* Become a Sponsor Callout */}
        <div className="rounded-3xl border border-fuchsia-500/30 bg-gradient-to-r from-purple-950/80 via-slate-900/90 to-indigo-950/80 p-8 sm:p-12 text-center shadow-2xl backdrop-blur-md space-y-4 max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tight">
            Become A Sponsor
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto font-medium">
            Interested in sponsoring {event?.title || "Digital Age Expo"}? Partner with us to reach thousands of business decision-makers.
          </p>
          <div className="pt-2">
            <Link
              href="/sponsor_registration"
              className="btn-brand-gradient inline-flex items-center gap-2 rounded-full px-8 py-4 text-xs sm:text-sm font-extrabold uppercase tracking-wider text-white shadow-xl transition hover:scale-105"
            >
              <Sparkles className="w-4 h-4" />
              <span>Apply to Sponsor</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

