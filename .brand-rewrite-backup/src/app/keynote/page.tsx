import { getDomain } from "@/lib/services/domain";
import { Sparkles, Mic } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Keynote Sessions | Digital Age Expo",
  description: "Main stage keynote addresses by visionary founders, executives, and keynote speakers.",
};

export default async function KeynotePage() {
  const domain = await getDomain();

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      <div className="bg-indigo-950 text-white py-16 px-6 text-center">
        <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight">
          Keynote <span className="text-pink-500">Sessions</span>
        </h1>
        <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto">
          Visionary keynotes inspiring the next decade of technology, digital commerce, and leadership.
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 text-center">
        <Link
          href="/view_speaker"
          className="inline-block px-8 py-3.5 bg-indigo-950 hover:bg-indigo-900 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition shadow-md"
        >
          See Keynote Speakers
        </Link>
      </div>
    </div>
  );
}