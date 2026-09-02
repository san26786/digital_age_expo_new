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
                className="rounded-2xl glass-panel p-6 flex flex-col justify-between h-56 transition-all duration-350 hover:border-brand-pink/50 hover:shadow-lg hover:shadow-brand-pink/10 animate-fade-in"
                id={`featured-exh-${exh.id}`}
              >
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 bg-surface-2 flex items-center justify-center p-1.5 text-xs font-bold text-slate-400 shrink-0">
                    <ExhibitorLogo
                      src={logo}
                      business={exh.business}
                      className="h-full w-full object-contain"
                      fallbackClassName="text-xs font-bold uppercase text-slate-400"
                    />
                  </div>
                  {exh.standNumber && (
                    <span className="bg-brand-pink/10 border border-brand-pink/20 text-brand-pink text-[10px] font-bold font-mono px-3 py-1 rounded-full uppercase">
                      Stand {exh.standNumber}
                    </span>
                  )}
                </div>
                <div className="space-y-1 mt-6">
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
