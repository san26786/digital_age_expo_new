"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { CountdownTimer } from "@/components/home/CountdownTimer";
import { Hero3DBackground } from "@/components/home/Hero3DBackground";
import { formatDateLocation } from "@/lib/format";
import { staticAssetUrl } from "@/lib/assets";

interface Props {
  /** Live row counts for this event. */
  title: string;
  label: string | null;
  dateStart: Date;
  dateEnd: Date | null;
  venue: string | null;
}

const HERO_IMAGE = staticAssetUrl(
  "https://digitalageexpo.com/files/listing_pages/818073-dae_index_top_banner.jpg"
);

export function HeroSection({
  title,
  label,
  dateStart,
  dateEnd,
  venue,
}: Props) {
  /*
   * --------------------------------------------------------------------------
   * Scroll animation
   * --------------------------------------------------------------------------
   *
   * scrollYProgress:
   * 0 = hero enters viewport
   * 1 = hero leaves viewport
   *
   * These transforms create a subtle premium parallax effect.
   */
  const { scrollYProgress } = useScroll();

  const imageY = useTransform(scrollYProgress, [0, 0.35], ["0%", "12%"]);
  const imageScale = useTransform(scrollYProgress, [0, 0.35], [1, 1.08]);

  const contentY = useTransform(scrollYProgress, [0, 0.35], ["0px", "70px"]);
  const contentOpacity = useTransform(
    scrollYProgress,
    [0, 0.25, 0.45],
    [1, 0.95, 0.35]
  );

  const glowY = useTransform(scrollYProgress, [0, 0.5], ["0px", "-120px"]);
  const glowX = useTransform(scrollYProgress, [0, 0.5], ["0px", "80px"]);

  const waveY = useTransform(scrollYProgress, [0, 0.5], ["0px", "-25px"]);

  return (
    <section className="relative isolate min-h-[720px] overflow-hidden bg-[var(--color-surface-1)] sm:min-h-[760px] lg:min-h-[780px]">
      {/* ================================================================== */}
      {/* BACKGROUND IMAGE */}
      {/* ================================================================== */}

      <motion.div
        className="absolute inset-y-0 right-0 w-full overflow-hidden lg:w-[66%]"
        style={{
          y: imageY,
          scale: imageScale,
        }}
      >
        <motion.div
          className="absolute -inset-[3%] bg-cover bg-center"
          style={{
            backgroundImage: `url('${HERO_IMAGE}')`,
          }}
        />

        {/* Desktop left-side dissolve */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(
              to right,
              rgb(var(--color-surface-1-rgb)) 0%,
              rgb(var(--color-surface-1-rgb) / 0.92) 22%,
              rgb(var(--color-surface-1-rgb) / 0.45) 55%,
              rgb(var(--color-surface-1-rgb) / 0.15) 100%
            )`,
          }}
        />

        {/* Mobile / tablet overlay */}
        <div
          className="absolute inset-0 lg:hidden"
          style={{
            backgroundImage: `linear-gradient(
              to bottom,
              rgb(var(--color-surface-1-rgb) / 0.88) 0%,
              rgb(var(--color-surface-1-rgb) / 0.78) 50%,
              rgb(var(--color-surface-1-rgb) / 0.96) 100%
            )`,
          }}
        />

        {/* Top fade */}
        <div
          className="absolute inset-x-0 top-0 h-28"
          style={{
            backgroundImage: `linear-gradient(
              to bottom,
              rgb(var(--color-surface-1-rgb) / 0.9),
              transparent
            )`,
          }}
        />

        {/* Bottom fade */}
        <div
          className="absolute inset-x-0 bottom-0 h-48"
          style={{
            backgroundImage: `linear-gradient(
              to top,
              rgb(var(--color-surface-1-rgb)),
              transparent
            )`,
          }}
        />

        {/* Subtle animated image highlight */}
        <motion.div
          className="pointer-events-none absolute inset-0"
          animate={{
            opacity: [0.15, 0.28, 0.15],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            background:
              "radial-gradient(circle at 75% 40%, rgba(240,32,168,0.25), transparent 40%)",
          }}
        />
      </motion.div>

      {/* ================================================================== */}
      {/* AMBIENT GLOWS */}
      {/* ================================================================== */}

      <motion.div
        className="pointer-events-none absolute -left-40 top-1/4 h-[30rem] w-[30rem] rounded-full bg-[#6C2BFF]/20 blur-[130px]"
        style={{
          x: glowX,
          y: glowY,
        }}
        animate={{
          scale: [1, 1.12, 1],
          opacity: [0.45, 0.7, 0.45],
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="pointer-events-none absolute bottom-0 left-1/3 h-[24rem] w-[24rem] rounded-full bg-[#F020A8]/15 blur-[120px]"
        animate={{
          x: [0, 60, 0],
          y: [0, -40, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{
          duration: 9,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* 3D background */}
      <Hero3DBackground />

      {/* ================================================================== */}
      {/* CONTENT */}
      {/* ================================================================== */}

      <motion.div
        className="relative z-10 mx-auto grid max-w-7xl items-center gap-10 px-5 py-20 sm:px-6 sm:py-24 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:py-28"
        style={{
          y: contentY,
          opacity: contentOpacity,
        }}
      >
        <div className="text-center lg:text-left">

          {/* Small top label */}
          <motion.div
            initial={{
              opacity: 0,
              y: 25,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.7,
              ease: "easeOut",
            }}
          >
            <span className="inline-block text-[11px] font-black uppercase tracking-[0.3em] text-[#F020A8] sm:text-xs">
              The Future Is Digital
            </span>
          </motion.div>

          {/* Main title */}
          <motion.h1
            initial={{
              opacity: 0,
              y: 45,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.9,
              delay: 0.15,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="mt-4 text-[1.9rem] font-black uppercase leading-[1.06] tracking-tight text-white sm:text-5xl lg:text-[3.4rem]"
          >
            {title}
          </motion.h1>

          {/* Event label */}
          {label && (
            <motion.h2
              initial={{
                opacity: 0,
                y: 35,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.8,
                delay: 0.3,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="mt-2 text-xl font-black uppercase leading-tight tracking-tight text-white sm:text-3xl lg:text-[2.6rem]"
            >
              {label}
            </motion.h2>
          )}

          {/* Connect / Learn / Grow */}
          <motion.p
            initial={{
              opacity: 0,
              y: 25,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.7,
              delay: 0.45,
            }}
            className="mt-4 text-base font-medium text-[#EDEDF8] sm:text-lg lg:text-xl"
          >
            Connect
            <span className="mx-2 text-[#F020A8]">•</span>
            Learn
            <span className="mx-2 text-[#F020A8]">•</span>
            Grow
          </motion.p>

          {/* Date and venue */}
          <motion.p
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.7,
              delay: 0.55,
            }}
            className="mt-3 text-sm text-[#A5A6C5] sm:text-base"
          >
            {formatDateLocation(dateStart, dateEnd, venue)}
          </motion.p>

          {/* Countdown */}
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.92,
              y: 25,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
            }}
            transition={{
              duration: 0.8,
              delay: 0.65,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="mt-9"
          >
            <CountdownTimer targetDate={dateStart.toISOString()} />
          </motion.div>

          {/* ================================================================= */}
          {/* BUTTONS */}
          {/* ================================================================= */}

          <motion.div
            initial={{
              opacity: 0,
              y: 30,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.8,
              delay: 0.8,
            }}
            className="mt-9 flex flex-wrap justify-center gap-3 lg:justify-start"
          >
            {/* FREE TICKET */}
            <Link href="/free-ticket">
              <motion.div
                whileHover={{
                  scale: 1.06,
                  y: -4,
                }}
                whileTap={{
                  scale: 0.96,
                }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 18,
                }}
                className="btn-brand-gradient group inline-flex cursor-pointer items-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold text-white shadow-[0_10px_34px_-8px_rgba(240,32,168,0.6)]"
              >
                Get Free Tickets Now!

                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden="true"
                  className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                >
                  <path
                    d="M4 10h11M11 6l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </motion.div>
            </Link>

            {/* ENTER THE SHOW */}
            <Link href="/enter-the-show">
              <motion.div
                whileHover={{
                  scale: 1.06,
                  y: -4,
                  backgroundColor: "rgba(255,255,255,0.10)",
                }}
                whileTap={{
                  scale: 0.96,
                }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 18,
                }}
                className="btn-outline-animated inline-flex cursor-pointer rounded-full border border-[#8B3DFF]/50 bg-white/[0.04] px-7 py-3.5 text-sm font-bold text-white backdrop-blur-md"
              >
                Enter The Show
              </motion.div>
            </Link>

            {/* BOOK STAND */}
            <Link href="/exhibitor-registration">
              <motion.div
                whileHover={{
                  scale: 1.06,
                  y: -4,
                  backgroundColor: "rgba(255,255,255,0.10)",
                }}
                whileTap={{
                  scale: 0.96,
                }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 18,
                }}
                className="btn-outline-animated inline-flex cursor-pointer rounded-full border border-white/20 bg-white/[0.04] px-7 py-3.5 text-sm font-bold text-white backdrop-blur-md"
              >
                Book Your Stand
              </motion.div>
            </Link>
          </motion.div>
        </div>

        {/* Desktop spacer */}
        <div
          className="hidden lg:block"
          aria-hidden="true"
        />
      </motion.div>

      {/* ================================================================== */}
      {/* BOTTOM WAVE */}
      {/* ================================================================== */}

      <motion.div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-20 w-full sm:h-28"
        style={{
          y: waveY,
        }}
      >
        <svg
          className="h-full w-full"
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id="dae-hero-wave-a"
              x1="0"
              y1="0"
              x2="1"
              y2="0"
            >
              <stop
                offset="0%"
                stopColor="#6C2BFF"
                stopOpacity="0.85"
              />

              <stop
                offset="55%"
                stopColor="#F020A8"
                stopOpacity="0.7"
              />

              <stop
                offset="100%"
                stopColor="#00C8FF"
                stopOpacity="0.5"
              />
            </linearGradient>

            <linearGradient
              id="dae-hero-wave-b"
              x1="0"
              y1="0"
              x2="1"
              y2="0"
            >
              <stop
                offset="0%"
                stopColor="#FF2BAF"
                stopOpacity="0.55"
              />

              <stop
                offset="100%"
                stopColor="#8B3DFF"
                stopOpacity="0.3"
              />
            </linearGradient>
          </defs>

          <motion.path
            d="M0 96C240 40 420 118 720 78s520-86 720-30v72H0z"
            fill="url(#dae-hero-wave-b)"
            animate={{
              d: [
                "M0 96C240 40 420 118 720 78s520-86 720-30v72H0z",
                "M0 88C240 65 430 105 720 70s520-70 720-22v72H0z",
                "M0 96C240 40 420 118 720 78s520-86 720-30v72H0z",
              ],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          <motion.path
            d="M0 112C260 62 470 124 760 92s540-64 680-18v46H0z"
            fill="url(#dae-hero-wave-a)"
            animate={{
              d: [
                "M0 112C260 62 470 124 760 92s540-64 680-18v46H0z",
                "M0 105C260 75 470 115 760 82s540-52 680-12v46H0z",
                "M0 112C260 62 470 124 760 92s540-64 680-18v46H0z",
              ],
            }}
            transition={{
              duration: 7,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </svg>
      </motion.div>

      {/* Bottom glowing line */}
      <motion.div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#8B3DFF]/60 to-transparent"
        animate={{
          opacity: [0.35, 1, 0.35],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </section>
  );
}