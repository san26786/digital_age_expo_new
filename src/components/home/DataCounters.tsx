"use client";

import { GraduationCap, Mic, Star, Users, type LucideIcon } from "lucide-react";
import { useEffect, useRef } from "react";

interface Props {
  /** Live row counts for this event. */
  counts?: {
    visitors: number;
    exhibitors: number;
    speakers: number;
    workshops: number;
  };

  visitors: string;
  exhibitors: string;
  speakers: string;
  workshops: string;
}

function tileValue(
  count: number | undefined,
  phrase: string,
  fallback: string
): string {
  if (typeof count === "number" && count > 0) {
    return count.toLocaleString("en-GB");
  }

  return phrase || fallback;
}

const ITEMS = (
  p: Props
): {
  label: string;
  value: string;
  icon: LucideIcon;
  accent: string;
}[] => [
  {
    label: "Visitors",
    value: tileValue(p.counts?.visitors, p.visitors, "25000+"),
    icon: Users,
    accent: "#8B3DFF",
  },
  {
    label: "Exhibitors",
    value: tileValue(p.counts?.exhibitors, p.exhibitors, "1000+"),
    icon: Star,
    accent: "#F020A8",
  },
  {
    label: "Speakers",
    value: tileValue(p.counts?.speakers, p.speakers, "100+"),
    icon: Mic,
    accent: "#FF2BAF",
  },
  {
    label: "Workshops & Masterclass",
    value: tileValue(p.counts?.workshops, p.workshops, "50+"),
    icon: GraduationCap,
    accent: "#246BFD",
  },
];

