/**
 * Fixed upload slots overlaid on a stand background.
 *
 * Unlike the DB-driven `find_event_lobby_spots` hotspots (which only exist for exhibitors with a
 * real seeded `ex_stand_layout_id` template), these are hand-measured percentage boxes tied to a
 * specific piece of stand artwork. Recommended dimensions come from the legacy artwork spec at
 * /Standartworktemplates ("Booth Dimension Requirements").
 *
 * Each is persisted as its own `find_event_lobby_layout_type_assets` row per exhibitor, keyed by
 * `title = slot.key` (see the `update_template_asset` action in
 * /api/members/stand-assets/route.ts) — independent of any real spot record.
 *
 * ---------------------------------------------------------------------------
 * WHY THERE IS MORE THAN ONE SET
 * ---------------------------------------------------------------------------
 * The stand artwork differs per Exhibitor Stand Layout: the default stand has a wide header, two
 * hanging banners, two pull-ups and a tabletop panel, while the Basic Stand has a header, two
 * centre rectangles, a table-front banner and a wall-mounted SCREEN that takes a video. Measuring
 * one set against one template and reusing it everywhere put upload boxes in mid-air on the
 * others, so the set is chosen from the layout's title — see {@link slotsForStandLayout}.
 *
 * Slot keys must stay globally unique across sets, because they are what identifies the stored
 * row; that is also why {@link STAND_TEMPLATE_SLOT_KEYS} is the union of every set.
 */

/** What a slot accepts. `video` slots take an mp4/webm and render a <video> instead of an <img>. */
export type StandSlotKind = "image" | "video";

export interface StandTemplateSlot {
  key: string;
  label: string;
  helpText: string;
  /** Percentage-based box, measured against that layout's own artwork. */
  left: number;
  top: number;
  width: number;
  height: number;
  /** Defaults to "image". */
  kind?: StandSlotKind;
}

/**
 * The default six, measured against the standard stand artwork (and the 1940x1091 fallback
 * `stand_img.png`, whose geometry matches).
 */
export const STAND_TEMPLATE_SLOTS: StandTemplateSlot[] = [
  {
    key: "top_banner",
    label: "Stand Header Image",
    helpText: "Recommended: 678 x 188px",
    left: 19.5,
    top: 8.4,
    width: 35.1,
    height: 17.1,
  },
  {
    key: "top_banner_left",
    label: "Top Banner Image (Left)",
    helpText: "Recommended: 325 x 395px",
    left: 74.3,
    top: 9.2,
    width: 7.6,
    height: 16.2,
  },
  {
    key: "top_banner_right",
    label: "Top Banner Image (Right)",
    helpText: "Recommended: 325 x 395px",
    left: 85.0,
    top: 9.2,
    width: 7.6,
    height: 16.2,
  },
  {
    key: "bottom_banner_left",
    label: "Bottom Banner Image (Left)",
    helpText: "Recommended: 335 x 727px",
    left: 7.7,
    top: 55.9,
    width: 7.2,
    height: 30.2,
  },
  {
    key: "bottom_banner_right",
    label: "Bottom Banner Image (Right)",
    helpText: "Recommended: 335 x 727px",
    left: 84.8,
    top: 55.9,
    width: 7.5,
    height: 30.2,
  },
  {
    key: "tabletop_banner",
    label: "Tabletop Image",
    helpText: "Recommended: 232 x 94px",
    left: 63.7,
    top: 77.7,
    width: 12.0,
    height: 8.5,
  },
];

/**
 * The Basic Stand: header banner, two centre rectangles, the table-front banner, and the wall
 * screen (video).
 *
 * Boxes measured off the Basic Stand artwork as it renders in the designer canvas. They are
 * close but not pixel-perfect — nudge these numbers, not the component, if a banner sits a little
 * proud of its frame.
 */
export const BASIC_STAND_SLOTS: StandTemplateSlot[] = [
  {
    key: "basic_top_banner",
    label: "Top Banner",
    helpText: "Recommended: 507 x 77px",
    left: 31.405563689605,
    top: 8.1528662420382,
    width: 37.042459736457,
    height: 10.191082802548,
  },
  {
    key: "basic_screen_video",
    label: "Screen Video",
    helpText: "Paste a YouTube or Vimeo embed URL, e.g. https://www.youtube.com/embed/xxxx",
    left: 27.086383601757,
    top: 37.070063694268,
    width: 14.714494875549,
    height: 14.904458598726,
    kind: "video",
  },
  {
    key: "basic_center_left",
    label: "Centre Image (Left)",
    helpText: "Recommended: 1308 x 1827px",
    left: 54.02635431918,
    top: 38.216560509554,
    width: 8.6383601756955,
    height: 26.242038216561,
  },
  {
    key: "basic_center_right",
    label: "Centre Image (Right)",
    helpText: "Recommended: 1308 x 1827px",
    left: 64.348462664714,
    top: 38.089171974522,
    width: 8.5651537335286,
    height: 26.369426751592,
  },
  {
    key: "basic_table_banner",
    label: "Below Table Banner",
    helpText: "Recommended: 508 x 120px",
    left: 28.184480234261,
    top: 67.770700636943,
    width: 21.069729136164,
    height: 8.5290605095541,
  },
];

/**
 * Background filenames whose artwork is the Basic Stand.
 *
 * `event_1473` is the one the live site serves for this layout (event_layout_child_id 2735);
 * `event_1495` is the same stand geometry in a different colourway. Matched as well as the layout
 * title because find_event_lobby_child_layout_manager.title is empty on the migrated rows, so a
 * title-only match fell through to the default six boxes and put them in mid-air.
 *
 * Compared on the basename without extension, so `/images/external/lobby/child/event_1473.png`,
 * `event_1473.png` and a bare `event_1473` all match.
 */
const BASIC_STAND_IMAGES = ["event_1473", "event_1495"];

/**
 * Which slot set a stand uses.
 *
 * Decided from the layout's title when it has one, and otherwise from the background artwork
 * itself — see BASIC_STAND_IMAGES for why the image is the more reliable of the two. Anything
 * unrecognised keeps the default six, so this can never move the upload boxes on a stand that is
 * currently correct.
 */
export function slotsForStandLayout(
  layoutTitle?: string | null,
  standImage?: string | null
): StandTemplateSlot[] {
  if (/basic/i.test(String(layoutTitle ?? ""))) return BASIC_STAND_SLOTS;

  const base = String(standImage ?? "")
    .split("/")
    .pop()
    ?.replace(/\.[a-z0-9]+$/i, "")
    .toLowerCase();
  if (base && BASIC_STAND_IMAGES.includes(base)) return BASIC_STAND_SLOTS;

  return STAND_TEMPLATE_SLOTS;
}

/** Every slot key across every set — what the stored-row lookups filter on. */
export const STAND_TEMPLATE_SLOT_KEYS = [...STAND_TEMPLATE_SLOTS, ...BASIC_STAND_SLOTS].map((s) => s.key);

/** Lookup used when rendering a stored slot row back onto a stand. */
export function findSlotByKey(key: string): StandTemplateSlot | undefined {
  return [...STAND_TEMPLATE_SLOTS, ...BASIC_STAND_SLOTS].find((s) => s.key === key);
}
