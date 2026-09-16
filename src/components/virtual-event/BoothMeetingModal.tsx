"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { ModalPortal } from "@/components/ui/ModalPortal";

const DAY_NAMES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** 08:00 to 17:30 in half hours, the working day the legacy offers. */
function buildSlots(): string[] {
  const out: string[] = [];
  for (let minutes = 8 * 60; minutes <= 17 * 60 + 30; minutes += 30) {
    out.push(`${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`);
  }
  return out;
}

function label(slot: string): string {
  const [h, m] = slot.split(":").map(Number);
  const suffix = h < 12 ? "am" : "pm";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** Local Y-M-D, never toISOString(): that converts to UTC and rolls the date over an evening. */
function ymd(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

/**
 * "Schedule a Meeting" — the booth's meeting request dialog.
 *
 * Two panes, as on the reference: a month to pick a date on the left, the day's slots on the
 * right split into morning and afternoon, and a footer that says what will happen. Written
 * without a date library — a month grid is six rows of seven cells and that is the whole of it.
 *
 * Slots already taken on the chosen day are fetched and disabled, so two visitors cannot both be
 * told they have the 10:00.
 *
 * Every colour here is an explicit hex. This project's `@theme` inverts the zinc scale for its
 * dark UI (`zinc-700` is white at 12%), so utility greys paint white-on-white inside a light
 * dialog like this one.
 */
export function BoothMeetingModal({
  exhibitorId,
  business,
  onClose,
}: {
  exhibitorId: number;
  business: string;
  onClose: () => void;
}) {
  const today = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);

  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<Date>(today);
  const [time, setTime] = useState<string | null>(null);
  const [taken, setTaken] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const slots = useMemo(buildSlots, []);
  const morning = slots.filter((s) => Number(s.slice(0, 2)) < 12);
  const afternoon = slots.filter((s) => Number(s.slice(0, 2)) >= 12);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Which slots are gone on the selected day. Re-read whenever the day changes; a stale list
  // would offer a slot that is already booked.
  useEffect(() => {
    let cancelled = false;
    setTaken([]);
    fetch(`/api/virtual-event/schedule-meeting?exhibitorId=${exhibitorId}&date=${ymd(selected)}`)
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setTaken(Array.isArray(j?.taken) ? j.taken : []);
      })
      .catch(() => {
        /* the POST re-checks and will say so if the slot is gone */
      });
    return () => {
      cancelled = true;
    };
  }, [exhibitorId, selected]);

  /** Six weeks of cells starting on the Sunday on or before the 1st. */
  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const atFirstMonth =
    cursor.getFullYear() === today.getFullYear() && cursor.getMonth() === today.getMonth();

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  async function submit() {
    if (!time || sending) return;
    setSending(true);
    setError(null);
    try {
      const response = await fetch("/api/virtual-event/schedule-meeting", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ exhibitorId, date: ymd(selected), time }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "That did not send.");

      setDone(
        `${selected.toLocaleDateString(undefined, {
          weekday: "long",
          day: "numeric",
          month: "long",
        })} at ${label(time)}`
      );
      setTaken((prev) => [...prev, time]);
      setTime(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not send.");
    } finally {
      setSending(false);
    }
  }

  const slotButton = (slot: string) => {
    const isTaken = taken.includes(slot);
    const isPast =
      sameDay(selected, today) &&
      Number(slot.slice(0, 2)) * 60 + Number(slot.slice(3)) <=
        new Date().getHours() * 60 + new Date().getMinutes();
    const disabled = isTaken || isPast;
    const active = time === slot;

    return (
      <button
        key={slot}
        type="button"
        disabled={disabled}
        onClick={() => setTime(slot)}
        title={isTaken ? "Already booked" : isPast ? "That time has passed" : undefined}
        className={`rounded-md border px-2 py-2 text-[13px] font-medium transition ${
          active
            ? "border-[#1f6fd0] bg-[#1f6fd0] text-white"
            : disabled
              ? "cursor-not-allowed border-[#ececef] bg-[#f4f4f5] text-[#c4c4c8] line-through"
              : "border-[#e4e4e7] bg-white text-[#3f3f46] hover:border-[#1f6fd0] hover:text-[#1f6fd0]"
        }`}
      >
        {label(slot)}
      </button>
    );
  };

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/70 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={`Schedule a meeting with ${business}`}
          className="w-full max-w-3xl overflow-hidden rounded-xl bg-white text-[#18181b] shadow-2xl"
        >
          <div className="relative border-b border-[#e4e4e7] px-6 py-5 text-center">
            <h2 className="text-xl font-bold">Schedule a Meeting</h2>
            <p className="mt-0.5 text-xs text-[#71717a]">{business}</p>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-[#a1a1aa] transition hover:bg-[#f4f4f5] hover:text-[#18181b]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid gap-0 md:grid-cols-2">
            {/* ------------------------------------------------------------ date */}
            <div className="border-b border-[#e4e4e7] px-6 py-5 md:border-b-0 md:border-r">
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#71717a]">
                Pick a date
              </p>

              <div className="mt-4 flex items-center justify-between">
                <button
                  type="button"
                  disabled={atFirstMonth}
                  onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
                  aria-label="Previous month"
                  className="flex h-7 w-7 items-center justify-center rounded text-[#52525b] transition hover:bg-[#f4f4f5] disabled:invisible"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <p className="text-base font-semibold">
                  {MONTH_NAMES[cursor.getMonth()]} {cursor.getFullYear()}
                </p>
                <button
                  type="button"
                  onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
                  aria-label="Next month"
                  className="flex h-7 w-7 items-center justify-center rounded text-[#52525b] transition hover:bg-[#f4f4f5]"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-7 gap-1 text-center">
                {DAY_NAMES.map((d) => (
                  <span key={d} className="py-1 text-[11px] font-bold text-[#71717a]">
                    {d}
                  </span>
                ))}

                {cells.map((day) => {
                  const outside = day.getMonth() !== cursor.getMonth();
                  const past = day < today;
                  const active = sameDay(day, selected);
                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      disabled={past}
                      onClick={() => {
                        setSelected(day);
                        setTime(null);
                        setDone(null);
                        setError(null);
                        if (outside) setCursor(new Date(day.getFullYear(), day.getMonth(), 1));
                      }}
                      className={`aspect-square rounded-full text-[13px] font-medium transition ${
                        active
                          ? "bg-[#1f4fd0] text-white"
                          : past
                            ? "cursor-not-allowed text-[#d4d4d8]"
                            : outside
                              ? "text-[#a1a1aa] hover:bg-[#f4f4f5]"
                              : "text-[#18181b] hover:bg-[#f4f4f5]"
                      }`}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ------------------------------------------------------------ time */}
            <div className="max-h-[22rem] overflow-y-auto bg-[#fafafa] px-6 py-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#71717a]">
                Pick a time
              </p>

              <p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-[#a1a1aa]">
                Morning
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2">{morning.map(slotButton)}</div>

              <p className="mt-5 text-[11px] font-bold uppercase tracking-wide text-[#a1a1aa]">
                Afternoon
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2">{afternoon.map(slotButton)}</div>
            </div>
          </div>

          {error && (
            <p role="alert" className="border-t border-[#fecaca] bg-[#fef2f2] px-6 py-3 text-sm text-[#b91c1c]">
              {error}
            </p>
          )}
          {done && (
            <p className="border-t border-[#bbf7d0] bg-[#f0fdf4] px-6 py-3 text-sm text-[#15803d]">
              Requested — {business} has your meeting request for {done}.
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e4e4e7] bg-[#fafafa] px-6 py-4">
            <p className="flex items-center gap-2 text-xs text-[#71717a]">
              <CalendarDays className="h-4 w-4 shrink-0" />
              {time
                ? `${selected.toLocaleDateString(undefined, { day: "numeric", month: "long" })} at ${label(time)}`
                : "Choose a date and a time to request a meeting"}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-[#d4d4d8] bg-white px-5 py-2 text-sm font-semibold text-[#3f3f46] transition hover:bg-[#f4f4f5]"
              >
                {done ? "Done" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={!time || sending}
                className="rounded-lg bg-[#1f4fd0] px-5 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-[#e4e4e7] disabled:text-[#a1a1aa]"
              >
                {sending ? "Requesting…" : "Request Meeting"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
