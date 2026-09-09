import { prisma } from "@/lib/prisma";
import {
  assetUrl,
  standTemplateUrl,
  hallArtworkFor,
  DEFAULT_AUDITORIUM_SCREEN,
  DEFAULT_AUDITORIUM_BACKGROUND,
} from "@/lib/assets";
import { existingPublicFile } from "@/lib/publicFile";
import { spotGeometry, type SpotBox } from "@/lib/spotGeometry";

/**
 * ---------------------------------------------------------------------------
 * One auditorium — /virtual-event/<slug>?zone=<child layout id>
 * ---------------------------------------------------------------------------
 *
 * Ported against the legacy's own markup for Ted Talk Hall (child_lobby_2732, "Ted Talk &
 * Business Presentation Hall"), which settles how this page is really built:
 *
 *   <div class="bg"><img src=".../files/lobby/child/event_1470.png"></div>
 *   <div class="live_agenda_div" data-spotid="62055" data-agendaid="123"
 *        style="left:13.09817589124%; top:2.4074077606201%; width:35.833334922791%; height:35.138889595314%">
 *   <div class="live_agenda_div" data-spotid="62056" data-agendaid="126" style="left:51.484372615814%; ...">
 *   <div class="pulsating-circle" data-spotid="48130" data-postactionid="2768" data-postactiontype="layout"
 *        style="left:calc(29.609375198682%); top:calc(43.055555555556%)">
 *
 * Three things follow, and the first version of this file got all three wrong:
 *
 *  1. THE PANELS ARE SPOTS. Each screen is a `find_event_lobby_spots` row whose `agenda_id` names
 *     the hall, positioned by its own stored percentages. They are NOT a hardcoded box: the two
 *     panels here are 35.83% and 35.73% wide and sit at slightly different tops (2.407% vs
 *     2.313%), because an organiser dragged them there in Lobby Spots. A fixed grid can only ever
 *     be right for one render.
 *
 *  2. ONE LAYOUT CARRIES BOTH HALLS. Layout 2732 is titled "Ted Talk & Business Presentation
 *     Hall" and holds two agenda panels, so the halls come from the SPOTS' agenda ids rather than
 *     from every agenda that happens to share the layout.
 *
 *  3. THE BACKGROUND IS THE LAYOUT'S OWN IMAGE — event_1470.png, already mirrored in this repo.
 *     The named rooms (ted_talk / keynote_speaker / seminar_hall / live_workshop) are the
 *     FALLBACK for a layout with no artwork, not the first choice.
 *
 * The red pulsating dots are separate spots with `post_action_type = "layout"`, pointing at the
 * individual hall layouts (2768, 2776) — they are how the visitor walks from the pair of screens
 * into one hall, so they are rendered as real links.
 */

export interface AuditoriumSession {
  id: number;
  title: string;
  speakerName: string | null;
  /** ISO — formatted client-side, so the server emits no locale-dependent strings. */
  startsAt: string | null;
  endsAt: string | null;
  videoLink: string | null;
}

export interface AuditoriumHall {
  id: number;
  title: string;
  sessions: AuditoriumSession[];
  joinLink: string | null;
}

/** One `live_agenda_div` — a hall's screen, at the position the organiser placed it. */
export interface AuditoriumPanel {
  spotId: number;
  box: SpotBox;
  /**
   * NULL when the room has a known screen position but no agenda row behind it.
   *
   * This is the normal state on this database: the live site's spots carry agenda ids 123 and 126,
   * but those links did not survive the migration, so the screens exist and the halls do not. The
   * screen still has to be drawn — the artwork's baked caption names it, and the panel says "No
   * sessions scheduled", which is exactly what the live site shows.
   */
  hall: AuditoriumHall | null;
  /** The legacy's own per-spot display switches. */
  showSessionName: boolean;
  showOtherDetail: boolean;
}

/** One `pulsating-circle` — a marker that walks into a hall. */
export interface AuditoriumMarker {
  spotId: number;
  x: number;
  y: number;
  title: string | null;
  /** Where it goes; null when the spot names no destination. */
  targetLayoutId: number | null;
  color: string | null;
}

export interface AuditoriumScene {
  id: number;
  title: string;
  backgroundUrl: string;
  backgroundIsFallback: boolean;
  /** Positioned panels from the spots. Empty when this layout has none placed yet. */
  panels: AuditoriumPanel[];
  markers: AuditoriumMarker[];
  /**
   * Used ONLY when `panels` is empty: the halls attached to this layout, laid out on the measured
   * fallback grid so an event whose spots were never positioned still shows its screens.
   */
  fallbackHalls: AuditoriumHall[];
  screen?: { left: number; top: number; width: number; height: number };
}

