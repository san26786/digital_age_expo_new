'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { assetUrl, staticAssetUrl } from '@/lib/assets';

interface Props {
  sectionTitle?: string | null;
  sectionDescription?: string | null;
  image?: string | null;
}

export function BookYourStand({
  sectionTitle,
  sectionDescription,
  image,
}: Props) {
  const sectionRef = useRef<HTMLElement | null>(null);

  const [isVisible, setIsVisible] = useState(false);

  const title =
    sectionTitle ||
    'Book Your Virtual Exhibition Stand – Get In Touch For More Details!';

  const imgMain =
    assetUrl(image) || staticAssetUrl('/images/exhibitor.jpg');

  useEffect(() => {
    const section = sectionRef.current;

    if (!section) return;

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (reducedMotion) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        } else {
          // Reset so the animation plays again
          // when the user scrolls back to this section.
          setIsVisible(false);
        }
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -80px 0px',
      }
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="
        relative
        overflow-hidden
        bg-zinc-950
        px-6
        py-20
        text-white
        sm:py-24
      "
    >
      {/* =====================================================
          BACKGROUND AMBIENT EFFECTS
      ====================================================== */}

      <div
        className="
          pointer-events-none
          absolute
          inset-0
          bg-[radial-gradient(circle_at_10%_30%,rgba(240,32,168,0.12),transparent_35%),radial-gradient(circle_at_90%_70%,rgba(108,43,255,0.14),transparent_40%)]
        "
      />

      {/* Left animated glow */}

      <div
        className="
          pointer-events-none
          absolute
          -left-40
          top-1/4
          h-80
          w-80
          rounded-full
          bg-brand-pink/10
          blur-3xl
          animate-[pulse_7s_ease-in-out_infinite]
        "
      />

      {/* Right animated glow */}

      <div
        className="
          pointer-events-none
          absolute
          -right-40
          bottom-0
          h-96
          w-96
          rounded-full
          bg-[var(--c-accent-violet)]/10
          blur-3xl
          animate-[pulse_8s_ease-in-out_infinite]
        "
      />

      <div className="relative z-10 mx-auto max-w-6xl">

        {/* =====================================================
            MAIN GRID
        ====================================================== */}

        <div className="grid items-center gap-12 sm:grid-cols-2 lg:gap-16">

          {/* =================================================
              LEFT — CONTENT
          ================================================= */}

          <div
            className={`
              transition-all
              duration-1000
              ease-[cubic-bezier(0.22,1,0.36,1)]
              ${
                isVisible
                  ? 'translate-x-0 opacity-100'
                  : '-translate-x-16 opacity-0'
              }
            `}
          >

            {/* Small label */}

            <div
              className={`
                transition-all
                duration-700
                ${
                  isVisible
                    ? 'translate-y-0 opacity-100'
                    : 'translate-y-6 opacity-0'
                }
              `}
            >
              <span
                className="
                  inline-block
                  text-[10px]
                  font-black
                  uppercase
                  tracking-[0.3em]
                  text-brand-pink
                  sm:text-xs
                "
              >
                Become An Exhibitor
              </span>
            </div>

            {/* Heading */}

            <h2
              className={`
                mt-4
                text-3xl
                font-black
                uppercase
                leading-tight
                tracking-tight
                text-white
                transition-all
                duration-1000
                ease-[cubic-bezier(0.22,1,0.36,1)]
                sm:text-5xl
                ${
                  isVisible
                    ? 'translate-y-0 opacity-100'
                    : 'translate-y-8 opacity-0'
                }
              `}
              style={{
                transitionDelay: '100ms',
              }}
            >
              {title}
            </h2>

            {/* Pink accent line */}

            <div
              className={`
                mt-5
                h-[2px]
                bg-gradient-to-r
                from-brand-pink
                via-[var(--c-accent-violet-soft)]
                to-transparent
                transition-all
                duration-1000
                ${
                  isVisible
                    ? 'w-32 opacity-100'
                    : 'w-0 opacity-0'
                }
              `}
              style={{
                transitionDelay: '200ms',
              }}
            />

            {/* Subtitle */}

            <p
              className={`
                mt-5
                text-xs
                font-black
                uppercase
                leading-relaxed
                tracking-[0.2em]
                text-brand-pink
                transition-all
                duration-800
                ${
                  isVisible
                    ? 'translate-y-0 opacity-100'
                    : 'translate-y-6 opacity-0'
                }
              `}
              style={{
                transitionDelay: '250ms',
              }}
            >
              Promote your business to a local, national & international
              audience.
            </p>

            {/* Description */}

            <div
              className={`
                mt-8
                space-y-6
                text-sm
                font-medium
                leading-relaxed
                text-zinc-400
                transition-all
                duration-800
                ${
                  isVisible
                    ? 'translate-y-0 opacity-100'
                    : 'translate-y-8 opacity-0'
                }
              `}
              style={{
                transitionDelay: '350ms',
              }}
            >
              <p>
                Virtual stands work pretty much the same as live in-person
                events — without the hassle of having to stand around all
                day!
              </p>

              {/* =================================================
                  BENEFITS CARD
              ================================================= */}

              <div
                className="
                  group
                  relative
                  overflow-hidden
                  rounded-3xl
                  border
                  border-white/10
                  bg-white/[0.035]
                  p-6
                  shadow-2xl
                  backdrop-blur-sm
                  transition-all
                  duration-500
                  hover:-translate-y-1
                  hover:border-brand-pink/30
                  hover:bg-white/[0.05]
                "
              >
                {/* Card glow */}

                <div
                  className="
                    pointer-events-none
                    absolute
                    -right-16
                    -top-16
                    h-32
                    w-32
                    rounded-full
                    bg-brand-pink/10
                    blur-3xl
                    transition-transform
                    duration-700
                    group-hover:scale-150
                  "
                />

                <p
                  className="
                    relative
                    text-xs
                    font-black
                    uppercase
                    tracking-widest
                    text-zinc-200
                  "
                >
                  5 Ways to Maximize On-Stand Promotions:
                </p>

                <ul className="relative mt-4 space-y-3 text-[11px] font-bold uppercase tracking-widest text-zinc-400 sm:text-xs">

                  {[
                    'Branding your stand with your company logo',
                    'Showcase your website & social channels',
                    'Promote short videos & presentations',
                    'Present company brochures & leaflets',
                    'Engage in real-time with instant video call & chat',
                  ].map((item, index) => (
                    <li
                      key={item}
                      className="
                        flex
                        items-start
                        gap-3
                        transition-all
                        duration-300
                        hover:translate-x-1
                        hover:text-white
                      "
                    >
                      <span
                        className="
                          mt-1.5
                          h-1.5
                          w-1.5
                          shrink-0
                          rounded-full
                          bg-brand-pink
                          shadow-[0_0_10px_rgba(240,32,168,0.8)]
                        "
                      />

                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Dynamic description */}

              {sectionDescription && (
                <p className="whitespace-pre-line pt-2">
                  {sectionDescription}
                </p>
              )}
            </div>

            {/* =================================================
                BUTTONS
            ================================================= */}

            <div
              className={`
                mt-10
                flex
                flex-wrap
                gap-4
                transition-all
                duration-800
                ${
                  isVisible
                    ? 'translate-y-0 opacity-100'
                    : 'translate-y-8 opacity-0'
                }
              `}
              style={{
                transitionDelay: '500ms',
              }}
            >
              {/* Primary CTA */}

              <Link
                href="/exhibitor-registration"
                className="
                  btn-brand-gradient
                  group
                  relative
                  overflow-hidden
                  rounded-full
                  px-10
                  py-4
                  text-[10px]
                  font-black
                  uppercase
                  tracking-widest
                  text-white
                  shadow-2xl
                  transition-all
                  duration-300
                  hover:scale-105
                  hover:shadow-[0_15px_45px_-10px_rgba(240,32,168,0.8)]
                  active:scale-95
                "
              >
                {/* Shine */}

                <span
                  className="
                    pointer-events-none
                    absolute
                    -left-full
                    top-0
                    h-full
                    w-1/2
                    skew-x-[-20deg]
                    bg-white/20
                    transition-all
                    duration-700
                    group-hover:left-[130%]
                  "
                />

                <span className="relative">
                  Book Your Stand
                </span>
              </Link>

              {/* Secondary CTA */}

              <Link
                href="/exhibitors"
                className="
                  btn-outline-animated
                  group
                  rounded-full
                  border
                  border-white/10
                  bg-white/5
                  px-10
                  py-4
                  text-[10px]
                  font-black
                  uppercase
                  tracking-widest
                  text-zinc-300
                  shadow-xl
                  transition-all
                  duration-300
                  hover:-translate-y-1
                  hover:border-brand-pink/40
                  hover:bg-white/10
                  hover:text-white
                  active:scale-95
                "
              >
                Our Exhibitors
              </Link>
            </div>
          </div>

          {/* =================================================
              RIGHT — IMAGES
          ================================================= */}

          <div className="space-y-6">

            {/* =================================================
                IMAGE 1
            ================================================= */}

            <div
              className={`
                group
                relative
                transition-all
                duration-1000
                ease-[cubic-bezier(0.22,1,0.36,1)]
                ${
                  isVisible
                    ? 'translate-x-0 opacity-100'
                    : 'translate-x-16 opacity-0'
                }
              `}
              style={{
                transitionDelay: '200ms',
              }}
            >
              {/* Glow */}

              <div
                className="
                  pointer-events-none
                  absolute
                  -inset-4
                  rounded-[2rem]
                  bg-gradient-to-br
                  from-brand-pink/20
                  via-[var(--c-accent-violet-soft)]/15
                  to-[var(--c-accent-cyan)]/20
                  blur-2xl
                  opacity-70
                  transition-all
                  duration-700
                  group-hover:opacity-100
                  group-hover:scale-105
                "
              />

              <div
                className="
                  relative
                  overflow-hidden
                  rounded-3xl
                  border
                  border-white/10
                  bg-white/5
                  p-2
                  shadow-2xl
                  transition-all
                  duration-500
                  group-hover:-translate-y-2
                  group-hover:border-brand-pink/30
                "
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}

                <img
                  src={imgMain}
                  alt={title}
                  className="
                    w-full
                    h-auto
                    rounded-2xl
                    object-cover
                    transition-all
                    duration-700
                    ease-out
                    group-hover:scale-105
                  "
                />

                {/* Overlay */}

                <div
                  className="
                    pointer-events-none
                    absolute
                    inset-2
                    rounded-2xl
                    bg-gradient-to-t
                    from-black/30
                    via-transparent
                    to-transparent
                    opacity-70
                    transition-opacity
                    duration-500
                    group-hover:opacity-30
                  "
                />

                {/* Shine */}

                <div
                  className="
                    pointer-events-none
                    absolute
                    -left-full
                    top-0
                    h-full
                    w-1/2
                    skew-x-[-20deg]
                    bg-gradient-to-r
                    from-transparent
                    via-white/15
                    to-transparent
                    transition-all
                    duration-1000
                    group-hover:left-[130%]
                  "
                />
              </div>
            </div>

            {/* =================================================
                IMAGE 2
            ================================================= */}

            <div
              className={`
                group
                relative
                transition-all
                duration-1000
                ease-[cubic-bezier(0.22,1,0.36,1)]
                ${
                  isVisible
                    ? 'translate-x-0 opacity-100'
                    : 'translate-x-16 opacity-0'
                }
              `}
              style={{
                transitionDelay: '400ms',
              }}
            >
              {/* Glow */}

              <div
                className="
                  pointer-events-none
                  absolute
                  -inset-4
                  rounded-[2rem]
                  bg-gradient-to-br
                  from-[var(--c-accent-violet)]/20
                  via-[var(--c-accent-violet-soft)]/15
                  to-[var(--c-accent-cyan)]/20
                  blur-2xl
                  opacity-60
                  transition-all
                  duration-700
                  group-hover:opacity-100
                  group-hover:scale-105
                "
              />

              <div
                className="
                  relative
                  overflow-hidden
                  rounded-3xl
                  border
                  border-white/10
                  bg-white/5
                  p-2
                  shadow-2xl
                  transition-all
                  duration-500
                  group-hover:-translate-y-2
                  group-hover:border-[var(--c-accent-violet-soft)]/40
                "
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}

                <img
                  src={staticAssetUrl('/images/exhibitor_2.jpg')}
                  alt="Virtual Exhibition Stand Showcase"
                  className="
                    w-full
                    h-auto
                    rounded-2xl
                    object-cover
                    transition-all
                    duration-700
                    ease-out
                    group-hover:scale-105
                  "
                />

                {/* Overlay */}

                <div
                  className="
                    pointer-events-none
                    absolute
                    inset-2
                    rounded-2xl
                    bg-gradient-to-t
                    from-black/30
                    via-transparent
                    to-transparent
                    opacity-70
                    transition-opacity
                    duration-500
                    group-hover:opacity-30
                  "
                />

                {/* Shine */}

                <div
                  className="
                    pointer-events-none
                    absolute
                    -left-full
                    top-0
                    h-full
                    w-1/2
                    skew-x-[-20deg]
                    bg-gradient-to-r
                    from-transparent
                    via-white/15
                    to-transparent
                    transition-all
                    duration-1000
                    group-hover:left-[130%]
                  "
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}