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
 * Display-only tidy-up of a website string. The href is untouched — this is what the visitor
 * reads, not where the link goes. Dropping the query string matters more than it sounds: one
 * exhibitor's Instagram URL carries an `?igsh=...` share token that ate the whole line and
 * truncated mid-word.
 */
function displayWebsite(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\?.*$/, '').replace(/\/$/, '');
}

/**
 * UI-ONLY REDESIGN.
 *
 * ---------------------------------------------------------------------------
 *  WHY THE LOGO PLATE IS WHITE AND FULL-WIDTH
 * ---------------------------------------------------------------------------
 *
 *  The first pass put logos on a translucent dark plate, copying the reference. Rendered against
 *  the real data it looked broken, and the reason is the artwork: these exhibitor logos are JPEGs
 *  and flattened PNGs with their own WHITE backgrounds. A white-backed image on a dark plate
 *  reads as a small white sticker stuck inside a big dark box — which is exactly what it looked
 *  like. The reference gets away with dark plates because its logos are transparent PNGs drawn
 *  for a dark canvas; ours are not, and restyling cannot change the files.
 *
 *  So the plate is deliberately a solid light surface filling the card's width. A white-backed
 *  logo now blends into it seamlessly and a transparent one sits on white perfectly well, so both
 *  kinds of artwork look intentional instead of only the kind we do not have.
 *
 *  `exhibitors.slice(0, 4)` remains unchanged — how many exhibitors are featured is a content
 *  decision this component has always made, not something a restyle should quietly alter.
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
    <section className="relative overflow-hidden bg-[#0B0C20] px-5 py-14 text-white sm:px-6 sm:py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_110%,rgba(108,43,255,0.18),transparent_60%)]" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="text-center">
          <span className="text-[11px] font-black uppercase tracking-[0.3em] text-[#F020A8]">
            The Trades Cohort
          </span>
          <h2 className="mt-2.5 text-2xl font-black uppercase tracking-tight text-white sm:text-4xl">
            Featured Exhibitors
          </h2>
          <p className="mx-auto mt-2.5 max-w-2xl text-sm text-[#A5A6C5]">
            Book stand packages to showcase alongside these industry-leading technology operations.
          </p>
        </div>

        {featured.length > 0 ? (
          <div className="relative mt-9">
            {/* Arrows appear only when the row actually overflows — an arrow that pages through a
                row already fully visible is a control that does nothing when clicked. */}
            {scrollable && (
              <>
                <button
                  type="button"
                  onClick={() => scrollByPage(-1)}
                  aria-label="Previous exhibitors"
                  className="absolute -left-1 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#8B3DFF]/50 bg-[#10112A]/95 text-white backdrop-blur transition-all duration-300 hover:border-[#8B3DFF] hover:shadow-[0_0_20px_-4px_#8B3DFF] sm:flex lg:-left-6"
                >
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollByPage(1)}
                  aria-label="Next exhibitors"
                  className="absolute -right-1 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#F020A8]/50 bg-[#10112A]/95 text-white backdrop-blur transition-all duration-300 hover:border-[#F020A8] hover:shadow-[0_0_20px_-4px_#F020A8] sm:flex lg:-right-6"
                >
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </>
            )}

            <div
              ref={trackRef}
              className={`flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-6 [&::-webkit-scrollbar]:hidden ${
                scrollable ? '' : 'sm:justify-center'
              }`}
            >
              {featured.map((exh) => {
                const logo = exhibitorLogoUrl(exh.logo, exh.listingId, exh.logoExtension);

                return (
                  <div
                    key={exh.id}
                    id={`featured-exh-${exh.id}`}
                    className="group w-[15.5rem] shrink-0 snap-start rounded-[1.35rem] bg-gradient-to-br from-[#8B3DFF]/50 via-white/[0.06] to-[#F020A8]/40 p-px transition-all duration-300 hover:-translate-y-1.5 hover:from-[#8B3DFF] hover:to-[#F020A8] hover:shadow-[0_22px_55px_-20px_rgba(108,43,255,0.9)] sm:w-[16.5rem]"
                  >
                    <div className="flex h-full flex-col rounded-[1.3rem] bg-[#10112A] p-3.5">
                      {/* Light plate: fills the card so white-backed artwork blends instead of
                          reading as a sticker. See the note at the top of this file. */}
                      <div className="relative flex aspect-[16/10] w-full items-center justify-center overflow-hidden rounded-xl bg-[#F6F7FB] p-5">
                        <ExhibitorLogo
                          src={logo}
                          business={exh.business}
                          className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-[1.06]"
                          fallbackClassName="text-3xl font-black uppercase tracking-tight text-[#10112A]/70"
                        />

                        {exh.standNumber && (
                          <span className="absolute right-2 top-2 rounded-full border border-[#F020A8]/40 bg-[#08091A]/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#F020A8]">
                            Stand {exh.standNumber}
                          </span>
                        )}
                      </div>

                      <div className="mt-3.5 text-center">
                        <h4 className="line-clamp-1 text-base font-bold text-white transition-colors group-hover:text-[#F020A8]">
                          {exh.business}
                        </h4>
                        {exh.website && (
                          <a
                            href={exh.website}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 block truncate text-xs text-[#A5A6C5] transition-colors hover:text-white"
                          >
                            {displayWebsite(exh.website)}
                          </a>
                        )}
                      </div>
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
                      i === page ? 'w-6 bg-[#F020A8]' : 'w-2 bg-white/20'
                    }`}
                  />
                ))}
              </div>
            )}

            <div className="mt-9 flex justify-center">
              <Link
                href="/exhibitors"
                className="group inline-flex items-center gap-2 rounded-full border border-[#F020A8]/60 bg-[#F020A8]/[0.07] px-8 py-3.5 text-xs font-bold uppercase tracking-widest text-white backdrop-blur-md transition-all duration-300 hover:scale-105 hover:border-[#F020A8] hover:bg-[#F020A8]/15 hover:shadow-[0_0_30px_-6px_#F020A8] active:scale-95"
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
