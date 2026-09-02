"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, X, Bookmark, Users, Building2, ArrowRight } from "lucide-react";

import { ModalPortal } from "@/components/ui/ModalPortal";

export interface ExhibitorDirectoryEntry {
  id: number;
  business: string;
  contactName: string | null;
  zoneName: string | null;
  standNumber: string | null;
  about: string | null;
  logoUrl?: string;
  friendlyUrl: string | null;
}

const BOOKMARK_STORAGE_KEY = "lobby_bookmarked_exhibitors";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const NUMERIC_BUCKET = "0-9";

/**
 * Which A-Z chip an exhibitor belongs under.
 *
 * Anything that does not start with a letter — a digit, a quote, an ampersand — goes in the
 * "0-9" bucket rather than being dropped. Every exhibitor has to be reachable from exactly one
 * chip, otherwise picking a letter would silently hide records that "All" shows, and nobody
 * would know which chip to look under to find them again.
 */
function bucketFor(business: string): string {
  const first = business.trim().charAt(0).toUpperCase();
  return first >= "A" && first <= "Z" ? first : NUMERIC_BUCKET;
}

function loadBookmarks(): Set<number> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(BOOKMARK_STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

/**
 * An exhibitor logo that degrades to a glyph instead of a broken-image icon.
 *
 * logoUrl resolves through the asset map to /images/external/..., and a large share of those
 * files were never mirrored — the URL is present but 404s. Rendering <img> unconditionally
 * showed the browser's torn-page placeholder in the middle of the card (visible on MAVELON
 * STUDIO and LegalVision in the directory). Swapping on the image's own error event is the only
 * check that reflects whether the file actually exists.
 */
function ExhibitorLogo({ src, alt }: { src?: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <Building2 className="h-8 w-8 text-slate-300" aria-hidden="true" />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- organiser-uploaded, arbitrary remote host
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className="max-h-full max-w-full object-contain"
    />
  );
}

/**
 * The lobby footer's "Exhibitor List" action — mirrors lobby.php's getExhibitorListModal(): a
 * searchable directory of every active exhibitor (business, contact, zone, booth number,
 * "Visit Booth" link), with an "All Exhibitors" / "Bookmarked Exhibitors" split and an A-Z index.
 *
 * The legacy bookmark flag has no equivalent table in this app yet, so bookmarking here is a
 * lightweight, client-only preference (localStorage) rather than a server-persisted one — enough
 * to make the second tab do something without inventing a whole favourites backend.
 *
 * Chrome (title, search, tabs, A-Z index) is pinned; only the grid scrolls. When the index
 * scrolled away with the cards it became unreachable the moment you started browsing, which is
 * the one control you most want while deep in a 232-row list.
 *
 * Dark to match the rest of the lobby, with the LOGO TILE left white: exhibitor logos are
 * supplied on the assumption of a white background, and the ones with dark lettering or a white
 * knockout vanish on a dark card. Scoping the light surface to the tile keeps them legible
 * without turning the whole modal into a foreign white panel.
 */
export function ExhibitorListModal({
  open,
  onClose,
  exhibitors,
  eventSlug,
}: {
  open: boolean;
  onClose: () => void;
  exhibitors: ExhibitorDirectoryEntry[];
  /** This event's friendly_url, used to build each card's booth link. */
  eventSlug?: string;
}) {
  /**
   * Where "Visit Booth" goes.
   *
   * Prefers the legacy booth URL keyed on the exhibitor's id, which works for every exhibitor.
   * Falls back to the slug-based /virtual-directory page only when this modal was rendered
   * without an event slug (it is an optional prop, so an older caller keeps working), and gives
   * up entirely when neither is available rather than linking somewhere that 404s.
   */
  function boothHrefFor(exhibitor: ExhibitorDirectoryEntry): string | null {
    if (eventSlug) return `/virtual-event/${eventSlug}?mybooth=1&ex_id=${exhibitor.id}`;
    if (exhibitor.friendlyUrl) return `/virtual-directory/${exhibitor.friendlyUrl}`;
    return null;
  }

  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | "bookmarked">("all");
  const [letter, setLetter] = useState<string>("All");
  const [bookmarked, setBookmarked] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    setBookmarked(loadBookmarks());
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  function toggleBookmark(id: number) {
    setBookmarked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        window.localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        // localStorage can be unavailable (private mode, quota) — bookmarking just won't persist.
      }
      return next;
    });
  }

  /** The tab's pool, before the letter and search narrow it. */
  const pool = useMemo(
    () => (tab === "bookmarked" ? exhibitors.filter((e) => bookmarked.has(e.id)) : exhibitors),
    [exhibitors, tab, bookmarked],
  );

  /**
   * Which chips have anything behind them, computed from the tab's pool rather than the whole
   * directory — so switching to Bookmarked greys out every letter you haven't saved anyone under,
   * instead of offering chips that lead to an empty grid.
   */
  const availableBuckets = useMemo(() => {
    const set = new Set<string>();
    for (const e of pool) set.add(bucketFor(e.business));
    return set;
  }, [pool]);

  const filtered = useMemo(() => {
    const byLetter = letter === "All" ? pool : pool.filter((e) => bucketFor(e.business) === letter);
    const needle = query.trim().toLowerCase();
    if (!needle) return byLetter;
    return byLetter.filter(
      (e) =>
        e.business.toLowerCase().includes(needle) ||
        (e.contactName?.toLowerCase().includes(needle) ?? false) ||
        (e.zoneName?.toLowerCase().includes(needle) ?? false),
    );
  }, [pool, letter, query]);

  if (!open) return null;

  const chips = ["All", NUMERIC_BUCKET, ...LETTERS];

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-40 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 p-3 backdrop-blur-sm sm:p-6"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="glass-panel flex max-h-[88vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl border border-white/10 shadow-2xl"
        >
          {/* ---------- Pinned chrome ---------- */}
          <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <h2 className="whitespace-nowrap text-lg font-black uppercase tracking-tight text-white">
              Exhibitor List <span className="text-brand-pink">({exhibitors.length})</span>
            </h2>

            <div className="flex items-center gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search exhibitors..."
                  className="w-full rounded-full border border-white/10 bg-white/5 py-2 pl-9 pr-4 text-sm text-white placeholder:text-zinc-500 focus:border-brand-pink focus:outline-none focus:ring-1 focus:ring-brand-pink"
                />
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:border-brand-pink/50 hover:text-brand-pink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex gap-2 border-b border-white/10 px-5 pt-3 sm:px-6">
            <button
              type="button"
              onClick={() => setTab("all")}
              className={`flex items-center gap-1.5 border-b-2 px-3 pb-3 text-xs font-black uppercase tracking-wide transition ${
                tab === "all"
                  ? "border-brand-pink text-brand-pink"
                  : "border-transparent text-zinc-400 hover:text-white"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              All Exhibitors
            </button>
            <button
              type="button"
              onClick={() => setTab("bookmarked")}
              className={`flex items-center gap-1.5 border-b-2 px-3 pb-3 text-xs font-black uppercase tracking-wide transition ${
                tab === "bookmarked"
                  ? "border-brand-pink text-brand-pink"
                  : "border-transparent text-zinc-400 hover:text-white"
              }`}
            >
              <Bookmark className="h-3.5 w-3.5" />
              Bookmarked ({bookmarked.size})
            </button>
          </div>

          {/* A-Z index — pinned with the rest of the chrome, above the scroll region */}
          <div className="flex flex-wrap gap-1.5 border-b border-white/10 px-5 py-3 sm:px-6">
            {chips.map((chip) => {
              const isAll = chip === "All";
              const enabled = isAll || availableBuckets.has(chip);
              const active = letter === chip;
              return (
                <button
                  key={chip}
                  type="button"
                  disabled={!enabled}
                  onClick={() => setLetter(chip)}
                  aria-pressed={active}
                  className={`min-w-[1.9rem] rounded-md border px-2 py-1 text-[11px] font-bold transition ${
                    active
                      ? "border-brand-pink bg-brand-pink text-white"
                      : enabled
                        ? "border-white/10 bg-white/5 text-zinc-300 hover:border-brand-pink/50 hover:text-brand-pink"
                        : "cursor-not-allowed border-white/5 bg-transparent text-zinc-700"
                  }`}
                >
                  {chip}
                </button>
              );
            })}
          </div>

          {/* ---------- Scrolling grid ---------- */}
          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            {filtered.length === 0 ? (
              <p className="py-16 text-center text-sm text-zinc-500">
                {tab === "bookmarked"
                  ? "You haven't bookmarked any exhibitors yet."
                  : "No exhibitors match your search."}
              </p>
            ) : (
              /* Five across on xl, stepping down so a card never gets too narrow to read a logo
                 or a booth number. */
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {filtered.map((exhibitor) => {
                  const isBookmarked = bookmarked.has(exhibitor.id);
                  return (
                    <div
                      key={exhibitor.id}
                      /* h-full + the min-heights below keep every card in a row the same shape.
                         Without them a card with no zone/booth badges stretched to its tallest
                         neighbour and left a large dead gap above the button. */
                      className="group relative flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-3 transition hover:border-brand-pink/40 hover:bg-white/[0.07]"
                    >
                      <button
                        type="button"
                        onClick={() => toggleBookmark(exhibitor.id)}
                        aria-label={isBookmarked ? "Remove bookmark" : "Bookmark this exhibitor"}
                        title={isBookmarked ? "Remove bookmark" : "Bookmark this exhibitor"}
                        className={`absolute right-2 top-2 z-10 rounded-md p-1 transition ${
                          isBookmarked
                            ? "text-brand-pink"
                            : "text-white/30 hover:bg-white/10 hover:text-brand-pink"
                        }`}
                      >
                        <Bookmark className={`h-4 w-4 ${isBookmarked ? "fill-current" : ""}`} />
                      </button>

                      {/* White tile: logos assume a white background and disappear on a dark one */}
                      <div className="flex h-20 items-center justify-center overflow-hidden rounded-xl bg-white px-3 py-2">
                        <ExhibitorLogo src={exhibitor.logoUrl} alt={exhibitor.business} />
                      </div>

                      <div className="mt-3 min-h-[3.25rem] text-center">
                        <h3 className="text-sm font-bold leading-snug text-white">
                          {exhibitor.business}
                        </h3>
                        {exhibitor.contactName && (
                          <p className="mt-0.5 text-xs text-zinc-400">({exhibitor.contactName})</p>
                        )}
                      </div>

                      {/* Reserved so cards with and without badges still line up across a row */}
                      <div className="mt-2 min-h-[3.25rem] space-y-1.5">
                        {exhibitor.zoneName && (
                          <p className="truncate rounded-md bg-white/[0.07] px-2 py-1 text-center text-[10px] font-bold uppercase tracking-wide text-zinc-300">
                            {exhibitor.zoneName}
                          </p>
                        )}
                        {exhibitor.standNumber && (
                          <p className="rounded-md bg-white/[0.07] px-2 py-1 text-center text-[10px] font-bold uppercase tracking-wide text-zinc-300">
                            Booth No: {exhibitor.standNumber}
                          </p>
                        )}
                      </div>

                      {/* mt-auto pins the action to the card's bottom edge, so the buttons form a
                          straight line across the row whatever the content above them. */}
                      {/* The booth is addressed by exhibitor id, not by slug:
                          find_event_exhibitor.friendly_url is empty on most migrated rows, so the
                          old /virtual-directory/<slug> link left the majority of the directory
                          showing "Booth Coming Soon" for stands that exist and are published.
                          This is the legacy booth URL, and it opens in the same tab so the lobby
                          chrome and the Back button behave as one journey. */}
                      {boothHrefFor(exhibitor) ? (
                        <Link
                          href={boothHrefFor(exhibitor) as string}
                          onClick={onClose}
                          className="btn-brand-gradient mt-auto flex items-center justify-center gap-1.5 rounded-full py-2 text-[11px] font-black uppercase tracking-widest text-white transition hover:scale-[1.02]"
                        >
                          Visit Booth
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      ) : (
                        <span
                          title="This exhibitor's booth link is not available yet"
                          className="mt-auto block rounded-full border border-white/10 py-2 text-center text-[11px] font-black uppercase tracking-widest text-zinc-500"
                        >
                          Booth Coming Soon
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
