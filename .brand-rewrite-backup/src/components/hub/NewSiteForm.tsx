"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Check, Loader2, Lock } from "lucide-react";
import {
  COPY_TOGGLES,
  noCopySelections,
  withDependencies,
  type CopyToggleKey,
} from "@/lib/hub/copyOptions";
import type { CopyableEvent, DryRunLine, HubSiteRow } from "@/lib/services/hubSites";

/**
 * ===========================================================================
 *  THE NEW SITE FORM
 * ===========================================================================
 *
 *  §6.2 and §6.3 of docs/multi-site-spec.md, and the thing Angad asked to see before the
 *  machinery underneath it exists: "when click on new sites then form will open".
 *
 *  IT DOES NOT CREATE ANYTHING YET, AND IT SAYS SO IN THE ONE PLACE THAT MATTERS — on the button.
 *  The clone engine is Phase 3; host-based routing is Phase 1 and also unbuilt. A form that
 *  looked ready and quietly did nothing, or worse half-did something, would be the most expensive
 *  possible way to find that out. So the final step produces a written plan of exactly what would
 *  be created and copied, which is the thing worth reviewing now anyway — the engine can be held
 *  to it later.
 *
 *  Everything ABOVE that button is real: the events are real events, the counts are real row
 *  counts against the real database, and the uniqueness check is against the real domains table.
 */

const HERO_LAYOUTS = ["Luxury", "Sport", "Corporate"];

const COLOUR_SCHEMES = [
  "Purple / Pink (Digital Age Expo)",
  "Blue / Cyan",
  "Emerald / Lime",
  "Amber / Orange",
  "Crimson / Rose",
  "Slate / Steel",
];

/** Turns "London Growth Expo 2026" into "london-growth-expo-2026". */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** How many of a toggle's tables the dry run could not read at all (as opposed to read as empty). */
function unknownCount(line: DryRunLine): number {
  return line.models.filter((entry) => entry.rows === null).length;
}

/** Strips scheme, www., path and trailing dots so two spellings of one host compare equal. */
function normaliseHost(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .replace(/\.+$/, "");
}

