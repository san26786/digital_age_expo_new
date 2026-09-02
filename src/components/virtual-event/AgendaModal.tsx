"use client";

import { useEffect, useMemo, useState } from "react";
import { X, CalendarDays, Clock, Mic } from "lucide-react";

import { ModalPortal } from "@/components/ui/ModalPortal";
import type { ScheduleDay } from "@/lib/services/schedule";

const ALL_HALLS = "__all__";

/**
 * The lobby footer's "Agenda" action — the event programme, filterable by hall and by day.
 *
 * Reads the same getEventSchedule() rows the public /event_schedule page uses, so the lobby and
 * the marketing site can never show a different programme. Note that query filters to sessions
 * that HAVE a speaker (`speaker_id: { not: null }`), so an unassigned slot won't appear here —
 * that is the service's existing behaviour, not something this modal decides.
 *
 * Chrome (title, hall pills, day tabs) is pinned and only the session list scrolls, matching
 * ExhibitorListModal — with a full three-day programme the filters are exactly what you want to
 * keep reaching while browsing.
 */
export function AgendaModal({
  open,
  onClose,
  days,
}: {
  open: boolean;
  onClose: () => void;
  days: ScheduleDay[];
}) {
  const [hall, setHall] = useState<string>(ALL_HALLS);
  const [dayIndex, setDayIndex] = useState(0);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  /** Every hall that actually has a session, across all days — so the pill row is stable as you
   *  switch days rather than appearing and disappearing under the cursor. */
  const halls = useMemo(() => {
    const set = new Set<string>();
    for (const day of days) {
      for (const slot of day.slots) {
        const name = slot.agendaName?.trim();
        if (name) set.add(name);
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [days]);

  const activeDay = days[Math.min(dayIndex, Math.max(days.length - 1, 0))];

  const sessions = useMemo(() => {
    if (!activeDay) return [];
    return hall === ALL_HALLS
      ? activeDay.slots
      : activeDay.slots.filter((s) => s.agendaName?.trim() === hall);
  }, [activeDay, hall]);

  if (!open) return null;

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-40 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 p-3 backdrop-blur-sm sm:p-6"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="glass-panel flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/10 shadow-2xl"
        >
          {/* ---------- Pinned chrome ---------- */}
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-6">
            <h2 className="flex items-center gap-2 text-lg font-black uppercase tracking-tight text-white">
              <CalendarDays className="h-5 w-5 text-brand-pink" />
              Agenda
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:border-brand-pink/50 hover:text-brand-pink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {halls.length > 0 && (
            <div className="flex flex-wrap gap-2 border-b border-white/10 px-5 py-3 sm:px-6">
              <button
                type="button"
                onClick={() => setHall(ALL_HALLS)}
                aria-pressed={hall === ALL_HALLS}
                className={`rounded-full border px-3.5 py-1.5 text-[11px] font-bold transition ${
                  hall === ALL_HALLS
                    ? "border-brand-pink bg-brand-pink text-white"
                    : "border-white/10 bg-white/5 text-zinc-300 hover:border-brand-pink/50 hover:text-brand-pink"
                }`}
              >
                All Halls
              </button>
              {halls.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setHall(name)}
                  aria-pressed={hall === name}
                  className={`rounded-full border px-3.5 py-1.5 text-[11px] font-bold transition ${
                    hall === name
                      ? "border-brand-pink bg-brand-pink text-white"
                      : "border-white/10 bg-white/5 text-zinc-300 hover:border-brand-pink/50 hover:text-brand-pink"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          )}

          {days.length > 1 && (
            <div className="flex flex-wrap gap-1 border-b border-white/10 px-5 py-2 sm:px-6">
              {days.map((day, i) => (
                <button
                  key={day.date || i}
                  type="button"
                  onClick={() => setDayIndex(i)}
                  aria-pressed={i === dayIndex}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    i === dayIndex
                      ? "bg-white/10 text-white"
                      : "text-zinc-500 hover:text-zinc-200"
                  }`}
                >
                  {day.dateLabel || day.dayTitle || `Day ${i + 1}`}
                </button>
              ))}
            </div>
          )}

          {/* ---------- Scrolling session list ---------- */}
          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            {!activeDay || sessions.length === 0 ? (
              <p className="py-16 text-center text-sm text-zinc-500">
                {days.length === 0
                  ? "The agenda for this event hasn't been published yet."
                  : "No sessions scheduled for this hall on this day."}
              </p>
            ) : (
              <>
                {activeDay.dateLabel && (
                  <p className="mb-4 text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">
                    {activeDay.dateLabel}
                  </p>
                )}

                <ul className="space-y-3">
                  {sessions.map((slot) => (
                    <li
                      key={slot.id}
                      className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-brand-pink/30 hover:bg-white/[0.07] sm:flex-row sm:items-start"
                    >
                      {/* Time rail — fixed width so titles line up down the list */}
                      <div className="flex items-center gap-1.5 sm:w-36 sm:flex-shrink-0 sm:border-r sm:border-white/10 sm:pr-4">
                        <Clock className="h-3.5 w-3.5 flex-shrink-0 text-brand-pink sm:hidden" />
                        <span className="text-xs font-black tracking-tight text-white">
                          {slot.startTime}
                          {slot.endTime ? ` - ${slot.endTime}` : ""}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        {slot.agendaName && (
                          <span className="mb-1.5 inline-block rounded bg-white/[0.07] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-300">
                            {slot.agendaName}
                          </span>
                        )}
                        <h3 className="text-sm font-bold leading-snug text-white">{slot.title}</h3>
                        {slot.speakerName && (
                          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-400">
                            <Mic className="h-3 w-3 flex-shrink-0 text-brand-pink" />
                            <span className="truncate">
                              {slot.speakerName}
                              {slot.speakerBusiness ? ` — ${slot.speakerBusiness}` : ""}
                            </span>
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
