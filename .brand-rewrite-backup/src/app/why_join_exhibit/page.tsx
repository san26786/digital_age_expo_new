import {
  Radio,
  Mic,
  BarChart3,
  Sparkles,
  Database,
  Camera,
  CheckCircle2,
  ArrowRight,
  Video,
} from "lucide-react";
import Link from "next/link";
import { getDomain } from "@/lib/services/domain";
import { getWhyJoinExhibitContent } from "@/lib/services/exhibitors";
import { assetUrl, staticAssetUrl } from "@/lib/assets";

export const metadata = {
  title: "Why Join & Exhibit | Digital Age Expo",
  description:
    "Discover why participating as an exhibitor at Digital Age Expo accelerates your growth, generates high-value leads, and elevates your brand.",
};

const REASON_ICONS = [Radio, Mic, BarChart3, Sparkles, Database, Camera];
const REASON_COLORS = [
  "from-fuchsia-500 to-pink-500",
  "from-purple-500 to-indigo-500",
  "from-pink-500 to-rose-500",
  "from-indigo-500 to-purple-500",
  "from-fuchsia-600 to-purple-600",
  "from-rose-500 to-pink-600",
];

const DEFAULT_REASONS: { title: string; description: string; image: string | null }[] = [
  {
    title: "Networking",
    description:
      "Meet Potential Customers — With the ability to create powerful rapport with face-to-face video calling interactions and live chat conversations, you can transform your business. A future paying client could be right in front of you.",
    image: null,
  },
  {
    title: "Great Speakers",
    description:
      "Welcoming some of the UK’s leading speakers and industry experts on the Keynote Stage, Seminar Zones, and Expert Workshops! Gain valuable tips and insights to up-skill and implement in your business.",
    image: null,
  },
  {
    title: "Lead Generation",
    description:
      "Create strong rapport with face-to-face video calling interactions and live chat conversations. Discover attendee needs in real time and position your products and services as the ideal solution.",
    image: null,
  },
  {
    title: "New Opportunities",
    description:
      "Exhibiting or sponsoring at the event allows new ideas to develop, project collaborations to form, and chance meetings with key individuals you wouldn’t otherwise have met.",
    image: null,
  },
  {
    title: "Build Database",
    description:
      "Meeting with potential customers at the Show helps you build targeted marketing lists and generate highly qualified, sales-ready leads for your pipeline.",
    image: null,
  },
  {
    title: "Brand Awareness",
    description:
      "Raising Awareness with New People — Exhibiting or sponsoring is a proven way to raise your company profile and generate long-lasting brand awareness across international markets.",
    image: null,
  },
];

