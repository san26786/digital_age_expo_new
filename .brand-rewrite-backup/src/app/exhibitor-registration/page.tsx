import { getDomain } from "@/lib/services/domain";
import { getEventById } from "@/lib/services/events";
import { getExhibitorRegistrationContent } from "@/lib/services/exhibitors";
import { formatDateLocation } from "@/lib/format";
import { ExhibitorRegistrationForm } from "@/components/exhibitors/ExhibitorRegistrationForm";
import { ScrollToSection } from "@/components/exhibitors/ScrollToSection";
import { Phone, Mail, Sparkles, TrendingUp, Megaphone, Users, Award, CheckCircle2 } from "lucide-react";
import { assetUrl, staticAssetUrl } from "@/lib/assets";

export const metadata = {
  title: "Exhibitor Registration | Digital Age Expo",
  description:
    "Register as an exhibitor for Digital Age Expo 2026. Showcase your products and services to active C-level decision-makers and technology buyers.",
};

const GAIN_ICONS = [TrendingUp, Megaphone, Users, Award];

const DEFAULT_GAINS = [
  {
    title: "Generate sales",
    desc: "Face to Face is proven to be by far the most effective way of selling your products and services. With over 10,000 key decision makers in attendance.",
    image: null as string | null,
  },
  {
    title: "Maximise your exposure",
    desc: "By exhibiting, you not only get unrivalled exposure at the show, but also benefit from our extensive pre-show 365 marketing campaign.",
    image: null as string | null,
  },
  {
    title: "Network with your industry",
    desc: "Meet companies like yours and individuals looking for the products and services you offer.",
    image: null as string | null,
  },
  {
    title: "Proven ROI",
    desc: "78% of visitors purchased from exhibitors at the show, or as a direct result of the show.",
    image: null as string | null,
  },
];

const DEFAULT_PACKAGE_INCLUDES = [
  {
    title: "Your Exhibitor Package Includes:",
    description: [
      "An exhibition stand",
      "A microsite on the business Show website",
      "An exhibitor listing in the hard copy and digital copy of show guide",
      "Social media support",
      "Extra marketing promotion via the news section of the website",
    ],
    image: null as string | null,
  },
];

interface Props {
  searchParams: Promise<{ action?: string }>;
}

