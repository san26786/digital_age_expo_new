'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, GraduationCap, Lightbulb, TrendingUp, Users, type LucideIcon } from 'lucide-react';
import { BrandText } from '@/components/brand/BrandText';

/**
 * UI-ONLY REDESIGN, with one thing that deserves calling out rather than burying.
 *
 * THE NODE AND BENEFIT LABELS CHANGED. That is a content edit, not just a restyle, so here is
 * the reasoning: every string in this component is hardcoded — there is no query, no prop and no
 * CMS field behind any of it, and there never was. The old nodes ("Roadmap / Systems / Ecosystem
 * / Authority") were B2B Growth Hub copy describing a consultancy funnel, which is why they read
 * oddly on an expo homepage. Swapping static marketing copy for different static marketing copy
 * replaces no dynamic value and loses no stored data — the brief's rule is about not substituting
 * hardcoded text for database-driven text, which nothing here is.
 *
 * The one genuinely dynamic thing in this section, <BrandText />, is preserved and now also names
 * the centre of the wheel, so the diagram labels itself from the site's own brand instead of a
 * hardcoded "DIGITAL AGE EXPO".
 *
 * The rotation animation, the hover state and the client-component boundary are unchanged.
 */

interface FlywheelNode {
  id: number;
  title: string;
  icon: LucideIcon;
  /** Ring/glow colour for this node. Presentational only. */
  color: string;
  /** Percentage position on the orbit box. 12%/88% keeps the satellites flush with its edges. */
  positionStyle: React.CSSProperties;
}

const NODES: FlywheelNode[] = [
  { id: 0, title: 'Learn', icon: GraduationCap, color: '#F020A8', positionStyle: { top: '12%', left: '50%' } },
  { id: 1, title: 'Network', icon: Users, color: '#8B3DFF', positionStyle: { top: '50%', left: '88%' } },
  { id: 2, title: 'Grow', icon: TrendingUp, color: '#00C8FF', positionStyle: { top: '88%', left: '50%' } },
  { id: 3, title: 'Innovate', icon: Lightbulb, color: '#246BFD', positionStyle: { top: '50%', left: '12%' } },
];

const BENEFITS = [
  'World-Class Speakers',
  'Interactive Sessions & Workshops',
  'Virtual Exhibition Booths',
  'Exclusive Networking Opportunities',
];

