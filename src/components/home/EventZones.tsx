'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Cpu,
  ShieldCheck,
  Coins,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';

interface Zone {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  from: string;
  to: string;
  accent: string;
}

const ZONES: Zone[] = [
  {
    id: 'z-ai',
    name: 'Artificial Intelligence Zone',
    description:
      'Explore the bleeding-edge of machine learning, neural accelerators, generative transformers, and cognitive automation.',
    icon: Cpu,
    from: 'var(--c-accent-violet)',
    to: 'var(--c-accent-violet-soft)',
    accent: '#B08CFF',
  },
  {
    id: 'z-cyber',
    name: 'Cyber Security & Trust',
    description:
      'Hardening enterprise postures with post-quantum cryptography, zero-trust architectures, and seamless audit logs.',
    icon: ShieldCheck,
    from: 'var(--c-accent-blue)',
    to: 'var(--c-accent-cyan)',
    accent: '#5FD8FF',
  },
  {
    id: 'z-fin',
    name: 'FinTech & Digital Assets',
    description:
      'Pioneering the future of instant corporate clearing, decentralised accounting ledgers, and secure financial assets.',
    icon: Coins,
    from: 'var(--c-accent-cyan)',
    to: 'var(--c-accent-blue)',
    accent: '#7FE0FF',
  },
  {
    id: 'z-cloud',
    name: 'Cloud & Scaling Operations',
    description:
      'Harnessing serverless infrastructure, global content orchestration, and real-time edge processing for modern web apps.',
    icon: TrendingUp,
    from: 'var(--c-accent-pink)',
    to: 'var(--c-accent-violet-soft)',
    accent: 'var(--c-accent-pink-200)',
  },
];

