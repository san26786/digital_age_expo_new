"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  GraduationCap,
  Lightbulb,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  motion,
  useScroll,
  useTransform,
} from "framer-motion";
import { BrandText } from "@/components/brand/BrandText";

interface FlywheelNode {
  id: number;
  title: string;
  icon: LucideIcon;
  color: string;
  positionStyle: React.CSSProperties;
}

const NODES: FlywheelNode[] = [
  {
    id: 0,
    title: "Learn",
    icon: GraduationCap,
    color: "#F020A8",
    positionStyle: { top: "12%", left: "50%" },
  },
  {
    id: 1,
    title: "Network",
    icon: Users,
    color: "#8B3DFF",
    positionStyle: { top: "50%", left: "88%" },
  },
  {
    id: 2,
    title: "Grow",
    icon: TrendingUp,
    color: "#00C8FF",
    positionStyle: { top: "88%", left: "50%" },
  },
  {
    id: 3,
    title: "Innovate",
    icon: Lightbulb,
    color: "#246BFD",
    positionStyle: { top: "50%", left: "12%" },
  },
];

const BENEFITS = [
  "World-Class Speakers",
  "Interactive Sessions & Workshops",
  "Virtual Exhibition Booths",
  "Exclusive Networking Opportunities",
];

export function B2BGrowthFlywheel() {
  const [activeNode, setActiveNode] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);

  /*
   * --------------------------------------------------------------------------
   * CONTINUOUS ORBIT ROTATION
   * --------------------------------------------------------------------------
   */

  useEffect(() => {
    const interval = setInterval(() => {
      setRotation((prev) => (prev + 0.35) % 360);
    }, 45);

    return () => clearInterval(interval);
  }, []);

  /*
   * --------------------------------------------------------------------------
   * SCROLL ANIMATION
   * --------------------------------------------------------------------------
   */

  const { scrollYProgress } = useScroll();

  /*
   * The section moves very slightly while scrolling.
   */
  const sectionY = useTransform(
    scrollYProgress,
    [0.05, 0.5, 0.95],
    ["25px", "0px", "-20px"]
  );

  /*
   * Background glow travels diagonally as the page scrolls.
   */
  const glowX = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    ["-40px", "50px", "-30px"]
  );

  const glowY = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    ["50px", "-80px", "40px"]
  );

  /*
   * Wheel gets a subtle parallax movement.
   */
  const wheelY = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    ["35px", "-15px", "25px"]
  );

  const wheelRotate = useTransform(
    scrollYProgress,
    [0, 1],
    [-3, 3]
  );

  return (
    <motion.section
      className="relative overflow-hidden border-y border-white/[0.06] bg-[#0B0C20] px-5 py-16 text-white sm:px-6 sm:py-24"
      style={{ y: sectionY }}
    >
      {/* ================================================================== */}
      {/* BACKGROUND DECORATION */}
      {/* ================================================================== */}

      <motion.div
        className="pointer-events-none absolute -left-40 top-1/3 h-[30rem] w-[30rem] rounded-full bg-[#F020A8]/10 blur-[130px]"
        style={{
          x: glowX,
          y: glowY,
        }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.35, 0.65, 0.35],
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="pointer-events-none absolute -right-40 top-1/4 h-[34rem] w-[34rem] rounded-full bg-[#6C2BFF]/20 blur-[140px]"
        animate={{
          x: [0, -60, 0],
          y: [0, 50, 0],
          scale: [1, 1.12, 1],
        }}
        transition={{
          duration: 9,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Moving light beam */}
      <motion.div
        className="pointer-events-none absolute -left-[20%] top-0 h-full w-[20%] rotate-[15deg] bg-gradient-to-r from-transparent via-white/[0.025] to-transparent blur-2xl"
        animate={{
          left: ["-20%", "120%"],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "linear",
          repeatDelay: 3,
        }}
      />

      {/* ================================================================== */}
      {/* MAIN CONTENT */}
      {/* ================================================================== */}

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2 lg:gap-16">
        {/* ================================================================= */}
        {/* LEFT CONTENT */}
        {/* ================================================================= */}

        <motion.div
          initial={{
            opacity: 0,
            x: -70,
          }}
          whileInView={{
            opacity: 1,
            x: 0,
          }}
          viewport={{
            once: false,
            amount: 0.25,
          }}
          transition={{
            duration: 0.8,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {/* Small heading */}
          <motion.span
            initial={{
              opacity: 0,
              y: 20,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={{
              once: false,
            }}
            transition={{
              duration: 0.6,
              delay: 0.1,
            }}
            className="inline-block text-[11px] font-black uppercase tracking-[0.3em] text-[#F020A8] sm:text-xs"
          >
            Why Attend?
          </motion.span>

          {/* Main heading */}
          <motion.h2
            initial={{
              opacity: 0,
              y: 35,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={{
              once: false,
              amount: 0.4,
            }}
            transition={{
              duration: 0.8,
              delay: 0.15,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="mt-4 text-2xl font-black uppercase leading-[1.12] tracking-tight text-white sm:text-4xl lg:text-[2.7rem]"
          >
            A System Where{" "}
            <span className="text-white">Every Part</span>{" "}
            <span className="text-[#F020A8]">Feeds</span>{" "}
            <span className="text-white">The Next</span>
          </motion.h2>

          {/* Description */}
          <motion.p
            initial={{
              opacity: 0,
              y: 25,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={{
              once: false,
            }}
            transition={{
              duration: 0.7,
              delay: 0.3,
            }}
            className="mt-5 max-w-xl text-sm leading-relaxed text-[#A5A6C5] sm:text-base"
          >
            <BrandText /> is more than an event — it&apos;s an ecosystem. From
            learning and networking to business growth, every experience is
            designed to help you move forward.
          </motion.p>

          {/* =============================================================== */}
          {/* BENEFITS */}
          {/* =============================================================== */}

          <ul className="mt-8 space-y-0">
            {BENEFITS.map((benefit, index) => (
              <motion.li
                key={benefit}
                initial={{
                  opacity: 0,
                  x: -35,
                }}
                whileInView={{
                  opacity: 1,
                  x: 0,
                }}
                viewport={{
                  once: false,
                  amount: 0.4,
                }}
                transition={{
                  duration: 0.55,
                  delay: 0.12 * index,
                  ease: [0.22, 1, 0.36, 1],
                }}
                whileHover={{
                  x: 8,
                }}
                className="group flex items-center gap-3 border-b border-white/[0.07] py-3 last:border-b-0"
              >
                {/* Check icon */}
                <motion.span
                  whileHover={{
                    scale: 1.15,
                    rotate: 8,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 15,
                  }}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_0_14px_rgba(255,255,255,0.35)]"
                >
                  <Check
                    className="h-3.5 w-3.5 text-[#0B0C20]"
                    strokeWidth={3}
                    aria-hidden="true"
                  />
                </motion.span>

                <span className="text-sm font-semibold text-[#EDEDF8] transition-colors duration-300 group-hover:text-white sm:text-base">
                  {benefit}
                </span>
              </motion.li>
            ))}
          </ul>

          {/* =============================================================== */}
          {/* REGISTER BUTTON */}
          {/* =============================================================== */}

          <motion.div
            initial={{
              opacity: 0,
              y: 30,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={{
              once: false,
            }}
            transition={{
              duration: 0.7,
              delay: 0.55,
            }}
            className="mt-9"
          >
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
                className="btn-brand-gradient group inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-[0_10px_34px_-8px_rgba(240,32,168,0.6)]"
              >
                Register Now

                <ArrowRight
                  className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </motion.div>
            </Link>
          </motion.div>
        </motion.div>

        {/* ================================================================= */}
        {/* RIGHT — FLYWHEEL */}
        {/* ================================================================= */}

        <motion.div
          className="flex items-center justify-center"
          style={{
            y: wheelY,
            rotate: wheelRotate,
          }}
          initial={{
            opacity: 0,
            x: 70,
            scale: 0.88,
          }}
          whileInView={{
            opacity: 1,
            x: 0,
            scale: 1,
          }}
          viewport={{
            once: false,
            amount: 0.25,
          }}
          transition={{
            duration: 1,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <div className="relative aspect-square w-[19rem] sm:w-[23rem] lg:w-[27rem]">
            {/* ============================================================= */}
            {/* OUTER ROTATING ORBIT */}
            {/* ============================================================= */}

            <motion.div
              className="absolute inset-0"
              style={{
                transform: `rotate(${rotation}deg)`,
              }}
              aria-hidden="true"
            >
              <svg
                className="h-full w-full"
                viewBox="0 0 400 400"
                fill="none"
              >
                <defs>
                  <linearGradient
                    id="dae-wheel-orbit"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
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
            </motion.div>

            {/* ============================================================= */}
            {/* INNER ORBIT */}
            {/* ============================================================= */}

            <motion.div
              className="pointer-events-none absolute inset-0"
              animate={{
                rotate: [0, -360],
              }}
              transition={{
                duration: 40,
                repeat: Infinity,
                ease: "linear",
              }}
              aria-hidden="true"
            >
              <svg
                className="h-full w-full"
                viewBox="0 0 400 400"
                fill="none"
              >
                <circle
                  cx="200"
                  cy="200"
                  r="118"
                  stroke="#8B3DFF"
                  strokeWidth="1"
                  strokeDasharray="3 7"
                  className="opacity-35"
                />
              </svg>
            </motion.div>

            {/* ============================================================= */}
            {/* OUTER GLOW */}
            {/* ============================================================= */}

            <motion.div
              className="pointer-events-none absolute inset-[8%] rounded-full bg-[#8B3DFF]/10 blur-3xl"
              animate={{
                scale: [1, 1.12, 1],
                opacity: [0.35, 0.7, 0.35],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            {/* ============================================================= */}
            {/* CENTRE BLOOM */}
            {/* ============================================================= */}

            <motion.div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <motion.div
                className="h-40 w-40 rounded-full bg-[#8B3DFF]/25 blur-3xl sm:h-48 sm:w-48"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.45, 0.8, 0.45],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </motion.div>

            {/* ============================================================= */}
            {/* CENTRE DISC */}
            {/* ============================================================= */}

            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
              <motion.div
                animate={{
                  boxShadow: [
                    "0 0 40px -5px rgba(240,32,168,0.45), inset 0 0 25px rgba(108,43,255,0.2)",
                    "0 0 70px -5px rgba(240,32,168,0.75), inset 0 0 40px rgba(108,43,255,0.35)",
                    "0 0 40px -5px rgba(240,32,168,0.45), inset 0 0 25px rgba(108,43,255,0.2)",
                  ],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="flex h-[42%] w-[42%] flex-col items-center justify-center rounded-full border-2 border-[#F020A8]/60 bg-[#08091A] text-center"
              >
                <motion.span
                  animate={{
                    scale: [1, 1.04, 1],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="px-2 text-[11px] font-black uppercase leading-tight tracking-tight text-white sm:text-sm lg:text-base"
                >
                  <BrandText />
                </motion.span>
              </motion.div>
            </div>

            {/* ============================================================= */}
            {/* SATELLITE NODES */}
            {/* ============================================================= */}

            {NODES.map((node, index) => {
              const Icon = node.icon;
              const isActive = activeNode === node.id;

              return (
                <motion.button
                  key={node.id}
                  type="button"
                  className="absolute z-30 -translate-x-1/2 -translate-y-1/2 outline-none"
                  style={node.positionStyle}
                  initial={{
                    opacity: 0,
                    scale: 0.6,
                  }}
                  whileInView={{
                    opacity: 1,
                    scale: 1,
                  }}
                  viewport={{
                    once: false,
                    amount: 0.3,
                  }}
                  transition={{
                    duration: 0.6,
                    delay: 0.2 + index * 0.12,
                    type: "spring",
                    stiffness: 180,
                    damping: 15,
                  }}
                  whileHover={{
                    scale: 1.12,
                    y: -4,
                  }}
                  whileTap={{
                    scale: 0.95,
                  }}
                  onMouseEnter={() => setActiveNode(node.id)}
                  onMouseLeave={() => setActiveNode(null)}
                  onFocus={() => setActiveNode(node.id)}
                  onBlur={() => setActiveNode(null)}
                  aria-label={node.title}
                >
                  {/* Node outer glow */}
                  <motion.div
                    className="absolute inset-[-12px] rounded-full"
                    animate={{
                      opacity: isActive ? 0.8 : 0,
                      scale: isActive ? 1.15 : 0.85,
                    }}
                    transition={{
                      duration: 0.3,
                    }}
                    style={{
                      background: `radial-gradient(circle, ${node.color}55, transparent 70%)`,
                      filter: "blur(8px)",
                    }}
                  />

                  {/* Node */}
                  <motion.div
                    animate={{
                      y: isActive
                        ? [0, -3, 0]
                        : [0, 2, 0],
                    }}
                    transition={{
                      duration: isActive ? 1.2 : 3 + index * 0.3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="relative flex h-[4.5rem] w-[4.5rem] flex-col items-center justify-center rounded-full border bg-[#10112A] sm:h-[5.5rem] sm:w-[5.5rem]"
                    style={{
                      borderColor: isActive
                        ? node.color
                        : "rgba(255,255,255,0.12)",
                      boxShadow: isActive
                        ? `0 0 35px -4px ${node.color}, inset 0 0 20px ${node.color}33`
                        : `0 0 18px -8px ${node.color}`,
                    }}
                  >
                    <Icon
                      className="mb-1 h-5 w-5 sm:h-6 sm:w-6"
                      style={{
                        color: node.color,
                      }}
                      aria-hidden="true"
                    />

                    <span className="text-[10px] font-bold text-white sm:text-xs">
                      {node.title}
                    </span>
                  </motion.div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* ================================================================== */}
      {/* BOTTOM GLOW LINE */}
      {/* ================================================================== */}

      <motion.div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#8B3DFF] to-transparent"
        animate={{
          opacity: [0.25, 1, 0.25],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </motion.section>
  );
}