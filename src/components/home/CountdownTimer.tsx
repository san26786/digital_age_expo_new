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

  useEffect(() => {
    setRemaining(getRemaining(targetDate));
    const interval = setInterval(() => setRemaining(getRemaining(targetDate)), 1000);
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
  return (
    <div className={`flex flex-wrap justify-center gap-2.5 sm:gap-4 lg:justify-start ${className ?? ""}`}>
      {units.map((unit) => (
        <div
          key={unit.label}
          className="group relative min-w-[4.25rem] flex-1 basis-[4.25rem] overflow-hidden rounded-2xl border border-white/12 bg-[#14152F]/70 px-3 py-3.5 text-center backdrop-blur-md transition-all duration-300 hover:border-[#8B3DFF]/50 sm:min-w-[5.25rem] sm:basis-[5.25rem] sm:px-5 sm:py-4"
        >
          {/* Inner glow, brightening on hover. Decorative only. */}
          <div className="pointer-events-none absolute inset-x-0 -top-10 h-16 bg-[#6C2BFF]/30 blur-2xl transition-opacity duration-300 group-hover:bg-[#F020A8]/30" />
          <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-[#8B3DFF]/70 to-transparent" />

          <div className="relative text-2xl font-black tabular-nums tracking-tight text-white sm:text-4xl">
            {String(unit.value).padStart(2, "0")}
          </div>
          <div className="relative mt-1 text-[9px] font-bold uppercase tracking-[0.18em] text-[#A5A6C5] sm:text-[10px]">
            {unit.label}
          </div>
        </div>
      ))}
    </div>
  );
}
