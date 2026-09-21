import {
  TrendingUp,
  DollarSign,
  Award,
  Target,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { getDomain } from "@/lib/services/domain";
import { createOutageCollector } from "@/lib/db-errors";
import { getWhyExhibitHero } from "@/lib/services/exhibitors";
import { staticAssetUrl } from "@/lib/assets";

export const metadata = {
  title: "Why Exhibit | Digital Age Expo",
  description:
    "Learn why exhibiting at Digital Age Expo delivers unmatched ROI, high-quality lead generation, and direct access to active technology buyers.",
};

export default async function WhyExhibitPage() {
  const domain = await getDomain();
  // Guarded so a database refusing service (plan quota, asleep, pool exhausted) degrades
  // instead of 500-ing this route — see src/lib/db-errors.ts. Keep the collector object intact:
  // `current` is a getter, so destructuring would snapshot the still-null value.
  const collector = createOutageCollector();
  const guard = collector.guard;

  const hero = await guard(() => getWhyExhibitHero(domain.linked_profile_listing_id), null);

  const heroTitle = hero?.section_title || "Exhibit?";
  const heroSubtitle = hero?.section_description;
  const heroBody =
    hero?.additional_info ||
    "Unrivaled opportunity to scale your brand, generate qualified sales leads, and meet global decision-makers.";

  const stats = [
    { label: "Active Attendees", val: "25,000+" },
    { label: "C-Level Decision Makers", val: "68%" },
    { label: "Average Leads Per Stand", val: "120+" },
    { label: "Exhibitor Retention Rate", val: "89%" },
  ];

  const benefits = [
    {
      icon: Target,
      title: "Target High-Intent Buyers",
      desc: "Every attendee at Digital Age Expo registers with specific tech and service needs. Interact directly via video calls, scheduled 1-on-1 meetings, and live chat.",
    },
    {
      icon: DollarSign,
      title: "Cost-Effective Growth",
      desc: "Zero travel, hotel, or physical booth shipping costs. Get full virtual booth presentation capability at a fraction of traditional trade show expense.",
    },
    {
      icon: TrendingUp,
      title: "Maximize Sales Revenue",
      desc: "Showcase your product demo videos, downloadable PDFs, and digital brochures to thousands of SME decision makers actively seeking solutions.",
    },
    {
      icon: Award,
      title: "Industry Visibility & Authority",
      desc: "Position your company alongside global market leaders and gain year-round brand exposure through our online portal and social ecosystem.",
    },
  ];

  return (
    <div className="bg-slate-950 text-white min-h-screen pb-20">
      {/* Header */}
      <section
        className="relative overflow-hidden bg-cover bg-center bg-no-repeat px-6 py-20 sm:py-28 text-center"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgb(var(--color-slate-900-rgb) / 0.9), rgb(var(--color-violet-900-rgb) / 0.85)), url('${staticAssetUrl("https://digitalageexpo.com/files/listing_pages/818073-dae_index_top_banner.jpg")}')`,
        }}
      >
        <div className="relative z-10 max-w-4xl mx-auto">
          <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-fuchsia-400">
            Digital Age Expo
          </p>
          <h1 className="mt-2 text-3xl sm:text-6xl font-black uppercase tracking-tight text-white">
            {hero?.section_title ? (
              heroTitle
            ) : (
              <>
                Why <span className="brand-gradient-text">Exhibit?</span>
              </>
            )}
          </h1>
          {heroSubtitle && (
            <p className="mt-2 text-sm sm:text-base uppercase tracking-wide text-fuchsia-200 font-bold">
              {heroSubtitle}
            </p>
          )}
          <p className="mt-4 text-base sm:text-lg text-slate-200 max-w-2xl mx-auto font-medium leading-relaxed whitespace-pre-line">
            {heroBody}
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 py-16 space-y-16">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((st, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-md transition-transform duration-300 hover:scale-105"
            >
              <div className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-300 via-pink-200 to-rose-300 mb-1">
                {st.val}
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
                {st.label}
              </div>
            </div>
          ))}
        </div>

        {/* Benefits Breakdown Grid */}
        <div>
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white">
              Key Advantages of Exhibiting
            </h2>
            <p className="mt-2 text-sm text-slate-400 font-medium">
              Accelerate your sales pipeline with modern digital exhibition tools
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {benefits.map((b, idx) => {
              const Icon = b.icon;
              return (
                <div
                  key={idx}
                  className="group rounded-2xl border border-white/10 bg-slate-900/80 p-8 transition-all duration-300 hover:-translate-y-1 hover:border-fuchsia-500/40 hover:shadow-xl hover:shadow-fuchsia-950/40"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-fuchsia-600 to-purple-600 text-white flex items-center justify-center mb-6 shadow-md group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-fuchsia-300 transition-colors">
                    {b.title}
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed font-medium">
                    {b.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Exhibition Stand Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center rounded-3xl border border-white/10 bg-slate-900/60 p-8 sm:p-12 backdrop-blur-md">
          <div className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-fuchsia-400">
              Virtual Stand Features
            </span>
            <h3 className="text-2xl sm:text-3xl font-black uppercase text-white leading-tight">
              A Complete Virtual Booth Environment
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed font-medium">
              Customize your stand artwork, upload promotional videos, connect social profiles, and host live group webinars or individual sales meetings on demand.
            </p>

            <ul className="space-y-2 pt-2">
              {[
                "Instant 1-on-1 Video Calling & Chat",
                "Downloadable Product Leaflets & Catalogs",
                "Full Lead Analytics & Visitor Tracking",
                "Interactive Banner & Stand Artwork Templates",
              ].map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-fuchsia-400 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <div className="pt-4">
              <Link
                href="/exhibitor-registration"
                className="btn-brand-gradient inline-block rounded-full px-8 py-3.5 font-bold text-white shadow-xl transition-all duration-300 hover:scale-105 text-sm uppercase tracking-wider"
              >
                Enroll as Exhibitor
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/20 bg-slate-950 p-2 shadow-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={staticAssetUrl("/images/exhibitor.jpg")}
              alt="Virtual Stand Feature Showcase"
              className="w-full h-auto rounded-xl object-cover hover:scale-105 transition-transform duration-500"
            />
          </div>
        </div>

        {/* Call to action */}
        <div className="text-center bg-gradient-to-r from-purple-950 via-slate-900 to-fuchsia-950 border border-white/10 rounded-3xl p-10 shadow-2xl">
          <Sparkles className="w-10 h-10 text-fuchsia-400 mx-auto mb-3" />
          <h3 className="text-2xl sm:text-3xl font-black uppercase text-white mb-2">
            Book Your Stand In Under 3 Minutes
          </h3>
          <p className="text-sm sm:text-base text-slate-300 mb-8 max-w-xl mx-auto font-medium">
            Choose from flexible stand packages tailored for startups, SMEs, and enterprise brands.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/exhibitor-registration"
              className="btn-brand-gradient rounded-full px-8 py-3.5 font-bold text-white shadow-xl transition-all duration-300 hover:scale-105 text-sm uppercase tracking-wider"
            >
              Book Stand Now
            </Link>
            <Link
              href="/membership_packages"
              className="btn-outline-animated rounded-full bg-white/10 px-8 py-3.5 font-bold text-white ring-1 ring-white/30 backdrop-blur-md transition-all duration-300 hover:bg-white/20 hover:scale-105 text-sm uppercase tracking-wider"
            >
              View Packages
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
