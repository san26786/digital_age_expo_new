import { getDomain } from "@/lib/services/domain";
import { getStandPackages } from "@/lib/services/exhibitors";
import { Check, ShieldCheck } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Stands & Packages | Digital Age Expo",
  description: "Explore virtual booth stand packages and membership options for Digital Age Expo exhibitors.",
};

const PERIOD_LABELS: Record<string, string> = {
  month: "month",
  months: "months",
  year: "year",
  years: "years",
  week: "week",
  weeks: "weeks",
  day: "day",
  days: "days",
  once: "event pass",
};

function formatPeriod(period: string, periodCount: number) {
  const label = PERIOD_LABELS[period?.toLowerCase()] || period || "event pass";
  if (!periodCount || periodCount <= 1 || label === "event pass") return label;
  return `${periodCount} ${label}`;
}

// Static fallback shown only if this domain has no real pricing rows configured yet in
// find_products / find_products_pricing (see getStandPackages).
const FALLBACK_PACKAGES = [
  {
    id: -1,
    name: "Starter Virtual Stand",
    price: 499,
    period: "event pass",
    description: [
      "Standard 3D Virtual Stand",
      "Company Profile & Product Gallery",
      "Live Chat & Enquiry Forms",
      "Up to 2 Representative Badges",
      "Basic Lead Analytics",
    ],
  },
  {
    id: -2,
    name: "Pro Growth Package",
    price: 999,
    period: "event pass",
    description: [
      "Featured Sector Zone Position",
      "Custom Banner & Video Screen Embeds",
      "1-on-1 Live Video Calling",
      "Up to 5 Representative Badges",
      "1x Workshop / Presentation Slot",
      "Full Lead Contact Export",
    ],
  },
  {
    id: -3,
    name: "Headline Enterprise Package",
    price: 2499,
    period: "event pass",
    description: [
      "Premium Main Lobby Exhibition Position",
      "Custom 3D Booth Design & Branding",
      "Main Stage Keynote Session (20 Mins)",
      "VIP Lounge & Speed Networking Access",
      "Unlimited Staff Badges",
      "Dedicated Account & Support Manager",
    ],
  },
];

export default async function MembershipPackagesPage() {
  const domain = await getDomain();
  const standPackages = await getStandPackages(domain.id);

  const usingFallback = standPackages.packages.length === 0;
  const packages = usingFallback
    ? FALLBACK_PACKAGES
    : standPackages.packages.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        period: formatPeriod(p.period, p.periodCount),
        description: p.description,
      }));

  // Highlight the middle-priced package (or the priciest of two) as "most popular", mirroring the
  // general pattern of the legacy pricing page without inventing data that isn't in the DB.
  const popularIndex =
    packages.length >= 3 ? Math.floor(packages.length / 2) : packages.length === 2 ? 1 : -1;

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      <div className="bg-indigo-950 text-white py-16 px-6 text-center">
        <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight">
          {usingFallback ? (
            <>
              Stands & <span className="text-pink-500">Packages</span>
            </>
          ) : (
            standPackages.title
          )}
        </h1>
        <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto">
          Choose the right virtual exhibition package tailored to your growth goals.
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {packages.map((pkg, idx) => {
            const isPopular = idx === popularIndex;
            const features = Array.isArray(pkg.description)
              ? pkg.description
              : (pkg.description || "")
                  .split(/\r?\n/)
                  .map((line) => line.replace(/^[-*•]\s*/, "").trim())
                  .filter(Boolean);

            return (
              <div
                key={pkg.id}
                className={`rounded-2xl p-8 bg-white border flex flex-col justify-between transition relative ${
                  isPopular
                    ? "border-pink-500 shadow-xl ring-2 ring-pink-500/20"
                    : "border-slate-200 shadow-sm hover:shadow-md"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-pink-500 text-white text-xs font-bold uppercase tracking-wider shadow">
                    Most Popular
                  </div>
                )}

                <div>
                  <h3 className="text-xl font-bold text-indigo-950">{pkg.name}</h3>
                  <div className="mt-4 mb-6">
                    <span className="text-3xl font-black text-indigo-950">
                      £{pkg.price.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-500 font-medium"> / {pkg.period}</span>
                  </div>

                  {features.length > 0 && (
                    <ul className="space-y-3 mb-8 text-xs text-slate-600">
                      {features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <Check className="w-4 h-4 text-pink-500 shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <Link
                  href="/exhibitor-registration"
                  className={`w-full py-3 rounded-xl font-bold text-center text-xs uppercase tracking-wider transition ${
                    isPopular
                      ? "bg-pink-600 hover:bg-pink-700 text-white shadow-md"
                      : "bg-indigo-950 hover:bg-indigo-900 text-white"
                  }`}
                >
                  Select Package
                </Link>
              </div>
            );
          })}
        </div>

        <div className="mt-10 flex items-center justify-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-indigo-950/60" />
          <span>All packages include secure payment and dedicated exhibitor support.</span>
        </div>
      </div>
    </div>
  );
}
