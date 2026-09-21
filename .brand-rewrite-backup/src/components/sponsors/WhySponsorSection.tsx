import React from "react";
import Link from "next/link";
import { Award, FileText, Sparkles, Users } from "lucide-react";

export function WhySponsorSection() {
  return (
    <section className="bg-gradient-to-b from-indigo-950 via-slate-950 to-purple-950 py-16 sm:py-20 px-6 text-white text-center border-t border-b border-white/10">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-fuchsia-500/20 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-fuchsia-300 border border-fuchsia-500/30">
          <Award className="w-4 h-4" />
          <span>Sponsorship Opportunities</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white">
          Why <span className="brand-gradient-text">Sponsor?</span>
        </h2>

        <h3 className="text-sm sm:text-lg font-bold uppercase tracking-wide text-fuchsia-200 max-w-3xl mx-auto leading-relaxed">
          YOUR OPPORTUNITY TO STAND OUT AND SKYROCKET YOUR BRAND EXPOSURE
        </h3>

        <div className="w-24 h-1 bg-gradient-to-r from-fuchsia-500 to-indigo-500 mx-auto rounded-full" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 text-left">
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-white/10 hover:border-fuchsia-500/40 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-fuchsia-500/20 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white uppercase tracking-tight">Global Brand Exposure</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Position your company directly in front of thousands of international business leaders, decision-makers, and industry innovators participating in the virtual expo.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/80 border border-white/10 hover:border-fuchsia-500/40 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-fuchsia-500/20 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-300">
              <Users className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white uppercase tracking-tight">High-Impact Leads</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Connect with highly targeted B2B audiences, generate qualified sales leads, and showcase your newest product or service offerings during live streams and keynotes.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/80 border border-white/10 hover:border-fuchsia-500/40 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-fuchsia-500/20 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-300">
              <Award className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white uppercase tracking-tight">Market Leadership</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Demonstrate industry authority by co-branding with Digital Age Expo 2026, gaining prominent feature placements across all event communications and marketing materials.
            </p>
          </div>
        </div>

        <div className="pt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/sponsor_opportunity"
            className="btn-brand-gradient inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-xs sm:text-sm font-extrabold uppercase tracking-wider text-white shadow-xl transition hover:scale-105"
          >
            <FileText className="w-4 h-4" />
            <span>Request Partnership Prospectus</span>
          </Link>

          <Link
            href="/our_sponsor"
            className="rounded-xl border border-white/20 bg-slate-800/90 px-7 py-3.5 text-xs sm:text-sm font-extrabold uppercase tracking-wider text-white hover:bg-slate-700 transition hover:scale-105"
          >
            View Sponsors
          </Link>
        </div>
      </div>
    </section>
  );
}