export function DataCounters(props: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const cards = cardsRef.current;

    if (!section || !cards) return;

    let ticking = false;

    const updateScrollAnimation = () => {
      const rect = section.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      const progress =
        (viewportHeight - rect.top) /
        (viewportHeight + rect.height);

      const clampedProgress = Math.max(0, Math.min(1, progress));

      // Cards move slightly in the opposite direction while scrolling.
      const translateY = (clampedProgress - 0.5) * -28;

      // Subtle scale change as the section enters/leaves viewport.
      const distanceFromCenter = Math.abs(clampedProgress - 0.5);
      const scale = 1 - distanceFromCenter * 0.035;

      cards.style.transform = `translate3d(0, ${translateY}px, 0) scale(${scale})`;

      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollAnimation);
        ticking = true;
      }
    };

    updateScrollAnimation();

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden border-y border-white/[0.06] bg-[#0B0C20] px-4 py-10 text-white sm:px-6 sm:py-14"
    >
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_0%,rgba(108,43,255,0.18),transparent_55%),radial-gradient(ellipse_at_85%_100%,rgba(240,32,168,0.14),transparent_55%)]" />

      {/* Animated background orbs */}
      <div className="pointer-events-none absolute -left-32 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-[#6C2BFF]/10 blur-[100px] animate-counter-orb-left" />

      <div className="pointer-events-none absolute -right-32 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-[#F020A8]/10 blur-[100px] animate-counter-orb-right" />

      {/* Animated grid */}
      <div className="counter-grid pointer-events-none absolute inset-0 opacity-[0.035]" />

      <div
        ref={cardsRef}
        className="relative z-10 mx-auto grid max-w-6xl grid-cols-2 gap-3 will-change-transform sm:gap-5 lg:grid-cols-4 lg:gap-6"
      >
        {ITEMS(props).map((item, index) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className="counter-card group relative flex w-full max-w-full flex-col items-center justify-center overflow-hidden rounded-[1.25rem] border border-white/[0.09] bg-[#10112A]/85 px-3 py-6 text-center backdrop-blur-sm sm:px-5 sm:py-8"
              style={{
                animationDelay: `${index * 120}ms`,
              }}
            >
              {/* Card top gradient */}
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-50 transition-opacity duration-500 group-hover:opacity-100"
                style={{
                  background: `linear-gradient(90deg, transparent, ${item.accent}, transparent)`,
                }}
              />

              {/* Icon glow */}
              <div
                className="pointer-events-none absolute -top-10 left-1/2 h-24 w-24 -translate-x-1/2 rounded-full opacity-30 blur-3xl transition-all duration-500 group-hover:scale-150 group-hover:opacity-80"
                style={{
                  backgroundColor: item.accent,
                }}
              />

              {/* Floating decorative ring */}
              <div
                className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border opacity-0 transition-all duration-700 group-hover:scale-150 group-hover:opacity-10"
                style={{
                  borderColor: item.accent,
                }}
              />

              {/* Icon */}
              <div
                className="relative mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border transition-all duration-500 group-hover:-translate-y-1 group-hover:scale-110"
                style={{
                  borderColor: `${item.accent}35`,
                  backgroundColor: `${item.accent}12`,
                  boxShadow: `0 0 30px ${item.accent}15`,
                }}
              >
                <Icon
                  aria-hidden="true"
                  strokeWidth={2.25}
                  className="h-7 w-7 transition-all duration-500"
                  style={{
                    color: item.accent,
                    filter: `drop-shadow(0 0 10px ${item.accent}80)`,
                  }}
                />
              </div>

              {/* Number */}
              <div
                className="relative w-full max-w-full whitespace-nowrap px-1 text-2xl font-black tabular-nums tracking-tight text-white transition-all duration-500 group-hover:scale-105 sm:text-3xl lg:text-[2.35rem]"
                style={{
                  textShadow: `0 0 25px ${item.accent}25`,
                }}
              >
                {item.value}
              </div>

              {/* Label */}
              <p className="relative mt-1.5 max-w-full break-words px-1 text-center text-xs font-medium text-[#A5A6C5] transition-colors duration-300 group-hover:text-white sm:text-sm">
                {item.label}
              </p>

              {/* Bottom animated line */}
              <div
                className="absolute bottom-0 left-1/2 h-[2px] w-0 -translate-x-1/2 transition-all duration-500 group-hover:w-2/3"
                style={{
                  background: `linear-gradient(90deg, transparent, ${item.accent}, transparent)`,
                  boxShadow: `0 0 15px ${item.accent}`,
                }}
              />

              {/* Shine animation */}
              <div className="pointer-events-none absolute inset-0 -translate-x-full skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/[0.08] to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
            </div>
          );
        })}
      </div>

      {/* Bottom decorative glow */}
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-[#8B3DFF]/60 to-transparent" />

      <style jsx>{`
        @keyframes counterOrbLeft {
          0%,
          100% {
            transform: translate3d(0, -50%, 0) scale(1);
          }

          50% {
            transform: translate3d(35px, -45%, 0) scale(1.15);
          }
        }

        @keyframes counterOrbRight {
          0%,
          100% {
            transform: translate3d(0, -50%, 0) scale(1);
          }

          50% {
            transform: translate3d(-35px, -55%, 0) scale(1.12);
          }
        }

        @keyframes counterCardIn {
          from {
            opacity: 0;
            transform: translateY(35px) scale(0.94);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .counter-card {
          opacity: 0;
          animation: counterCardIn 0.8s cubic-bezier(0.22, 1, 0.36, 1)
            forwards;
          transition:
            transform 0.45s cubic-bezier(0.22, 1, 0.36, 1),
            border-color 0.3s ease,
            background-color 0.3s ease,
            box-shadow 0.4s ease;
        }

        .counter-card:hover {
          transform: translateY(-8px);
          border-color: rgba(255, 255, 255, 0.18);
          background-color: rgba(20, 21, 48, 0.95);
          box-shadow:
            0 20px 50px -20px rgba(108, 43, 255, 0.45),
            0 0 30px rgba(240, 32, 168, 0.08);
        }

        .animate-counter-orb-left {
          animation: counterOrbLeft 8s ease-in-out infinite;
        }

        .animate-counter-orb-right {
          animation: counterOrbRight 10s ease-in-out infinite;
        }

        .counter-grid {
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.8) 1px, transparent 1px),
            linear-gradient(
              90deg,
              rgba(255, 255, 255, 0.8) 1px,
              transparent 1px
            );
          background-size: 70px 70px;
          mask-image: linear-gradient(
            to bottom,
            transparent,
            black 25%,
            black 75%,
            transparent
          );
        }

        @media (prefers-reduced-motion: reduce) {
          .counter-card {
            opacity: 1;
            animation: none !important;
            transition: none !important;
          }

          .animate-counter-orb-left,
          .animate-counter-orb-right {
            animation: none !important;
          }
        }
      `}</style>
    </section>
  );
}