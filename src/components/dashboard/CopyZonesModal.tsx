"use client";

/**
 * ===========================================================================
 *  COPY ZONES FROM ANOTHER EVENT
 * ===========================================================================
 *
 *  Setting up a new edition of a show almost never means inventing its exhibition halls — they
 *  are last year's halls, with the same names, artwork and booth positions. This lifts them
 *  across in one press rather than a zone at a time.
 *
 *  What comes over: zones, stand layouts, and each zone's booth positions and numbers.
 *  What does not: anything belonging to the old event's exhibitors — allocations, booth captions,
 *  uploaded stand artwork. The result is last year's empty hall.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import axios, { isAxiosError } from "axios";
import { AlertTriangle, CheckCircle2, Copy, Info, Loader2, X } from "lucide-react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import type { CopyZonesResult, ZoneSourceEvent } from "@/lib/services/eventLobbyZones";

export function CopyZonesModal({
  eventId,
  onClose,
  onCopied,
}: {
  eventId: number | string;
  onClose: () => void;
  onCopied: () => void;
}) {
  const [events, setEvents] = useState<ZoneSourceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceId, setSourceId] = useState<number | null>(null);
  const [enableCopied, setEnableCopied] = useState(true);
  const [copyBooths, setCopyBooths] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CopyZonesResult | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.get("/api/members/lobby-child/copy-from-event");
      const list = (data as { events: ZoneSourceEvent[] }).events ?? [];
      setEvents(list);
      // Newest first from the server, and the most recent edition of a show is nearly always the
      // one worth copying, so it is preselected.
      setSourceId(list[0]?.eventId ?? null);
    } catch (err) {
      setError(messageFrom(err, "Could not load the events to copy from."));
    } finally {
      setLoading(false);
    }
  }, []);

  const requested = useRef(false);
  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    void load();
  }, [load]);

  async function run() {
    if (!sourceId) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await axios.post("/api/members/lobby-child/copy-from-event", {
        source_event_id: sourceId,
        enable_copied: enableCopied,
        copy_booths: copyBooths,
      });
      setResult(data as CopyZonesResult);
      onCopied();
    } catch (err) {
      setError(messageFrom(err, "Could not copy those zones."));
    } finally {
      setBusy(false);
    }
  }

  const chosen = events.find((e) => e.eventId === sourceId) ?? null;

  return (
    <ModalPortal onClose={() => (busy ? undefined : onClose())}>
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 p-4 backdrop-blur-sm">
        <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
          <div className="flex items-start justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-pink/15 text-brand-pink">
                <Copy className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-white">Copy zones from another event</h3>
                <p className="text-xs text-zinc-400">
                  Brings the halls, stand layouts and booth positions onto Event #{eventId}.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4 pt-5">
            {error && (
              <p className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </p>
            )}

            {result ? (
              <div className="space-y-3">
                <p className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-300">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Copied <strong>{result.zonesCopied}</strong> zone
                    {result.zonesCopied === 1 ? "" : "s"}
                    {result.standLayoutsCopied > 0 && (
                      <>
                        {" "}
                        and {result.standLayoutsCopied} stand layout
                        {result.standLayoutsCopied === 1 ? "" : "s"}
                      </>
                    )}
                    {result.boothsCopied > 0 && <>, with {result.boothsCopied} booths</>}.
                    {result.createdLobby && <> A lobby was created to hold them.</>}
                  </span>
                </p>

                {result.skipped.length > 0 && (
                  <details className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-zinc-400">
                    <summary className="cursor-pointer font-semibold text-zinc-300">
                      {result.skipped.length} already here, left alone
                    </summary>
                    <p className="mt-2 leading-relaxed">{result.skipped.join(", ")}</p>
                  </details>
                )}
              </div>
            ) : loading ? (
              <p className="flex items-center justify-center gap-2 py-10 text-sm text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Finding events with zones…
              </p>
            ) : events.length === 0 ? (
              <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-6 text-center text-sm text-zinc-400">
                No other event has exhibition zones to copy.
              </p>
            ) : (
              <>
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-zinc-300">
                    Copy from
                  </label>
                  <select
                    value={sourceId ?? ""}
                    onChange={(e) => setSourceId(Number(e.target.value) || null)}
                    className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-2.5 text-sm text-white focus:border-brand-pink focus:outline-none"
                  >
                    {events.map((e) => (
                      <option key={e.eventId} value={e.eventId}>
                        {e.title} (#{e.eventId}) — {e.zones} zone{e.zones === 1 ? "" : "s"},{" "}
                        {e.standLayouts} layout{e.standLayouts === 1 ? "" : "s"}, {e.booths} booths
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex cursor-pointer items-start gap-2.5 text-xs text-zinc-300">
                  <input
                    type="checkbox"
                    checked={copyBooths}
                    onChange={(e) => setCopyBooths(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-white/10 bg-white/5 text-brand-pink focus:ring-brand-pink"
                  />
                  <span>
                    Copy booth positions and numbers
                    <span className="mt-0.5 block text-[11px] leading-relaxed text-zinc-500">
                      The part worth copying: where each booth sits on the artwork, and its stand
                      number. Without this the zones arrive empty and booths are generated
                      unpositioned on first use.
                    </span>
                  </span>
                </label>

                <label className="flex cursor-pointer items-start gap-2.5 text-xs text-zinc-300">
                  <input
                    type="checkbox"
                    checked={enableCopied}
                    onChange={(e) => setEnableCopied(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-white/10 bg-white/5 text-brand-pink focus:ring-brand-pink"
                  />
                  <span>
                    Enable the copied zones
                    <span className="mt-0.5 block text-[11px] leading-relaxed text-zinc-500">
                      Zones are often left disabled on the event they came from. A disabled zone
                      looks present but allocates nothing, so this switches the copies on.
                    </span>
                  </span>
                </label>

                <p className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[11px] leading-relaxed text-zinc-400">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" />
                  <span>
                    Additive: a zone whose name is already here is skipped, not duplicated, so this
                    is safe to run twice. Nothing belonging to{" "}
                    {chosen ? chosen.title : "the source event"}&apos;s exhibitors comes across —
                    no allocations, captions or uploaded stand artwork.
                  </span>
                </p>
              </>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-2 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-white/10 hover:text-white"
            >
              {result ? "Done" : "Cancel"}
            </button>
            {!result && events.length > 0 && (
              <button
                type="button"
                onClick={run}
                disabled={busy || !sourceId}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-pink px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white transition hover:opacity-90 disabled:opacity-40"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
                {busy ? "Copying..." : "Copy zones"}
              </button>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

function messageFrom(err: unknown, fallback: string): string {
  return isAxiosError(err) && typeof err.response?.data?.error === "string"
    ? err.response.data.error
    : fallback;
}
