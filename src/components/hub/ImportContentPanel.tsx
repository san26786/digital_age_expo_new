"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowDownToLine, Check, Loader2 } from "lucide-react";
import {
  COPY_TOGGLES,
  noCopySelections,
  withDependencies,
  type CopyToggleKey,
} from "@/lib/hub/copyOptions";
import type { CopyableEvent, DryRunLine } from "@/lib/services/hubSites";

/**
 * ===========================================================================
 *  BRINGING A PREVIOUS SHOW'S CONTENT INTO THIS SITE
 * ===========================================================================
 *
 *  The copy toggles used to live only on the New Site form, which made them a decision you had
 *  one chance at. This is the same set, on a site that already exists, so "start empty now, add
 *  last year's exhibitors in March" is a thing you can actually do.
 *
 *  ---------------------------------------------------------------------------
 *  IT ADDS. IT DOES NOT MERGE — AND THE UI HAS TO SAY SO
 *  ---------------------------------------------------------------------------
 *
 *  These legacy tables have no unique key, so there is no way to tell "this exhibitor is already
 *  here" from "this is a second exhibitor with the same name". Importing twice gives you two of
 *  everything and nothing in the database will stop it.
 *
 *  Rather than hide that, every row shows BOTH numbers: what this site already has, and what
 *  would arrive. A count already sitting in the "has" column is the warning, and it is far harder
 *  to miss than a sentence under the button.
 */
