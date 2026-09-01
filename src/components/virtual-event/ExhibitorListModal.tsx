"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, X, Bookmark, Users, Building2 } from "lucide-react";

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
 * The lobby footer's "Exhibitor List" action — mirrors lobby.php's getExhibitorListModal(): a
 * searchable directory of every active exhibitor (business, contact, zone, booth number, blurb,
 * "Visit Booth" link), with an "All Exhibitors" / "Bookmarked Exhibitors" split. The legacy
 * bookmark flag has no equivalent table in this app yet, so bookmarking here is a lightweight,
 * client-only preference (localStorage) rather than a server-persisted one — enough to make the
 * second tab actually do something without inventing a whole favourites backend for it.
 *
 * Styled to match this app's own dark, glass/gradient theme (see globals.css's .glass-panel /
 * brand-pink) rather than the legacy modal's white Bootstrap card look — same structure, this
 * app's colors.
 */
export function ExhibitorListModal({
  open,
  onClose,
  exhibitors,
}: {
  open: boolean;
  onClose: () => void;
  exhibitors: ExhibitorDirectoryEntry[];
}) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | "bookmarked">("all");
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

  const filtered = useMemo(() => {
    const pool = tab === "bookmarked" ? exhibitors.filter((e) => bookmarked.has(e.id)) : exhibitors;
    const needle = query.trim().toLowerCase();
    if (!needle) return pool;
    return pool.filter(
      (e) =>
        e.business.toLowerCase().includes(needle) ||
        (e.contactName?.toLowerCase().includes(needle) ?? false) ||
        (e.zoneName?.toLowerCase().includes(needle) ?? false)
    );
  }, [exhibitors, tab, bookmarked, query]);

  if (!open) return null;

  return (
    <ModalPortal>
      <div
      className="fixed inset-0 z-40 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 p-4 backdrop-blur-sm sm:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-panel flex max-h-[85vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl"
      >
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <h2 className="text-lg font-black uppercase tracking-tight text-white">
            Exhibitor List <span className="text-brand-pink">({exhibitors.length})</span>
          </h2>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search exhibitors..."
                className="w-full rounded-full border border-white/10 bg-white/5 py-2 pl-9 pr-4 text-sm text-white placeholder:text-zinc-500 focus:border-brand-pink focus:outline-none focus:ring-1 focus:ring-brand-pink sm:w-64"
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

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/10 px-5 pt-4 sm:px-6">
          <button
            type="button"
            onClick={() => setTab("all")}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide transition ${
              tab === "all" ? "bg-brand-pink text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            All Exhibitors
          </button>
          <button
            type="button"
            onClick={() => setTab("bookmarked")}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide transition ${
              tab === "bookmarked" ? "bg-brand-pink text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            <Bookmark className="h-3.5 w-3.5" />
            Bookmarked ({bookmarked.size})
          </button>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {filtered.length === 0 ? (
            <p className="py-16 text-center text-sm text-zinc-500">
              {tab === "bookmarked"
                ? "You haven't bookmarked any exhibitors yet."
                : "No exhibitors match your search."}
            </p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((exhibitor) => {
                const isBookmarked = bookmarked.has(exhibitor.id);
                return (
                  <div
                    key={exhibitor.id}
                    className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-brand-pink/30 hover:bg-white/[0.06]"
                  >
                    <div className="flex h-20 items-center justify-center rounded-xl border border-white/10 bg-white/5 p-3">
                      {exhibitor.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={exhibitor.logoUrl} alt={exhibitor.business} className="max-h-full max-w-full object-contain" />
                      ) : (
                        <Building2 className="h-7 w-7 text-white/20" />
                      )}
                    </div>

                    <div className="mt-4 flex-1 space-y-1.5 text-center">
                      <h3 className="font-black uppercase tracking-tight text-white">
                        {exhibitor.business}
                        {exhibitor.contactName && (
                          <span className="ml-1 font-medium italic text-brand-pink">({exhibitor.contactName})</span>
                        )}
                      </h3>
                      {exhibitor.zoneName && (
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                          {exhibitor.zoneName}
                        </p>
                      )}
                      {exhibitor.standNumber && (
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                          Booth No: <span className="text-zinc-300">{exhibitor.standNumber}</span>
                        </p>
                      )}
                      {exhibitor.about && (
                        <p className="line-clamp-2 pt-1 text-xs text-zinc-400">{exhibitor.about}</p>
                      )}
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleBookmark(exhibitor.id)}
                        title={isBookmarked ? "Remove bookmark" : "Bookmark this exhibitor"}
                        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border transition ${
                          isBookmarked
                            ? "border-brand-pink bg-brand-pink/15 text-brand-pink"
                            : "border-white/10 bg-white/5 text-white/50 hover:border-brand-pink/50 hover:text-brand-pink"
                        }`}
                      >
                        <Bookmark className={`h-4 w-4 ${isBookmarked ? "fill-current" : ""}`} />
                      </button>

                      {exhibitor.friendlyUrl ? (
                        <Link
                          href={`/virtual-directory/${exhibitor.friendlyUrl}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-brand-gradient flex-1 rounded-full py-2 text-center text-[11px] font-black uppercase tracking-widest text-white transition hover:scale-[1.02]"
                        >
                          Visit Booth →
                        </Link>
                      ) : (
                        <span className="flex-1 rounded-full border border-white/10 py-2 text-center text-[11px] font-black uppercase tracking-widest text-zinc-500">
                          Booth Coming Soon
                        </span>
                      )}
                    </div>
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
