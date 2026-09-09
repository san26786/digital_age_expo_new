"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarClock, User } from "lucide-react";

import { LobbyActions } from "@/components/virtual-event/LobbyTopBar";
import { DEFAULT_AUDITORIUM_BACKGROUND, DEFAULT_AUDITORIUM_SCREEN } from "@/lib/assets";
import type {
  AuditoriumScene,
  AuditoriumHall,
  AuditoriumSession,
} from "@/lib/services/publicAuditorium";

/**
 * ---------------------------------------------------------------------------
 * An auditorium — /virtual-event/<slug>?zone=<child layout id>
 * ---------------------------------------------------------------------------
 *
 * Reproduces the legacy's own structure for this page: the child layout's artwork as the
 * background, one absolutely-positioned `live_agenda_div` per hall at the percentages stored on
 * its spot, and the `pulsating-circle` markers that walk into each hall.
 *
 * The panels are POSITIONED FROM THE DATA, not laid out on a grid. The Ted Talk room's two
 * screens are 35.83% and 35.73% wide at tops of 2.407% and 2.313% — near-identical but not equal,
 * because someone placed them by hand. Only the stored coordinates put them on the artwork's
 * frame; the grid this component used before could not.
 *
 * `object-fill` on the artwork, as in BoothView and ZoneView: every box is a percentage, so the
 * non-uniform stretch is what keeps the panels on their screens at any window size.
 */

/** Fallback grid columns, used only when no panel spots have been placed. */
const MAX_COLUMNS = 3;

function timeRange(session: AuditoriumSession): string | null {
  if (!session.startsAt) return null;
  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  try {
    return session.endsAt
      ? `${fmt(session.startsAt)} – ${fmt(session.endsAt)}`
      : fmt(session.startsAt);
  } catch {
    return null;
  }
}

