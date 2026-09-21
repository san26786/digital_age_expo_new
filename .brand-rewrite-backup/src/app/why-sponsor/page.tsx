import { getDomain } from "@/lib/services/domain";
import { Award, Zap, TrendingUp, ShieldCheck, Target, Users } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Why Sponsor | Digital Age Expo",
  description: "Gain maximum brand exposure, thought leadership positioning, and premier access to B2B decision makers by sponsoring Digital Age Expo.",
};

export default async function WhySponsorPage() {
  const domain = await getDomain();

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      <div className="bg-indigo-950 text-white py-16 px-6 text-center">
        <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight">
          Why <span className="text-pink-500">Sponsor</span>
        </h1>
        <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto">
          Elevate your brand presence, lead industry conversations, and connect with premier corporate buyers.
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center mb-6">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-indigo-950 mb-2">Headline Visibility</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Your logo prominently displayed across all email marketing, main stage streams, press releases, and virtual hall lobbies.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-6">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-indigo-950 mb-2">Thought Leadership</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Deliver a keynote address or moderate high-profile panel sessions attended by top industry professionals.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-6">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-indigo-950 mb-2">Exclusive VIP Access</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Host private networking suites and engage in direct 1-on-1 video meetings with enterprise buyers.
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-pink-600 to-indigo-900 text-white rounded-3xl p-8 sm:p-12 text-center shadow-xl">
          <h2 className="text-2xl sm:text-3xl font-black uppercase">Ready to Partner With Us?</h2>
          <p className="mt-2 text-slate-200 text-sm max-w-xl mx-auto">
            Explore bespoke sponsorship packages tailored to your brand goals.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Link
              href="/sponsor_registration"
              className="px-8 py-3.5 bg-white text-indigo-950 font-bold rounded-xl text-sm uppercase tracking-wider shadow hover:bg-slate-100 transition"
            >
              Request Sponsorship
            </Link>
            <Link
              href="/sponsor_opportunity"
              className="px-8 py-3.5 bg-pink-500/20 border border-white/30 text-white font-bold rounded-xl text-sm uppercase tracking-wider hover:bg-pink-500/30 transition"
            >
              View Options
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}