"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

/** Static table — see `formatPublished`. */
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Formats `YYYY-MM-DD` without touching `Date` or `toLocaleDateString`.
 */
function formatPublished(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);

  if (!m) return iso;

  const monthIndex = Number(m[2]) - 1;

  if (monthIndex < 0 || monthIndex > 11) {
    return iso;
  }

  return `${MONTHS[monthIndex]} ${Number(m[3])}, ${m[1]}`;
}

export function BlogsAndNews() {
  const sectionRef = useRef<HTMLElement | null>(null);

  const [isVisible, setIsVisible] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const defaultBlogs = [
    {
      id: "blog-1",
      title: "The Zero-Trust Operational Roadmap for Enterprise Scale",
      excerpt:
        "Unpacking zero-trust schemas, cryptographic policy layers, and deep API resource isolation strategies that are defining corporate standard roadmaps for 2026.",
      category: "CYBER SECURITY",
      imageUrl:
        "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=400",
      author: "DANIEL CROFT",
      publishedAt: "2026-07-20",
    },
    {
      id: "blog-2",
      title: "Pioneering the Post-Quantum Cryptographic Compliance Era",
      excerpt:
        "NIST's upcoming quantum-resistant algorithm deadlines demand proactive infrastructure updates. Learn how to audit, swap, and verify legacy key structures safely.",
      category: "COMPLIANCE",
      imageUrl:
        "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=400",
      author: "DR. ARIA CHEN",
      publishedAt: "2026-07-18",
    },
    {
      id: "blog-3",
      title: "Architecting Generative AI Agents for Secure Workflows",
      excerpt:
        "How leading technical firms are establishing local inference pipelines and secure sandboxed environments to leverage large models without leaking proprietary IP.",
      category: "ARTIFICIAL INTELLIGENCE",
      imageUrl:
        "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=400",
      author: "MARCUS VANCE",
      publishedAt: "2026-07-15",
    },
  ];

  /*
   * Detect reduced-motion preference.
   */
  useEffect(() => {
    const mediaQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    setReduceMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setReduceMotion(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  /*
   * Intersection Observer:
   *
   * When the section enters viewport:
   *   false -> true
   *
   * When the section leaves viewport:
   *   true -> false
   *
   * This allows the animation to replay when the user
   * scrolls back to the section.
   */
  useEffect(() => {
    if (reduceMotion) {
      setIsVisible(true);
      return;
    }

    const section = sectionRef.current;

    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        } else {
          setIsVisible(false);
        }
      },
      {
        threshold: 0.15,
        rootMargin: "-40px 0px -40px 0px",
      }
    );

    observer.observe(section);

    return () => {
      observer.disconnect();
    };
  }, [reduceMotion]);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-[#0B0C20] px-5 py-16 text-white sm:px-6 sm:py-20"
    >
      {/* =========================================================
          BACKGROUND EFFECTS
      ========================================================== */}

      {/* Main radial glow */}
      <div
        className={`pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_0%,rgba(36,107,253,0.16),transparent_60%)] transition-all duration-[1800ms] ease-out ${
          isVisible
            ? "scale-100 opacity-100"
            : "scale-110 opacity-0"
        }`}
      />

      {/* Purple ambient glow */}
      <div
        className={`pointer-events-none absolute -left-40 top-20 h-[350px] w-[350px] rounded-full bg-purple-600/10 blur-[120px] transition-all duration-[1800ms] ease-out ${
          isVisible
            ? "translate-x-0 scale-100 opacity-100"
            : "-translate-x-24 scale-75 opacity-0"
        }`}
      />

      {/* Pink ambient glow */}
      <div
        className={`pointer-events-none absolute -right-40 bottom-10 h-[400px] w-[400px] rounded-full bg-pink-600/10 blur-[130px] transition-all duration-[2200ms] ease-out ${
          isVisible
            ? "translate-x-0 scale-100 opacity-100"
            : "translate-x-24 scale-75 opacity-0"
        }`}
      />

      {/* =========================================================
          MAIN CONTENT
      ========================================================== */}

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* =======================================================
            HEADER
        ======================================================== */}

        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          {/* Heading */}
          <div
            className={`transition-all duration-1000 ease-out ${
              isVisible
                ? "translate-x-0 translate-y-0 opacity-100"
                : "-translate-x-14 translate-y-6 opacity-0"
            }`}
          >
            <span className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.3em] text-[#F020A8] sm:text-xs">
              <span
                className={`h-1.5 w-1.5 rounded-full bg-[#F020A8] shadow-[0_0_14px_#F020A8] transition-all duration-700 ${
                  isVisible
                    ? "scale-100 opacity-100"
                    : "scale-0 opacity-0"
                }`}
              />

              Expo Research
            </span>

            <h2 className="mt-3 text-2xl font-black uppercase tracking-tight text-white sm:text-4xl">
              Latest Technical Insights
            </h2>

            {/* Animated underline */}
            <div
              className={`mt-4 h-[2px] rounded-full bg-gradient-to-r from-[#F020A8] via-[#8B3DFF] to-transparent transition-all duration-[1200ms] ease-out ${
                isVisible
                  ? "w-32 opacity-100"
                  : "w-0 opacity-0"
              }`}
            />
          </div>

          {/* CTA */}
          <Link
            href="/articles"
            className={`group inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-[#8B3DFF]/50 bg-white/[0.04] px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-white backdrop-blur-md transition-all duration-1000 hover:-translate-y-1 hover:border-[#8B3DFF] hover:bg-[#8B3DFF]/10 hover:shadow-[0_0_30px_-6px_#8B3DFF] sm:self-auto ${
              isVisible
                ? "translate-x-0 translate-y-0 opacity-100"
                : "translate-x-14 translate-y-6 opacity-0"
            }`}
          >
            View All Articles

            <ArrowRight
              className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5"
              aria-hidden="true"
            />
          </Link>
        </div>

        {/* =======================================================
            BLOG GRID
        ======================================================== */}

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
          {defaultBlogs.map((blog, index) => (
            <Link
              key={blog.id}
              id={`blog-card-${blog.id}`}
              href="/articles"
              className={`group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.09] bg-[#10112A] transition-all ease-out hover:-translate-y-2 hover:border-[#8B3DFF]/60 hover:shadow-[0_25px_65px_-22px_rgba(108,43,255,0.9)] ${
                isVisible
                  ? "translate-y-0 scale-100 opacity-100"
                  : "translate-y-20 scale-[0.96] opacity-0"
              }`}
              style={{
                transitionDuration: "900ms",
                transitionDelay: reduceMotion
                  ? "0ms"
                  : `${250 + index * 180}ms`,
              }}
            >
              {/* =================================================
                  IMAGE
              ================================================== */}

              <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#14152F]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={blog.imageUrl}
                  alt={blog.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110 group-hover:rotate-[0.5deg]"
                />

                {/* Image dark gradient */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#10112A] via-transparent to-transparent opacity-90" />

                {/* Hover purple glow */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-500/0 via-transparent to-pink-500/0 transition-all duration-700 group-hover:from-purple-500/10 group-hover:to-pink-500/10" />

                {/* Category */}
                <span className="absolute bottom-3 left-3 rounded-full border border-[#F020A8]/40 bg-[#08091A]/85 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#FF7ACF] backdrop-blur-sm transition-all duration-300 group-hover:border-[#F020A8]/80 group-hover:bg-[#F020A8]/15 group-hover:text-white">
                  {blog.category}
                </span>

                {/* Image shine */}
                <span className="pointer-events-none absolute inset-y-0 -left-32 w-24 rotate-12 bg-white/10 blur-xl transition-all duration-1000 group-hover:left-[120%]" />
              </div>

              {/* =================================================
                  CONTENT
              ================================================== */}

              <div className="flex flex-1 flex-col p-5">
                <h4 className="line-clamp-2 text-sm font-bold leading-snug text-white transition-all duration-300 group-hover:translate-x-1 group-hover:text-[#F020A8] sm:text-[0.95rem]">
                  {blog.title}
                </h4>

                <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-[#A5A6C5] transition-colors duration-300 group-hover:text-[#C7C8E0]">
                  {blog.excerpt}
                </p>

                {/* Footer */}
                <div className="mt-auto flex items-center justify-between gap-3 border-t border-white/[0.07] pt-4 text-[10px] uppercase tracking-wider text-[#A5A6C5]">
                  <span className="truncate transition-colors duration-300 group-hover:text-[#C7C8E0]">
                    By{" "}
                    <span className="font-bold text-[#EDEDF8]">
                      {blog.author}
                    </span>
                  </span>

                  <span className="flex shrink-0 items-center gap-2">
                    {formatPublished(blog.publishedAt)}

                    <ArrowRight
                      className="h-3.5 w-3.5 text-[#8B3DFF] transition-all duration-300 group-hover:translate-x-1.5 group-hover:text-[#F020A8]"
                      aria-hidden="true"
                    />
                  </span>
                </div>
              </div>

              {/* Bottom animated border */}
              <span className="absolute bottom-0 left-0 h-[2px] w-0 bg-gradient-to-r from-[#8B3DFF] via-[#F020A8] to-[#00C8FF] transition-all duration-500 group-hover:w-full" />
            </Link>
          ))}
        </div>

        {/* =======================================================
            BOTTOM DECORATIVE ELEMENT
        ======================================================== */}

        <div
          className={`mt-12 flex items-center justify-center gap-3 transition-all duration-1000 ${
            isVisible
              ? "translate-y-0 opacity-100"
              : "translate-y-8 opacity-0"
          }`}
          style={{
            transitionDelay: reduceMotion ? "0ms" : "850ms",
          }}
        >
          <span className="h-px w-16 bg-gradient-to-r from-transparent to-[#8B3DFF]" />

          <span className="h-2 w-2 animate-pulse rounded-full bg-[#F020A8] shadow-[0_0_16px_#F020A8]" />

          <span className="h-px w-16 bg-gradient-to-l from-transparent to-[#8B3DFF]" />
        </div>
      </div>
    </section>
  );
}