import { getDomain } from "@/lib/services/domain";
import { getEventById } from "@/lib/services/events";
import { getApprovedSponsors, getSponsorshipTiers } from "@/lib/services/sponsors";
import { SponsorsGrid } from "@/components/sponsors/SponsorsGrid";
import { SponsorshipTiersSection } from "@/components/sponsors/SponsorshipTiersSection";
import { WhySponsorSection } from "@/components/sponsors/WhySponsorSection";
import { SponsorRegistrationForm } from "@/components/sponsors/SponsorRegistrationForm";
import { Sparkles, Ticket, Play, Store } from "lucide-react";
import Link from "next/link";
import { staticAssetUrl } from "@/lib/assets";

export const metadata = {
  title: "Our Sponsors & Registration | Digital Age Expo",
  description: "Meet official sponsors and register as a sponsor for Digital Age Expo 2026.",
};

export default async function OurSponsorPage() {
  const domain = await getDomain();
  const event = domain.event_id ? await getEventById(domain.event_id) : null;
  const [sponsors, tiers] = await Promise.all([
    event ? getApprovedSponsors(event.id) : [],
    event ? getSponsorshipTiers(event.id) : [],
  ]);

  const tierOptions = tiers.map((t: any) => ({
    id: t.id,
    title: t.title,
    price: t.price,
  }));

  return (
    <div className="w-full bg-slate-950 text-white min-h-screen pb-20">
      {/* Top Banner Section */}
      <section className="relative w-full min-h-[60vh] flex items-center justify-center overflow-hidden border-b border-white/10 bg-slate-950">
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

      {/* Main Sponsors Content & Registration Form */}
      <div className="max-w-6xl mx-auto px-6 pt-16 space-y-20">
        <SponsorsGrid sponsors={sponsors} />

        <SponsorshipTiersSection tiers={tiers} />

        {/* Sponsor Registration Form Section */}
        <div id="register-sponsor" className="max-w-3xl mx-auto pt-8">
          <SponsorRegistrationForm tiers={tierOptions} />
        </div>
      </div>
    </div>
  );
}

