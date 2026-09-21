import React from "react";
import Link from "next/link";
import { Mic, Sparkles } from "lucide-react";

export function BecomeSpeakerSection() {
  return (
    <section className="bg-gradient-to-b from-indigo-950 via-slate-950 to-purple-950 py-16 sm:py-20 px-6 text-white text-center border-t border-white/10">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-fuchsia-500/20 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-fuchsia-300 border border-fuchsia-500/30">
          <Mic className="w-4 h-4" />
          <span>Call for Speakers</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white">
          Become A <span className="brand-gradient-text">Speaker</span>
        </h2>

        <h3 className="text-sm sm:text-lg font-bold uppercase tracking-wide text-fuchsia-200 max-w-3xl mx-auto leading-relaxed">
          REPRESENT INNOVATION, LEADERSHIP AND CONSCIOUSNESS TO SHARE YOUR STORY AS A MARKET LEADER
        </h3>

        <div className="w-24 h-1 bg-gradient-to-r from-fuchsia-500 to-indigo-500 mx-auto rounded-full" />

        <div className="space-y-4 text-xs sm:text-base text-slate-300 font-medium max-w-4xl mx-auto leading-relaxed text-center sm:text-justify pt-2">
          <p>
            Do you have a story to tell? Join the list of industry leaders and experts to share impactful knowledge with attendees, entrepreneurs, and businesses from all over the world. Digital Age Expo proudly welcomes industry experts from around the world to share their newest findings, strategies, and business practices. The strength of our program is founded on the quality of its research, so we reach out to those who want to share their experiences, their frustrations and their aspirations with this targeted audience.
          </p>
          <p>
            Interested in speaking at the Digital Age Expo and virtual conference? Have a great case study, data or insights to share from the worlds of ecommerce, online retail, marketing, advertising or social media? Do you have expertise in the most current, economical, or environmental practices? Are you a leader with new and innovative ideas? Are you a researcher with ground-breaking findings?
          </p>
          <p>
            In particular we are looking for speakers who represent Innovation, Leadership, Consciousness and Connection and are driven to improve the customer experience in every aspect of their business. Apply to be one of our conference speakers at a Digital Age Expo and participate as one the best in the leadership marketing arena. Get in touch!
          </p>
        </div>

        <div className="pt-6 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/speaker_registration"
            className="btn-brand-gradient inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-xs sm:text-sm font-extrabold uppercase tracking-wider text-white shadow-xl transition hover:scale-105"
          >
            <Sparkles className="w-4 h-4" />
            <span>Request Speaker Slot</span>
          </Link>

          <Link
            href="/view_speaker"
            className="rounded-xl border border-white/20 bg-slate-800/90 px-6 py-3.5 text-xs sm:text-sm font-extrabold uppercase tracking-wider text-white hover:bg-slate-700 transition hover:scale-105"
          >
            View Speaker
          </Link>

          <Link
            href="/speaker_registration"
            className="btn-brand-gradient inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-xs sm:text-sm font-extrabold uppercase tracking-wider text-white shadow-xl transition hover:scale-105"
          >
            <Sparkles className="w-4 h-4" />
            <span>Request Keynote Speaker</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
