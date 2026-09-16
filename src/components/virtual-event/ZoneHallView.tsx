import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import type { ExhibitionZoneScene } from "@/lib/services/publicExhibitionZone";

/**
 * ===========================================================================
 *  ONE EXHIBITION ZONE, DRAWN THE WAY THE LIVE HALL DRAWS IT
 * ===========================================================================
 *
 *  The legacy markup this mirrors, per booth:
 *
 *    <div class="ex-stand-div" data-toggle="tooltip"
 *         data-original-title="VISIT Loomie London (Booth No. 31039)"
 *         style="left:calc(6.88%); top:calc(23.43%); height:5.20%; width:8.12%">
 *      <img src=".../exhibitor_stand_logos/ex_154762.png">
 *      <div class="anchor"></div>
 *    </div>
 *
 *  Three things follow from that, and they are the whole design:
 *
 *    1. A booth's only permanent furniture is its SIGN and a small red dot — the `.anchor`.
 *       The "VISIT <business> (Booth No. n)" text is a TOOLTIP, shown on hover. An earlier pass
 *       here printed that text on a pink pill under every stand: twenty-two of them at once
 *       turned the floor into a wall of labels and hid the artwork the halls exist to show.
 *    2. Position is the spot's own percentage box, rotation included — never a grid of ours.
 *    3. The zone's name sits in a slim bar on the right (`.right-side-bar > .stand-zone-info`),
 *       not in a heading above the room.
 *
 *  No hooks: hover is CSS throughout, so this renders on the server inside the lobby route.
 */
