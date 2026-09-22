"use client";

import { useEffect, useState } from "react";

interface Props {
  targetDate: string;
  className?: string;
}

function getRemaining(targetDate: string) {
  const distance = new Date(targetDate).getTime() - Date.now();
  if (distance <= 0) return { weeks: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };

  const weeks = Math.floor(distance / (1000 * 60 * 60 * 24 * 7));
  const days = Math.floor(distance / (1000 * 60 * 60 * 24)) - weeks * 7;
  const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((distance % (1000 * 60)) / 1000);
  return { weeks, days, hours, minutes, seconds };
}

const ZERO_REMAINING = { weeks: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };

export function CountdownTimer({ targetDate, className }: Props) {
  // Start with a static value so the server-rendered markup and the client's first
  // render match exactly (Date.now() differs between server render time and client
  // hydration time, which was causing a hydration mismatch). The real countdown is
  // computed after mount, once we're safely past hydration.
  const [remaining, setRemaining] = useState(ZERO_REMAINING);

  /*
   * Whether the target is already behind us.
   *
   * `getRemaining` clamps a negative distance to all zeros, which is correct arithmetic and a
   * terrible thing to show: a finished event rendered four tiles reading 00 / 00 / 00 / 00,
   * which looks like a timer that failed to start rather than a show that has been and gone.
   * An expo site sits in that state for most of the year, between one show and the next.
   *
   * Resolved after mount for the same reason the count itself is: comparing against Date.now()
   * during render gives the server and the client two different answers and React reports a
   * hydration mismatch.
   */
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    if (new Date(targetDate).getTime() - Date.now() <= 0) {
      setEnded(true);
      // No interval: there is nothing left to count, and a 1s timer that can only ever produce
      // the same zeros would run for as long as the tab is open.
      return;
    }

    setEnded(false);
    setRemaining(getRemaining(targetDate));
    const interval = setInterval(() => {
      const next = getRemaining(targetDate);
      setRemaining(next);
      // The moment it reaches the date, stop and switch over rather than sitting on zeros.
      if (new Date(targetDate).getTime() - Date.now() <= 0) setEnded(true);
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  const units = [
    remaining.weeks > 0 ? { label: "weeks", value: remaining.weeks } : null,
    { label: "days", value: remaining.days },
    { label: "hours", value: remaining.hours },
    { label: "minutes", value: remaining.minutes },
    { label: "seconds", value: remaining.seconds },
  ].filter((u): u is { label: string; value: number } => u !== null);

  /*
   * UI ONLY. The timer logic, the hydration-safe initial state, the interval and the conditional
   * "weeks" unit are untouched — only the tiles were restyled.
   *
   * The unit count is variable (four normally, five while the event is more than a week out), so
   * the row stays a flex-wrap rather than becoming a fixed four-column grid: a five-item grid
   * would leave a lone orphaned tile on the second line at most widths.
   */
  if (ended) {
    return (
      <div className={`flex justify-center lg:justify-start ${className ?? ""}`}>
        <span className="inline-flex items-center gap-2.5 rounded-2xl border border-white/12 bg-[var(--c-surf-1)]/70 px-5 py-3 backdrop-blur-md">
          <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--c-accent-pink)]" aria-hidden="true" />
          <span className="text-[11px] font-black uppercase tracking-[0.18em] text-white sm:text-xs">
            This show has finished
          </span>
        </span>
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap justify-center gap-2.5 sm:gap-4 lg:justify-start ${className ?? ""}`}>
      {units.map((unit) => (
        <div
          key={unit.label}
          className="group relative min-w-[4.25rem] flex-1 basis-[4.25rem] overflow-hidden rounded-2xl border border-white/12 bg-[var(--c-surf-1)]/70 px-3 py-3.5 text-center backdrop-blur-md transition-all duration-300 hover:border-[var(--c-accent-violet-soft)]/50 sm:min-w-[5.25rem] sm:basis-[5.25rem] sm:px-5 sm:py-4"
        >
          {/* Inner glow, brightening on hover. Decorative only. */}
          <div className="pointer-events-none absolute inset-x-0 -top-10 h-16 bg-[var(--c-accent-violet)]/30 blur-2xl transition-opacity duration-300 group-hover:bg-[var(--c-accent-pink)]/30" />
          <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-[var(--c-accent-violet-soft)]/70 to-transparent" />

          <div className="stat-number relative text-2xl font-black tabular-nums tracking-tight text-white sm:text-4xl">
            {String(unit.value).padStart(2, "0")}
          </div>
          <div className="relative mt-1 text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--c-text-muted)] sm:text-[10px]">
            {unit.label}
          </div>
        </div>
      ))}
    </div>
  );
}
