"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * UI-ONLY REDESIGN.
 *
 * Existing FAQ questions, answers, default-open first item,
 * and single-open accordion behavior remain unchanged.
 */
export function FaqsAccordionSection() {
  const [activeFaqId, setActiveFaqId] = useState<string | null>("faq-1");
  const [isVisible, setIsVisible] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const sectionRef = useRef<HTMLElement | null>(null);

  const faqs = [
    {
      id: "faq-1",
      question: "How do I claim my Free Access Badge?",
      answer:
        "You can click on the 'Get Free Ticket' button on any page and complete the short registration form. You will receive a PDF badge and access credentials directly in your email inbox.",
    },
    {
      id: "faq-2",
      question:
        "What technical requirements are there for the Virtual Platform?",
      answer:
        "The platform is fully browser-based and optimized for Google Chrome, Safari, and Microsoft Edge on desktops, laptops, and tablets. No plugins or downloads are required.",
    },
    {
      id: "faq-3",
      question:
        "Are the live session recordings available after the show?",
      answer:
        "Yes, Delegate and VIP Pass holders receive complete post-event access to all HD recordings of keynote lectures, panel discussions, and technical workshops on demand.",
    },
    {
      id: "faq-4",
      question: "How do virtual exhibitor stands work?",
      answer:
        "Exhibitor stands work similarly to in-person shows but online. Visitors can read brochures, watch introduction videos, browse websites, and click 'Call Now' to enter a direct live video call with your booth team.",
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
   * Intersection Observer.
   *
   * Animation plays when the FAQ section enters the viewport.
   * It resets after leaving the viewport so scrolling back
   * to the section plays the animation again.
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
      className="relative overflow-hidden border-y border-white/[0.06] bg-[#0B0C20] px-5 py-16 text-white sm:px-6 sm:py-20"
    >
      {/* =====================================================
          BACKGROUND EFFECTS
      ====================================================== */}

      {/* Main radial glow */}
      <div
        className={`pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_10%_20%,rgba(108,43,255,0.18),transparent_60%)] transition-all duration-[1800ms] ease-out ${
          isVisible
            ? "scale-100 opacity-100"
            : "scale-110 opacity-0"
        }`}
      />

      {/* Purple ambient glow */}
      <div
        className={`pointer-events-none absolute -left-40 top-1/2 h-[420px] w-[420px] -translate-y-1/2 rounded-full bg-purple-600/10 blur-[120px] transition-all duration-[1800ms] ease-out ${
          isVisible
            ? "translate-x-0 scale-100 opacity-100"
            : "-translate-x-24 scale-75 opacity-0"
        }`}
      />

      {/* Pink ambient glow */}
      <div
        className={`pointer-events-none absolute -right-40 bottom-0 h-[350px] w-[350px] rounded-full bg-pink-600/10 blur-[120px] transition-all duration-[2200ms] ease-out ${
          isVisible
            ? "translate-x-0 scale-100 opacity-100"
            : "translate-x-24 scale-75 opacity-0"
        }`}
      />

      {/* Decorative floating dots */}
      <span
        className={`pointer-events-none absolute left-[8%] top-[25%] h-2 w-2 rounded-full bg-purple-400 shadow-[0_0_18px_#8B3DFF] transition-all duration-[1500ms] ${
          isVisible
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-10 scale-0 opacity-0"
        }`}
      />

      <span
        className={`pointer-events-none absolute right-[10%] top-[20%] h-1.5 w-1.5 rounded-full bg-pink-400 shadow-[0_0_15px_#F020A8] transition-all delay-300 duration-[1700ms] ${
          isVisible
            ? "translate-y-0 scale-100 opacity-100"
            : "-translate-y-10 scale-0 opacity-0"
        }`}
      />

      <span
        className={`pointer-events-none absolute bottom-[18%] right-[25%] h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_16px_#00C8FF] transition-all delay-500 duration-[1900ms] ${
          isVisible
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-10 scale-0 opacity-0"
        }`}
      />

      {/* =====================================================
          MAIN CONTENT
      ====================================================== */}

      <div className="relative z-10 mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
        {/* ===================================================
            LEFT: HEADING / INTRO
        ==================================================== */}

        <div
          className={`lg:pt-2 transition-all duration-1000 ease-out ${
            isVisible
              ? "translate-x-0 translate-y-0 opacity-100"
              : "-translate-x-16 translate-y-8 opacity-0"
          }`}
        >
          {/* Top accent */}
          <span
            className={`block h-1 rounded-full bg-gradient-to-r from-[#F020A8] to-[#8B3DFF] transition-all duration-1000 ${
              isVisible ? "w-12" : "w-0"
            }`}
          />

          {/* Label */}
          <span
            className={`mt-5 block text-[11px] font-black uppercase tracking-[0.3em] text-[#F020A8] transition-all delay-150 duration-700 sm:text-xs ${
              isVisible
                ? "translate-y-0 opacity-100"
                : "translate-y-5 opacity-0"
            }`}
          >
            Expo Inquiries
          </span>

          {/* Heading */}
          <h2
            className={`mt-3 text-2xl font-black uppercase leading-[1.12] tracking-tight text-white transition-all delay-200 duration-1000 ease-out sm:text-4xl ${
              isVisible
                ? "translate-y-0 opacity-100"
                : "translate-y-8 opacity-0"
            }`}
          >
            Frequently Asked Questions
          </h2>

          {/* Description */}
          <p
            className={`mt-4 max-w-md text-sm leading-relaxed text-[#A5A6C5] transition-all delay-300 duration-1000 ${
              isVisible
                ? "translate-y-0 opacity-100"
                : "translate-y-8 opacity-0"
            }`}
          >
            Find answers to common questions about the event,
            registration, exhibitors and more.
          </p>

          {/* Decorative line */}
          <div
            className={`mt-7 flex items-center gap-3 transition-all delay-500 duration-1000 ${
              isVisible
                ? "translate-y-0 opacity-100"
                : "translate-y-5 opacity-0"
            }`}
          >
            <span className="h-px w-16 bg-gradient-to-r from-[#F020A8] to-[#8B3DFF]" />

            <span className="h-2 w-2 animate-pulse rounded-full bg-[#F020A8] shadow-[0_0_15px_#F020A8]" />
          </div>
        </div>

        {/* ===================================================
            RIGHT: ACCORDION
        ==================================================== */}

        <div data-reveal="right" className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = activeFaqId === faq.id;

            return (
              <div
                key={faq.id}
                id={`faq-accordion-${faq.id}`}
                className={`group relative overflow-hidden rounded-2xl border bg-[#10112A]/85 backdrop-blur-sm transition-all ease-out ${
                  isOpen
                    ? "border-[#8B3DFF]/55 shadow-[0_15px_45px_-25px_rgba(139,61,255,0.8)]"
                    : "border-white/[0.09] hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_15px_40px_-25px_rgba(108,43,255,0.6)]"
                } ${
                  isVisible
                    ? "translate-x-0 translate-y-0 opacity-100"
                    : "translate-x-16 translate-y-8 opacity-0"
                }`}
                style={{
                  transitionDuration: "800ms",
                  transitionDelay: reduceMotion
                    ? "0ms"
                    : `${200 + index * 150}ms`,
                }}
              >
                {/* Active top glow */}
                <div
                  className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#8B3DFF] to-transparent transition-opacity duration-500 ${
                    isOpen ? "opacity-100" : "opacity-0"
                  }`}
                />

                {/* Question */}
                <button
                  type="button"
                  onClick={() =>
                    setActiveFaqId(
                      isOpen ? null : faq.id
                    )
                  }
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${faq.id}`}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-all duration-300 hover:bg-white/[0.03] sm:px-6"
                >
                  <span
                    className={`text-sm font-bold transition-all duration-300 sm:text-[0.95rem] ${
                      isOpen
                        ? "translate-x-1 text-white"
                        : "text-white group-hover:translate-x-1 group-hover:text-[#F020A8]"
                    }`}
                  >
                    {faq.question}
                  </span>

                  {/* Chevron container */}
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                      isOpen
                        ? "rotate-180 border-[#F020A8]/40 bg-[#F020A8]/10"
                        : "border-white/10 bg-white/[0.03] group-hover:border-[#8B3DFF]/40"
                    }`}
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-colors duration-300 ${
                        isOpen
                          ? "text-[#F020A8]"
                          : "text-[#A5A6C5] group-hover:text-white"
                      }`}
                      aria-hidden="true"
                    />
                  </span>
                </button>

                {/* Answer */}
                <div
                  id={`faq-panel-${faq.id}`}
                  className={`grid transition-all duration-500 ease-in-out ${
                    isOpen
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div className="border-t border-white/[0.07] px-5 py-4 sm:px-6">
                      <p
                        className={`text-sm leading-relaxed text-[#A5A6C5] transition-all duration-500 ${
                          isOpen
                            ? "translate-y-0 opacity-100"
                            : "-translate-y-2 opacity-0"
                        }`}
                      >
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom active indicator */}
                <span
                  className={`absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-[#8B3DFF] via-[#F020A8] to-[#00C8FF] transition-all duration-500 ${
                    isOpen ? "w-full" : "w-0"
                  }`}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* =====================================================
          BOTTOM DECORATIVE LINE
      ====================================================== */}

      <div
        className={`relative z-10 mx-auto mt-12 flex items-center justify-center gap-3 transition-all duration-1000 ${
          isVisible
            ? "translate-y-0 opacity-100"
            : "translate-y-8 opacity-0"
        }`}
        style={{
          transitionDelay: reduceMotion ? "0ms" : "900ms",
        }}
      >
        <span className="h-px w-16 bg-gradient-to-r from-transparent to-[#8B3DFF]" />

        <span className="h-2 w-2 animate-pulse rounded-full bg-[#F020A8] shadow-[0_0_16px_#F020A8]" />

        <span className="h-px w-16 bg-gradient-to-l from-transparent to-[#8B3DFF]" />
      </div>
    </section>
  );
}