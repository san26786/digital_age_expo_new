'use client';

import React from 'react';
import Link from 'next/link';
import { exhibitorLogoUrl } from "@/lib/assets";
import { ExhibitorLogo } from "@/components/exhibitors/ExhibitorLogo";
import { ChevronRight } from 'lucide-react';

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

export function FeaturedExhibitors({ exhibitors }: Props) {
  const featured = exhibitors.slice(0, 4);

  return (
    <section className="mx-auto max-w-6xl px-6 py-20 space-y-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
        <div className="space-y-4 max-w-2xl">
          <span className="text-xs font-bold font-mono text-fuchsia-400 uppercase tracking-widest block">
            THE TRADES COHORT
          </span>
          <h2 className="text-3xl font-black uppercase tracking-tight text-white sm:text-5xl">
            Featured Exhibitors
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            Book stand packages to showcase alongside these industry-leading technology operations.
          </p>
        </div>
        <Link 
          href="/exhibitors"
          className="flex items-center gap-2 text-xs text-fuchsia-400 hover:text-fuchsia-300 font-extrabold tracking-widest uppercase shrink-0 transition-colors"
        >
          <span>BROWSE ALL EXHIBITORS</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {featured.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featured.map((exh) => {
            const logo = exhibitorLogoUrl(exh.logo, exh.listingId, exh.logoExtension);

            return (
              <div 
                key={exh.id} 
                className="rounded-2xl glass-panel p-6 flex flex-col gap-5 min-h-[17rem] transition-all duration-350 hover:border-brand-pink/50 hover:shadow-lg hover:shadow-brand-pink/10 animate-fade-in"
                id={`featured-exh-${exh.id}`}
              >
                {/*
                  The logo is the reason an exhibitor card exists, so it gets the card's full
                  width and a real plate to sit on. It used to share a 48px square with 6px of
                  padding — about 36px of actual artwork — which rendered every wordmark as an
                  unreadable smudge and every initials fallback as tiny grey text. This matches
                  the treatment on /exhibitors (ExhibitorsGrid), so the same logo doesn't appear
                  at two wildly different sizes on two pages.

                  The stand badge moves above it rather than sitting alongside: at this width a
                  badge and a logo competing on one row is what forced the logo to be small.
                */}
                {exh.standNumber && (
                  <div className="flex justify-end">
                    <span className="bg-brand-pink/10 border border-brand-pink/20 text-brand-pink text-[10px] font-bold font-mono px-3 py-1 rounded-full uppercase">
                      Stand {exh.standNumber}
                    </span>
                  </div>
                )}
                <div className="flex h-24 w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner sm:h-28">
                  <ExhibitorLogo
                    src={logo}
                    business={exh.business}
                    className="max-h-full max-w-full object-contain"
                    fallbackClassName="text-3xl font-black uppercase tracking-tighter text-white/30"
                  />
                </div>
                <div className="space-y-1 mt-auto">
                  <h4 className="font-extrabold text-white text-md uppercase tracking-wider line-clamp-1">
                    {exh.business}
                  </h4>
                  {exh.website && (
                    <a 
                      href={exh.website} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-[11px] text-brand-pink hover:underline inline-block font-mono tracking-wider truncate max-w-full"
                    >
                      {exh.website.replace(/^https?:\/\/(www\.)?/, '')}
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 bg-surface-1/40 p-12 text-center glass-panel">
          <p className="text-zinc-400 font-medium">
            Exhibitor registrations are currently opening. Secure your spot now!
          </p>
          <Link
            href="/exhibitor-registration"
            className="mt-6 inline-block btn-brand-gradient rounded-full px-8 py-3.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg"
          >
            Enroll as Exhibitor
          </Link>
        </div>
      )}
    </section>
  );
}