function iso(value: Date | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** The legacy's own panel size, used when a spot carries no dimensions of its own. */
const PANEL_FALLBACK_WIDTH = 35.83;
const PANEL_FALLBACK_HEIGHT = 35.14;

export async function getAuditoriumScene(
  eventId: number,
  layoutId: number
): Promise<AuditoriumScene | null> {
  /*
   * Matched by EXCLUSION rather than by requiring the type to say "auditorium": the legacy's
   * layout_type values are neither consistently cased nor consistently spelled, and the two types
   * that genuinely have their own renderers are the only ones to keep out. A menu entry naming a
   * real child layout should never dead-end at the lobby.
   */
  const layout = await prisma.find_event_lobby_child_layout_manager.findFirst({
    where: {
      id: layoutId,
      event_id: eventId,
      NOT: { layout_type: { in: ["exhibition", "exhibition_stand"] } },
    },
    select: { id: true, title: true, image: true },
  });
  if (!layout) return null;

  /*
   * Relaxed the same way getAuditoriumChildLobby is.
   *
   * Migrated spot rows routinely carry event_id 0 and populate `layout_child_id` rather than
   * `event_layout_child_id` — the same gap that left lobby rows unstamped elsewhere in this
   * project. Requiring both exact columns is why no agenda panels were found for this layout.
   */
  const spots = await prisma.find_event_lobby_spots.findMany({
    where: {
      AND: [
        { OR: [{ event_id: eventId }, { event_id: 0 }] },
        { OR: [{ event_layout_child_id: layoutId }, { layout_child_id: layoutId }] },
      ],
    },
    orderBy: { id: "asc" },
    select: {
      id: true,
      title: true,
      agenda_id: true,
      spot_type: true,
      spot_color: true,
      show_session_name: true,
      show_other_dtl: true,
      post_action_type: true,
      event_post_redirection_path_layout: true,
      post_redirection_path_layout: true,
      x_coordinates: true,
      y_coordinates: true,
      width: true,
      height: true,
      block_width: true,
      block_height: true,
      dimension: true,
    },
  });

  const agendaSpots = (spots as any[]).filter((s) => s.agenda_id);
  const agendaIds = [...new Set(agendaSpots.map((s) => s.agenda_id as number))];

  /*
   * Halls: the spots' agenda ids when panels are placed, otherwise every agenda on this layout.
   * The distinction matters — layout 2732 holds two of the event's agendas, so taking "every
   * agenda with this event_layout_id" would be right here but wrong on a layout that shares its
   * id with halls it does not display.
   */
  const halls = await prisma.find_event_lobby_agenda.findMany({
    where: {
      event_id: eventId,
      status: { not: "disabled" },
      ...(agendaIds.length > 0 ? { id: { in: agendaIds } } : { event_layout_id: layoutId }),
    },
    orderBy: { id: "asc" },
    select: { id: true, title: true, zoom_link: true, path: true },
  });

  const items = halls.length
    ? await prisma.find_event_lobby_agenda_items.findMany({
        where: {
          event_id: eventId,
          agenda_id: { in: halls.map((h: any) => h.id) },
          status: "active",
        },
        orderBy: { start_date_time: "asc" },
        select: {
          id: true,
          agenda_id: true,
          title: true,
          speaker_name: true,
          start_date_time: true,
          end_date_time: true,
          video_link: true,
        },
      })
    : [];

  const sessionsByHall = new Map<number, AuditoriumSession[]>();
  for (const item of items as any[]) {
    const list = sessionsByHall.get(item.agenda_id) ?? [];
    list.push({
      id: item.id,
      title: item.title || "Session",
      speakerName: item.speaker_name || null,
      startsAt: iso(item.start_date_time),
      endsAt: iso(item.end_date_time),
      videoLink: item.video_link || null,
    });
    sessionsByHall.set(item.agenda_id, list);
  }

  const hallById = new Map<number, AuditoriumHall>();
  for (const hall of halls as any[]) {
    hallById.set(hall.id, {
      id: hall.id,
      title: hall.title || "Hall",
      sessions: sessionsByHall.get(hall.id) ?? [],
      joinLink: hall.zoom_link || hall.path || null,
    });
  }

  /*
   * Panels, in spot order. A spot whose agenda row is missing or disabled is skipped rather than
   * drawn empty — an unlabelled white rectangle over the artwork reads as a rendering fault.
   */
  const panels: AuditoriumPanel[] = agendaSpots
    .map((spot): AuditoriumPanel | null => {
      const hall = hallById.get(spot.agenda_id as number);
      if (!hall) return null;
      return {
        spotId: spot.id,
        box: spotGeometry(spot, PANEL_FALLBACK_WIDTH, PANEL_FALLBACK_HEIGHT),
        hall,
        // Default true: the legacy's columns are nullable and an unset switch there still shows
        // the session, so treating null as "off" would blank out working halls.
        showSessionName: spot.show_session_name !== 0,
        showOtherDetail: spot.show_other_dtl !== 0,
      };
    })
    .filter((p): p is AuditoriumPanel => p !== null);

  /*
   * Markers — the pulsating circles, one per hall caption.
   *
   * TIGHTLY FILTERED, and that is the point. This used to accept any spot that was merely
   * POSITIONED (`m.x > 0 || m.y > 0`), which on this layout let through everything else placed on
   * the wall — buttons, video spots, welcome-tour steps — and drew eight dots where the live site
   * shows three.
   *
   * A dot is a door. It only qualifies if it is a LAYOUT redirect (the legacy's
   * `data-spottype="layout"` / `data-postactiontype="layout"`) AND actually names a layout to go
   * to. Both redirection columns are read because the legacy writes the event-scoped one on newer
   * rows and the plain one on migrated ones.
   */
  const isLayoutRedirect = (spot: any) =>
    /layout/i.test(String(spot.spot_type ?? "")) ||
    /layout/i.test(String(spot.post_action_type ?? ""));

  const markers: AuditoriumMarker[] = (spots as any[])
    .filter((s) => !s.agenda_id && isLayoutRedirect(s))
    .map((spot): AuditoriumMarker => {
      const target =
        Number(spot.event_post_redirection_path_layout) ||
        Number(spot.post_redirection_path_layout) ||
        0;
      const box = spotGeometry(spot, 0, 0);
      return {
        spotId: spot.id,
        x: box.x,
        y: box.y,
        title: spot.title || null,
        targetLayoutId: target > 0 ? target : null,
        color: spot.spot_color || null,
      };
    })
    // No destination means it is not a door, however it is typed or wherever it sits.
    .filter((m) => m.targetLayoutId !== null);

  const artwork = hallArtworkFor(layout.title ?? "");

  /*
   * THE NAMED ROOM WINS over the layout's own uploaded image.
   *
   * The live site's Ted Talk page uses the layout's DB image (files/lobby/child/event_1470.png),
   * but these four renders were supplied specifically for these halls, so a hall whose name
   * matches one of them gets it. A layout with no name match still falls back to its own upload
   * before the generic room, so nothing that had artwork loses it.
   *
   * existingPublicFile, not the raw URL: a legacy filename that was never mirrored resolves fine
   * and then 404s, and an <img> that fails before hydration cannot be recovered by onError.
   */
  const own = existingPublicFile(standTemplateUrl(layout.image) ?? assetUrl(layout.image));
  const named = hallArtworkFor(layout.title ?? "").url;
  const background = existingPublicFile(named) ?? own ?? DEFAULT_AUDITORIUM_BACKGROUND;

  /*
   * No spots placed for this layout, but the room has known screen positions — use them.
   *
   * This is what makes the page match the live site on an event whose spots were never
   * positioned: the Ted Talk room's two boxes are the legacy's own numbers, so the screens land
   * on the frame rather than on a generic grid.
   */
  if (panels.length === 0 && artwork.panels && artwork.panels.length > 0) {
    /*
     * ONE PANEL PER KNOWN POSITION — not one per hall.
     *
     * This loop used to run `Math.min(halls.length, artwork.panels.length)` times, so with no
     * agenda rows in this database it ran ZERO times: no panels, and the page fell through to a
     * single placeholder screen spanning the whole wall, captioned with the layout's title. The
     * live site shows TWO screens there.
     *
     * The room's geometry is a property of the ARTWORK, not of how much data survived the
     * migration. Both screens are drawn; a hall fills one when there is one to fill it with.
     */
    const halls = [...hallById.values()];
    artwork.panels.forEach((box, i) => {
      panels.push({
        // Negative so it can never collide with a real spot id.
        spotId: -(i + 1),
        box: { x: box.left, y: box.top, width: box.width, height: box.height, angle: 0 },
        hall: halls[i] ?? null,
        showSessionName: true,
        showOtherDetail: true,
      });
    });
  }

  /*
   * The grid fallback is only for a room with NO known positions and no spots — an unknown
   * layout upload. A room we ship artwork for never reaches it, which is why the single
   * full-width placeholder screen is gone.
   */
  /*
   * No usable doors in the data — fall back to the room's measured marker positions, one per
   * screen, so the page still shows a dot under each hall caption as the live site does. They are
   * decorative here: a dot that named no destination is exactly what was being filtered out
   * above, so inventing a link for it would be worse than drawing none.
   */
  if (markers.length === 0 && artwork.markers && artwork.markers.length > 0) {
    const count = panels.length > 0 ? Math.min(panels.length, artwork.markers.length) : artwork.markers.length;
    for (let i = 0; i < count; i += 1) {
      markers.push({
        spotId: -(100 + i),
        x: artwork.markers[i].x,
        y: artwork.markers[i].y,
        title: panels[i]?.hall?.title ?? null,
        targetLayoutId: null,
        color: null,
      });
    }
  }

  const fallbackHalls = panels.length === 0 ? [...hallById.values()] : [];
  if (panels.length === 0 && fallbackHalls.length === 0) {
    fallbackHalls.push({ id: 0, title: layout.title ?? "Auditorium", sessions: [], joinLink: null });
  }

  return {
    id: layout.id,
    title: layout.title ?? "Auditorium",
    backgroundUrl: background,
    /*
     * True whenever the background is one of OUR shipped rooms rather than a layout upload. The
     * view paints those as a CSS background (which cannot show a broken-image icon) and only
     * uses an <img> for an unknown upload, where an onError swap is still worth having.
     */
    backgroundIsFallback: background !== own,
    panels,
    markers,
    fallbackHalls,
    // Only consulted for the fallback grid; a layout with its own artwork gets the shared frame.
    screen: background === own ? DEFAULT_AUDITORIUM_SCREEN : artwork.screen,
  };
}
