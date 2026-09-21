"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { assetUrl, staticAssetUrl } from "@/lib/assets";

interface Partner {
  id: number;
  charity_name: string;
  logo: string | null;
}

const DEFAULT_PARTNER: Partner = {
  id: 1,
  charity_name: "Wessex Cancer Trust",
  logo: staticAssetUrl("/images/charity.png"),
};

export function CharityPartners({
  partners,
}: {
  partners?: Partner[];
}) {
  const displayPartners =
    partners && partners.length > 0
      ? partners
      : [DEFAULT_PARTNER];

  const sectionRef = useRef<HTMLElement | null>(null);

  const [isVisible, setIsVisible] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  /*
   * Detect user's reduced-motion preference.
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
   * Trigger animations whenever the section enters
   * the viewport.
   *
   * The animation resets after leaving the viewport,
   * allowing it to replay when scrolling back.
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
        threshold: 0.18,
        rootMargin: "-50px 0px -50px 0px",
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
      className="relative overflow-hidden border-t border-white/[0.06] bg-[#0B0C20] px-5 py-14 text-white sm:px-6 sm:py-16"
    >
      {/* =====================================================
          BACKGROUND EFFECTS
      ====================================================== */}

      {/* Main radial background */}
      <div
        className={`pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_85%_50%,rgba(108,43,255,0.24),transparent_60%),radial-gradient(ellipse_at_10%_20%,rgba(240,32,168,0.12),transparent_55%)] transition-all duration-[1800ms] ease-out ${
          isVisible
            ? "scale-100 opacity-100"
            : "scale-110 opacity-0"
        }`}
      />

      {/* Purple glow */}
      <div
        className={`pointer-events-none absolute -right-40 top-1/2 h-[420px] w-[420px] -translate-y-1/2 rounded-full bg-purple-600/10 blur-[120px] transition-all duration-[1800ms] ease-out ${
          isVisible
            ? "translate-x-0 scale-100 opacity-100"
            : "translate-x-32 scale-75 opacity-0"
        }`}
      />

      {/* Pink glow */}
      <div
        className={`pointer-events-none absolute -left-40 bottom-0 h-[320px] w-[320px] rounded-full bg-pink-600/10 blur-[110px] transition-all duration-[2200ms] ease-out ${
          isVisible
            ? "translate-x-0 scale-100 opacity-100"
            : "-translate-x-32 scale-75 opacity-0"
        }`}
      />

      {/* Decorative particles */}
      <span
        className={`pointer-events-none absolute left-[12%] top-[25%] h-1.5 w-1.5 rounded-full bg-pink-400 shadow-[0_0_15px_#F020A8] transition-all duration-[1400ms] ${
          isVisible
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-8 scale-0 opacity-0"
        }`}
      />

      <span
        className={`pointer-events-none absolute right-[18%] top-[20%] h-2 w-2 rounded-full bg-purple-400 shadow-[0_0_18px_#8B3DFF] transition-all delay-200 duration-[1600ms] ${
          isVisible
            ? "translate-y-0 scale-100 opacity-100"
            : "-translate-y-8 scale-0 opacity-0"
        }`}
      />

      <span
        className={`pointer-events-none absolute bottom-[20%] right-[8%] h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_15px_#00C8FF] transition-all delay-300 duration-[1800ms] ${
          isVisible
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-8 scale-0 opacity-0"
        }`}
      />

      {/* =====================================================
          MAIN CONTENT
      ====================================================== */}

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[1fr_1.15fr] lg:gap-14">
        {/* ===================================================
            LEFT CONTENT
        ==================================================== */}

        <div
          className={`text-center transition-all duration-1000 ease-out lg:text-left ${
            isVisible
              ? "translate-x-0 translate-y-0 opacity-100"
              : "-translate-x-16 translate-y-6 opacity-0"
          }`}
        >
          {/* Small label */}
          <div className="mb-4 flex items-center justify-center gap-3 lg:justify-start">
            <span
              className={`h-px bg-gradient-to-r from-transparent to-[#F020A8] transition-all duration-1000 ${
                isVisible ? "w-8" : "w-0"
              }`}
            />

            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#F020A8]">
              Community Impact
            </span>

            <span
              className={`h-px bg-gradient-to-r from-[#F020A8] to-transparent transition-all duration-1000 ${
                isVisible ? "w-8" : "w-0"
              }`}
            />
          </div>

          <h2 className="text-xl font-black uppercase tracking-tight text-white sm:text-3xl">
            Our Charity Partners
          </h2>

          <p className="mx-auto mt-2.5 max-w-md text-sm leading-relaxed text-[#A5A6C5] lg:mx-0">
            Together for a better, more inclusive digital future.
          </p>

          {/* Animated underline */}
          <div
            className={`mx-auto mt-5 h-[2px] rounded-full bg-gradient-to-r from-[#F020A8] via-[#8B3DFF] to-transparent transition-all duration-[1200ms] ease-out lg:mx-0 ${
              isVisible
                ? "w-28 opacity-100"
                : "w-0 opacity-0"
            }`}
          />
        </div>

        {/* ===================================================
            RIGHT CONTENT
        ==================================================== */}

        <div className="flex flex-col items-center gap-6 lg:flex-row lg:justify-end lg:gap-8">
          {/* =================================================
              PARTNER LOGOS
          ================================================== */}

          <div className="flex flex-wrap items-center justify-center gap-4">
            {displayPartners.map((partner, index) => {
              const logo =
                assetUrl(partner.logo) ||
                DEFAULT_PARTNER.logo;

              return (
                <div
                  key={partner.id}
                  className={`group/logo relative flex h-24 w-56 items-center justify-center overflow-hidden rounded-xl border border-white/[0.12] bg-white p-4 shadow-[0_14px_40px_-16px_rgba(0,0,0,0.9)] transition-all ease-out hover:-translate-y-2 hover:scale-[1.04] hover:border-[#F020A8]/50 hover:shadow-[0_20px_50px_-15px_rgba(240,32,168,0.45)] sm:h-28 sm:w-64 ${
                    isVisible
                      ? "translate-x-0 translate-y-0 scale-100 opacity-100"
                      : "translate-x-16 translate-y-8 scale-90 opacity-0"
                  }`}
                  style={{
                    transitionDuration: "900ms",
                    transitionDelay: reduceMotion
                      ? "0ms"
                      : `${250 + index * 180}ms`,
                  }}
                >
                  {/* Logo glow */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-500/0 via-transparent to-pink-500/0 transition-all duration-500 group-hover/logo:from-purple-500/10 group-hover/logo:to-pink-500/10" />

                  {/* Shine sweep */}
                  <span className="pointer-events-none absolute inset-y-0 -left-24 w-16 rotate-12 bg-white/60 blur-md transition-all duration-1000 group-hover/logo:left-[120%]" />

                  {logo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logo}
                      alt={partner.charity_name}
                      loading="lazy"
                      className="relative z-10 max-h-full max-w-full object-contain transition-transform duration-500 group-hover/logo:scale-105"
                    />
                  )}

                  {/* Bottom accent */}
                  <span className="absolute bottom-0 left-1/2 h-[2px] w-0 -translate-x-1/2 bg-gradient-to-r from-[#8B3DFF] via-[#F020A8] to-[#00C8FF] transition-all duration-500 group-hover/logo:w-3/4" />
                </div>
              );
            })}
          </div>

          {/* =================================================
              CTA
          ================================================== */}

          <Link
            href="/charity-partnership"
            className={`btn-brand-gradient group relative inline-flex shrink-0 items-center gap-2 overflow-hidden rounded-full px-7 py-3.5 text-xs font-bold uppercase tracking-widest text-white shadow-[0_10px_34px_-8px_rgba(240,32,168,0.6)] transition-all duration-1000 hover:-translate-y-1 hover:scale-105 hover:shadow-[0_15px_45px_-8px_rgba(240,32,168,0.8)] active:scale-95 ${
              isVisible
                ? "translate-x-0 translate-y-0 opacity-100"
                : "translate-x-16 translate-y-8 opacity-0"
            }`}
            style={{
              transitionDelay: reduceMotion
                ? "0ms"
                : `${250 + displayPartners.length * 180}ms`,
            }}
          >
            {/* Button shine */}
            <span className="pointer-events-none absolute inset-y-0 -left-20 w-16 rotate-12 bg-white/30 blur-md transition-all duration-700 group-hover:left-[120%]" />

            <span className="relative z-10">
              Apply for Charity Partnership
            </span>

            <ArrowRight
              className="relative z-10 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5"
              aria-hidden="true"
            />
          </Link>
        </div>
      </div>

      {/* =====================================================
          BOTTOM DECORATIVE LINE
      ====================================================== */}

      <div
        className={`relative z-10 mx-auto mt-10 flex items-center justify-center gap-3 transition-all duration-1000 ${
          isVisible
            ? "translate-y-0 opacity-100"
            : "translate-y-6 opacity-0"
        }`}
        style={{
          transitionDelay: reduceMotion ? "0ms" : "800ms",
        }}
      >
        <span className="h-px w-16 bg-gradient-to-r from-transparent to-[#8B3DFF]" />

        <span className="h-2 w-2 animate-pulse rounded-full bg-[#F020A8] shadow-[0_0_16px_#F020A8]" />

        <span className="h-px w-16 bg-gradient-to-l from-transparent to-[#8B3DFF]" />
      </div>
    </section>
  );
}