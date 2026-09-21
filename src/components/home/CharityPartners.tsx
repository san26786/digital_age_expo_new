import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { assetUrl, staticAssetUrl } from "@/lib/assets";

interface Partner {
  id: number;
  charity_name: string;
  logo: string | null;
}

const DEFAULT_PARTNER: Partner = {
  id: 1,
  charity_name: "Wessex Cancer Trust",
  logo: staticAssetUrl("/images/charity.png"),
};

/**
 * UI-ONLY REDESIGN. `partners`, the `DEFAULT_PARTNER` fallback, `assetUrl()` resolution and the
 * /charity-partnership route are unchanged.
 *
 * Two notes:
 *
 * 1. THE LOGO PLATE IS WHITE, for the same reason as the exhibitor cards: charity logos are
 *    supplied as flattened artwork with their own white background, so on a dark plate they
 *    render as a white rectangle floating inside a dark box. A white plate makes that background
 *    part of the design instead of an artefact.
 *
 * 2. The section was a tall centred column — heading, then a gap, then one logo, then a gap, then
 *    a button — which gave a single partner the vertical weight of a major section. It is now a
 *    band: copy on the left, partner(s) and the call to action on the right.
 */
export function CharityPartners({ partners }: { partners?: Partner[] }) {
  const displayPartners = partners && partners.length > 0 ? partners : [DEFAULT_PARTNER];

  return (
    <section className="relative overflow-hidden border-t border-white/[0.06] bg-[#0B0C20] px-5 py-14 text-white sm:px-6 sm:py-16">
      {/* Decorative field — non-interactive. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_85%_50%,rgba(108,43,255,0.24),transparent_60%),radial-gradient(ellipse_at_10%_20%,rgba(240,32,168,0.12),transparent_55%)]" />

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[1fr_1.15fr] lg:gap-14">
        <div className="text-center lg:text-left">
          <h2 className="text-xl font-black uppercase tracking-tight text-white sm:text-3xl">
            Our Charity Partners
          </h2>
          <p className="mt-2.5 text-sm text-[#A5A6C5]">
            Together for a better, more inclusive digital future.
          </p>
        </div>

        <div className="flex flex-col items-center gap-6 lg:flex-row lg:justify-end lg:gap-8">
          <div className="flex flex-wrap items-center justify-center gap-4">
            {displayPartners.map((partner) => {
              const logo = assetUrl(partner.logo) || DEFAULT_PARTNER.logo;
              return (
                <div
                  key={partner.id}
                  className="flex h-24 w-56 items-center justify-center rounded-xl border border-white/[0.12] bg-white p-4 shadow-[0_14px_40px_-16px_rgba(0,0,0,0.9)] transition-transform duration-300 hover:scale-105 sm:h-28 sm:w-64"
                >
                  {logo && (
                    // eslint-disable-next-line @next/next/no-img-element -- legacy asset hosts
                    // resolved through assetUrl(); next/image would need each one configured.
                    <img
                      src={logo}
                      alt={partner.charity_name}
                      loading="lazy"
                      className="max-h-full max-w-full object-contain"
                    />
                  )}
                </div>
              );
            })}
          </div>

          <Link
            href="/charity-partnership"
            className="btn-brand-gradient group inline-flex shrink-0 items-center gap-2 rounded-full px-7 py-3.5 text-xs font-bold uppercase tracking-widest text-white shadow-[0_10px_34px_-8px_rgba(240,32,168,0.6)] transition-all duration-300 hover:scale-105 active:scale-95"
          >
            Apply for Charity Partnership
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
