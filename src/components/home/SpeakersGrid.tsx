"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import {
  motion,
  useScroll,
  useTransform,
} from "framer-motion";
import { assetUrl } from "@/lib/assets";
import { speakerSlug } from "@/lib/slug";

interface Speaker {
  id: number;
  name: string;
  position: string | null;
  business: string | null;
  profile_pic: string | null;
}

interface Props {
  speakers: Speaker[];
  eyebrow?: string;
  speakerTypeTitle?: string;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "?";

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return (
    parts[0][0] + parts[parts.length - 1][0]
  ).toUpperCase();
}

/* -------------------------------------------------------------------------- */
/* Speaker Portrait                                                           */
/* -------------------------------------------------------------------------- */

function SpeakerPortrait({
  speaker,
}: {
  speaker: Speaker;
}) {
  const [errored, setErrored] = useState(false);

  const hasSrc = Boolean(
    speaker.profile_pic &&
      speaker.profile_pic.trim()
  );

  const src = hasSrc
    ? assetUrl(speaker.profile_pic)
    : null;

  const showImage = Boolean(src) && !errored;

  return (
    <motion.div
      className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-[#14152F]"
      whileHover={{
        scale: 1.02,
      }}
      transition={{
        duration: 0.4,
        ease: "easeOut",
      }}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src as string}
          alt={speaker.name}
          loading="lazy"
          onError={() => setErrored(true)}
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
        />
      ) : (
        <motion.div
          className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_50%_35%,rgba(108,43,255,0.35),transparent_70%)]"
          animate={{
            backgroundPosition: [
              "50% 35%",
              "55% 45%",
              "50% 35%",
            ],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <motion.span
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="text-4xl font-black tracking-wide text-[#EDEDF8] sm:text-5xl"
          >
            {getInitials(speaker.name)}
          </motion.span>
        </motion.div>
      )}

      {/* Image bottom gradient */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#08091A]/70 via-transparent to-transparent" />

      {/* Hover shine */}
      <motion.div
        className="pointer-events-none absolute -left-[120%] top-0 h-full w-[60%] rotate-12 bg-gradient-to-r from-transparent via-white/[0.12] to-transparent"
        whileHover={{
          left: "150%",
        }}
        transition={{
          duration: 0.8,
          ease: "easeInOut",
        }}
      />
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/* Speakers Grid                                                              */
/* -------------------------------------------------------------------------- */

export function SpeakersGrid({
  speakers,
  eyebrow,
  speakerTypeTitle = "Event",
}: Props) {
  const displayEyebrow =
    eyebrow ||
    "Your story. Your vision. Our stage.";

  const trackRef =
    useRef<HTMLDivElement | null>(null);

  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(1);

  /*
   * ------------------------------------------------------------------------
   * Scroll progress
   * ------------------------------------------------------------------------
   */

  const { scrollYProgress } = useScroll();

  /*
   * Background parallax
   */
  const glowY = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    ["40px", "-80px", "30px"]
  );

  const glowX = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    ["-30px", "50px", "-20px"]
  );

  /*
   * Decorative light movement
   */
  const lightX = useTransform(
    scrollYProgress,
    [0, 1],
    ["-20%", "120%"]
  );

  /*
   * ------------------------------------------------------------------------
   * Existing pagination logic
   * ------------------------------------------------------------------------
   */

  const recalculate = useCallback(() => {
    const el = trackRef.current;

    if (!el || el.clientWidth === 0) return;

    setPageCount(
      Math.max(
        1,
        Math.ceil(
          el.scrollWidth / el.clientWidth
        )
      )
    );

    setPage(
      Math.round(
        el.scrollLeft / el.clientWidth
      )
    );
  }, []);

  useEffect(() => {
    recalculate();

    const el = trackRef.current;

    if (!el) return;

    el.addEventListener(
      "scroll",
      recalculate,
      { passive: true }
    );

    window.addEventListener(
      "resize",
      recalculate
    );

    return () => {
      el.removeEventListener(
        "scroll",
        recalculate
      );

      window.removeEventListener(
        "resize",
        recalculate
      );
    };
  }, [recalculate, speakers.length]);

  const scrollByPage = (
    direction: -1 | 1
  ) => {
    const el = trackRef.current;

    if (!el) return;

    el.scrollBy({
      left:
        direction *
        el.clientWidth *
        0.9,
      behavior: "smooth",
    });
  };

  return (
    <motion.section
      className="relative overflow-hidden bg-[#0B0C20] px-5 py-16 text-white sm:px-6 sm:py-20"
      style={{
        y: useTransform(
          scrollYProgress,
          [0, 1],
          ["20px", "-20px"]
        ),
      }}
    >
      {/* ================================================================== */}
      {/* BACKGROUND                                                          */}
      {/* ================================================================== */}

      <motion.div
        className="pointer-events-none absolute -left-40 top-1/4 h-[30rem] w-[30rem] rounded-full bg-[#6C2BFF]/20 blur-[130px]"
        style={{
          x: glowX,
          y: glowY,
        }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="pointer-events-none absolute -right-40 bottom-[-10rem] h-[30rem] w-[30rem] rounded-full bg-[#F020A8]/10 blur-[130px]"
        animate={{
          x: [0, -50, 0],
          y: [0, -40, 0],
          scale: [1, 1.12, 1],
        }}
        transition={{
          duration: 9,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Moving light */}
      <motion.div
        className="pointer-events-none absolute top-0 h-full w-[18%] rotate-[12deg] bg-gradient-to-r from-transparent via-white/[0.025] to-transparent blur-2xl"
        style={{
          left: lightX,
        }}
      />

      {/* Top glowing line */}
      <motion.div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#8B3DFF]/60 to-transparent"
        animate={{
          opacity: [0.25, 0.9, 0.25],
        }}
        transition={{
          duration: 3.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* ================================================================== */}
      {/* MAIN CONTENT                                                        */}
      {/* ================================================================== */}

      <div className="relative z-10 mx-auto max-w-7xl">

        {/* ================================================================= */}
        {/* HEADING                                                            */}
        {/* ================================================================= */}

        <motion.div
          initial={{
            opacity: 0,
            y: 45,
          }}
          whileInView={{
            opacity: 1,
            y: 0,
          }}
          viewport={{
            once: false,
            amount: 0.3,
          }}
          transition={{
            duration: 0.8,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="text-center"
        >
          <motion.div
            initial={{
              width: 0,
              opacity: 0,
            }}
            whileInView={{
              width: "4rem",
              opacity: 1,
            }}
            viewport={{
              once: false,
            }}
            transition={{
              duration: 0.6,
            }}
            className="mx-auto mb-4 h-px bg-gradient-to-r from-[#F020A8] to-[#8B3DFF]"
          />

          <motion.h2
            initial={{
              opacity: 0,
              scale: 0.92,
            }}
            whileInView={{
              opacity: 1,
              scale: 1,
            }}
            viewport={{
              once: false,
            }}
            transition={{
              duration: 0.7,
              delay: 0.1,
            }}
            className="text-2xl font-black uppercase tracking-tight text-white sm:text-4xl"
          >
            {speakerTypeTitle} Speakers
          </motion.h2>

          <motion.p
            initial={{
              opacity: 0,
              y: 15,
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
              delay: 0.25,
            }}
            className="mx-auto mt-3 max-w-2xl text-sm text-[#A5A6C5] sm:text-base"
          >
            {displayEyebrow}
          </motion.p>
        </motion.div>

        {/* ================================================================= */}
        {/* SPEAKER CAROUSEL                                                  */}
        {/* ================================================================= */}

        {speakers.length > 0 ? (
          <div className="relative mt-10">

            {/* ============================================================= */}
            {/* PREVIOUS BUTTON                                                */}
            {/* ============================================================= */}

            <motion.button
              type="button"
              onClick={() =>
                scrollByPage(-1)
              }
              aria-label="Previous speakers"
              initial={{
                opacity: 0,
                x: -20,
              }}
              whileInView={{
                opacity: 1,
                x: 0,
              }}
              viewport={{
                once: false,
              }}
              whileHover={{
                scale: 1.1,
                x: -3,
              }}
              whileTap={{
                scale: 0.92,
              }}
              transition={{
                duration: 0.4,
              }}
              className="absolute -left-2 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#00C8FF]/40 bg-[#10112A]/90 text-white backdrop-blur sm:flex lg:-left-5"
            >
              <ChevronLeft
                className="h-5 w-5"
                aria-hidden="true"
              />
            </motion.button>

            {/* ============================================================= */}
            {/* NEXT BUTTON                                                     */}
            {/* ============================================================= */}

            <motion.button
              type="button"
              onClick={() =>
                scrollByPage(1)
              }
              aria-label="Next speakers"
              initial={{
                opacity: 0,
                x: 20,
              }}
              whileInView={{
                opacity: 1,
                x: 0,
              }}
              viewport={{
                once: false,
              }}
              whileHover={{
                scale: 1.1,
                x: 3,
              }}
              whileTap={{
                scale: 0.92,
              }}
              transition={{
                duration: 0.4,
              }}
              className="absolute -right-2 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#F020A8]/40 bg-[#10112A]/90 text-white backdrop-blur sm:flex lg:-right-5"
            >
              <ChevronRight
                className="h-5 w-5"
                aria-hidden="true"
              />
            </motion.button>

            {/* ============================================================= */}
            {/* TRACK                                                           */}
            {/* ============================================================= */}

            <div
              ref={trackRef}
              className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-5 [&::-webkit-scrollbar]:hidden"
            >
              {speakers.map(
                (speaker, index) => (
                  <motion.div
                    key={speaker.id}
                    initial={{
                      opacity: 0,
                      y: 60,
                      scale: 0.92,
                    }}
                    whileInView={{
                      opacity: 1,
                      y: 0,
                      scale: 1,
                    }}
                    viewport={{
                      once: false,
                      amount: 0.2,
                    }}
                    transition={{
                      duration: 0.65,
                      delay:
                        (index % 5) * 0.1,
                      ease: [
                        0.22,
                        1,
                        0.36,
                        1,
                      ],
                    }}
                    className="w-[13rem] shrink-0 snap-start sm:w-[14.5rem]"
                  >
                    <Link
                      href={`/speaker/${speakerSlug(
                        speaker.name,
                        speaker.id
                      )}`}
                      id={`featured-speaker-${speaker.id}`}
                      className="group relative block overflow-hidden rounded-2xl border border-white/[0.09] bg-[#10112A]/80 p-3 text-center backdrop-blur-sm transition-colors duration-500 hover:border-[#8B3DFF]/60"
                    >
                      {/* Card glow */}
                      <motion.div
                        className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_50%_0%,rgba(139,61,255,0.18),transparent_65%)]"
                        initial={{
                          opacity: 0,
                        }}
                        whileHover={{
                          opacity: 1,
                        }}
                        transition={{
                          duration: 0.4,
                        }}
                      />

                      {/* Card top line */}
                      <motion.div
                        className="absolute left-1/2 top-0 h-px -translate-x-1/2 bg-gradient-to-r from-transparent via-[#F020A8] to-transparent"
                        initial={{
                          width: 0,
                        }}
                        whileHover={{
                          width: "80%",
                        }}
                        transition={{
                          duration: 0.45,
                        }}
                      />

                      <SpeakerPortrait
                        speaker={speaker}
                      />

                      <div className="relative z-10 px-1 pb-1 pt-3.5">
                        <motion.h4
                          className="line-clamp-1 text-sm font-bold text-white sm:text-base"
                          whileHover={{
                            color: "#F020A8",
                          }}
                          transition={{
                            duration: 0.25,
                          }}
                        >
                          {speaker.name}
                        </motion.h4>

                        <p className="mt-1 line-clamp-2 text-xs leading-snug text-[#A5A6C5]">
                          {speaker.position}
                          {speaker.position &&
                          speaker.business
                            ? ", "
                            : ""}
                          {speaker.business}
                        </p>
                      </div>

                      {/* Bottom gradient accent */}
                      <motion.div
                        className="absolute bottom-0 left-1/2 h-[2px] -translate-x-1/2 bg-gradient-to-r from-[#6C2BFF] via-[#F020A8] to-[#00C8FF]"
                        initial={{
                          width: 0,
                          opacity: 0,
                        }}
                        whileHover={{
                          width: "65%",
                          opacity: 1,
                        }}
                        transition={{
                          duration: 0.45,
                        }}
                      />
                    </Link>
                  </motion.div>
                )
              )}
            </div>

            {/* ============================================================= */}
            {/* PAGINATION DOTS                                                */}
            {/* ============================================================= */}

            {pageCount > 1 && (
              <motion.div
                initial={{
                  opacity: 0,
                  y: 15,
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                }}
                viewport={{
                  once: false,
                }}
                transition={{
                  duration: 0.5,
                }}
                className="mt-6 flex items-center justify-center gap-2"
              >
                {Array.from({
                  length: pageCount,
                }).map((_, i) => (
                  <motion.span
                    key={i}
                    aria-hidden="true"
                    animate={{
                      width:
                        i === page
                          ? 24
                          : 8,
                      opacity:
                        i === page
                          ? 1
                          : 0.5,
                    }}
                    transition={{
                      duration: 0.3,
                    }}
                    className={`h-2 rounded-full ${
                      i === page
                        ? "bg-gradient-to-r from-[#F020A8] to-[#8B3DFF]"
                        : "bg-white/20"
                    }`}
                  />
                ))}
              </motion.div>
            )}
          </div>
        ) : (
          /* =============================================================== */
          /* EMPTY STATE                                                      */
          /* =============================================================== */

          <motion.div
            initial={{
              opacity: 0,
              y: 40,
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
            }}
            className="mt-10 rounded-2xl border border-dashed border-white/10 bg-[#10112A]/50 p-12 text-center"
          >
            <p className="font-medium text-[#A5A6C5]">
              Be the first one to register
              for {speakerTypeTitle} Speaker
            </p>
          </motion.div>
        )}

        {/* ================================================================= */}
        {/* CTA BUTTONS                                                       */}
        {/* ================================================================= */}

        <motion.div
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
            amount: 0.3,
          }}
          transition={{
            duration: 0.7,
            delay: 0.15,
          }}
          className="mt-10 flex flex-wrap justify-center gap-4"
        >
          {/* View speakers */}
          <Link href="/view_speaker">
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
              className="btn-brand-gradient group inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-bold text-white shadow-[0_10px_34px_-8px_rgba(240,32,168,0.6)]"
            >
              View All Speakers

              <ArrowRight
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                aria-hidden="true"
              />
            </motion.div>
          </Link>

          {/* Register speaker */}
          <Link href="/speaker_registration">
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
              className="btn-outline-animated rounded-full border border-white/20 bg-white/[0.04] px-8 py-3.5 text-sm font-bold text-white backdrop-blur-md transition-colors duration-300 hover:border-[#8B3DFF] hover:bg-white/[0.1]"
            >
              Enroll as{" "}
              {speakerTypeTitle} Speaker
            </motion.div>
          </Link>
        </motion.div>
      </div>

      {/* ================================================================== */}
      {/* BOTTOM GLOW                                                         */}
      {/* ================================================================== */}

      <motion.div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#F020A8]/60 to-transparent"
        animate={{
          opacity: [0.25, 0.9, 0.25],
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