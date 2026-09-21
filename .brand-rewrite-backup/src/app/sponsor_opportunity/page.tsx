import { getDomain } from "@/lib/services/domain";
import { getEventById } from "@/lib/services/events";
import { getSponsorshipTiers } from "@/lib/services/sponsors";
import { Check } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Sponsorship Options & Opportunities | Digital Age Expo",
  description: "Explore headline, zone, lounge, and workshop sponsorship opportunities at Digital Age Expo.",
};

export default async function SponsorOpportunityPage() {
  const domain = await getDomain();
  const event = domain.event_id ? await getEventById(domain.event_id) : null;
  const tiers = event ? await getSponsorshipTiers(event.id) : [];

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      <div className="bg-indigo-950 text-white py-16 px-6 text-center">
        <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight">
          Sponsorship <span className="text-pink-500">Opportunities</span>
        </h1>
        <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto">
          Tailored sponsorship tiers to fit your strategic objectives and campaign budget.
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {tiers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {tiers.map((tier: any) => {
              const isAvailable = tier.available - tier.used >= 0 && !tier.sold_out;
              return (
                <div key={tier.id} className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-indigo-950 mb-2">{tier.title}</h3>
                    <div className="text-3xl font-black text-pink-600 mb-6">£{tier.price.toLocaleString()}</div>
                    {tier.short_description && (
                      <p className="text-xs text-slate-600 mb-8 leading-relaxed flex items-start gap-2">
                        <Check className="w-4 h-4 text-pink-500 shrink-0 mt-0.5" />
                        <span>{tier.short_description}</span>
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Link
                      href={`/sponsor/${tier.id}`}
                      className="w-full py-3 border border-indigo-950 text-indigo-950 font-bold rounded-xl text-xs uppercase tracking-wider text-center block transition hover:bg-indigo-50"
                    >
                      View Details
                    </Link>
                    {isAvailable ? (
                      <Link
                        href={`/sponsor_registration?sponsorship_tier_id=${tier.id}`}
                        className="w-full py-3 bg-indigo-950 hover:bg-indigo-900 text-white font-bold rounded-xl text-xs uppercase tracking-wider text-center block transition"
                      >
                        Apply For Package
                      </Link>
                    ) : (
                      <span className="w-full py-3 bg-slate-200 text-slate-500 font-bold rounded-xl text-xs uppercase tracking-wider text-center block">
                        Sold Out
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-slate-600 font-medium">Sponsorship packages coming soon &mdash; check back shortly.</p>
        )}
      </div>
    </div>
  );
}