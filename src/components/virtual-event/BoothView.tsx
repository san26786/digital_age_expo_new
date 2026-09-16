"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Gift,
  Share2,
  Info,
  Circle,
  X,
  Check,
  Mail,
  Phone,
  MessageSquare,
  User,
  Users,
  CalendarDays,
} from "lucide-react";

import { LobbyActions } from "@/components/virtual-event/LobbyTopBar";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { BoothChatPanel } from "@/components/virtual-event/BoothChatPanel";
import { BoothMeetingModal } from "@/components/virtual-event/BoothMeetingModal";

export interface BoothSpot {
  id: number;
  title: string | null;
  /** Percentage box against the stand artwork. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Artwork to paint in the box, when the spot has any. */
  src?: string;
  /** A video slot (e.g. the Basic Stand's wall screen) renders a looping <video>, not an <img>. */
  isVideo?: boolean;
  /** True for the interactive tiles (Schedule a Meeting, Video Call, Chat, Sales Team, screens). */
  interactive?: boolean;
  /** WHICH interactive tile, so a click can do the right thing rather than only show a marker. */
  action?: "sales" | "meeting" | "video" | "chat";
}

/** The person on the stand, shown by the Sales Team tile. */
export interface BoothContact {
  name: string | null;
  position?: string | null;
  email: string | null;
  phone: string | null;
  avatarUrl?: string | null;
}

export interface BoothNeighbour {
  id: number;
  business: string;
}

/**
 * The exhibitor booth scene, i.e. `/virtual-event/<slug>?mybooth=1&ex_id=<id>`.
 *
 * Deliberately the same chrome as the lobby it replaces — the footer nav is rendered by the page
 * around this component, and the top-right actions come from LobbyActions so the booth and the
 * lobby can never drift apart. What this adds is the stand artwork itself, the red hotspot dots
 * over the interactive tiles, and the right-hand rail (browse previous/next booth, this booth's
 * own actions, presence).
 *
 * The stand fills the viewport with `object-fill` rather than `contain` or `cover`: the reference
 * booth stretches its artwork edge to edge, and every hotspot is positioned in percentages, so a
 * non-uniform scale keeps them on their tiles at any window size.
 */
