"use client";

import { useMemo, useState } from "react";
import axios, { isAxiosError } from "axios";
import { Filter, Loader2, Activity, AlertTriangle, X } from "lucide-react";

import {
  PANEL,
  BTN_PRIMARY,
  BTN_SECONDARY,
  INPUT_FIELD,
  FORM_LABEL,
  FORM_HINT,
  ALERT_ERROR,
} from "@/components/ui/membersTheme";
import type { ActivityEntry, ActivityUserOption } from "@/lib/services/eventActivityReport";

interface Props {
  eventId: number;
  users: ActivityUserOption[];
  initialEntries: ActivityEntry[];
  initialHasMore: boolean;
  /** False when find_event_lobby_engagement_report is not in this database at all. */
  available: boolean;
}

/**
 * ---------------------------------------------------------------------------
 * User Activity Report timeline.
 * ---------------------------------------------------------------------------
 *
 * Replaces members/event_user_activity_report.tpl: a filter bar, a vertical timeline grouped by
 * day, and Load More.
 *
 * Filtering is CLIENT-SIDE state, not a page reload. The legacy rebuilt the whole URL in jQuery
 * and navigated (`window.location.href = url`), which meant every filter change re-rendered the
 * event header, the nav and the footer to change ten rows. Here it refetches the feed alone.
 */
export function ActivityReportManager({
  eventId,
  users,
  initialEntries,
  initialHasMore,
  available,
}: Props) {
  const [entries, setEntries] = useState<ActivityEntry[]>(initialEntries);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [userId, setUserId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function query(offset: number) {
    const params = new URLSearchParams({ event_id: String(eventId), offset: String(offset) });
    if (userId) params.set("user_id", userId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return `/api/members/event-activity?${params.toString()}`;
  }

  async function load(offset: number, mode: "replace" | "append") {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(query(offset));
      const next: ActivityEntry[] = res.data?.entries ?? [];
      setEntries((prev) => (mode === "append" ? [...prev, ...next] : next));
      setHasMore(Boolean(res.data?.hasMore));
    } catch (err) {
      setError(
        isAxiosError(err) && err.response?.data?.error
          ? String(err.response.data.error)
          : "Could not load activity."
      );
    } finally {
      setLoading(false);
    }
  }

  function resetFilters() {
    setUserId("");
    setFrom("");
    setTo("");
    setEntries(initialEntries);
    setHasMore(initialHasMore);
    setError(null);
  }

  /**
   * Group into day headings.
   *
   * Done from the ISO timestamp in the BROWSER, so a day boundary falls where the reader is,
   * not where the server happens to be. The legacy formatted dates in PHP and compared the
   * formatted strings to decide when to print a new heading — which also meant a heading could
   * repeat across a Load More boundary, since the comparison restarted per request. Grouping the
   * accumulated list instead makes that impossible.
   */
  const groups = useMemo(() => {
    const out: { day: string; items: ActivityEntry[] }[] = [];
    for (const entry of entries) {
      const day = new Date(entry.at).toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
        year: "2-digit",
      });
      const last = out[out.length - 1];
      if (last && last.day === day) last.items.push(entry);
      else out.push({ day, items: [entry] });
    }
    return out;
  }, [entries]);

  const filtersActive = Boolean(userId || from || to);

  if (!available) {
    return (
      <div className={`${PANEL} flex items-start gap-3`}>
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
        <div className="text-sm text-zinc-300">
          <p className="font-semibold text-white">Activity tracking isn&apos;t set up for this database.</p>
          <p className="mt-1 text-zinc-400">
            The report reads <code className="text-zinc-300">find_event_lobby_engagement_report</code>, which
            doesn&apos;t exist here yet. Lobby interactions are recorded into that table by the live
            site; once it has been migrated across, this page will fill in on its own with no code
            change.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className={PANEL}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className={FORM_LABEL}>Select User</label>
            <select value={userId} onChange={(e) => setUserId(e.target.value)} className={INPUT_FIELD}>
              <option value="">All attendees</option>
              {users.map((u) => (
                <option key={u.userId} value={u.userId}>
                  {u.label}
                </option>
              ))}
            </select>
            {users.length === 0 && <p className={FORM_HINT}>No attendees are registered for this event yet.</p>}
          </div>
          <div>
            <label className={FORM_LABEL}>From Activity Date</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={INPUT_FIELD} />
          </div>
          <div>
            <label className={FORM_LABEL}>To Activity Date</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={INPUT_FIELD} />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => load(0, "replace")}
            disabled={loading}
            className={`${BTN_PRIMARY} disabled:opacity-50`}
          >
            <Filter className="h-4 w-4" /> {loading ? "Filtering…" : "Filter"}
          </button>
          {filtersActive && (
            <button type="button" onClick={resetFilters} className={BTN_SECONDARY}>
              <X className="h-4 w-4" /> Clear
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className={`${ALERT_ERROR} flex items-center gap-2`}>
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {entries.length === 0 ? (
        <div className={`${PANEL} py-12 text-center`}>
          <Activity className="mx-auto mb-3 h-8 w-8 text-zinc-600" />
          <p className="text-sm font-semibold text-zinc-300">
            {filtersActive ? "No activity matches these filters." : "No lobby activity recorded yet."}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Entries appear here as visitors move around the lobby, open booths and download resources.
          </p>
        </div>
      ) : (
        <div className={PANEL}>
          {groups.map((group) => (
            <div key={group.day} className="mb-6 last:mb-0">
              <div className="mb-4 flex justify-center">
                <span className="rounded-md bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300">
                  {group.day}
                </span>
              </div>

              {/* The vertical rule lives on this wrapper so it spans the day's rows and stops
                  cleanly at the last one, rather than running past the final entry. */}
              <ul className="relative space-y-2 border-l-2 border-brand-pink/60 pl-6 sm:ml-24">
                {group.items.map((entry) => (
                  <li key={entry.id} className="relative rounded-lg border border-white/5 bg-white/5 px-4 py-2.5">
                    <span className="absolute -left-[31px] top-4 h-3 w-3 rounded-full border-2 border-brand-pink bg-[#140f22]" />
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4">
                      <time
                        dateTime={entry.at}
                        className="shrink-0 text-xs font-semibold text-brand-pink sm:w-20"
                      >
                        {new Date(entry.at).toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                      <p className="text-sm text-zinc-200">
                        <span className="font-semibold text-white">{entry.userName}</span>{" "}
                        {entry.highlight ? (
                          <>
                            {entry.description.split(entry.highlight)[0]}
                            <strong className="font-bold text-brand-pink">{entry.highlight}</strong>
                            {entry.description.split(entry.highlight).slice(1).join(entry.highlight)}
                          </>
                        ) : (
                          entry.description
                        )}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {hasMore && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => load(entries.length, "append")}
                disabled={loading}
                className={`${BTN_PRIMARY} disabled:opacity-50`}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {loading ? "Loading…" : "Load More"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