/** The contents of one screen: the hall's sessions, or the legacy's empty message. */
function HallScreen({
  hall,
  showSessionName = true,
  showOtherDetail = true,
}: {
  /** Null when the room has a screen here but no agenda row behind it — see AuditoriumPanel. */
  hall: AuditoriumHall | null;
  showSessionName?: boolean;
  showOtherDetail?: boolean;
}) {
  if (!hall || hall.sessions.length === 0) {
    return (
      <div className="grid h-full place-items-center px-4 text-center">
        {/* The legacy's `.live-agenda-empty`, wording included. */}
        <p className="text-[clamp(11px,1.05vw,17px)] font-bold text-brand-purple">
          No sessions scheduled
        </p>
      </div>
    );
  }

  return (
    <ul className="h-full divide-y divide-black/10 overflow-y-auto overscroll-contain">
      {hall.sessions.map((session) => {
        const range = showOtherDetail ? timeRange(session) : null;
        return (
          <li key={session.id} className="px-3 py-2.5">
            {showSessionName && (
              <p className="text-[clamp(11px,0.95vw,15px)] font-bold leading-snug text-[#18181b]">
                {session.title}
              </p>
            )}
            {showOtherDetail && (
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[clamp(9px,0.75vw,12px)] font-semibold text-[#52525b]">
                {range && (
                  <span className="inline-flex items-center gap-1">
                    <CalendarClock className="h-3 w-3 shrink-0" />
                    {range}
                  </span>
                )}
                {session.speakerName && (
                  <span className="inline-flex items-center gap-1">
                    <User className="h-3 w-3 shrink-0" />
                    {session.speakerName}
                  </span>
                )}
              </div>
            )}
            {session.videoLink && (
              <a
                href={session.videoLink}
                target="_blank"
                rel="noreferrer"
                className="mt-1.5 inline-block text-[clamp(9px,0.75vw,12px)] font-bold text-brand-purple underline decoration-brand-purple/40 hover:decoration-brand-purple"
              >
                Join session
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}

const SCREEN_SURFACE =
  "overflow-hidden rounded-xl bg-[#eceef0] shadow-[0_2px_10px_rgba(0,0,0,0.18)]";

export function AuditoriumView({
  scene,
  eventSlug,
  eventTitle,
}: {
  scene: AuditoriumScene;
  eventSlug: string;
  eventTitle: string;
}) {
  const [broken, setBroken] = useState(false);

  /*
   * Every read off `scene` is defaulted. This prop arrives as an RSC payload that can be a
   * version behind this component — a hot update swaps the client chunk while the page still
   * holds an older payload — and reading straight through took the whole route down once already.
   * A stale payload should cost accuracy, never the page.
   */
  const panels = scene?.panels ?? [];
  const markers = scene?.markers ?? [];
  const fallbackHalls = scene?.fallbackHalls ?? [];
  const SCREEN = scene?.screen ?? DEFAULT_AUDITORIUM_SCREEN;
  const ownArtwork =
    !broken && scene?.backgroundIsFallback === false ? scene.backgroundUrl : null;

  return (
    <>
      {/* ------------------------------------------------------------ room artwork */}
      <div
        className="absolute inset-0 bg-zinc-950"
        style={{
          backgroundImage: `url(${
            scene?.backgroundIsFallback && scene.backgroundUrl
              ? scene.backgroundUrl
              : DEFAULT_AUDITORIUM_BACKGROUND
          })`,
          backgroundSize: "100% 100%",
          backgroundRepeat: "no-repeat",
        }}
      >
        {ownArtwork && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ownArtwork}
            alt=""
            aria-hidden
            className="h-full w-full object-fill"
            onError={() => setBroken(true)}
            ref={(el) => {
              // A server-rendered <img> can fail before React attaches onError, and React never
              // replays the event; this is the DOM's own record that it produced nothing.
              if (el && el.complete && el.naturalWidth === 0) setBroken(true);
            }}
          />
        )}
      </div>

      {/* --------------------------------------------- screens, placed from the spots */}
      {panels.map((panel) => (
        <section
          key={panel.spotId}
          /* The artwork's baked-in caption sits directly under this screen and names it, so the
             label is only a fallback for when there is a hall row to name it with. */
          aria-label={panel.hall?.title ?? "Session screen"}
          className={`absolute z-10 ${SCREEN_SURFACE}`}
          style={{
            left: `${panel.box.x}%`,
            top: `${panel.box.y}%`,
            width: `${panel.box.width}%`,
            height: `${panel.box.height}%`,
            transform: panel.box.angle ? `rotate(${panel.box.angle}rad)` : undefined,
          }}
        >
          {/* No visible heading: the artwork's baked-in caption sits directly under this panel,
              which is correct here because the panel is placed against that very frame. */}
          <HallScreen
            hall={panel.hall}
            showSessionName={panel.showSessionName}
            showOtherDetail={panel.showOtherDetail}
          />
        </section>
      ))}

      {/* ------------------------------------- fallback grid: no spots placed for this layout */}
      {panels.length === 0 && fallbackHalls.length > 0 && (
        <div
          className="absolute z-10 grid gap-[1.4%] overflow-y-auto overscroll-contain"
          style={{
            left: `${SCREEN.left}%`,
            top: `${SCREEN.top}%`,
            width: `${SCREEN.width}%`,
            height: `${SCREEN.height}%`,
            gridTemplateColumns: `repeat(${Math.max(
              1,
              Math.min(fallbackHalls.length, MAX_COLUMNS)
            )}, minmax(0, 1fr))`,
          }}
        >
          {fallbackHalls.map((hall) => (
            <section key={hall.id} aria-label={hall.title} className={`flex flex-col ${SCREEN_SURFACE}`}>
              <div className="min-h-0 flex-1">
                <HallScreen hall={hall} />
              </div>
              {/* Named here because this grid covers the artwork's caption rail — without its own
                  label the screen would sit over a caption naming a different hall. */}
              <p className="shrink-0 truncate border-t border-black/10 bg-[#e2e5e8] px-3 py-1.5 text-center text-[clamp(10px,1vw,16px)] font-extrabold text-[#18181b]">
                {hall.title}
              </p>
            </section>
          ))}
        </div>
      )}

      {/* ------------------------------------------------------------ pulsating markers */}
      {markers.map((marker) => {
        const dot = (
          <span
            className="block h-3.5 w-3.5 rounded-full ring-2 ring-white/70"
            style={{ backgroundColor: marker.color || "#ff0000" }}
          />
        );
        const position = {
          left: `${marker.x}%`,
          top: `${marker.y}%`,
          transform: "translate(-50%, -50%)",
        } as const;

        // A marker with no destination is a decoration, not a door — rendering it as a link
        // would promise a page that does not exist.
        return marker.targetLayoutId ? (
          <Link
            key={marker.spotId}
            href={`/virtual-event/${eventSlug}?zone=${marker.targetLayoutId}`}
            title={marker.title || "Enter"}
            aria-label={marker.title || "Enter this hall"}
            className="absolute z-20 animate-pulse-glow"
            style={position}
          >
            {dot}
          </Link>
        ) : (
          <span key={marker.spotId} className="absolute z-20" style={position} aria-hidden>
            {dot}
          </span>
        );
      })}

      {/* ------------------------------------------------------------ chrome */}
      <div className="absolute left-4 top-4 z-30">
        <Link
          href={`/virtual-event/${eventSlug}`}
          className="flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-bold text-zinc-900 shadow-lg transition hover:bg-white hover:text-brand-pink"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </div>

      <div className="absolute right-4 top-4 z-30">
        <LobbyActions eventTitle={eventTitle} />
      </div>
    </>
  );
}
