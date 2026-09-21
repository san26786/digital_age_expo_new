'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { exhibitorLogoUrl } from '@/lib/assets';
import { ExhibitorLogo } from '@/components/exhibitors/ExhibitorLogo';

interface Exhibitor {
  id: number;
  business: string;
  website: string | null;
  logo: string | null;
  listingId: number | null;
  logoExtension: string | null;
  standNumber: string | null;
}

interface Props {
  exhibitors: Exhibitor[];
}

/**
 * UI-ONLY REDESIGN, matching the carousel used by SpeakersGrid so the two strips behave
 * identically rather than each inventing its own scrolling.
 *
 * `exhibitors.slice(0, 4)` IS DELIBERATELY UNCHANGED. The reference shows five cards and this
 * shows at most four, which looks like an oversight and is not one: how many exhibitors are
 * featured is a content decision this component has always made, and quietly raising the number
 * would change what the homepage promotes. It is a single digit to change if you want five —
 * but that is your call, not a side effect of a restyle.
 *
 * Arrows and dots are therefore CONDITIONAL on the track actually overflowing. With four cards on
 * a wide screen nothing scrolls, and a carousel offering to page through a row that already fits
 * is a control that does nothing when clicked.
 *
 * Logo rendering still goes through the shared <ExhibitorLogo> and `exhibitorLogoUrl()`, so the
 * same logo (and the same initials fallback) appears here and on /exhibitors.
 */
export function FeaturedExhibitors({ exhibitors }: Props) {
  const featured = exhibitors.slice(0, 4);

  const trackRef = useRef<HTMLDivElement | null>(null);
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(1);

  const recalculate = useCallback(() => {
    const el = trackRef.current;
    if (!el || el.clientWidth === 0) return;
    setPageCount(Math.max(1, Math.ceil(el.scrollWidth / el.clientWidth)));
    setPage(Math.round(el.scrollLeft / el.clientWidth));
  }, []);

  useEffect(() => {
    recalculate();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener('scroll', recalculate, { passive: true });
    window.addEventListener('resize', recalculate);
    return () => {
      el.removeEventListener('scroll', recalculate);
      window.removeEventListener('resize', recalculate);
    };
  }, [recalculate, featured.length]);

  const scrollByPage = (direction: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: 'smooth' });
  };

  const scrollable = pageCount > 1;

  return (
    <section className="relative overflow-hidden bg-[#0B0C20] px-5 py-16 text-white sm:px-6 sm:py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(108,43,255,0.16),transparent_60%)]" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="text-center">
          <span className="text-[11px] font-black uppercase tracking-[0.3em] text-[#F020A8] sm:text-xs">
            The Trades Cohort
          </span>
          <h2 className="mt-3 text-2xl font-black uppercase tracking-tight text-white sm:text-4xl">
            Featured Exhibitors
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-[#A5A6C5] sm:text-base">
            Book stand packages to showcase alongside these industry-leading technology operations.
          </p>
        </div>

        {featured.length > 0 ? (
          <div className="relative mt-10">
            {scrollable && (
              <>
                <button
                  type="button"
                  onClick={() => scrollByPage(-1)}
                  aria-label="Previous exhibitors"
                  className="absolute -left-2 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#8B3DFF]/40 bg-[#10112A]/90 text-white backdrop-blur transition-all duration-300 hover:border-[#8B3DFF] hover:shadow-[0_0_20px_-4px_#8B3DFF] sm:flex lg:-left-5"
                >
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollByPage(1)}
                  aria-label="Next exhibitors"
                  className="absolute -right-2 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#F020A8]/40 bg-[#10112A]/90 text-white backdrop-blur transition-all duration-300 hover:border-[#F020A8] hover:shadow-[0_0_20px_-4px_#F020A8] sm:flex lg:-right-5"
                >
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </>
            )}

            <div
              ref={trackRef}
              className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-5 [&::-webkit-scrollbar]:hidden"
            >
              {featured.map((exh) => {
                const logo = exhibitorLogoUrl(exh.logo, exh.listingId, exh.logoExtension);

                return (
                  <div
                    key={exh.id}
                    id={`featured-exh-${exh.id}`}
                    className="group relative flex w-[15rem] shrink-0 snap-start flex-col rounded-2xl border border-white/[0.09] bg-[#10112A]/80 p-4 text-center backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-[#8B3DFF]/60 hover:shadow-[0_20px_50px_-18px_rgba(108,43,255,0.8)] sm:w-[16.5rem]"
                  >
                    {exh.standNumber && (
                      <span className="absolute right-3 top-3 rounded-full border border-[#F020A8]/25 bg-[#F020A8]/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#F020A8]">
                        Stand {exh.standNumber}
                      </span>
                    )}

                    {/*
                      The logo is the reason an exhibitor card exists, so it gets the card's full
                      width and a real plate to sit on — the same treatment as /exhibitors, so one
                      logo never appears at two wildly different sizes across two pages.
                    */}
                    <div className="flex h-24 w-full items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.04] p-4 sm:h-28">
                      <ExhibitorLogo
                        src={logo}
                        business={exh.business}
                        className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                        fallbackClassName="text-2xl font-black uppercase tracking-tight text-[#EDEDF8]"
                      />
                    </div>

                    <div className="mt-4">
                      <h4 className="line-clamp-1 text-sm font-bold text-white transition-colors group-hover:text-[#F020A8] sm:text-base">
                        {exh.business}
                      </h4>
                      {exh.website && (
                        <a
                          href={exh.website}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 block truncate text-xs text-[#A5A6C5] transition-colors hover:text-[#00C8FF]"
                        >
                          {exh.website.replace(/^https?:\/\/(www\.)?/, '')}
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {scrollable && (
              <div className="mt-6 flex items-center justify-center gap-2">
                {Array.from({ length: pageCount }).map((_, i) => (
                  <span
                    key={i}
                    aria-hidden="true"
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === page ? 'w-6 bg-gradient-to-r from-[#F020A8] to-[#8B3DFF]' : 'w-2 bg-white/20'
                    }`}
                  />
                ))}
              </div>
            )}

            <div className="mt-10 flex justify-center">
              <Link
                href="/exhibitors"
                className="group inline-flex items-center gap-2 rounded-full border border-[#F020A8]/50 bg-white/[0.04] px-8 py-3.5 text-xs font-bold uppercase tracking-widest text-white backdrop-blur-md transition-all duration-300 hover:scale-105 hover:border-[#F020A8] hover:shadow-[0_0_28px_-6px_#F020A8] active:scale-95"
              >
                Browse All Exhibitors
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-10 rounded-2xl border border-dashed border-white/10 bg-[#10112A]/50 p-12 text-center">
            <p className="font-medium text-[#A5A6C5]">
              Exhibitor registrations are currently opening. Secure your spot now!
            </p>
            <Link
              href="/exhibitor-registration"
              className="btn-brand-gradient mt-6 inline-block rounded-full px-8 py-3.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg transition-all duration-300 hover:scale-105 active:scale-95"
            >
              Enroll as Exhibitor
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