export function ZoneHallView({
  scene,
  eventSlug,
}: {
  scene: ExhibitionZoneScene;
  eventSlug: string;
}) {
  const lobbyHref = `/virtual-event/${eventSlug}`;
  const placed = scene.stands.filter((s) => s.box);
  const listedOnly = scene.stands.filter((s) => !s.box);

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-zinc-950">
      {/*
        * The hall is a 16:9 render and the booths are percentages OF THAT RENDER, so the artwork
        * and the stands have to be the same box. Painting the background on the full-height
        * wrapper instead (as this did at first) lets `cover` crop and re-centre it independently
        * of the frame the stands are positioned in: on any window that is not 16:9 the whole
        * floor slides off its own booths.
        *
        * `containerType` additionally makes every booth-scale size below resolve against the ROOM
        * rather than the window, so a dot stays a dot at any width.
        *
        * A CSS background rather than <img>: it cannot show a broken-image icon if the artwork is
        * missing, the same choice the auditorium view makes for the same reason.
        */}
      <div
        className="relative aspect-video w-full max-w-[1920px] bg-cover bg-center"
        style={{
          containerType: "size",
          backgroundImage: scene.backgroundUrl ? `url(${scene.backgroundUrl})` : undefined,
        }}
      >
        <Link
          href={lobbyHref}
          className="absolute left-4 top-4 z-40 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-black uppercase tracking-widest text-zinc-900 shadow-lg transition hover:bg-zinc-100 sm:left-6 sm:top-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        {/* The right-side bar. */}
        <div className="absolute right-0 top-4 z-40 rounded-l-xl bg-zinc-900/85 py-2.5 pl-5 pr-4 text-right backdrop-blur sm:top-6">
          <p className="text-sm font-black uppercase tracking-wide text-white">{scene.title}</p>
          <p className="text-[11px] font-semibold text-zinc-400">
            {scene.stands.length} {scene.stands.length === 1 ? "stand" : "stands"}
            {scene.totalZones > 1 && scene.position > 0
              ? ` · zone ${scene.position} of ${scene.totalZones}`
              : ""}
          </p>
        </div>

        {/*
          * Walk the floor. The legacy carousel puts a bare chevron halfway down each edge with
          * nothing behind it — the artwork is the point and a heavy button competes with it. The
          * hall each one leads to is named on hover, which the legacy never told you.
          */}
        {scene.previous && (
          <Link
            href={`${lobbyHref}?zone=${scene.previous.id}`}
            title={`Previous: ${scene.previous.title}`}
            aria-label={`Previous zone: ${scene.previous.title}`}
            className="group/nav absolute left-0 top-1/2 z-40 flex h-28 -translate-y-1/2 items-center pl-1 pr-4"
          >
            <ChevronLeft
              className="h-10 w-10 text-white/70 drop-shadow-[0_2px_6px_rgba(0,0,0,0.65)] transition group-hover/nav:scale-110 group-hover/nav:text-white"
              strokeWidth={2.5}
            />
            <span className="pointer-events-none ml-1 hidden max-w-[36vw] truncate rounded-full bg-zinc-900/90 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white backdrop-blur group-hover/nav:block">
              {scene.previous.title}
            </span>
          </Link>
        )}

        {scene.next && (
          <Link
            href={`${lobbyHref}?zone=${scene.next.id}`}
            title={`Next: ${scene.next.title}`}
            aria-label={`Next zone: ${scene.next.title}`}
            className="group/nav absolute right-0 top-1/2 z-40 flex h-28 -translate-y-1/2 flex-row-reverse items-center pl-4 pr-1"
          >
            <ChevronRight
              className="h-10 w-10 text-white/70 drop-shadow-[0_2px_6px_rgba(0,0,0,0.65)] transition group-hover/nav:scale-110 group-hover/nav:text-white"
              strokeWidth={2.5}
            />
            <span className="pointer-events-none mr-1 hidden max-w-[36vw] truncate rounded-full bg-zinc-900/90 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white backdrop-blur group-hover/nav:block">
              {scene.next.title}
            </span>
          </Link>
        )}

        {placed.map((stand) => {
          const box = stand.box!;
          const href = stand.exhibitorId
            ? `${lobbyHref}?mybooth=1&ex_id=${stand.exhibitorId}`
            : lobbyHref;
          const label = stand.standNumber
            ? `VISIT ${stand.business} (Booth No. ${stand.standNumber})`
            : `VISIT ${stand.business}`;
          const sign = stand.artworkUrl || stand.logoUrl;

          return (
            <Link
              key={stand.key}
              href={href}
              title={label}
              aria-label={label}
              className="group absolute z-20 hover:z-30"
              style={{
                left: `${box.x}%`,
                top: `${box.y}%`,
                width: `${box.width}%`,
                height: `${box.height}%`,
                transform: box.angle ? `rotate(${box.angle}rad)` : undefined,
              }}
            >
              {sign ? (
                // eslint-disable-next-line @next/next/no-img-element -- exhibitor-supplied artwork
                // of arbitrary origin, positioned by the organiser's own coordinates.
                //
                // object-fill, not object-contain: the box IS the sign face the render draws, and
                // the legacy stretches its image across it. Contain letterboxes a banner whose
                // aspect differs by a hair and the sign floats off its own panel.
                <img
                  src={sign}
                  alt={stand.business}
                  className="h-full w-full object-fill transition-[filter] duration-200 group-hover:brightness-110"
                  loading="lazy"
                />
              ) : (
                // No banner and no logo — the panel still has to say whose stand it is, or the
                // booth reads as empty when it is not.
                <span
                  className="flex h-full w-full items-center justify-center overflow-hidden bg-white/95 px-[4%] text-center font-black uppercase leading-tight tracking-tight text-zinc-800"
                  style={{ fontSize: "clamp(6px, 0.62cqw, 15px)" }}
                >
                  {stand.business}
                </span>
              )}

              {/* The anchor: the legacy's red dot, and the only permanent marker on a booth. */}
              <span
                className="pointer-events-none absolute rounded-full bg-[#e8142d] ring-2 ring-white/70 transition group-hover:scale-125"
                style={{
                  left: "clamp(-9px, -0.42cqw, -3px)",
                  top: "clamp(-9px, -0.42cqw, -3px)",
                  height: "clamp(6px, 0.84cqw, 20px)",
                  width: "clamp(6px, 0.84cqw, 20px)",
                }}
                aria-hidden
              />

              {/* The tooltip. Hidden until hover, exactly as data-toggle="tooltip" behaves. */}
              <span
                className="pointer-events-none absolute left-1/2 top-full z-50 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-black/90 font-semibold uppercase tracking-wide text-white shadow-xl group-hover:block"
                style={{
                  marginTop: "clamp(3px, 0.4cqw, 9px)",
                  paddingInline: "clamp(5px, 0.6cqw, 14px)",
                  paddingBlock: "clamp(2px, 0.25cqw, 6px)",
                  fontSize: "clamp(7px, 0.55cqw, 13px)",
                }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>

      {listedOnly.length > 0 && (
        // More exhibitors than the hall has panels — visible rather than lost.
        <div className="relative z-30 mx-auto w-[min(92vw,1100px)] pb-10">
          <div className="rounded-2xl bg-black/70 p-4 backdrop-blur">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-brand-pink">
              Also in this zone
            </p>
            <div className="flex flex-wrap gap-2">
              {listedOnly.map((stand) => (
                <Link
                  key={stand.key}
                  href={
                    stand.exhibitorId
                      ? `${lobbyHref}?mybooth=1&ex_id=${stand.exhibitorId}`
                      : lobbyHref
                  }
                  className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:border-brand-pink hover:text-brand-pink"
                >
                  {stand.business}
                  {stand.standNumber ? ` · ${stand.standNumber}` : ""}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
