"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { staticAssetUrl } from "@/lib/assets";

interface Props {
  title?: string;
  description?: string;
}

export function GetFreeTicket({ title, description }: Props) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const motionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    setReduceMotion(motionQuery.matches);

    const handleMotionChange = (event: MediaQueryListEvent) => {
      setReduceMotion(event.matches);
    };

    motionQuery.addEventListener("change", handleMotionChange);

    return () => {
      motionQuery.removeEventListener("change", handleMotionChange);
    };
  }, []);

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
          // Reset animation so it plays again when scrolling back
          setIsVisible(false);
        }
      },
      {
        threshold: 0.18,
        rootMargin: "-50px 0px -50px 0px",
      }
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, [reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return;

    const handleScroll = () => {
      const section = sectionRef.current;
      const video = videoRef.current;

      if (!section || !video) return;

      const rect = section.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Only apply subtle movement while section is around viewport
      if (rect.bottom < 0 || rect.top > windowHeight) return;

      const progress =
        (windowHeight - rect.top) /
        (windowHeight + rect.height);

      const clampedProgress = Math.max(
        0,
        Math.min(1, progress)
      );

      const scale = 1.04 + clampedProgress * 0.04;
      const translateY = (clampedProgress - 0.5) * 24;

      video.style.transform = `scale(${scale}) translateY(${translateY}px)`;
    };

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [reduceMotion]);

  return (
    <section
      ref={sectionRef}
      /*
       * Pinned to the dark tokens in both themes. The visible ground here is a VIDEO under a
       * from-slate-950 scrim, not the section's own `bg-slate-950` - so lightening the token
       * changed nothing anyone can see while the copy on top turned to ink.
       */
      data-theme-scope="dark"
      className="group relative min-h-[520px] overflow-hidden bg-slate-950 py-24 text-center text-white"
    >
      {/* Background Video */}
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        poster={staticAssetUrl(
          "https://digitalageexpo.com/images/maxresdefault.jpg"
        )}
        className="absolute inset-0 h-full w-full object-cover opacity-35 will-change-transform transition-transform duration-700 ease-out"
      >
        <source
          src={staticAssetUrl(
            "https://digitalageexpo.com/images/get_ticket.mp4"
          )}
          type="video/mp4"
        />
      </video>

      {/* Main Dark Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-950/85" />

      {/* Purple / Pink Ambient Glow */}
      <div
        className={`pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-600/20 blur-[120px] transition-all duration-[1800ms] ease-out ${
          isVisible
            ? "scale-100 opacity-100"
            : "scale-50 opacity-0"
        }`}
      />

      <div
        className={`pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-pink-600/15 blur-[100px] transition-all duration-[2000ms] ${
          isVisible
            ? "translate-x-0 opacity-100"
            : "-translate-x-32 opacity-0"
        }`}
      />

      <div
        className={`pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-cyan-500/10 blur-[110px] transition-all duration-[2200ms] ${
          isVisible
            ? "translate-x-0 opacity-100"
            : "translate-x-32 opacity-0"
        }`}
      />

      {/* Decorative Floating Dots */}
      <div
        className={`pointer-events-none absolute left-[12%] top-[25%] h-2 w-2 rounded-full bg-pink-400 shadow-[0_0_20px_rgba(244,114,182,0.8)] transition-all duration-[1600ms] ${
          isVisible
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-10 scale-0 opacity-0"
        }`}
      />

      <div
        className={`pointer-events-none absolute right-[15%] top-[32%] h-3 w-3 rounded-full bg-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.8)] transition-all delay-300 duration-[1800ms] ${
          isVisible
            ? "translate-y-0 scale-100 opacity-100"
            : "-translate-y-10 scale-0 opacity-0"
        }`}
      />

      <div
        className={`pointer-events-none absolute bottom-[22%] left-[20%] h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.8)] transition-all delay-500 duration-[2000ms] ${
          isVisible
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-12 scale-0 opacity-0"
        }`}
      />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-4xl px-6">
        {/* Small Top Label */}
        <div
          className={`mb-5 flex justify-center transition-all duration-700 ease-out ${
            isVisible
              ? "translate-y-0 opacity-100"
              : "translate-y-8 opacity-0"
          }`}
        >
          <span className="rounded-full border border-purple-400/30 bg-purple-500/10 px-5 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-purple-300 backdrop-blur-md">
            Join The Experience
          </span>
        </div>

        {/* Heading */}
        <h2
          className={`text-3xl font-black uppercase leading-tight tracking-tight text-white drop-shadow-md transition-all duration-1000 ease-out sm:text-5xl lg:text-6xl ${
            isVisible
              ? "translate-y-0 scale-100 opacity-100"
              : "translate-y-12 scale-95 opacity-0"
          }`}
        >
          {title || "Get Entry Ticket Now!"}
        </h2>

        {/* Animated Heading Line */}
        <div
          className={`mx-auto mt-6 h-1 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 transition-all duration-[1200ms] ease-out ${
            isVisible
              ? "w-24 opacity-100"
              : "w-0 opacity-0"
          }`}
        />

        {/* Description */}
        <p
          className={`mx-auto mt-6 max-w-3xl text-base font-medium leading-relaxed text-slate-200 drop-shadow-sm transition-all delay-200 duration-1000 ease-out sm:text-lg ${
            isVisible
              ? "translate-y-0 opacity-100"
              : "translate-y-10 opacity-0"
          }`}
        >
          {description ||
            "Experience the conference wherever you are. Register now for online access. Tune in live for the keynotes and watch sessions on demand. Also be sure to join our event."}
        </p>

        {/* Buttons */}
        <div
          className={`mt-10 flex flex-wrap justify-center gap-4 transition-all delay-300 duration-1000 ease-out ${
            isVisible
              ? "translate-y-0 opacity-100"
              : "translate-y-12 opacity-0"
          }`}
        >
          {/* Free Ticket */}
          <Link
            href="/free-ticket"
            className="group/btn relative overflow-hidden rounded-full px-8 py-3.5 font-bold text-white shadow-xl transition-all duration-300 hover:-translate-y-1 hover:scale-105 hover:shadow-[0_15px_40px_rgba(139,61,255,0.35)] active:scale-95"
          >
            {/* Button Background */}
            <span className="absolute inset-0 bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500" />

            {/* Shine */}
            <span className="absolute inset-y-0 -left-20 w-16 rotate-12 bg-white/30 blur-md transition-all duration-700 group-hover/btn:left-[120%]" />

            <span className="relative z-10">
              Get Free Ticket
            </span>
          </Link>

          {/* Book Stand */}
          <Link
            href="/exhibitor-registration"
            className="group/stand relative overflow-hidden rounded-full bg-white/10 px-8 py-3.5 font-bold text-white ring-1 ring-white/30 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:scale-105 hover:bg-white/20 hover:shadow-[0_15px_40px_rgba(255,255,255,0.12)] active:scale-95"
          >
            {/* Shine */}
            <span className="absolute inset-y-0 -left-20 w-16 rotate-12 bg-white/20 blur-md transition-all duration-700 group-hover/stand:left-[120%]" />

            <span className="relative z-10">
              Book Your Stand
            </span>
          </Link>
        </div>

        {/* Bottom Decorative Line */}
        <div
          className={`mx-auto mt-14 flex items-center justify-center gap-3 transition-all delay-500 duration-1000 ${
            isVisible
              ? "translate-y-0 opacity-100"
              : "translate-y-8 opacity-0"
          }`}
        >
          <span className="h-px w-12 bg-gradient-to-r from-transparent to-purple-400" />

          <span className="h-2 w-2 rounded-full bg-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.8)]" />

          <span className="h-px w-12 bg-gradient-to-r from-purple-400 to-transparent" />
        </div>
      </div>

      {/* Bottom Fade */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950 to-transparent" />
    </section>
  );
}