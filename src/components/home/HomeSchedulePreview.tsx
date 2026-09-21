'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { ScheduleDay, ScheduleSlot } from '@/lib/services/schedule';

interface Props {
  scheduleDays: ScheduleDay[];
}

const MONTHS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
];

function dateBadge(date?: string): { day: string; month: string } | null {
  if (!date) return null;

  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);

  if (!m) return null;

  const monthIndex = Number(m[2]) - 1;

  if (monthIndex < 0 || monthIndex > 11) return null;

  return {
    day: m[3],
    month: MONTHS[monthIndex],
  };
}

export function HomeSchedulePreview({ scheduleDays }: Props) {
  const sectionRef = useRef<HTMLElement | null>(null);

  const [isVisible, setIsVisible] = useState(false);
  const [visibleSessions, setVisibleSessions] = useState<Set<number>>(
    new Set()
  );

  const slots: (ScheduleSlot & {
    dayTitle?: string;
    date?: string;
  })[] = [];

  for (const day of scheduleDays) {
    for (const slot of day.slots) {
      slots.push({
        ...slot,
        dayTitle: day.dayTitle,
        date: day.date,
      });
    }
  }

  const displaySlots = slots.slice(0, 2);

  const fallbackSlots = [
    {
      id: 101,
      title:
        'Keynote: Redefining Corporate Operations with Advanced Neural Architecture',
      description:
        'How leading architectures leverage cognitive pipelines and deep machine intelligence to scale corporate logistics and compliance workflows seamlessly.',
      startTime: '09:00 AM',
      endTime: '10:30 AM',
      agendaName: 'Main Seminar Stage',
      speakerName: 'Dr. Aria Chen',
      dayTitle: 'Day 1',
    },
    {
      id: 102,
      title:
        'Panel: Scaling Secure Decentrailised Ledgers in Financial Networks',
      description:
        'NexaScale and partners debate the scaling and throughput milestones for peer-to-peer enterprise financial ledgers under quantum threats.',
      startTime: '11:00 AM',
      endTime: '12:30 PM',
      agendaName: 'FinTech Innovation Hub',
      speakerName: 'Marcus Vance',
      dayTitle: 'Day 1',
    },
  ];

  const sessionsToRender =
    displaySlots.length > 0 ? displaySlots : fallbackSlots;

  /*
   * Scroll reveal
   *
   * The state is reset when the section leaves the viewport.
   * Therefore the animation plays again when the user scrolls
   * back up to the section.
   */
  useEffect(() => {
    const section = sectionRef.current;

    if (!section) return;

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (reducedMotion) {
      setIsVisible(true);
      setVisibleSessions(
        new Set(sessionsToRender.map((session) => Number(session.id)))
      );
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);

            setVisibleSessions(
              new Set(
                sessionsToRender.map((session) => Number(session.id))
              )
            );
          } else {
            setIsVisible(false);

            setVisibleSessions(new Set());
          }
        });
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -70px 0px',
      }
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, [sessionsToRender.length]);

  return (
    <section
      ref={sectionRef}
      className="
        relative
        overflow-hidden
        border-y
        border-white/[0.06]
        bg-[#0B0C20]
        px-5
        py-16
        text-white
        sm:px-6
        sm:py-20
      "
    >
      {/* =========================================================
          BACKGROUND
      ========================================================== */}

      <div
        className="
          pointer-events-none
          absolute
          inset-0
          bg-[radial-gradient(ellipse_at_15%_30%,rgba(36,107,253,0.18),transparent_60%),radial-gradient(ellipse_at_90%_80%,rgba(240,32,168,0.14),transparent_55%)]
        "
      />

      {/* Moving background glow - left */}

      <div
        className="
          pointer-events-none
          absolute
          -left-32
          top-1/4
          h-72
          w-72
          rounded-full
          bg-[#246BFD]/10
          blur-3xl
          animate-[pulse_6s_ease-in-out_infinite]
        "
      />

      {/* Moving background glow - right */}

      <div
        className="
          pointer-events-none
          absolute
          -right-32
          bottom-0
          h-80
          w-80
          rounded-full
          bg-[#F020A8]/10
          blur-3xl
          animate-[pulse_7s_ease-in-out_infinite]
        "
      />

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2 lg:gap-14">

        {/* =========================================================
            LEFT — STAGE IMAGE
        ========================================================== */}

        <div
          className={`
            relative
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
          {/* Outer animated glow */}

          <div
            className="
              pointer-events-none
              absolute
              -inset-5
              rounded-[2.25rem]
              bg-gradient-to-br
              from-[#F020A8]/30
              via-[#6C2BFF]/25
              to-[#00C8FF]/30
              blur-3xl
              transition-all
              duration-1000
              group-hover:scale-110
            "
          />

          {/* Image frame */}

          <div
            className="
              group
              relative
              overflow-hidden
              rounded-[1.65rem]
              bg-gradient-to-br
              from-[#F020A8]
              via-[#8B3DFF]
              to-[#00C8FF]
              p-[2px]
              shadow-[0_28px_80px_-28px_rgba(0,0,0,0.9)]
              transition-all
              duration-700
              hover:-translate-y-2
              hover:shadow-[0_35px_90px_-25px_rgba(108,43,255,0.65)]
            "
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/exhibitor_2.jpg"
              alt="Presentation in progress on the main stage"
              loading="lazy"
              className="
                aspect-[16/11]
                w-full
                rounded-[1.55rem]
                object-cover
                transition-all
                duration-1000
                ease-out
                group-hover:scale-105
                group-hover:rotate-[0.5deg]
              "
            />

            {/* Image overlay */}

            <div
              className="
                pointer-events-none
                absolute
                inset-0
                rounded-[1.55rem]
                bg-gradient-to-t
                from-[#0B0C20]/35
                via-transparent
                to-transparent
                opacity-70
                transition-opacity
                duration-500
                group-hover:opacity-40
              "
            />

            {/* Moving shine */}

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
                via-white/10
                to-transparent
                transition-all
                duration-1000
                group-hover:left-[130%]
              "
            />
          </div>
        </div>

        {/* =========================================================
            RIGHT — SCHEDULE CONTENT
        ========================================================== */}

        <div>

          {/* Eyebrow */}

          <div
            className={`
              transition-all
              duration-700
              ease-[cubic-bezier(0.22,1,0.36,1)]
              ${
                isVisible
                  ? 'translate-y-0 opacity-100'
                  : 'translate-y-8 opacity-0'
              }
            `}
            style={{
              transitionDelay: '150ms',
            }}
          >
            <span
              className="
                text-[11px]
                font-black
                uppercase
                tracking-[0.3em]
                text-[#F020A8]
                sm:text-xs
              "
            >
              Stage Schedules
            </span>
          </div>

          {/* Heading */}

          <h2
            className={`
              mt-3
              text-2xl
              font-black
              uppercase
              tracking-tight
              text-white
              transition-all
              duration-800
              ease-[cubic-bezier(0.22,1,0.36,1)]
              sm:text-4xl
              ${
                isVisible
                  ? 'translate-y-0 opacity-100'
                  : 'translate-y-8 opacity-0'
              }
            `}
            style={{
              transitionDelay: '250ms',
            }}
          >
            Live Schedules Preview
          </h2>

          {/* Description */}

          <p
            className={`
              mt-3
              max-w-xl
              text-sm
              leading-relaxed
              text-[#A5A6C5]
              transition-all
              duration-800
              ease-[cubic-bezier(0.22,1,0.36,1)]
              sm:text-base
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
            A snapshot of major technical presentations taking place across
            stages. Register a delegate pass for full interactive access.
          </p>

          {/* =========================================================
              SESSION LIST
          ========================================================== */}

          <div className="mt-7 space-y-3">
            {sessionsToRender.map((session, index) => {
              const badge = dateBadge(
                (session as { date?: string }).date
              );

              const sessionVisible = visibleSessions.has(
                Number(session.id)
              );

              return (
                <Link
                  key={session.id}
                  id={`schedule-slot-${session.id}`}
                  href="/event_schedule"
                  className={`
                    group
                    flex
                    items-center
                    gap-4
                    rounded-2xl
                    border
                    border-white/[0.09]
                    bg-[#10112A]/85
                    p-3.5
                    backdrop-blur-sm

                    transition-all
                    duration-700
                    ease-[cubic-bezier(0.22,1,0.36,1)]

                    ${
                      sessionVisible
                        ? 'translate-x-0 opacity-100'
                        : 'translate-x-12 opacity-0'
                    }

                    hover:-translate-y-1
                    hover:border-[#8B3DFF]/55
                    hover:bg-[#10112A]
                    hover:shadow-[0_16px_40px_-20px_rgba(108,43,255,0.9)]

                    sm:p-4
                  `}
                  style={{
                    transitionDelay: sessionVisible
                      ? `${450 + index * 150}ms`
                      : '0ms',
                  }}
                >
                  {/* DATE BADGE */}

                  <span
                    className="
                      flex
                      h-14
                      w-14
                      shrink-0
                      flex-col
                      items-center
                      justify-center
                      rounded-xl
                      border
                      border-[#8B3DFF]/30
                      bg-[#8B3DFF]/10
                      text-center
                      leading-none
                      transition-all
                      duration-500
                      group-hover:scale-105
                      group-hover:border-[#F020A8]/50
                      group-hover:bg-[#F020A8]/10
                    "
                  >
                    {badge ? (
                      <>
                        <span className="text-lg font-black text-white">
                          {badge.day}
                        </span>

                        <span
                          className="
                            mt-0.5
                            text-[9px]
                            font-bold
                            tracking-wider
                            text-[#A5A6C5]
                            transition-colors
                            duration-300
                            group-hover:text-[#FF7ACF]
                          "
                        >
                          {badge.month}
                        </span>
                      </>
                    ) : (
                      <span
                        className="
                          px-1
                          text-[10px]
                          font-bold
                          uppercase
                          leading-tight
                          text-[#A5A6C5]
                        "
                      >
                        {session.dayTitle || 'Session'}
                      </span>
                    )}
                  </span>

                  {/* SESSION CONTENT */}

                  <span className="min-w-0 flex-1">
                    <span
                      className="
                        line-clamp-1
                        block
                        text-sm
                        font-bold
                        text-white
                        transition-colors
                        duration-300
                        group-hover:text-[#F020A8]
                        sm:text-[0.95rem]
                      "
                    >
                      {session.title}
                    </span>

                    <span
                      className="
                        mt-1
                        block
                        truncate
                        text-xs
                        text-[#A5A6C5]
                      "
                    >
                      {session.startTime} – {session.endTime}
                      {session.agendaName
                        ? ` · ${session.agendaName}`
                        : ''}
                    </span>

                    {session.speakerName && (
                      <span
                        className="
                          mt-0.5
                          block
                          truncate
                          text-[11px]
                          text-[#A5A6C5]/75
                        "
                      >
                        Host: {session.speakerName}
                      </span>
                    )}
                  </span>

                  {/* ARROW */}

                  <ChevronRight
                    className="
                      h-5
                      w-5
                      shrink-0
                      text-[#8B3DFF]
                      transition-all
                      duration-300
                      group-hover:translate-x-1
                      group-hover:text-[#F020A8]
                    "
                    aria-hidden="true"
                  />
                </Link>
              );
            })}
          </div>

          {/* =========================================================
              CTA
          ========================================================== */}

          <div
            className={`
              mt-8
              transition-all
              duration-800
              ease-[cubic-bezier(0.22,1,0.36,1)]
              ${
                isVisible
                  ? 'translate-y-0 opacity-100'
                  : 'translate-y-8 opacity-0'
              }
            `}
            style={{
              transitionDelay: '800ms',
            }}
          >
            <Link
              href="/event_schedule"
              className="
                btn-brand-gradient
                group
                inline-flex
                items-center
                gap-2
                rounded-full
                px-8
                py-3.5
                text-xs
                font-bold
                uppercase
                tracking-widest
                text-white
                shadow-[0_10px_34px_-8px_rgba(240,32,168,0.6)]
                transition-all
                duration-300
                hover:scale-105
                hover:shadow-[0_15px_45px_-8px_rgba(240,32,168,0.8)]
                active:scale-95
              "
            >
              Explore Full Schedule

              <ArrowRight
                className="
                  h-4
                  w-4
                  transition-transform
                  duration-300
                  group-hover:translate-x-1
                "
                aria-hidden="true"
              />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}