export function EventZones() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [visibleCards, setVisibleCards] = useState<Set<string>>(new Set());
  const [isHeadingVisible, setIsHeadingVisible] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;

    if (!section) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    /*
     * Accessibility:
     * If the user has requested reduced motion,
     * show everything immediately.
     */
    if (prefersReducedMotion) {
      setIsHeadingVisible(true);
      setVisibleCards(new Set(ZONES.map((zone) => zone.id)));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const target = entry.target as HTMLElement;
          const type = target.dataset.animation;
          const id = target.dataset.zoneId;

          if (entry.isIntersecting) {
            if (type === 'heading') {
              setIsHeadingVisible(true);
            }

            if (type === 'card' && id) {
              setVisibleCards((previous) => {
                const next = new Set(previous);
                next.add(id);
                return next;
              });
            }
          } else {
            /*
             * Remove the animation state when the element leaves
             * the viewport so the animation can play again when
             * scrolling back up.
             */
            if (type === 'heading') {
              setIsHeadingVisible(false);
            }

            if (type === 'card' && id) {
              setVisibleCards((previous) => {
                const next = new Set(previous);
                next.delete(id);
                return next;
              });
            }
          }
        });
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -80px 0px',
      }
    );

    const animatedElements = section.querySelectorAll(
      '[data-animation]'
    );

    animatedElements.forEach((element) => observer.observe(element));

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="
        relative
        overflow-hidden
        border-y
        border-white/[0.06]
        bg-[var(--c-bg-1)]
        px-5
        py-16
        text-white
        sm:px-6
        sm:py-20
      "
    >
      {/* Background ambient glow */}
      <div
        className="
          pointer-events-none
          absolute
          inset-0
          bg-[radial-gradient(ellipse_at_50%_0%,rgba(108,43,255,0.18),transparent_60%)]
        "
      />

      {/* Animated background glow */}
      <div
        className="
          pointer-events-none
          absolute
          -left-32
          top-1/3
          h-72
          w-72
          rounded-full
          bg-[var(--c-accent-violet)]/10
          blur-3xl
          animate-[pulse_5s_ease-in-out_infinite]
        "
      />

      <div
        className="
          pointer-events-none
          absolute
          -right-32
          bottom-0
          h-72
          w-72
          rounded-full
          bg-[var(--c-accent-pink)]/10
          blur-3xl
          animate-[pulse_6s_ease-in-out_infinite]
        "
      />

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* SECTION HEADING */}
        <div
          data-animation="heading"
          className={`
            mx-auto
            max-w-2xl
            text-center
            transition-all
            duration-1000
            ease-[cubic-bezier(0.22,1,0.36,1)]
            ${
              isHeadingVisible
                ? 'translate-y-0 opacity-100'
                : 'translate-y-10 opacity-0'
            }
          `}
        >
          {/* Eyebrow */}
          <span
            className="
              inline-block
              text-[11px]
              font-black
              uppercase
              tracking-[0.3em]
              text-[var(--c-accent-pink)]
              sm:text-xs
            "
          >
            The Architecture Of Innovation
          </span>

          {/* Heading */}
          <h2
            className="
              mt-3
              text-2xl
              font-black
              uppercase
              tracking-tight
              text-white
              sm:text-4xl
            "
          >
            Specialised Trade Zones
          </h2>

          {/* Description */}
          <p
            className="
              mt-3
              text-sm
              leading-relaxed
              text-[var(--c-text-muted)]
              sm:text-base
            "
          >
            Structured virtual environments to keep exhibition halls
            organized and perfectly navigated.
          </p>

          {/* Animated underline */}
          <div
            className={`
              mx-auto
              mt-6
              h-px
              bg-gradient-to-r
              from-transparent
              via-[var(--c-accent-pink)]
              to-transparent
              transition-all
              duration-1000
              ${
                isHeadingVisible
                  ? 'w-32 opacity-100'
                  : 'w-0 opacity-0'
              }
            `}
          />
        </div>

        {/* ZONE CARDS */}
        <div
          className="
            mt-12
            grid
            grid-cols-1
            gap-4
            sm:grid-cols-2
            sm:gap-5
            lg:grid-cols-4
          "
        >
          {ZONES.map((zone, index) => {
            const Icon = zone.icon;
            const isVisible = visibleCards.has(zone.id);

            return (
              <div
                key={zone.id}
                id={`event-zone-${zone.id}`}
                data-animation="card"
                data-zone-id={zone.id}
                className={`
                  group
                  relative
                  flex
                  flex-col
                  items-center
                  overflow-hidden
                  rounded-2xl
                  border
                  border-white/[0.1]
                  bg-[var(--c-bg-2)]
                  p-6
                  text-center

                  transition-all
                  duration-700
                  ease-[cubic-bezier(0.22,1,0.36,1)]

                  ${
                    isVisible
                      ? 'translate-y-0 scale-100 opacity-100'
                      : 'translate-y-16 scale-[0.96] opacity-0'
                  }

                  hover:-translate-y-2
                  hover:scale-[1.015]
                  hover:border-white/25
                  hover:shadow-[0_20px_60px_-25px_rgba(108,43,255,0.6)]
                `}
                style={{
                  transitionDelay: isVisible
                    ? `${index * 120}ms`
                    : '0ms',
                }}
              >
                {/* Per-zone gradient wash */}
                <div
                  className="
                    pointer-events-none
                    absolute
                    inset-0
                    opacity-70
                    transition-all
                    duration-700
                    group-hover:scale-110
                    group-hover:opacity-100
                  "
                  style={{
                    backgroundImage: `
                      linear-gradient(
                        150deg,
                        ${zone.from}38,
                        ${zone.to}12 65%,
                        transparent
                      )
                    `,
                  }}
                />

                {/* Animated radial glow */}
                <div
                  className="
                    pointer-events-none
                    absolute
                    -right-10
                    -top-10
                    h-28
                    w-28
                    rounded-full
                    opacity-20
                    blur-2xl
                    transition-all
                    duration-700
                    group-hover:scale-150
                    group-hover:opacity-40
                  "
                  style={{
                    backgroundColor: zone.accent,
                  }}
                />

                {/* Top glowing line */}
                <div
                  className="
                    pointer-events-none
                    absolute
                    inset-x-8
                    top-0
                    h-px
                    opacity-70
                    transition-all
                    duration-500
                    group-hover:inset-x-4
                    group-hover:opacity-100
                  "
                  style={{
                    background: `
                      linear-gradient(
                        90deg,
                        transparent,
                        ${zone.accent},
                        transparent
                      )
                    `,
                  }}
                />

                {/* ICON */}
                <span
                  className="
                    relative
                    flex
                    h-14
                    w-14
                    items-center
                    justify-center
                    rounded-2xl
                    border
                    transition-all
                    duration-500
                    ease-out
                    group-hover:scale-110
                    group-hover:rotate-3
                  "
                  style={{
                    borderColor: `${zone.accent}55`,
                    backgroundColor: `${zone.from}22`,
                    boxShadow: `0 0 26px -10px ${zone.accent}`,
                  }}
                >
                  <Icon
                    className="
                      h-7
                      w-7
                      transition-all
                      duration-500
                      group-hover:scale-110
                    "
                    style={{
                      color: zone.accent,
                    }}
                    aria-hidden="true"
                  />
                </span>

                {/* TITLE */}
                <h4
                  className="
                    relative
                    mt-5
                    text-sm
                    font-black
                    uppercase
                    leading-snug
                    tracking-wide
                    text-white
                    transition-all
                    duration-300
                    group-hover:tracking-wider
                    sm:text-[0.95rem]
                  "
                >
                  {zone.name}
                </h4>

                {/* DESCRIPTION */}
                <p
                  className="
                    relative
                    mt-2.5
                    text-xs
                    leading-relaxed
                    text-[var(--c-text-muted)]
                    transition-colors
                    duration-300
                    group-hover:text-[#C5C6DD]
                    sm:text-[0.8rem]
                  "
                >
                  {zone.description}
                </p>

                {/* Bottom accent */}
                <div
                  className="
                    relative
                    mt-5
                    h-px
                    w-0
                    opacity-0
                    transition-all
                    duration-500
                    group-hover:w-16
                    group-hover:opacity-100
                  "
                  style={{
                    backgroundColor: zone.accent,
                    boxShadow: `0 0 12px ${zone.accent}`,
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}