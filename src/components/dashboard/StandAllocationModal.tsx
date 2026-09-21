"use client";

/**
 * ===========================================================================
 *  AUTO-ALLOCATE TRADE STANDS — PREVIEW, THEN COMMIT
 * ===========================================================================
 *
 *  Opens on a preview, never on a write: two hundred stand numbers handed out in one press is not
 *  something anyone should discover after the fact. The plan is drawn, then confirmed.
 *
 *  THE PLAN IS NOT EDITABLE, deliberately. Booths are handed out in one continuous alphabetical
 *  run, so removing one exhibitor shifts everyone below them onto a different booth — a list with
 *  tick boxes would show numbers that stop being true the moment you untick anything. If a stand
 *  needs to be different, it is set on that exhibitor's own Edit Trade Stand form, and the
 *  allocator then leaves them alone because they already hold a booth.
 *
 *  The server does not accept this plan back. It recomputes its own at write time — see
 *  src/lib/services/standAllocation.ts.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import axios, { isAxiosError } from "axios";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  LayoutGrid,
  Loader2,
  MapPin,
  Wrench,
  X,
} from "lucide-react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import type {
  StandAllocationOutcome,
  StandAllocationPlan,
  StandAllocationResult,
} from "@/lib/services/standAllocation";

const OUTCOME_LABEL: Record<StandAllocationOutcome["status"], string> = {
  allocated: "Allocated",
  skipped: "Skipped",
  failed: "Failed",
};

const OUTCOME_BADGE: Record<StandAllocationOutcome["status"], string> = {
  allocated: "bg-emerald-500/10 text-emerald-300 border border-emerald-500/25",
  skipped: "bg-amber-500/10 text-amber-300 border border-amber-500/25",
  failed: "bg-red-500/10 text-red-300 border border-red-500/25",
};

function Tile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "good" | "warn" | "info" | "bad" | "muted";
}) {
  const ring = {
    good: "border-emerald-500/25 bg-emerald-500/[0.07]",
    warn: "border-amber-500/25 bg-amber-500/[0.07]",
    info: "border-sky-500/25 bg-sky-500/[0.07]",
    bad: "border-red-500/25 bg-red-500/[0.07]",
    muted: "border-white/10 bg-white/[0.03]",
  }[tone];

  const text = {
    good: "text-emerald-300",
    warn: "text-amber-300",
    info: "text-sky-300",
    bad: "text-red-300",
    muted: "text-zinc-300",
  }[tone];

  return (
    <div className={`rounded-xl border px-3 py-2.5 ${ring}`}>
      <p className={`text-xl font-black leading-none ${text}`}>{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">{label}</p>
    </div>
  );
}

export function StandAllocationModal({
  onClose,
  onAllocated,
}: {
  onClose: () => void;
  onAllocated: () => void;
}) {
  const [plan, setPlan] = useState<StandAllocationPlan | null>(null);
  const [result, setResult] = useState<StandAllocationResult | null>(null);
  const [planning, setPlanning] = useState(true);
  const [allocating, setAllocating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"plan" | "unplaced" | "zones">("plan");
  const [settingUp, setSettingUp] = useState(false);
  const [zoneCount, setZoneCount] = useState(1);
  const [setupNotice, setSetupNotice] = useState("");

  const step: "loading" | "preview" | "done" = result ? "done" : planning ? "loading" : "preview";

  const loadPlan = useCallback(async () => {
    setPlanning(true);
    setError("");
    try {
      const { data } = await axios.post("/api/members/exhibitors-admin/allocate-stands/analyze");
      const next = data as StandAllocationPlan;
      setPlan(next);
      // Enough zones for everyone who needs a booth, so the default press just works.
      setZoneCount(
        Math.max(1, Math.ceil(next.summary.needingBooth / Math.max(1, next.summary.boothsPerZone))),
      );
      setTab("plan");
    } catch (err) {
      setError(messageFrom(err, "Could not work out an allocation."));
    } finally {
      setPlanning(false);
    }
  }, []);

  /*
   * Drawn once, when the modal opens.
   *
   * The ref guard is not belt and braces: React's StrictMode runs every effect twice in
   * development, and this endpoint tops each zone up to its full set of booths, so a second call
   * is a second round of writes rather than a harmless repeat read.
   */
  const requested = useRef(false);
  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    void loadPlan();
  }, [loadPlan]);

  /** Create the missing lobby / zones, then redraw the plan against them. */
  async function runSetup() {
    setSettingUp(true);
    setError("");
    setSetupNotice("");
    try {
      const { data } = await axios.post("/api/members/exhibitors-admin/allocate-stands/setup", {
        zones: zoneCount,
      });
      const made = data as {
        createdLobby: boolean;
        enabledExisting: number;
        createdZones: number;
        totalZones: number;
        standLayoutTitle: string | null;
        createdStandLayout: boolean;
      };

      const parts: string[] = [];
      if (made.createdLobby) parts.push("created the lobby");
      if (made.enabledExisting > 0) parts.push(`enabled ${made.enabledExisting} existing zone${made.enabledExisting === 1 ? "" : "s"}`);
      if (made.createdZones > 0) parts.push(`added ${made.createdZones} zone${made.createdZones === 1 ? "" : "s"}`);
      if (made.createdStandLayout) parts.push(`created the "${made.standLayoutTitle}" stand layout`);
      setSetupNotice(
        `${parts.length ? parts.join(", ") : "Nothing needed creating"} — ${made.totalZones} exhibition zone${made.totalZones === 1 ? "" : "s"} now available.`,
      );

      await loadPlan();
    } catch (err) {
      setError(messageFrom(err, "Could not set up the exhibition zones."));
    } finally {
      setSettingUp(false);
    }
  }

  async function runAllocation() {
    setAllocating(true);
    setError("");
    try {
      const { data } = await axios.post("/api/members/exhibitors-admin/allocate-stands");
      setResult(data as StandAllocationResult);
      setConfirming(false);
      onAllocated();
    } catch (err) {
      setError(messageFrom(err, "The allocation failed."));
      setConfirming(false);
    } finally {
      setAllocating(false);
    }
  }

  const summary = plan?.summary;

  return (
    <ModalPortal
      onClose={() => {
        if (allocating) return;
        if (confirming) {
          setConfirming(false);
          return;
        }
        onClose();
      }}
    >
      <div className="fixed inset-0 z-50 grid place-items-start overflow-y-auto overscroll-contain bg-black/80 p-4 backdrop-blur-sm animate-fade-in sm:place-items-center">
        <div className="mx-auto w-full max-w-4xl rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
          {/* ------------------------------ header ------------------------------ */}
          <div className="flex items-start justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-pink/15 text-brand-pink">
                <LayoutGrid className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-white">Auto-allocate Trade Stands</h3>
                <p className="text-xs text-zinc-400">
                  {step === "done"
                    ? "Allocation finished. Every exhibitor is accounted for below."
                    : "Active exhibitors without a stand, in alphabetical order of business. Nothing is saved until you confirm."}
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

            {setupNotice && (
              <p className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-medium text-emerald-300">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{setupNotice}</span>
              </p>
            )}

            {step === "loading" && (
              <p className="flex items-center justify-center gap-2 py-12 text-sm text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Working out the allocation…
              </p>
            )}

            {/* ------------------------------ preview ------------------------------ */}
            {step === "preview" && plan && summary && (
              <>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  <Tile label="Active" value={summary.activeTotal} tone="muted" />
                  <Tile label="Has a stand" value={summary.alreadyAllocated} tone="info" />
                  <Tile label="Needs one" value={summary.needingBooth} tone="muted" />
                  <Tile label="Will allocate" value={summary.willAllocate} tone="good" />
                  <Tile label="Won't fit" value={summary.shortfall} tone={summary.shortfall > 0 ? "bad" : "muted"} />
                </div>

                <p className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[11px] leading-relaxed text-zinc-400">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" />
                  <span>
                    Zones fill in their own order, booths in stand-number order. Exhibitors who
                    already hold a stand are never moved, and pending exhibitors are not allocated —
                    though a pending exhibitor on a booth still occupies it.
                  </span>
                </p>

                {/*
                  * Two quite different problems, and conflating them sends the organiser to the
                  * wrong screen. No zones at all is a setup problem with a specific fix; zones
                  * that are simply full is a capacity problem. Only one can be true at a time.
                  */}
                {plan.zoneProblem ? (
                  <div className="space-y-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
                    <div className="flex items-start gap-2 text-xs leading-relaxed text-red-200">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <div>
                        <p className="font-bold uppercase tracking-wider">Nothing to allocate from</p>
                        <p className="mt-1 text-[11px] leading-relaxed text-red-200/90">
                          {plan.zoneProblem}
                        </p>
                        <p className="mt-2 text-[11px] leading-relaxed text-zinc-400">
                          This is the same list the Exhibition Zone dropdown on Add / Edit Trade
                          Stand reads, so it will be empty there too until this is sorted.
                        </p>
                      </div>
                    </div>

                    {/*
                      * All three causes are "something upstream was never created", so one
                      * additive action fixes any of them: reuse or create the lobby, switch on
                      * zones that exist but are off, then top up to the requested count.
                      */}
                    <div className="flex flex-wrap items-center gap-2 border-t border-red-500/20 pt-2.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">
                        Zones to create
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={40}
                        value={zoneCount}
                        onChange={(e) => setZoneCount(Math.max(1, Math.min(40, Number(e.target.value) || 1)))}
                        className="w-20 rounded-lg border border-white/10 bg-zinc-900 px-3 py-1.5 text-xs text-white focus:border-brand-pink focus:outline-none"
                      />
                      <span className="text-[11px] text-zinc-500">
                        × {summary.boothsPerZone} booths = {zoneCount * summary.boothsPerZone} for{" "}
                        {summary.needingBooth} exhibitor{summary.needingBooth === 1 ? "" : "s"}
                      </span>
                      <button
                        type="button"
                        onClick={runSetup}
                        disabled={settingUp}
                        className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-brand-pink px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-white transition hover:opacity-90 disabled:opacity-40"
                      >
                        {settingUp ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Wrench className="h-3 w-3" />
                        )}
                        {settingUp ? "Setting up..." : "Create lobby, zones & layout"}
                      </button>
                    </div>
                    <p className="text-[10px] leading-relaxed text-zinc-500">
                      Additive only — an existing lobby is reused, never replaced, and no zone is
                      deleted. Spare zones can be removed on Child Lobby Details.
                    </p>
                  </div>
                ) : (
                  summary.shortfall > 0 && (
                    <p className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-2.5 text-[11px] leading-relaxed text-amber-200">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>
                        There are {summary.freeBooths} free booths for {summary.needingBooth}{" "}
                        exhibitors, so <strong>{summary.shortfall}</strong> will be left without one.
                        Add another exhibition zone to make room — allocating now places the first{" "}
                        {summary.willAllocate} alphabetically and you can run it again afterwards.
                      </span>
                    </p>
                  )
                )}

                <div className="flex flex-wrap gap-1.5">
                  {[
                    { key: "plan" as const, label: "Allocation", count: plan.assignments.length },
                    { key: "unplaced" as const, label: "Won't fit", count: plan.unplaced.length },
                    { key: "zones" as const, label: "Zones", count: plan.zones.length },
                  ].map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setTab(t.key)}
                      className={`rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition ${
                        tab === t.key
                          ? "bg-brand-pink text-white"
                          : "border border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {t.label} <span className="opacity-70">({t.count})</span>
                    </button>
                  ))}
                </div>

                <div className="max-h-[22rem] overflow-y-auto rounded-xl border border-white/10">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 z-10">
                      <tr className="text-zinc-300 [&>th]:border-b [&>th]:border-white/10 [&>th]:bg-zinc-900 [&>th]:px-3 [&>th]:py-2 [&>th]:font-black [&>th]:uppercase [&>th]:tracking-wider">
                        {tab === "zones" ? (
                          <>
                            <th>Zone</th>
                            <th>Booths</th>
                            <th>Free</th>
                          </>
                        ) : (
                          <>
                            <th className="w-10">#</th>
                            <th>Business</th>
                            <th>Contact</th>
                            {tab === "plan" ? (
                              <>
                                <th>Zone</th>
                                <th>Stand</th>
                                <th>Layout</th>
                              </>
                            ) : (
                              <th>Why</th>
                            )}
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {tab === "zones" &&
                        plan.zones.map((zone) => (
                          <tr key={zone.id} className="bg-zinc-900/30">
                            <td className="px-3 py-1.5 text-zinc-200">{zone.name}</td>
                            <td className="px-3 py-1.5 text-zinc-400">{zone.total}</td>
                            <td className={`px-3 py-1.5 ${zone.free > 0 ? "text-emerald-300" : "text-zinc-500"}`}>
                              {zone.free}
                            </td>
                          </tr>
                        ))}

                      {tab === "plan" &&
                        plan.assignments.map((a, i) => (
                          <tr key={a.exhibitorId} className="bg-zinc-900/30">
                            <td className="px-3 py-1.5 text-zinc-600">{i + 1}</td>
                            <td className="px-3 py-1.5 text-zinc-200">{a.business || "—"}</td>
                            <td className="px-3 py-1.5 text-zinc-400">{a.contact || "—"}</td>
                            <td className="px-3 py-1.5 text-zinc-400">
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-brand-pink" />
                                {a.zoneName}
                              </span>
                            </td>
                            <td className="px-3 py-1.5">
                              <span className="inline-block rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black tracking-wider text-emerald-300">
                                {a.standNumber || "—"}
                              </span>
                            </td>
                            <td className="px-3 py-1.5 text-zinc-400">{a.standLayoutName}</td>
                          </tr>
                        ))}

                      {tab === "unplaced" &&
                        plan.unplaced.map((u, i) => (
                          <tr key={u.exhibitorId} className="bg-zinc-900/60">
                            <td className="px-3 py-1.5 text-zinc-600">{i + 1}</td>
                            <td className="px-3 py-1.5 text-zinc-200">{u.business || "—"}</td>
                            <td className="px-3 py-1.5 text-zinc-400">{u.contact || "—"}</td>
                            <td className="px-3 py-1.5 text-amber-300/90">{u.reason}</td>
                          </tr>
                        ))}

                      {((tab === "plan" && plan.assignments.length === 0) ||
                        (tab === "unplaced" && plan.unplaced.length === 0) ||
                        (tab === "zones" && plan.zones.length === 0)) && (
                        <tr>
                          <td colSpan={6} className="px-3 py-6 text-center text-zinc-500">
                            {tab === "plan"
                              ? "Every active exhibitor already has a stand."
                              : tab === "unplaced"
                                ? "Everyone fits."
                                : "This event has no enabled exhibition zones."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* -------------------------------- done -------------------------------- */}
            {step === "done" && result && (
              <div className="space-y-3">
                <p className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-300">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Allocated <strong>{result.allocated}</strong>{" "}
                    {result.allocated === 1 ? "stand" : "stands"}.
                    {result.unplaced > 0 && <> {result.unplaced} had no booth to go to.</>}
                    {result.failed > 0 && <> {result.failed} could not be saved.</>}
                  </span>
                </p>

                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  <Tile label="Allocated" value={result.allocated} tone="good" />
                  <Tile label="Skipped" value={result.skipped} tone="warn" />
                  <Tile label="No booth" value={result.unplaced} tone="muted" />
                  <Tile label="Failed" value={result.failed} tone="bad" />
                </div>

                <div className="max-h-[20rem] overflow-y-auto rounded-xl border border-white/10">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 z-10">
                      <tr className="text-zinc-300 [&>th]:border-b [&>th]:border-white/10 [&>th]:bg-zinc-900 [&>th]:px-3 [&>th]:py-2 [&>th]:font-black [&>th]:uppercase [&>th]:tracking-wider">
                        <th>Business</th>
                        <th>Zone</th>
                        <th>Stand</th>
                        <th>Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {result.outcomes.map((outcome) => (
                        <tr key={outcome.exhibitorId} className="bg-zinc-900/30 align-top">
                          <td className="px-3 py-1.5 text-zinc-200">{outcome.business || "—"}</td>
                          <td className="px-3 py-1.5 text-zinc-400">{outcome.zoneName || "—"}</td>
                          <td className="px-3 py-1.5 text-zinc-400">{outcome.standNumber || "—"}</td>
                          <td className="px-3 py-1.5">
                            <span
                              className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${OUTCOME_BADGE[outcome.status]}`}
                            >
                              {OUTCOME_LABEL[outcome.status]}
                            </span>
                            {outcome.reason && (
                              <p className="mt-1 text-[11px] leading-snug text-zinc-500">{outcome.reason}</p>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* ------------------------------- footer -------------------------------- */}
          <div className="mt-6 flex justify-end gap-2 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-white/10 hover:text-white"
            >
              {step === "done" ? "Done" : "Cancel"}
            </button>

            {step === "preview" && (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                disabled={!plan || plan.assignments.length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-pink px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white transition hover:opacity-90 disabled:opacity-40"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Allocate {plan?.assignments.length ?? 0} stands
              </button>
            )}
          </div>
        </div>
      </div>

      {/* --------------------------- confirmation step --------------------------- */}
      {confirming && plan && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
            <h4 className="text-base font-bold text-white">
              Allocate {plan.assignments.length} stand{plan.assignments.length === 1 ? "" : "s"}?
            </h4>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Each exhibitor gets a zone, a five-digit stand number and a stand layout, and their
              booth is captioned with the business name — the same fields the Edit Trade Stand form
              writes. An exhibitor already on a layout keeps it.
            </p>
            <p className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-2.5 text-[11px] leading-relaxed text-amber-200">
              There is no undo. Individual stands can be changed afterwards on each exhibitor&apos;s
              Edit Trade Stand form, and this never moves anyone who already has one.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={allocating}
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
              >
                Back
              </button>
              <button
                type="button"
                onClick={runAllocation}
                disabled={allocating}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-pink px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white transition hover:opacity-90 disabled:opacity-40"
              >
                {allocating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {allocating ? "Allocating..." : "Yes, allocate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalPortal>
  );
}

function messageFrom(err: unknown, fallback: string): string {
  return isAxiosError(err) && typeof err.response?.data?.error === "string"
    ? err.response.data.error
    : fallback;
}