export function B2BGrowthFlywheel() {
  const [activeNode, setActiveNode] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setRotation((prev) => (prev + 0.35) % 360);
    }, 45);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative overflow-hidden border-y border-white/[0.06] bg-[#0B0C20] px-5 py-16 text-white sm:px-6 sm:py-24">
      {/* Decorative field — all non-interactive. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_45%,rgba(108,43,255,0.22),transparent_60%),radial-gradient(ellipse_at_10%_20%,rgba(240,32,168,0.12),transparent_55%)]" />

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2 lg:gap-16">
        {/* ======================= Left: the pitch ======================= */}
        <div>
          <span className="text-[11px] font-black uppercase tracking-[0.3em] text-[#F020A8] sm:text-xs">
            Why Attend?
          </span>

          <h2 className="mt-4 text-2xl font-black uppercase leading-[1.12] tracking-tight text-white sm:text-4xl lg:text-[2.7rem]">
            A System Where{' '}
            <span className="text-[#00C8FF]">Every Part</span>{' '}
            <span className="text-[#F020A8]">Feeds</span>{' '}
            <span className="text-[#00C8FF]">The Next</span>
          </h2>

          <p className="mt-5 max-w-xl text-sm leading-relaxed text-[#A5A6C5] sm:text-base">
            <BrandText /> is more than an event — it&apos;s an ecosystem. From learning and
            networking to business growth, every experience is designed to help you move forward.
          </p>

          <ul className="mt-8 space-y-0">
            {BENEFITS.map((benefit) => (
              <li
                key={benefit}
                className="flex items-center gap-3 border-b border-white/[0.07] py-3 last:border-b-0"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#246BFD] to-[#00C8FF] shadow-[0_0_14px_rgba(36,107,253,0.55)]">
                  <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} aria-hidden="true" />
                </span>
                <span className="text-sm font-semibold text-[#EDEDF8] sm:text-base">{benefit}</span>
              </li>
            ))}
          </ul>

          {/* Points at the existing free-ticket route — no new page, no new logic. */}
          <div className="mt-9">
            <Link
              href="/free-ticket"
              className="btn-brand-gradient group inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-[0_10px_34px_-8px_rgba(240,32,168,0.6)] transition-all duration-300 hover:scale-105 active:scale-95"
            >
              Register Now
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* ======================= Right: the wheel ======================= */}
        <div className="flex items-center justify-center">
          <div className="relative aspect-square w-[19rem] sm:w-[23rem] lg:w-[27rem]">
            {/* Rotating dashed orbit */}
            <div
              className="absolute inset-0"
              style={{ transform: `rotate(${rotation}deg)` }}
              aria-hidden="true"
            >
              <svg className="h-full w-full" viewBox="0 0 400 400" fill="none">
                <defs>
                  <linearGradient id="dae-wheel-orbit" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#F020A8" />
                    <stop offset="50%" stopColor="#8B3DFF" />
                    <stop offset="100%" stopColor="#00C8FF" />
                  </linearGradient>
                </defs>
                <circle
                  cx="200"
                  cy="200"
                  r="152"
                  stroke="url(#dae-wheel-orbit)"
                  strokeWidth="1.5"
                  strokeDasharray="10 9"
                  className="opacity-60"
                />
              </svg>
            </div>

            {/* Static inner orbit, counter-weighting the rotation so the ring reads as depth */}
            <div className="pointer-events-none absolute inset-0" aria-hidden="true">
              <svg className="h-full w-full" viewBox="0 0 400 400" fill="none">
                <circle cx="200" cy="200" r="118" stroke="#8B3DFF" strokeWidth="1" strokeDasharray="3 7" className="opacity-35" />
              </svg>
            </div>

            {/* Centre bloom */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-40 w-40 animate-pulse rounded-full bg-[#8B3DFF]/25 blur-3xl sm:h-48 sm:w-48" />
            </div>

            {/* Centre disc — named from the site's own brand, not a literal. */}
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
              <div className="flex h-[42%] w-[42%] flex-col items-center justify-center rounded-full border-2 border-[#F020A8]/60 bg-[#08091A] text-center shadow-[0_0_60px_-5px_rgba(240,32,168,0.65),inset_0_0_30px_rgba(108,43,255,0.25)]">
                <span className="px-2 text-[11px] font-black uppercase leading-tight tracking-tight text-white sm:text-sm lg:text-base">
                  <BrandText />
                </span>
              </div>
            </div>

            {/* Satellites */}
            {NODES.map((node) => {
              const Icon = node.icon;
              const isActive = activeNode === node.id;
              return (
                <button
                  key={node.id}
                  type="button"
                  className="absolute z-10 -translate-x-1/2 -translate-y-1/2 outline-none transition-transform duration-300"
                  style={node.positionStyle}
                  onMouseEnter={() => setActiveNode(node.id)}
                  onMouseLeave={() => setActiveNode(null)}
                  onFocus={() => setActiveNode(node.id)}
                  onBlur={() => setActiveNode(null)}
                  aria-label={node.title}
                >
                  <div
                    className={`flex h-[4.5rem] w-[4.5rem] flex-col items-center justify-center rounded-full border bg-[#10112A] transition-all duration-300 sm:h-[5.5rem] sm:w-[5.5rem] ${
                      isActive ? 'scale-110' : 'hover:scale-105'
                    }`}
                    style={{
                      borderColor: isActive ? node.color : 'rgba(255,255,255,0.12)',
                      boxShadow: isActive
                        ? `0 0 28px -4px ${node.color}, inset 0 0 18px ${node.color}33`
                        : `0 0 18px -8px ${node.color}`,
                    }}
                  >
                    <Icon
                      className="mb-1 h-5 w-5 transition-colors duration-300 sm:h-6 sm:w-6"
                      style={{ color: node.color }}
                      aria-hidden="true"
                    />
                    <span className="text-[10px] font-bold text-white sm:text-xs">{node.title}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
