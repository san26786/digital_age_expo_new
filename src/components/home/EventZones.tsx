'use client';

import React from 'react';
import { Cpu, ShieldCheck, Coins, TrendingUp, type LucideIcon } from 'lucide-react';

interface Zone {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  /** Card wash + icon accent. Presentational only. */
  from: string;
  to: string;
  accent: string;
}

/**
 * UI-ONLY REDESIGN. Zone names, descriptions and icons are untouched — only the card treatment
 * changed. Two things were actually wrong before, not merely plain:
 *
 * 1. `h-64` with `justify-between` forced every card to a fixed height and then pushed the icon
 *    to the top and the text to the bottom, leaving a large dead gap in the middle of each one.
 *    Cards now size to their content and a grid row stretches them to match each other, so they
 *    stay aligned without anyone declaring a height.
 *
 * 2. All four cards were the same flat `bg-slate-950`, so the row read as one long dark band. A
 *    per-zone wash makes them legible as four distinct areas — which is the entire point of a
 *    section about zones.
 *
 * The washes are low-opacity gradients over a dark base rather than saturated fills: at full
 * strength the white body copy on top of them drops below a comfortable contrast ratio.
 */
const ZONES: Zone[] = [
  {
    id: 'z-ai',
    name: 'Artificial Intelligence Zone',
    description:
      'Explore the bleeding-edge of machine learning, neural accelerators, generative transformers, and cognitive automation.',
    icon: Cpu,
    from: '#6C2BFF',
    to: '#8B3DFF',
    accent: '#B08CFF',
  },
  {
    id: 'z-cyber',
    name: 'Cyber Security & Trust',
    description:
      'Hardening enterprise postures with post-quantum cryptography, zero-trust architectures, and seamless audit logs.',
    icon: ShieldCheck,
    from: '#246BFD',
    to: '#00C8FF',
    accent: '#5FD8FF',
  },
  {
    id: 'z-fin',
    name: 'FinTech & Digital Assets',
    description:
      'Pioneering the future of instant corporate clearing, decentralised accounting ledgers, and secure financial assets.',
    icon: Coins,
    from: '#00C8FF',
    to: '#246BFD',
    accent: '#7FE0FF',
  },
  {
    id: 'z-cloud',
    name: 'Cloud & Scaling Operations',
    description:
      'Harnessing serverless infrastructure, global content orchestration, and real-time edge processing for modern web apps.',
    icon: TrendingUp,
    from: '#F020A8',
    to: '#8B3DFF',
    accent: '#FF7ACF',
  },
];

export function EventZones() {
  return (
    <section className="relative overflow-hidden border-y border-white/[0.06] bg-[#0B0C20] px-5 py-16 text-white sm:px-6 sm:py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(108,43,255,0.18),transparent_60%)]" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-[11px] font-black uppercase tracking-[0.3em] text-[#F020A8] sm:text-xs">
            The Architecture Of Innovation
          </span>
          <h2 className="mt-3 text-2xl font-black uppercase tracking-tight text-white sm:text-4xl">
            Specialised Trade Zones
          </h2>
          <p className="mt-3 text-sm text-[#A5A6C5] sm:text-base">
            Structured virtual environments to keep exhibition halls organized and perfectly
            navigated.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
          {ZONES.map((zone) => {
            const Icon = zone.icon;
            return (
              <div
                key={zone.id}
                id={`event-zone-${zone.id}`}
                className="group relative flex flex-col items-center overflow-hidden rounded-2xl border border-white/[0.1] bg-[#10112A] p-6 text-center transition-all duration-300 hover:-translate-y-1.5 hover:border-white/25"
              >
                {/* Per-zone wash. Kept low so the copy above it stays readable. */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-70 transition-opacity duration-300 group-hover:opacity-100"
                  style={{ backgroundImage: `linear-gradient(150deg, ${zone.from}38, ${zone.to}12 65%, transparent)` }}
                />
                {/* Top hairline in the zone's own colour. */}
                <div
                  className="pointer-events-none absolute inset-x-8 top-0 h-px"
                  style={{ background: `linear-gradient(90deg, transparent, ${zone.accent}, transparent)` }}
                />

                <span
                  className="relative flex h-14 w-14 items-center justify-center rounded-2xl border transition-transform duration-300 group-hover:scale-110"
                  style={{
                    borderColor: `${zone.accent}55`,
                    backgroundColor: `${zone.from}22`,
                    boxShadow: `0 0 26px -10px ${zone.accent}`,
                  }}
                >
                  <Icon className="h-7 w-7" style={{ color: zone.accent }} aria-hidden="true" />
                </span>

                <h4 className="relative mt-5 text-sm font-black uppercase leading-snug tracking-wide text-white sm:text-[0.95rem]">
                  {zone.name}
                </h4>

                <p className="relative mt-2.5 text-xs leading-relaxed text-[#A5A6C5] sm:text-[0.8rem]">
                  {zone.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
