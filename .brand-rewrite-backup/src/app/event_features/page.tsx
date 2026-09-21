import {
  CheckCircle2,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { staticAssetUrl } from "@/lib/assets";

export const metadata = {
  title: "Event Features | Digital Age Expo",
  description:
    "Explore the virtual lobby, auditorium, exhibitor stands, photo booth, and networking lounge at Digital Age Expo.",
};

export default function EventFeaturesPage() {
  const highlightPoints = [
    "Sell and showcase products & services directly to key decision makers",
    "Meet global buyers, suppliers, and potential commercial clients",
    "Grow your pipeline with real-time lead capture & engagement tools",
    "Be a guest speaker to present your brand as an industry leader",
    "Make valuable connections through speed networking & 1-on-1 meetings",
  ];

  const virtualZones = [
    {
      title: "Welcome To Our Virtual World",
      badge: "Event Lobby",
      image: staticAssetUrl("/images/event_lobby.png"),
      description:
        "The central hub where thousands of attendees arrive, navigate to key zones, and discover event highlights.",
      points: [
        "Multiple high-visibility promotion opportunities",
        "Direct access to live seminars, workshops & masterclasses",
        "Join scheduled live group networking sessions",
        "Share promotional videos and brand announcements",
        "Connect instantly with existing and potential customers",
        "Schedule structured 1-on-1 video sales meetings",
      ],
      ctaText: "Explore Virtual Lobby",
      ctaLink: "/glimpse-of-the-show",
    },
    {
      title: "Visit Our Auditorium",
      badge: "Main Stage & Keynotes",
      image: staticAssetUrl("/images/speaker_hall.png"),
      description:
        "Listen to world-renowned speakers covering lead generation, social media, AI strategies, customer acquisition, and enterprise scaling.",
      points: [
        "Become a guest speaker & present live to a targeted global audience",
        "Fully branded stage backdrop with company artwork",
        "Invite your existing clients & business network to your talk",
        "Present interactive workshops with recurring earning potential",
        "Gather direct attendee feedback and live Q&A interaction",
      ],
      ctaText: "Become a Speaker",
      ctaLink: "/speaker_registration",
    },
    {
      title: "Your Custom Exhibition Stand",
      badge: "Exhibitor Booth",
      image: staticAssetUrl("/images/exhibition.png"),
      description:
        "Your dedicated 24/7 digital booth engineered for lead conversion, collateral downloads, and live buyer conversations.",
      points: [
        "Fully custom branded with company logos, graphics, and video banners",
        "Instant text chat and 1-on-1 live video calls with your sales team",
        "Downloadable company business cards & contact contact cards",
        "Display up to 10 revolving banners full-screen on demand",
        "Schedule prospective client discovery meetings in real-time",
        "Download brochures and literature to virtual attendee briefcases",
      ],
      ctaText: "Book Your Stand",
      ctaLink: "/exhibitor-registration",
    },
    {
      title: "Visit Our Photo Booth",
      badge: "Social Media & Branding",
      image: staticAssetUrl("/images/photobooth.png"),
      description:
        "Increase brand shareability across social networks with custom co-branded digital event photo memories.",
      points: [
        "Custom photo frame featuring your company logo & sponsor branding",
        "Instant one-click social sharing to LinkedIn, Twitter, & Facebook",
        "Interactive souvenir for all virtual event visitors and participants",
      ],
      ctaText: "View Sponsorship Options",
      ctaLink: "/sponsor_opportunity",
    },
    {
      title: "Visit Our Networking Lounge",
      badge: "Connections & Lounge",
      image: staticAssetUrl("/images/exhibitor.png"),
      description:
        "Connect in real-time with fellow entrepreneurs, investors, suppliers, and prospective partners.",
      points: [
        "Schedule, invite, or jump into high-impact networking roundtables",
        "Join dedicated WhatsApp & community discussion groups",
        "Feature up to 10 rotating promotional banners in the lounge area",
        "Stream continuous high-converting product demo videos",
      ],
      ctaText: "Join Speed Networking",
      ctaLink: "/networking",
    },
  ];

  return (
    <div className="bg-slate-950 text-white min-h-screen">
      {/* Hero Banner with Background Image */}
      <section
        className="relative overflow-hidden bg-cover bg-center bg-no-repeat px-6 py-20 sm:py-28 text-center"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgb(var(--color-slate-900-rgb) / 0.9), rgb(var(--color-violet-900-rgb) / 0.85), rgb(var(--color-slate-900-rgb) / 0.95)), url('${staticAssetUrl("https://digitalageexpo.com/files/listing_pages/818073-dae_index_top_banner.jpg")}')`,
        }}
      >
        <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-fuchsia-600/30 blur-3xl" />

        <div className="relative z-10 max-w-4xl mx-auto">
          <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-fuchsia-400">
            Interactive Platform Capabilities
          </p>
          <h1 className="mt-2 text-3xl sm:text-6xl font-black uppercase tracking-tight text-white drop-shadow-md">
            Event <span className="brand-gradient-text">Features & Zones</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-200 font-medium leading-relaxed max-w-3xl mx-auto">
            Explore the UK&apos;s most comprehensive Virtual B2B Business Growth Expo. Join over 350,000+ business owners &amp; entrepreneurs in our high-energy digital ecosystem.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/free-ticket"
              className="btn-brand-gradient rounded-full px-8 py-3.5 font-bold text-white shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 text-sm uppercase tracking-wider"
            >
              Get Free Pass
            </Link>
            <Link
              href="/exhibitor-registration"
              className="btn-outline-animated rounded-full bg-white/10 px-8 py-3.5 font-bold text-white ring-1 ring-white/30 backdrop-blur-md transition-all duration-300 hover:bg-white/20 hover:scale-105 active:scale-95 text-sm uppercase tracking-wider"
            >
              Book Virtual Stand
            </Link>
          </div>
        </div>
      </section>

      {/* Intro Video & Value Checklist */}
      <section className="py-16 px-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-white/15 bg-slate-900 shadow-2xl">
            <iframe
              className="w-full h-full"
              src="https://www.youtube.com/embed/TX17TH2HGqw"
              title="Digital Age Expo Intro Video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          <div className="space-y-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-fuchsia-400">
                Why Participate?
              </span>
              <h2 className="mt-2 text-2xl sm:text-4xl font-black uppercase tracking-tight text-white leading-tight">
                Unlock Measurable Business Growth
              </h2>
            </div>

            <div className="space-y-3">
              {highlightPoints.map((point, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-fuchsia-400 shrink-0 mt-0.5" />
                  <span className="text-sm font-semibold text-slate-200">{point}</span>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <Link
                href="/free-ticket"
                className="btn-brand-gradient inline-flex items-center gap-2 rounded-full px-8 py-3.5 font-bold text-white shadow-lg transition-all duration-300 hover:scale-105 text-sm uppercase tracking-wider"
              >
                <span>Reserve Free Ticket Now</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Virtual World Zones Detailed Section */}
      <section className="py-20 px-6 bg-slate-900/40 border-y border-white/10">
        <div className="max-w-6xl mx-auto space-y-20">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-fuchsia-100 to-pink-200">
              What Can Digital Age Expo Do For Your Business?
            </h2>
            <p className="mt-4 text-slate-300 text-sm sm:text-base font-medium">
              Explore our core virtual environments designed to drive engagement, knowledge sharing, and high-value sales.
            </p>
          </div>

          <div className="space-y-16">
            {virtualZones.map((zone, idx) => {
              const isEven = idx % 2 === 0;
              return (
                <div
                  key={idx}
                  className={`grid grid-cols-1 lg:grid-cols-2 gap-10 items-center rounded-3xl border border-white/10 bg-slate-900/80 p-8 sm:p-12 shadow-2xl backdrop-blur-md ${
                    isEven ? "" : "lg:grid-flow-dense"
                  }`}
                >
                  <div className={isEven ? "" : "lg:col-start-2"}>
                    <span className="inline-block rounded-full bg-fuchsia-500/20 border border-fuchsia-500/30 px-3 py-1 text-xs font-bold uppercase tracking-wider text-fuchsia-300 mb-3">
                      {zone.badge}
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-black uppercase text-white tracking-tight">
                      {zone.title}
                    </h3>
                    <p className="mt-3 text-sm text-slate-300 font-medium leading-relaxed">
                      {zone.description}
                    </p>

                    <div className="mt-6 space-y-2.5">
                      {zone.points.map((pt, pIdx) => (
                        <div key={pIdx} className="flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-fuchsia-400 shrink-0 mt-1" />
                          <span className="text-xs sm:text-sm font-semibold text-slate-200">
                            {pt}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-8">
                      <Link
                        href={zone.ctaLink}
                        className="btn-brand-gradient inline-flex items-center gap-2 rounded-full px-7 py-3 font-bold text-white shadow-md transition-all duration-300 hover:scale-105 text-xs uppercase tracking-wider"
                      >
                        <span>{zone.ctaText}</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>

                  <div className={`overflow-hidden rounded-2xl border border-white/20 bg-slate-950 p-2 shadow-2xl ${isEven ? "" : "lg:col-start-1"}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={zone.image}
                      alt={zone.title}
                      className="w-full h-auto rounded-xl object-cover hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bottom Exhibitor Discovery Call Banner */}
      <section className="relative overflow-hidden py-20 px-6 bg-gradient-to-r from-indigo-950 via-purple-900 to-fuchsia-950 border-t border-white/10 text-center">
        <div className="relative z-10 max-w-4xl mx-auto space-y-6">
          <Sparkles className="w-12 h-12 text-fuchsia-300 mx-auto animate-pulse" />
          <h2 className="text-3xl sm:text-5xl font-black uppercase text-white leading-tight">
            All Virtual Platforms Are FREE Included With Your Exhibition Stand
          </h2>
          <p className="text-base sm:text-lg text-slate-200 font-medium max-w-2xl mx-auto leading-relaxed">
            Book your stand now and become part of the FindUsOnWeb Business growth network. Schedule your 30-minute discovery session with our event directorship team today.
          </p>

          <div className="pt-4 flex flex-wrap justify-center gap-4">
            <Link
              href="/exhibitor-registration"
              className="btn-brand-gradient rounded-full px-10 py-4 font-bold text-white shadow-2xl transition-all duration-300 hover:scale-105 text-sm sm:text-base uppercase tracking-wider"
            >
              Book Discovery Call &amp; Stand
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