export function NewSiteForm({
  events,
  sites,
}: {
  events: CopyableEvent[];
  sites: HubSiteRow[];
}) {
  const [domain, setDomain] = useState("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [year, setYear] = useState(String(new Date().getFullYear() + 1));
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [sourceSiteId, setSourceSiteId] = useState<string>(
    String(sites.find((site) => site.isCurrent)?.id ?? sites[0]?.id ?? "")
  );
  const [sourceEventId, setSourceEventId] = useState<string>(String(events[0]?.id ?? ""));
  const [heroLayout, setHeroLayout] = useState(HERO_LAYOUTS[2]);
  const [colourScheme, setColourScheme] = useState(COLOUR_SCHEMES[0]);

  const [selections, setSelections] = useState(noCopySelections());
  const [exhibitorMode, setExhibitorMode] = useState<"unallocated" | "allocated">("unallocated");

  const [counts, setCounts] = useState<DryRunLine[] | null>(null);
  const [countsLoading, setCountsLoading] = useState(false);
  const [countsError, setCountsError] = useState<string | null>(null);
  const [plan, setPlan] = useState<string[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [created, setCreated] = useState<{
    domainId: number;
    eventId: number;
    copied: { key: string; label: string; rows: number; skipped: string[] }[];
  } | null>(null);

  // The slug follows the name until the moment someone edits it themselves, and then stops —
  // silently overwriting a hand-chosen slug on the next keystroke in the name field is the kind
  // of small betrayal that makes a form feel hostile.
  useEffect(() => {
    if (!slugTouched) setSlug(slugify(name));
  }, [name, slugTouched]);

  /*
   * Fetch the counts whenever the source event changes. Aborted on change so a slow response for
   * a previously selected event cannot land after a faster one and show counts belonging to the
   * wrong show — which would be worse than no counts, because it looks authoritative.
   */
  useEffect(() => {
    if (!sourceEventId) return;

    const controller = new AbortController();
    setCountsLoading(true);
    setCountsError(null);

    fetch(`/api/hub/sites/preview?event_id=${encodeURIComponent(sourceEventId)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Preview failed (${response.status})`);
        return response.json();
      })
      .then((data: { lines: DryRunLine[] }) => {
        setCounts(data.lines);
        setCountsLoading(false);
      })
      .catch((error: unknown) => {
        if ((error as { name?: string })?.name === "AbortError") return;
        setCountsError("Could not read the row counts for this event.");
        setCountsLoading(false);
      });

    return () => controller.abort();
  }, [sourceEventId]);

  const countFor = useMemo(() => {
    const map = new Map<CopyToggleKey, DryRunLine>();
    for (const line of counts ?? []) map.set(line.key, line);
    return map;
  }, [counts]);

  const takenHosts = useMemo(
    () => new Set(sites.map((site) => normaliseHost(site.link)).filter(Boolean)),
    [sites]
  );

  const host = normaliseHost(domain);
  const hostClash = host.length > 0 && takenHosts.has(host);
  const slugClash = false; // Slugs live on the event, not find_domains — checked at clone time.

  const errors: string[] = [];
  if (!host) errors.push("A domain is required.");
  if (host && !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host))
    errors.push("The domain does not look like a hostname (example: londongrowthexpo.com).");
  if (hostClash) errors.push(`${host} is already used by an existing site.`);
  if (!name.trim()) errors.push("A site name is required.");
  if (!slug) errors.push("A slug is required.");
  if (!sourceSiteId) errors.push("Choose which site supplies the branding and pages.");
  if (!sourceEventId) errors.push("Choose which event supplies the show content.");
  if (email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()))
    errors.push("That contact email does not look valid.");

  const toggle = (key: CopyToggleKey) => {
    setPlan(null);
    setSelections((current) => withDependencies({ ...current, [key]: !current[key] }));
  };

  const chosenEvent = events.find((event) => String(event.id) === sourceEventId);
  const chosenSite = sites.find((site) => String(site.id) === sourceSiteId);

  /**
   * Create the site for real.
   *
   * Deliberately only reachable AFTER the plan has been produced — `plan` gates the button. The
   * two-step is the whole safety design of this screen: there is no delete for a site the Hub did
   * not create, host routing is not live, and this writes several thousand rows, so the person
   * pressing it should have read what it is about to do rather than discovered it afterwards.
   */
  async function createSite() {
    setCreating(true);
    setCreateError(null);

    try {
      const response = await fetch("/api/hub/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: host,
          name: name.trim(),
          slug,
          year,
          email: email.trim(),
          company: company.trim(),
          sourceDomainId: Number(sourceSiteId),
          sourceEventId: Number(sourceEventId),
          heroLayout,
          colourScheme,
          exhibitorMode,
          selections: withDependencies(selections),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? `Create failed (${response.status})`);

      setCreated(data);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "The site could not be created.");
    } finally {
      setCreating(false);
    }
  }

  function buildPlan() {
    const resolved = withDependencies(selections);
    const lines: string[] = [
      `Create site "${name.trim()}" at ${host}, slug "${slug}"${year ? `, year ${year}` : ""}.`,
      `Branding, settings, menus and pages copied from ${chosenSite?.name ?? "—"} (domain ${sourceSiteId}).`,
      `Show content taken from ${chosenEvent?.title ?? "—"} (event_id ${sourceEventId}).`,
      `Hero layout ${heroLayout}; colour scheme ${colourScheme}.`,
      email.trim() ? `Contact email ${email.trim()}.` : "No contact email set.",
      company.trim() ? `Organising company ${company.trim()}.` : "No organising company set.",
    ];

    const ticked = COPY_TOGGLES.filter((entry) => resolved[entry.key]);

    if (ticked.length === 0) {
      lines.push("Nothing copied — the new site starts as an empty shell.");
    } else {
      for (const entry of ticked) {
        const line = countFor.get(entry.key);
        const unknown = line ? unknownCount(line) : 0;
        const rows = line
          ? `${line.total} row${line.total === 1 ? "" : "s"}` +
            (unknown > 0
              ? ` (plus ${unknown} table${unknown === 1 ? "" : "s"} that could not be read — the count is a floor, not a total)`
              : "")
          : "count unavailable";
        const extra =
          entry.key === "exhibitors"
            ? exhibitorMode === "allocated"
              ? " (with their stand allocation)"
              : " (unallocated)"
            : "";
        lines.push(`Copy ${entry.label} — ${rows}${extra}.`);
      }
    }

    lines.push(
      "Never copied: orders, invoices, purchased tickets, RSVPs, briefcases, enquiries, meeting " +
        "bookings, poll responses, email and letter logs, blog posts and feeds."
    );

    setPlan(lines);
  }

  const field =
    "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30";
  const label = "mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-white/50";

  return (
    <div>
      <Link
        href="/hub/sites"
        className="mb-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/50 transition hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All sites
      </Link>

      <h2 className="text-2xl font-bold text-white">New site</h2>
      <p className="mt-1 max-w-2xl text-sm text-white/60">
        A new location site starts as a copy of an existing site&apos;s shell. Choose which event
        it draws its content from, then tick only what genuinely carries over.
      </p>

      {/* ---------------------------------------------------------------- IDENTITY */}
      <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6">
        <h3 className="mb-5 text-xs font-black uppercase tracking-[0.2em] text-brand-pink">
          Identity
        </h3>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="site-domain">
              Domain *
            </label>
            <input
              id="site-domain"
              className={field}
              value={domain}
              onChange={(event) => {
                setDomain(event.target.value);
                setPlan(null);
              }}
              placeholder="londongrowthexpo.com"
              autoComplete="off"
            />
            <p className="mt-1.5 text-[11px] text-white/40">
              Without <code>www.</code> — that is added by the DNS setup, not stored here.
            </p>
          </div>

          <div>
            <label className={label} htmlFor="site-name">
              Site name *
            </label>
            <input
              id="site-name"
              className={field}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setPlan(null);
              }}
              placeholder="London Growth Expo"
            />
          </div>

          <div>
            <label className={label} htmlFor="site-slug">
              Slug *
            </label>
            <input
              id="site-slug"
              className={field}
              value={slug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(slugify(event.target.value));
                setPlan(null);
              }}
              placeholder="london-growth-expo"
            />
            <p className="mt-1.5 text-[11px] text-white/40">
              {slugTouched ? "Set by hand." : "Following the site name."}
            </p>
          </div>

          <div>
            <label className={label} htmlFor="site-year">
              Event year
            </label>
            <input
              id="site-year"
              className={field}
              value={year}
              onChange={(event) => setYear(event.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
              inputMode="numeric"
            />
          </div>

          <div>
            <label className={label} htmlFor="site-email">
              Contact email
            </label>
            <input
              id="site-email"
              type="email"
              className={field}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="hello@londongrowthexpo.com"
            />
          </div>

          <div>
            <label className={label} htmlFor="site-company">
              Organising company
            </label>
            <input
              id="site-company"
              className={field}
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              placeholder="B2B Growth Hub Limited"
            />
          </div>

          <div>
            <label className={label} htmlFor="site-hero">
              Hero layout
            </label>
            <select
              id="site-hero"
              className={field}
              value={heroLayout}
              onChange={(event) => setHeroLayout(event.target.value)}
            >
              {HERO_LAYOUTS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={label} htmlFor="site-colour">
              Colour scheme
            </label>
            <select
              id="site-colour"
              className={field}
              value={colourScheme}
              onChange={(event) => setColourScheme(event.target.value)}
            >
              {COLOUR_SCHEMES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- SOURCE */}
      <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
        <h3 className="mb-5 text-xs font-black uppercase tracking-[0.2em] text-brand-pink">
          Copy from
        </h3>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="source-site">
              Site * — branding, settings, menus, pages
            </label>
            <select
              id="source-site"
              className={field}
              value={sourceSiteId}
              onChange={(event) => {
                setSourceSiteId(event.target.value);
                setPlan(null);
              }}
            >
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name} {site.isCurrent ? "(this site)" : ""} — #{site.id}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={label} htmlFor="source-event">
              Event * — the show content
            </label>
            <select
              id="source-event"
              className={field}
              value={sourceEventId}
              onChange={(event) => {
                setSourceEventId(event.target.value);
                setPlan(null);
              }}
            >
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                  {event.date ? ` · ${event.date}` : ""} · {event.exhibitorCount} exhibitors · #
                  {event.id}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[11px] text-white/40">
              Dates and exhibitor counts are shown so the choice is made on facts, not ids.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- TOGGLES */}
      <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-brand-pink">
            What to copy
          </h3>
          <p className="text-[11px] text-white/40">
            {countsLoading ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" />
                counting…
              </span>
            ) : countsError ? (
              countsError
            ) : chosenEvent ? (
              `from: ${chosenEvent.title} (event ${chosenEvent.id})`
            ) : (
              ""
            )}
          </p>
        </div>

        <div className="space-y-2">
          {COPY_TOGGLES.map((entry) => {
            const line = countFor.get(entry.key);
            const checked = selections[entry.key];
            const notYet = !entry.implemented;
            const forced =
              !checked &&
              COPY_TOGGLES.some(
                (other) => selections[other.key] && other.requires?.includes(entry.key)
              );

            return (
              <div
                key={entry.key}
                className={`rounded-2xl border p-4 transition ${
                  notYet
                    ? "border-white/5 bg-white/[0.01] opacity-60"
                    : checked || forced
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
                    checked={!notYet && (checked || forced)}
                    disabled={notYet}
                    onChange={() => toggle(entry.key)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-3">
                      <span className="font-bold text-white">{entry.label}</span>
                      <span className="text-xs text-white/50">
                        {line
                          ? `${line.total.toLocaleString()} row${line.total === 1 ? "" : "s"}`
                          : countsLoading
                            ? "…"
                            : "—"}
                      </span>
                      {/*
                        * A table that could not be read is NOT a table with nothing in it, and
                        * the difference matters here more than almost anywhere else in the app.
                        * find_event_registration_fields, for one, is in the Prisma schema but was
                        * never carried into Neon, so it answers nothing rather than zero. Folding
                        * that into the headline as 0 would quietly tell someone their registration
                        * form is empty when the truth is that nobody knows.
                        */}
                      {line && unknownCount(line) > 0 && (
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                          {unknownCount(line)} table{unknownCount(line) === 1 ? "" : "s"} unreadable
                        </span>
                      )}
                      {forced && (
                        <span className="text-[11px] font-bold uppercase tracking-wider text-brand-pink">
                          required by another choice
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-white/50">
                      {entry.detail}
                    </span>
                    {notYet && entry.notYetReason && (
                      <span className="mt-1.5 block text-[11px] leading-relaxed text-amber-200/80">
                        {entry.notYetReason}
                      </span>
                    )}
                  </span>
                </label>

                {entry.key === "exhibitors" && (checked || forced) && (
                  <div className="mt-3 flex flex-wrap gap-4 pl-7">
                    {(["unallocated", "allocated"] as const).map((mode) => (
                      <label key={mode} className="flex cursor-pointer items-center gap-2 text-xs">
                        <input
                          type="radio"
                          name="exhibitor-mode"
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

                {entry.caution && (checked || forced) && (
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                    <p className="text-[11px] leading-relaxed text-amber-100/90">{entry.caution}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-5 flex items-start gap-2 text-[11px] leading-relaxed text-white/40">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Orders, invoices, purchased tickets, RSVPs, briefcases, enquiries, meeting bookings, poll
          responses, email and letter logs, blog posts and feeds are never copied — there is no
          setting for them.
        </p>
      </section>

      {/* ---------------------------------------------------------------- SUBMIT */}
      <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
        {errors.length > 0 && (
          <ul className="mb-5 space-y-1.5">
            {errors.map((error) => (
              <li key={error} className="flex items-start gap-2 text-xs text-amber-200">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {error}
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={buildPlan}
            disabled={errors.length > 0 || slugClash}
            className="rounded-full bg-gradient-to-r from-brand-purple to-brand-pink px-7 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Review what this would create
          </button>

          <p className="max-w-md text-[11px] leading-relaxed text-white/40">
            The clone engine is not built yet, so this writes nothing. It produces the exact plan
            the engine will be held to.
          </p>
        </div>

        {plan && (
          <div className="mt-6 rounded-2xl border border-emerald-400/25 bg-emerald-400/5 p-5">
            <h4 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-300">
              <Check className="h-4 w-4" />
              Plan
            </h4>
            <ul className="space-y-2">
              {plan.map((entry) => (
                <li key={entry} className="text-xs leading-relaxed text-white/75">
                  {entry}
                </li>
              ))}
            </ul>

            {!created && (
              <div className="mt-5 border-t border-white/10 pt-5">
                <button
                  type="button"
                  onClick={createSite}
                  disabled={creating}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-7 py-3 text-xs font-black uppercase tracking-widest text-emerald-950 shadow-lg transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                  {creating ? "Creating…" : "Create this site"}
                </button>
                <p className="mt-3 max-w-xl text-[11px] leading-relaxed text-white/40">
                  This writes to the database. The new site is created inactive, with no payment
                  keys, and can be removed again from the site list.
                </p>
              </div>
            )}

            {createError && (
              <p className="mt-4 flex items-start gap-2 text-xs text-amber-200">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {createError}
              </p>
            )}

            {created && (
              <div className="mt-5 rounded-2xl border border-emerald-400/40 bg-emerald-400/10 p-5">
                <p className="text-sm font-bold text-emerald-200">
                  Site #{created.domainId} created, on new event #{created.eventId}.
                </p>
                <ul className="mt-3 space-y-1">
                  {created.copied.map((entry) => (
                    <li key={entry.key} className="text-xs text-white/75">
                      {entry.label}: {entry.rows.toLocaleString()} row
                      {entry.rows === 1 ? "" : "s"} copied
                      {entry.skipped.length > 0
                        ? ` · skipped ${entry.skipped.join(", ")} (table unavailable)`
                        : ""}
                    </li>
                  ))}
                  {created.copied.length === 0 && (
                    <li className="text-xs text-white/75">
                      No content copied — the site is an empty shell, as chosen.
                    </li>
                  )}
                </ul>
                <Link
                  href="/hub/sites"
                  className="mt-4 inline-flex rounded-full bg-white px-5 py-2.5 text-xs font-black uppercase tracking-widest text-zinc-900 transition hover:bg-white/90"
                >
                  See it in the site list
                </Link>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
