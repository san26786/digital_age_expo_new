'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { ScheduleDay, ScheduleSlot } from '@/lib/services/schedule';

interface Props {
  scheduleDays: ScheduleDay[];
}

/** Static table, not `toLocaleDateString` — see `dateBadge`. */
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/**
 * Day + month for the badge, or null when there is no usable date.
 *
 * Parsed by regex against the raw `YYYY-MM-DD` rather than `new Date(...)`, and formatted from a
 * literal month table rather than `toLocaleDateString`. Both choices exist for the same reason:
 * this is a client component that Next also renders on the server, and both of those APIs can
 * disagree between the two environments — `Date` parsing of non-ISO strings is
 * implementation-defined, and locale formatting depends on the ICU data each side happens to
 * have. Either produces a hydration mismatch that only shows up in production.
 */
function dateBadge(date?: string): { day: string; month: string } | null {
  if (!date) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!m) return null;
  const monthIndex = Number(m[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return null;
  return { day: m[3], month: MONTHS[monthIndex] };
}

/**
 * UI-ONLY REDESIGN: stage photo on the left, session list on the right.
 *
 * `slots.slice(0, 2)` is unchanged. The reference shows three rows and this shows two — how many
 * sessions the homepage previews is a content decision this component has always made, and it is
 * one digit to change if you want three.
 *
 * The flatten now carries `date` alongside `dayTitle`. Both already existed on ScheduleDay; the
 * old code simply dropped `date` on the floor, which is why the badge can show a real date
 * instead of an invented one. No query changed.
 */
export function HomeSchedulePreview({ scheduleDays }: Props) {
  const slots: (ScheduleSlot & { dayTitle?: string; date?: string })[] = [];
  for (const day of scheduleDays) {
    for (const slot of day.slots) {
      slots.push({ ...slot, dayTitle: day.dayTitle, date: day.date });
    }
  }

  const displaySlots = slots.slice(0, 2);

  const fallbackSlots = [
    {
      id: 101,
      title: "Keynote: Redefining Corporate Operations with Advanced Neural Architecture",
      description: "How leading architectures leverage cognitive pipelines and deep machine intelligence to scale corporate logistics and compliance workflows seamlessly.",
      startTime: "09:00 AM",
      endTime: "10:30 AM",
      agendaName: "Main Seminar Stage",
      speakerName: "Dr. Aria Chen",
      dayTitle: "Day 1"
    },
    {
      id: 102,
      title: "Panel: Scaling Secure Decentrailised Ledgers in Financial Networks",
      description: "NexaScale and partners debate the scaling and throughput milestones for peer-to-peer enterprise financial ledgers under quantum threats.",
      startTime: "11:00 AM",
      endTime: "12:30 PM",
      agendaName: "FinTech Innovation Hub",
      speakerName: "Marcus Vance",
      dayTitle: "Day 1"
    }
  ];

  const sessionsToRender = displaySlots.length > 0 ? displaySlots : fallbackSlots;

  return (
    <section className="relative overflow-hidden border-y border-white/[0.06] bg-[#0B0C20] px-5 py-16 text-white sm:px-6 sm:py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_30%,rgba(36,107,253,0.18),transparent_60%),radial-gradient(ellipse_at_90%_80%,rgba(240,32,168,0.14),transparent_55%)]" />

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2 lg:gap-14">
        {/* ---------------- Left: stage photo ---------------- */}
        <div className="relative">
          <div className="pointer-events-none absolute -inset-5 rounded-[2.25rem] bg-gradient-to-br from-[#F020A8]/30 via-[#6C2BFF]/25 to-[#00C8FF]/30 blur-3xl" />
          <div className="relative rounded-[1.65rem] bg-gradient-to-br from-[#F020A8] via-[#8B3DFF] to-[#00C8FF] p-[2px] shadow-[0_28px_80px_-28px_rgba(0,0,0,0.9)]">
            {/* eslint-disable-next-line @next/next/no-img-element -- static file in /public;
                next/image would add no benefit for a fixed local asset here. */}
            <img
              src="/images/exhibitor_2.jpg"
              alt="Presentation in progress on the main stage"
              loading="lazy"
              className="aspect-[16/11] w-full rounded-[1.55rem] object-cover"
            />
          </div>
        </div>

        {/* ---------------- Right: sessions ---------------- */}
        <div>
          <span className="text-[11px] font-black uppercase tracking-[0.3em] text-[#F020A8] sm:text-xs">
            Stage Schedules
          </span>
          <h2 className="mt-3 text-2xl font-black uppercase tracking-tight text-white sm:text-4xl">
            Live Schedules Preview
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#A5A6C5]">
            A snapshot of major technical presentations taking place across stages. Register a
            delegate pass for full interactive access.
          </p>

          <div className="mt-7 space-y-3">
            {sessionsToRender.map((session) => {
              const badge = dateBadge((session as { date?: string }).date);
              return (
                <Link
                  key={session.id}
                  id={`schedule-slot-${session.id}`}
                  href="/event_schedule"
                  className="group flex items-center gap-4 rounded-2xl border border-white/[0.09] bg-[#10112A]/85 p-3.5 backdrop-blur-sm transition-all duration-300 hover:border-[#8B3DFF]/55 hover:bg-[#10112A] hover:shadow-[0_16px_40px_-20px_rgba(108,43,255,0.9)] sm:p-4"
                >
                  {/* Date badge, or the day label when the slot has no parseable date. */}
                  <span className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border border-[#8B3DFF]/30 bg-[#8B3DFF]/10 text-center leading-none">
                    {badge ? (
                      <>
                        <span className="text-lg font-black text-white">{badge.day}</span>
                        <span className="mt-0.5 text-[9px] font-bold tracking-wider text-[#A5A6C5]">
                          {badge.month}
                        </span>
                      </>
                    ) : (
                      <span className="px-1 text-[10px] font-bold uppercase leading-tight text-[#A5A6C5]">
                        {session.dayTitle || 'Session'}
                      </span>
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-1 block text-sm font-bold text-white transition-colors group-hover:text-[#F020A8] sm:text-[0.95rem]">
                      {session.title}
                    </span>
                    <span className="mt-1 block truncate text-xs text-[#A5A6C5]">
                      {session.startTime} – {session.endTime}
                      {session.agendaName ? ` · ${session.agendaName}` : ''}
                    </span>
                    {session.speakerName && (
                      <span className="mt-0.5 block truncate text-[11px] text-[#A5A6C5]/75">
                        Host: {session.speakerName}
                      </span>
                    )}
                  </span>

                  <ChevronRight
                    className="h-5 w-5 shrink-0 text-[#8B3DFF] transition-transform duration-300 group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </Link>
              );
            })}
          </div>

          <div className="mt-8">
            <Link
              href="/event_schedule"
              className="btn-brand-gradient group inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-xs font-bold uppercase tracking-widest text-white shadow-[0_10px_34px_-8px_rgba(240,32,168,0.6)] transition-all duration-300 hover:scale-105 active:scale-95"
            >
              Explore Full Schedule
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
