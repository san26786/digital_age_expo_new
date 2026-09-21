import { getDomain } from "@/lib/services/domain";
import { ExhibitorInformationForm } from "@/components/exhibitors/ExhibitorInformationForm";
import { Sparkles, Calendar, Store } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Exhibitor Information | Digital Age Expo",
  description: "Digital Age Expo 2026 exhibitor information and booth asset submission form.",
};

export default async function ExhibitorInformationPage() {
  const domain = await getDomain();

  return (
    <div className="w-full bg-slate-950 text-white min-h-screen pb-24">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-b from-purple-950 via-slate-950 to-slate-950 px-6 py-20 text-center border-b border-white/10">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-fuchsia-500/20 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-fuchsia-300 border border-fuchsia-500/30">
            <Sparkles className="w-4 h-4" />
            <span>Digital Age Expo 2026</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tight text-white">
            Exhibitor <span className="brand-gradient-text">Information</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto font-medium">
            Submit your company details, virtual booth assets, social links, and exhibition stand configuration.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 space-y-12">
        {/* Deadlines Card */}
        <div className="rounded-3xl border border-white/15 bg-slate-900/90 p-8 shadow-xl backdrop-blur-md space-y-6">
          <h2 className="text-xl font-black uppercase tracking-wider text-fuchsia-400 flex items-center gap-2">
            <Calendar className="w-5 h-5" /> Key Deadlines &amp; Setup Guide
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="p-4 bg-slate-950 rounded-2xl border border-white/10">
              <div className="font-extrabold text-white">Booth Content Submission</div>
              <div className="text-xs text-slate-400 mt-1">7 Days Prior to Event Start</div>
            </div>
            <div className="p-4 bg-slate-950 rounded-2xl border border-white/10">
              <div className="font-extrabold text-white">Staff Badge Allocation</div>
              <div className="text-xs text-slate-400 mt-1">3 Days Prior to Event Start</div>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <ExhibitorInformationForm />
      </div>
    </div>
  );
}