export default async function ExhibitorRegistrationPage({ searchParams }: Props) {
  const { action } = await searchParams;
  const domain = await getDomain();
  const event = domain.event_id ? await getEventById(domain.event_id) : null;
  const content = await getExhibitorRegistrationContent(domain.linked_profile_listing_id);

  const packageIncludes =
    content.packageIncludes.length > 0
      ? content.packageIncludes.map((p: any) => ({
          title: p.section_title || "Your Exhibitor Package Includes:",
          description: p.section_description,
          image: p.opportunity_images || null,
        }))
      : DEFAULT_PACKAGE_INCLUDES;

  const gains =
    content.gains.length > 0
      ? content.gains.map((g: any, i: number) => ({
          title: g.section_title || DEFAULT_GAINS[i % DEFAULT_GAINS.length].title,
          desc: g.section_description || DEFAULT_GAINS[i % DEFAULT_GAINS.length].desc,
          image: g.opportunity_images || null,
          icon: GAIN_ICONS[i % GAIN_ICONS.length],
        }))
      : DEFAULT_GAINS.map((g: { title: string; desc: string; image: string | null }, i: number) => ({ ...g, icon: GAIN_ICONS[i % GAIN_ICONS.length] }));

  return (
    <>
      {/* Jump straight to the form when arriving with intent to register/book a stand
          (e.g. the "Exhibitor" nav item -> ?action=buy, or the footer -> ?action=register). */}
      <ScrollToSection targetId="exhibitor-form" when={!!action} />
    <div className="bg-slate-950 text-white min-h-screen pb-20">
      {/* Top Banner Header */}
      <section
        className="relative overflow-hidden bg-cover bg-center bg-no-repeat px-6 py-20 sm:py-28 text-center"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgb(var(--color-slate-900-rgb) / 0.9), rgb(var(--color-violet-900-rgb) / 0.85), rgb(var(--color-slate-900-rgb) / 0.95)), url('${staticAssetUrl("https://digitalageexpo.com/files/listing_pages/818073-dae_index_top_banner.jpg")}')`,
        }}
      >
        <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-fuchsia-600/30 blur-3xl" />

        <div className="relative z-10 max-w-4xl mx-auto">
          <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-fuchsia-400">
            Digital Age Expo 2026
          </p>
          <h1 className="mt-2 text-3xl sm:text-6xl font-black uppercase tracking-tight text-white drop-shadow-md">
            Exhibitor <span className="brand-gradient-text">Registration</span>
          </h1>
          {event && (
            <p className="mt-3 text-sm sm:text-base text-slate-200 font-medium">
              {event.title} &mdash; {formatDateLocation(event.date_start, event.date_end, event.venue)}
            </p>
          )}
          <p className="mt-4 text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Reserve your virtual stand, choose your exhibition zone, and start connecting with thousands of business decision-makers.
          </p>
        </div>
      </section>

      {/* Main Registration Form Container */}
      <div className="mx-auto max-w-5xl px-6 -mt-10 relative z-20 space-y-16">
        <div id="exhibitor-form">
          <ExhibitorRegistrationForm />
        </div>

        {/* Exhibitor Package Includes Section */}
        <section className="rounded-3xl border border-white/10 bg-slate-900/90 overflow-hidden shadow-2xl backdrop-blur-md grid grid-cols-1 lg:grid-cols-2">
          <div
            className="min-h-[280px] lg:min-h-[400px] bg-cover bg-center relative"
            style={{
              backgroundImage: `url('${
                assetUrl(packageIncludes[0]?.image) ||
                staticAssetUrl("https://findusonweb.com/files/listing_pages/817601-27972070586_73eb8ef975_o (1).jpg")
              }')`,
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent lg:hidden" />
          </div>

          <div className="p-8 sm:p-12 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase tracking-widest text-fuchsia-400">
                All-Inclusive Stand Packages
              </span>
              <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
                {packageIncludes[0]?.title || "Your Exhibitor Package Includes:"}
              </h2>
              {Array.isArray(packageIncludes[0]?.description) ? (
                <ul className="space-y-3 pt-2">
                  {(packageIncludes[0].description as string[]).map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm sm:text-base text-slate-200 font-medium">
                      <CheckCircle2 className="w-5 h-5 text-fuchsia-400 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="whitespace-pre-line pt-2 text-sm sm:text-base text-slate-200 font-medium">
                  {packageIncludes[0]?.description as string}
                </p>
              )}
              {packageIncludes.length > 1 && (
                <div className="space-y-4 pt-4">
                  {packageIncludes.slice(1).map((p: { title: string; description: string | string[] | null }, i: number) => (
                    <div key={i} className="border-t border-white/10 pt-4">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-white">{p.title}</h3>
                      <p className="whitespace-pre-line mt-1 text-xs sm:text-sm text-slate-300 font-medium">
                        {Array.isArray(p.description) ? p.description.join(", ") : p.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2">
              <a
                href="#exhibitor-form"
                className="btn-brand-gradient inline-flex items-center justify-center rounded-full px-8 py-3.5 text-xs sm:text-sm font-extrabold uppercase tracking-wider text-white shadow-xl transition hover:scale-105"
              >
                Book A Stand Now
              </a>
            </div>
          </div>
        </section>

        {/* What You Gain From Exhibiting Section */}
        <section className="space-y-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white">
              What You Gain From Exhibiting At <span className="brand-gradient-text">The Digital Age Expo</span>
            </h2>
            <p className="mt-2 text-sm text-slate-400 font-medium">
              Maximize your commercial potential and industry presence
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {gains.map((gain: { title: string; desc: string; image: string | null; icon: any }, index: number) => {
              const Icon = gain.icon;
              return (
                <div
                  key={index}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/90 p-6 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-fuchsia-500/50 hover:shadow-2xl hover:shadow-fuchsia-950/50 flex flex-col justify-between"
                  style={{
                    backgroundImage: `linear-gradient(to bottom, rgb(var(--color-slate-900-rgb) / 0.85), rgb(var(--color-slate-900-rgb) / 0.95)), url('${
                      assetUrl(gain.image) ||
                      staticAssetUrl("https://digitalageexpo.com/files/listing_pages/817601-backgr.jpg")
                    }')`,
                    backgroundSize: "cover",
                    backgroundPosition: "bottom",
                  }}
                >
                  <div>
                    <div className="mb-4 inline-flex p-3 rounded-xl bg-gradient-to-br from-fuchsia-600 to-purple-600 text-white shadow-md group-hover:scale-110 transition-transform">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-black uppercase text-white mb-2 group-hover:text-fuchsia-300 transition-colors">
                      {gain.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                      {gain.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* What Can You Expect from Exhibiting? Section */}
        <section className="rounded-3xl border border-white/10 bg-gradient-to-r from-purple-950/80 via-slate-900/90 to-indigo-950/80 p-8 sm:p-12 shadow-2xl backdrop-blur-md space-y-6 text-center sm:text-left">
          <div className="flex items-center gap-3 justify-center sm:justify-start">
            <Sparkles className="w-8 h-8 text-fuchsia-400" />
            <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white">
              What Can You Expect from Exhibiting?
            </h2>
          </div>

          <div className="space-y-4 text-sm sm:text-base text-slate-200 leading-relaxed font-medium">
            <p>
              Exhibiting at The Digital Age Expo puts your business face to face with over 10,000+ SME owners and senior decision makers who are looking for the latest innovative products and services to maximize their revenue and take their business to the next level.
            </p>
            <p>
              Our team is here the whole way throughout the experience to help in any way we can and guide you through the steps to a successful exhibiting journey for you and your company.
            </p>
            <p className="pt-2">
              Get in touch today to find out exactly why The Digital Age Expo can benefit your business by contacting our Event Team:
            </p>
          </div>

          <div className="pt-4 flex flex-wrap items-center justify-center sm:justify-start gap-4">
            <a
              href="tel:02380970305"
              className="inline-flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/20 hover:border-fuchsia-400"
            >
              <Phone className="w-4 h-4 text-fuchsia-400" />
              <span>Call: 0238 097 0305</span>
            </a>
            <a
              href="mailto:hello@b2bgrowthhub.com"
              className="inline-flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/20 hover:border-fuchsia-400"
            >
              <Mail className="w-4 h-4 text-fuchsia-400" />
              <span>Email: hello@b2bgrowthhub.com</span>
            </a>
          </div>
        </section>
      </div>
    </div>
    </>
  );
}