export default async function WhyJoinExhibitPage() {
  const domain = await getDomain();
  const content = await getWhyJoinExhibitContent(domain.linked_profile_listing_id);

  const dynamicReasons = content.reasons.map((r: any, i: number) => ({
    title: r.section_title || DEFAULT_REASONS[i % DEFAULT_REASONS.length].title,
    description: r.section_description || DEFAULT_REASONS[i % DEFAULT_REASONS.length].description,
    image: r.opportunity_images || null,
  }));

  const reasons = (dynamicReasons.length > 0 ? dynamicReasons : DEFAULT_REASONS).map((r: any, i: number) => ({
    ...r,
    icon: REASON_ICONS[i % REASON_ICONS.length],
    color: REASON_COLORS[i % REASON_COLORS.length],
  }));

  const sectionHeading = content.intro?.section_title || "6 Reasons To Join The Show";
  const sectionSubheading =
    content.intro?.section_description ||
    "Transform your business trajectory with cutting-edge virtual networking and sales tools";

  const features = [
    {
      title: "Exceptional Keynote Speakers",
      image: staticAssetUrl("/images/event_feature3.jpg"),
      description:
        "Digital Age Expo proudly welcomes industry experts from around the world to share their newest findings, strategies, and business practices on our Keynote Stage.",
    },
    {
      title: "Interactive Masterclasses",
      image: staticAssetUrl("/images/event_feature3.jpg"),
      description:
        "Opportunity to receive mentoring and education from industry experts covering everything from financing and trademarks to marketing and property.",
    },
    {
      title: "Unparalleled Networking Opportunities",
      image: staticAssetUrl("/images/event_feature4.jpg"),
      description:
        "Connect with leaders in your industry. Discuss new ideas, business tips, or find out about sourcing and selling the latest cutting-edge products.",
    },
    {
      title: "Source Newest Products & Services",
      image: staticAssetUrl("/images/event_feature1.jpg"),
      description:
        "Meet over 500 industry-leading exhibitors showcasing all the latest products and services needed to take your business revenue to the next level.",
    },
  ];

  return (
    <div className="bg-slate-950 text-white min-h-screen">
      {/* Hero Header */}
      <section
        className="relative overflow-hidden bg-cover bg-center bg-no-repeat px-6 py-24 sm:py-32 text-center"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgb(var(--color-slate-900-rgb) / 0.88), rgb(var(--color-violet-900-rgb) / 0.85), rgb(var(--color-slate-900-rgb) / 0.95)), url('${staticAssetUrl("https://digitalageexpo.com/files/listing_pages/818073-dae_index_top_banner.jpg")}')`,
        }}
      >
        <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-fuchsia-600/30 blur-3xl" />
        
        <div className="relative z-10 max-w-4xl mx-auto">
          <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-fuchsia-400">
            Digital Age Expo Virtual Exhibition
          </p>
          <h1 className="mt-3 text-3xl sm:text-6xl font-black uppercase tracking-tight text-white drop-shadow-md">
            Why You Should <span className="brand-gradient-text">Join & Exhibit</span>
          </h1>
          <p className="mt-6 text-base sm:text-lg text-slate-200 font-medium leading-relaxed max-w-3xl mx-auto drop-shadow-sm">
            Exhibiting at this Business Show puts your business face to face with hundreds of SME owners and senior decision makers looking for innovative products and services to maximize revenue.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/exhibitor-registration"
              className="btn-brand-gradient rounded-full px-8 py-3.5 font-bold text-white shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 text-sm uppercase tracking-wider"
            >
              Enroll as Exhibitor
            </Link>
            <Link
              href="/buy_tickets"
              className="btn-outline-animated rounded-full bg-white/10 px-8 py-3.5 font-bold text-white ring-1 ring-white/30 backdrop-blur-md transition-all duration-300 hover:bg-white/20 hover:scale-105 active:scale-95 text-sm uppercase tracking-wider"
            >
              Buy Pass / Ticket
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Cards Showcase */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white">
            Event Highlights & Experiences
          </h2>
          <p className="mt-3 text-slate-300 text-sm sm:text-base font-medium">
            Discover how Digital Age Expo empowers entrepreneurs and companies worldwide
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feat, index) => (
            <div
              key={index}
              className="group relative flex flex-col overflow-hidden rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl transition-all duration-300 hover:-translate-y-2 hover:border-fuchsia-500/50 hover:shadow-2xl hover:shadow-fuchsia-950/50"
            >
              <div className="aspect-[4/3] w-full overflow-hidden bg-slate-950 relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={feat.image}
                  alt={feat.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
              </div>

              <div className="flex flex-col flex-1 p-6">
                <h3 className="text-lg font-bold text-white group-hover:text-fuchsia-300 transition-colors">
                  {feat.title}
                </h3>
                <p className="mt-3 text-xs text-slate-300 leading-relaxed font-medium flex-1">
                  {feat.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6 Key Reasons Panel */}
      <section className="py-20 px-6 bg-slate-900/60 border-y border-white/10 relative overflow-hidden">
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-96 max-w-5xl bg-purple-600/10 blur-3xl rounded-full" />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-fuchsia-100 to-pink-200">
              {sectionHeading}
            </h2>
            <p className="mt-4 text-slate-300 text-sm sm:text-base font-medium">
              {sectionSubheading}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {reasons.map((item: any, idx: number) => {
              const IconComp = item.icon;
              return (
                <div
                  key={idx}
                  className="group relative flex flex-col justify-between rounded-2xl bg-slate-950 p-8 border border-white/10 backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 hover:border-fuchsia-500/40 hover:shadow-2xl hover:shadow-purple-950/60"
                >
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div className={`p-3.5 rounded-xl bg-gradient-to-br ${item.color} text-white shadow-md group-hover:scale-110 transition-transform`}>
                        {item.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={assetUrl(item.image)} alt="" className="w-6 h-6 object-contain" />
                        ) : (
                          <IconComp className="w-6 h-6" />
                        )}
                      </div>
                      <span className="text-2xl font-black text-slate-800 group-hover:text-fuchsia-500/30 transition-colors">
                        0{idx + 1}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-fuchsia-300 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                      {item.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-2 text-xs font-bold text-fuchsia-400 group-hover:text-fuchsia-200 transition-colors">
                    <span>Learn More</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Virtual Exhibition Stand How It Works Section */}
      <section className="py-20 px-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-fuchsia-400">
              Interactive Booth Technology
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-black uppercase tracking-tight text-white leading-tight">
              This Is How A Virtual Exhibition Stand Works…
            </h2>
            <p className="mt-4 text-sm text-slate-300 leading-relaxed font-medium">
              Virtual stands work pretty much the same as live in-person events — without the hassle of standing around all day!
            </p>

            <div className="mt-6 space-y-3">
              {[
                "Branding your stand with your custom company logo and imagery",
                "Showcase your website and social media channels directly",
                "Promote high-converting video pitch or presentation decks",
                "Present company brochures, leaflets, and downloadable PDFs",
                "Engage in real-time with instant 1-on-1 video call & chat capabilities",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-fuchsia-400 shrink-0 mt-0.5" />
                  <span className="text-sm font-semibold text-slate-200">{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/exhibitor-registration"
                className="btn-brand-gradient rounded-full px-8 py-3.5 font-bold text-white shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 text-sm uppercase tracking-wider"
              >
                Book Your Stand Now
              </Link>
              <Link
                href="/exhibitors"
                className="btn-outline-animated rounded-full bg-white/10 px-8 py-3.5 font-bold text-white ring-1 ring-white/30 backdrop-blur-md transition-all duration-300 hover:bg-white/20 hover:scale-105 active:scale-95 text-sm uppercase tracking-wider"
              >
                View Exhibitors
              </Link>
            </div>
          </div>

          <div className="space-y-6">
            <div className="overflow-hidden rounded-2xl border border-white/15 bg-slate-900 p-2 shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={staticAssetUrl("/images/exhibitor.jpg")}
                alt="Exhibitor Stand Overview"
                className="w-full h-auto rounded-xl object-cover hover:scale-[1.02] transition-transform duration-300"
              />
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/15 bg-slate-900 p-2 shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={staticAssetUrl("/images/exhibition.png")}
                alt="Virtual Exhibition Platform"
                className="w-full h-auto rounded-xl object-cover hover:scale-[1.02] transition-transform duration-300"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="py-16 px-6 bg-gradient-to-r from-indigo-950 via-purple-900 to-fuchsia-950 border-t border-white/10 text-center">
        <div className="max-w-4xl mx-auto">
          <Video className="w-12 h-12 text-fuchsia-300 mx-auto mb-4 animate-bounce" />
          <h2 className="text-3xl sm:text-5xl font-black uppercase text-white">
            Step Up For Organic Business Growth
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-200 max-w-2xl mx-auto font-medium leading-relaxed">
            Ready to exhibit your business to over 2500+ SME owners and decision-makers? Contact our team today or enroll online in under 3 minutes.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/exhibitor-registration"
              className="btn-brand-gradient rounded-full px-10 py-4 font-bold text-white shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 text-sm sm:text-base uppercase tracking-wider"
            >
              Enroll as Exhibitor
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