export function ImportContentPanel({
  siteId,
  siteName,
  targetEventId,
  events,
}: {
  siteId: number;
  siteName: string;
  targetEventId: number | null;
  events: CopyableEvent[];
}) {
  const router = useRouter();

  // The site's own event is never a sensible source — importing it into itself would duplicate
  // everything — so it is not offered at all rather than offered and then refused.
  const sources = useMemo(
    () => events.filter((event) => event.id !== targetEventId),
    [events, targetEventId]
  );

  const [sourceEventId, setSourceEventId] = useState<string>(String(sources[0]?.id ?? ""));
  const [selections, setSelections] = useState(noCopySelections());
  const [exhibitorMode, setExhibitorMode] = useState<"unallocated" | "allocated">("unallocated");

  const [sourceCounts, setSourceCounts] = useState<DryRunLine[] | null>(null);
  const [existing, setExisting] = useState<DryRunLine[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ rows: number; label: string }[] | null>(null);

  /** What this site already holds — fetched once, and again after an import lands. */
  useEffect(() => {
    if (!targetEventId) return;
    const controller = new AbortController();
    fetch(`/api/hub/sites/preview?event_id=${targetEventId}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: { lines: DryRunLine[] }) => setExisting(data.lines))
      .catch(() => undefined);
    return () => controller.abort();
  }, [targetEventId, done]);

  /** What the chosen source holds. Aborted on change so a slow reply cannot land out of order. */
  useEffect(() => {
    if (!sourceEventId) return;
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/hub/sites/preview?event_id=${sourceEventId}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: { lines: DryRunLine[] }) => {
        setSourceCounts(data.lines);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if ((e as { name?: string })?.name === "AbortError") return;
        setLoading(false);
      });
    return () => controller.abort();
  }, [sourceEventId]);

  const countOf = (lines: DryRunLine[] | null, key: CopyToggleKey) =>
    lines?.find((line) => line.key === key)?.total ?? null;

  const toggle = (key: CopyToggleKey) => {
    setDone(null);
    setSelections((current) => withDependencies({ ...current, [key]: !current[key] }));
  };

  const chosen = COPY_TOGGLES.filter((t) => t.implemented && selections[t.key]);
  const chosenEvent = sources.find((e) => String(e.id) === sourceEventId);

  async function runImport() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/hub/sites/${siteId}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceEventId: Number(sourceEventId),
          exhibitorMode,
          selections: withDependencies(selections),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? `Import failed (${response.status})`);

      setDone(data.copied.map((c: { label: string; rows: number }) => ({ label: c.label, rows: c.rows })));
      setSelections(noCopySelections());
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The import failed.");
    } finally {
      setBusy(false);
    }
  }

  const field =
    "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white";

  if (!targetEventId) {
    return (
      <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
        <h3 className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-brand-pink">
          Import content
        </h3>
        <p className="text-xs text-white/50">
          This site has no event of its own, so there is nothing to import into.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
      <h3 className="mb-1 text-xs font-black uppercase tracking-[0.2em] text-brand-pink">
        Import content from another event
      </h3>
      <p className="mb-5 max-w-2xl text-xs leading-relaxed text-white/50">
        Copies rows into {siteName}&apos;s own event (#{targetEventId}) as new records. They belong
        to this site afterwards — editing them never touches the show they came from.
      </p>

      <div className="mb-5">
        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-white/50">
          Copy from
        </label>
        <select
          className={field}
          value={sourceEventId}
          onChange={(e) => {
            setSourceEventId(e.target.value);
            setDone(null);
          }}
        >
          {sources.map((event) => (
            <option key={event.id} value={event.id}>
              {event.title}
              {event.date ? ` · ${event.date}` : ""} · {event.exhibitorCount} exhibitors · #{event.id}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        {COPY_TOGGLES.map((entry) => {
          const notYet = !entry.implemented;
          const checked = selections[entry.key];
          const has = countOf(existing, entry.key);
          const gets = countOf(sourceCounts, entry.key);

          return (
            <div
              key={entry.key}
              className={`rounded-2xl border p-4 transition ${
                notYet
                  ? "border-white/5 bg-white/[0.01] opacity-60"
                  : checked
                    ? "border-brand-pink/40 bg-brand-pink/10"
                    : "border-white/10 bg-white/[0.02]"
              }`}
            >
              <label
                className={`flex items-start gap-3 ${notYet ? "cursor-not-allowed" : "cursor-pointer"}`}
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0 accent-[#C71585]"
                  checked={!notYet && checked}
                  disabled={notYet}
                  onChange={() => toggle(entry.key)}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-3">
                    <span className="font-bold text-white">{entry.label}</span>
                    {!notYet && (
                      <span className="text-xs text-white/50">
                        has{" "}
                        <span className={has ? "font-bold text-amber-300" : ""}>
                          {has === null ? "…" : has.toLocaleString()}
                        </span>
                        {" · adds "}
                        <span className="font-bold text-white/80">
                          {loading ? "…" : gets === null ? "—" : gets.toLocaleString()}
                        </span>
                      </span>
                    )}
                  </span>
                  {notYet && entry.notYetReason && (
                    <span className="mt-1 block text-[11px] leading-relaxed text-amber-200/80">
                      {entry.notYetReason}
                    </span>
                  )}
                </span>
              </label>

              {entry.key === "exhibitors" && checked && (
                <div className="mt-3 flex flex-wrap gap-4 pl-7">
                  {(["unallocated", "allocated"] as const).map((mode) => (
                    <label key={mode} className="flex cursor-pointer items-center gap-2 text-xs">
                      <input
                        type="radio"
                        name="import-exhibitor-mode"
                        className="h-3.5 w-3.5 accent-[#C71585]"
                        checked={exhibitorMode === mode}
                        onChange={() => setExhibitorMode(mode)}
                      />
                      <span className="text-white/80">
                        {mode === "unallocated"
                          ? "Unallocated — no stands assigned"
                          : "With their stand allocation"}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {entry.caution && checked && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                  <p className="text-[11px] leading-relaxed text-amber-100/90">{entry.caution}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {chosen.some((t) => (countOf(existing, t.key) ?? 0) > 0) && (
        <div className="mt-5 flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <p className="text-[11px] leading-relaxed text-amber-100/90">
            This site already has rows for something you have ticked. These tables have no unique
            key, so an import <span className="font-bold">adds</span> rather than merges — you will
            end up with both sets, and they cannot be told apart afterwards.
          </p>
        </div>
      )}

      {error && (
        <p className="mt-4 flex items-start gap-2 text-xs text-amber-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={runImport}
          disabled={busy || chosen.length === 0 || !sourceEventId}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-purple to-brand-pink px-7 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownToLine className="h-4 w-4" />}
          {busy ? "Importing…" : "Import selected"}
        </button>
        <p className="text-[11px] text-white/40">
          {chosen.length === 0
            ? "Tick what you want to bring across."
            : `${chosen.length} selected from ${chosenEvent?.title ?? "—"}.`}
        </p>
      </div>

      {done && (
        <div className="mt-5 rounded-2xl border border-emerald-400/40 bg-emerald-400/10 p-5">
          <p className="flex items-center gap-2 text-sm font-bold text-emerald-200">
            <Check className="h-4 w-4" />
            Imported
          </p>
          <ul className="mt-2 space-y-1">
            {done.map((entry) => (
              <li key={entry.label} className="text-xs text-white/75">
                {entry.label}: {entry.rows.toLocaleString()} row{entry.rows === 1 ? "" : "s"}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