export function BoothView({
  eventSlug,
  eventTitle,
  business,
  zoneName,
  standNumber,
  standImageUrl,
  spots,
  previousBooth,
  nextBooth,
  boothUrl,
  dealsUrl,
  contact,
  exhibitorId,
}: {
  eventSlug: string;
  eventTitle: string;
  business: string;
  zoneName?: string | null;
  standNumber?: string | null;
  standImageUrl?: string;
  spots: BoothSpot[];
  previousBooth?: BoothNeighbour | null;
  nextBooth?: BoothNeighbour | null;
  /** Absolute-path booth link used by "Share booth". */
  boothUrl: string;
  /** "Deals & offers" target, when the exhibitor has a website. */
  dealsUrl?: string | null;
  /** The stand's registered contact, for the Sales Team card. */
  contact?: BoothContact | null;
  /** Who a chat message is addressed to. */
  exhibitorId: number;
}) {
  const [railOpen, setRailOpen] = useState(true);
  const [available, setAvailable] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [salesOpen, setSalesOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  async function handleShare() {
    const url = typeof window !== "undefined" ? `${window.location.origin}${boothUrl}` : boothUrl;
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    } catch {
      window.prompt("Copy this booth's link:", url);
    }
  }

  /*
   * NOTE ON COLOURS: this project's globals.css `@theme` REDEFINES the zinc scale for a dark UI —
   * `--color-zinc-800` is `rgba(255,255,255,0.07)`, i.e. white at 7% opacity, not dark grey. Only
   * zinc-950/900 are actually dark and zinc-200/100 actually light; everything between is
   * translucent white. So `text-zinc-800` on a white pill renders invisible text, which is exactly
   * what happened here. Dark text on a light surface must use zinc-900 (#0a0614).
   */
  const railButton =
    "flex w-full items-center gap-2.5 rounded-lg bg-white/95 px-3.5 py-2.5 text-left text-[13px] font-semibold text-zinc-900 shadow-md transition hover:bg-white hover:text-brand-pink";

  return (
    <>
      {/* ---------------------------------------------------------- stand artwork */}
      <div className="absolute inset-0">
        {standImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={standImageUrl}
            alt={`${business} stand`}
            className="h-full w-full object-fill"
          />
        ) : (
          <div className="main-glow-bg h-full w-full" />
        )}

        {/* Uploaded artwork — the six banner slots plus whatever the DB hotspots carry. */}
        {spots
          .filter((spot) => spot.src)
          .map((spot) => {
            const style = {
              left: `${spot.x}%`,
              top: `${spot.y}%`,
              width: `${spot.width}%`,
              height: `${spot.height}%`,
            };
            return spot.isVideo ? (
              <video
                key={`art-${spot.id}`}
                src={spot.src}
                className="absolute object-cover"
                style={style}
                autoPlay
                muted
                loop
                playsInline
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`art-${spot.id}`}
                src={spot.src}
                alt={spot.title || "Stand artwork"}
                className="absolute object-fill"
                style={style}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            );
          })}

        {/* Red pulsing markers over the interactive tiles, as on the reference booth. Centred in
            their box so the dot lands on the tile art rather than in its corner. */}
        {spots
          .filter((spot) => spot.interactive)
          .map((spot) => {
            const box = {
              left: `${spot.x}%`,
              top: `${spot.y}%`,
              width: `${spot.width}%`,
              height: `${spot.height}%`,
            };
            const dot = (
              <span className="relative flex h-4 w-4">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500/70" />
                <span className="relative inline-flex h-4 w-4 rounded-full bg-red-500 shadow-lg" />
              </span>
            );

            /*
             * The whole tile is the hit area, not just the dot. A visitor aims at the "SALES
             * TEAM" artwork because that is what reads as the button; a 16px dot in the middle
             * of it is a marker, not a target.
             */
            if (spot.action === "sales" || spot.action === "chat" || spot.action === "meeting") {
              const fallbackLabel =
                spot.action === "chat"
                  ? "Chat"
                  : spot.action === "meeting"
                    ? "Schedule a Meeting"
                    : "Sales Team";
              const open = () => {
                if (spot.action === "chat") setChatOpen(true);
                else if (spot.action === "meeting") setMeetingOpen(true);
                else setSalesOpen(true);
              };
              return (
                <button
                  key={`dot-${spot.id}`}
                  type="button"
                  onClick={open}
                  title={spot.title || fallbackLabel}
                  aria-label={`${spot.title || fallbackLabel} — ${business}`}
                  className="absolute z-10 flex cursor-pointer items-center justify-center rounded-lg ring-white/0 transition hover:bg-white/10 hover:ring-2 hover:ring-white/60"
                  style={box}
                >
                  {dot}
                </button>
              );
            }

            return (
              <span
                key={`dot-${spot.id}`}
                title={spot.title || undefined}
                className="absolute flex items-center justify-center"
                style={box}
              >
                {dot}
              </span>
            );
          })}
      </div>

      {/* ------------------------------------------------------------- top chrome */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between px-4 py-3 sm:px-6">
        <Link
          href={`/virtual-event/${eventSlug}`}
          className="pointer-events-auto flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-xs font-bold uppercase tracking-wide text-zinc-900 shadow-lg transition hover:text-brand-pink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Link>

        <LobbyActions eventTitle={eventTitle} />
      </div>

      {/* -------------------------------------------------------- right-hand rail */}
      <div className="absolute right-0 top-1/2 z-30 flex -translate-y-1/2 items-start gap-0">
        <button
          type="button"
          onClick={() => setRailOpen((v) => !v)}
          aria-label={railOpen ? "Hide booth menu" : "Show booth menu"}
          className="mt-6 flex h-9 w-7 items-center justify-center rounded-l-lg bg-white/95 text-zinc-900 shadow-lg transition hover:text-brand-pink"
        >
          {railOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>

        {railOpen && (
          <div className="w-60 space-y-2 pr-3">
            {/* Zone + booth number badge */}
            <div className="rounded-lg bg-zinc-900/95 px-3.5 py-2 text-white shadow-lg backdrop-blur-sm">
              <p className="text-[13px] font-bold leading-tight">{zoneName || business}</p>
              <p className="text-[11px] text-white/70">Booth no. {standNumber || "—"}</p>
            </div>

            <p className="px-1 pt-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
              Browse
            </p>
            {previousBooth ? (
              <Link
                href={`/virtual-event/${eventSlug}?mybooth=1&ex_id=${previousBooth.id}`}
                className={railButton}
                title={previousBooth.business}
              >
                <ArrowLeft className="h-4 w-4 shrink-0 text-brand-pink" />
                Previous booth
              </Link>
            ) : (
              <span className={`${railButton} cursor-not-allowed opacity-50`}>
                <ArrowLeft className="h-4 w-4 shrink-0" />
                Previous booth
              </span>
            )}
            {nextBooth ? (
              <Link
                href={`/virtual-event/${eventSlug}?mybooth=1&ex_id=${nextBooth.id}`}
                className={railButton}
                title={nextBooth.business}
              >
                <ArrowRight className="h-4 w-4 shrink-0 text-brand-pink" />
                Next booth
              </Link>
            ) : (
              <span className={`${railButton} cursor-not-allowed opacity-50`}>
                <ArrowRight className="h-4 w-4 shrink-0" />
                Next booth
              </span>
            )}

            <p className="px-1 pt-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
              This booth
            </p>
            {dealsUrl ? (
              <a href={dealsUrl} target="_blank" rel="noreferrer" className={railButton}>
                <Gift className="h-4 w-4 shrink-0 text-brand-pink" />
                Deals &amp; offers
              </a>
            ) : (
              <span
                className={`${railButton} cursor-not-allowed opacity-50`}
                title="This exhibitor has not published any offers"
              >
                <Gift className="h-4 w-4 shrink-0" />
                Deals &amp; offers
              </span>
            )}
            <button type="button" onClick={handleShare} className={railButton}>
              {shareCopied ? (
                <Check className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <Share2 className="h-4 w-4 shrink-0 text-brand-pink" />
              )}
              {shareCopied ? "Link copied" : "Share booth"}
            </button>
            {/* Also in the rail, not only on the artwork: a stand whose template has no Sales
                tile would otherwise hide its contact entirely. */}
            <button type="button" onClick={() => setMeetingOpen(true)} className={railButton}>
              <CalendarDays className="h-4 w-4 shrink-0 text-brand-pink" />
              Schedule a meeting
            </button>
            <button type="button" onClick={() => setChatOpen(true)} className={railButton}>
              <MessageSquare className="h-4 w-4 shrink-0 text-brand-pink" />
              Chat
            </button>
            <button type="button" onClick={() => setSalesOpen(true)} className={railButton}>
              <Users className="h-4 w-4 shrink-0 text-brand-pink" />
              Sales team
            </button>
            <button type="button" onClick={() => setTourOpen(true)} className={railButton}>
              <Info className="h-4 w-4 shrink-0 text-brand-pink" />
              Booth tour
            </button>

            {/* Presence toggle — the reference rail's "Away" pill. */}
            <button
              type="button"
              onClick={() => setAvailable((v) => !v)}
              className="flex w-full items-center gap-2.5 rounded-lg bg-zinc-900/95 px-3.5 py-2.5 text-left text-[13px] font-semibold text-white shadow-md backdrop-blur-sm transition hover:bg-zinc-900"
            >
              <Circle
                className={`h-3 w-3 shrink-0 ${
                  available ? "fill-emerald-400 text-emerald-400" : "fill-sky-400 text-sky-400"
                }`}
              />
              {available ? "Available" : "Away"}
            </button>
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------- meeting modal */}
      {meetingOpen && (
        <BoothMeetingModal
          exhibitorId={exhibitorId}
          business={business}
          onClose={() => setMeetingOpen(false)}
        />
      )}

      {/* -------------------------------------------------------------- chat panel */}
      {chatOpen && (
        <BoothChatPanel
          exhibitorId={exhibitorId}
          business={business}
          onClose={() => setChatOpen(false)}
        />
      )}

      {/* -------------------------------------------------------- sales team modal */}
      {salesOpen && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => setSalesOpen(false)}
          >
            {/*
              * Light, not the dark glass the rest of the booth chrome uses: this card is the
              * legacy's own Sales Team dialog and visitors recognise it by that white sheet.
              */}
            <div
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Sales Team"
              className="w-full max-w-xl overflow-hidden rounded-2xl bg-white text-zinc-900 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4 px-6 pt-5">
                <h2 className="border-b-2 border-brand-pink pb-2 text-xl font-bold">Sales Team</h2>
                <button
                  type="button"
                  onClick={() => setSalesOpen(false)}
                  aria-label="Close"
                  className="-mt-1 flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-900"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="border-t border-zinc-200" />

              <div className="px-6 py-8">
                {contact && (contact.name || contact.email || contact.phone) ? (
                  <div className="mx-auto max-w-sm rounded-xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
                    <span className="mx-auto mb-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-brand-pink bg-white">
                      {contact.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={contact.avatarUrl}
                          alt={contact.name || business}
                          className="h-full w-full object-contain p-2"
                        />
                      ) : (
                        <User className="h-10 w-10 text-zinc-400" />
                      )}
                    </span>

                    <p className="text-lg font-bold text-zinc-900">{contact.name || business}</p>
                    {contact.position && (
                      <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        {contact.position}
                      </p>
                    )}

                    <div className="mt-4 space-y-2 text-sm">
                      {contact.email && (
                        <a
                          href={`mailto:${contact.email}`}
                          className="flex items-center justify-center gap-2 text-zinc-700 transition hover:text-brand-pink"
                        >
                          <Mail className="h-4 w-4 shrink-0 text-brand-pink" />
                          <span className="break-all">{contact.email}</span>
                        </a>
                      )}
                      {contact.phone && (
                        <a
                          href={`tel:${contact.phone.replace(/[^+\d]/g, "")}`}
                          className="flex items-center justify-center gap-2 text-zinc-700 transition hover:text-brand-pink"
                        >
                          <Phone className="h-4 w-4 shrink-0 text-brand-pink" />
                          <span>{contact.phone}</span>
                        </a>
                      )}
                    </div>

                    {/* Opens the stand's own chat panel, the same one the CHAT tile opens —
                        the card closes behind it so the thread is not buried under a dialog. */}
                    <button
                      type="button"
                      onClick={() => {
                        setSalesOpen(false);
                        setChatOpen(true);
                      }}
                      className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-pink px-4 py-3 text-sm font-bold text-white transition hover:opacity-90"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Chat
                    </button>
                  </div>
                ) : (
                  // Said plainly rather than shown as an empty card: the stand has no contact on
                  // file, which is a thing the organiser can fix, not a rendering fault.
                  <p className="py-6 text-center text-sm text-zinc-500">
                    {business} has not published a sales contact yet.
                  </p>
                )}
              </div>

              <div className="flex justify-end border-t border-zinc-200 bg-zinc-50 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setSalesOpen(false)}
                  className="rounded-lg border border-zinc-300 bg-white px-5 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* --------------------------------------------------------- booth tour modal */}
      {tourOpen && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-black/80 p-4 backdrop-blur-sm"
            onClick={() => setTourOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="glass-panel w-full max-w-lg space-y-4 rounded-3xl border border-white/15 p-6 text-white shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-lg font-black uppercase tracking-tight">Booth tour</h2>
                  <p className="text-xs text-zinc-400">{business}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setTourOpen(false)}
                  aria-label="Close"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <ul className="space-y-3 text-sm text-zinc-300">
                <li className="flex gap-3">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                  The red markers on the stand are the interactive points — schedule a meeting,
                  start a video call, open a chat, or meet the sales team.
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                  Banners and screens carry the exhibitor&apos;s own artwork and literature.
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                  Use Previous / Next booth in the side menu to walk the aisle, or the footer&apos;s
                  Exhibitor List to jump straight to a company.
                </li>
              </ul>

              <p className="border-t border-white/10 pt-4 text-[11px] font-medium text-zinc-500">
                {zoneName ? `${zoneName} · ` : ""}Booth no. {standNumber || "—"}
              </p>
            </div>
          </div>
        </ModalPortal>
      )}
    </>
  );
}
