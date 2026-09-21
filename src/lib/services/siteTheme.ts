import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { CACHE_TAGS, cachedRead } from "@/lib/cache";
import { resolveSiteId } from "@/lib/tenant";

/**
 * ===========================================================================
 *  THEME COLOURS — AND THE FACT THAT NOTHING WAS READING THEM
 * ===========================================================================
 *
 *  `src/app/cp/(shell)/settings/theme/` writes nine `cp_theme_*` colours into find_settings and
 *  has done for some time. Nothing anywhere in the app read a single one of them. Changing
 *  "Primary Color" in the CP saved a row and altered nothing on screen — the same defect the
 *  branding module's own header comment describes for the logo slots ("Settings -> Branding wrote
 *  six logo slots to find_settings and nothing read them").
 *
 *  So the Hub's colour picker could not simply have been another writer of those rows. It would
 *  have been a second control promising something the site does not do.
 *
 *  ---------------------------------------------------------------------------
 *  HOW A SAVED COLOUR REACHES THE PAGE
 *  ---------------------------------------------------------------------------
 *
 *  globals.css defines the palette as CSS custom properties on `:root` — `--color-brand-pink`,
 *  `--color-brand-purple`, `--color-zinc-950` — and every component reads those rather than
 *  literal hexes. That is what makes this possible at all: a `<style>` block emitted after the
 *  stylesheet, redefining those same properties, retints the entire site with no component
 *  changes and no client JavaScript.
 *
 *  ONLY THREE OF THE NINE ARE MAPPED, and that is deliberate. This design system is built on two
 *  brand colours and a background; there is no honest place to put "Heading Color" or "Link
 *  Color" that would not mean rewriting components to read new variables. Three that genuinely
 *  work beat nine that mostly do not, and the Hub editor offers exactly these three.
 *
 *  ---------------------------------------------------------------------------
 *  AN UNSET THEME EMITS NOTHING
 *  ---------------------------------------------------------------------------
 *
 *  Not "emits the defaults" — nothing at all. Digital Age Expo has no `cp_theme_*` rows, so it
 *  gets no style block and renders byte-identically to before this file existed. A site is
 *  retinted only where somebody deliberately chose a colour, which also means a half-filled
 *  theme falls back per-property rather than as a lump.
 */

/** The CP's own varnames, so the CP theme page and the Hub edit the same rows. */
export const THEME_VARNAMES = {
  primary: "cp_theme_primary_color",
  secondary: "cp_theme_secondary_color",
  background: "cp_theme_background_color",
  /*
   * The four below are this project's own, not the CP's. The CP Theme page has no varname for a
   * second surface or for the bars, so these use the same `cp_theme_` prefix and grouptitle to
   * sit alongside the others rather than inventing a second store for the same concern.
   *
   * EVERY ONE OF THEM IS OPTIONAL AND DERIVES FROM `background` WHEN UNSET. That is what keeps
   * one colour enough for a coherent site, while letting anyone who cares take a section or a bar
   * somewhere the ramp would not have gone on its own.
   */
  surfaceAlt: "cp_theme_surface_alt_color",
  card: "cp_theme_card_color",
  navbar: "cp_theme_navbar_color",
  footer: "cp_theme_footer_color",

  /*
   * TEXT, AND WHY IT IS ITS OWN THING RATHER THAN A SHADE OF PRIMARY.
   *
   * `primary` had two jobs and they pull in opposite directions: it is the FILL behind a button,
   * which wants to be dark enough for white text to sit on, and it is the ACCENT on headings and
   * links, which sits on a near-black page and wants to be light enough to read there. A colour
   * cannot be both. Reading a red logo produced #d21317 — a perfectly good button, and text so
   * dim on the page background it may as well not be there.
   *
   * So accent text is separated out. Left blank it is derived from primary and lifted until it is
   * readable on the page background, which means the split fixes itself for every existing site
   * without anybody opening this screen.
   */
  text: "cp_theme_text_color",
  accentText: "cp_theme_accent_text_color",
} as const;

export type SiteTheme = Partial<Record<keyof typeof THEME_VARNAMES, string>>;

/** #rgb or #rrggbb, nothing else — this value is interpolated into a stylesheet. */
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isHexColour(value: string | null | undefined): boolean {
  return HEX.test(String(value ?? "").trim());
}

/** "#ec4899" -> "236 72 153", for the `rgb(var(--x) / 0.25)` glows in globals.css. */
function hexToRgbTriplet(hex: string): string | null {
  const value = hex.trim().replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((character) => character + character)
          .join("")
      : value;
  if (full.length !== 6) return null;

  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((channel) => Number.isNaN(channel))) return null;

  return `${r} ${g} ${b}`;
}

const readThemeSettings = cachedRead(
  ["domain", "themeColours"],
  async function readThemeSettings(siteId: number): Promise<Record<string, string>> {
    const rows = await prisma.$queryRaw<{ varname: string; value: string | null }[]>`
      SELECT varname, value FROM find_settings
      WHERE "DOMAIN" = ${siteId} AND grouptitle = 'theme'
    `;
    return Object.fromEntries(rows.map((row) => [row.varname, row.value ?? ""]));
  },
  { tags: [CACHE_TAGS.domain] }
);

/**
 * Memoised per request for the same reason resolveSiteId is: this runs in the root layout, on
 * every page, against a ten-connection pool.
 */
export const getSiteTheme = cache(async function getSiteTheme(
  siteId?: number
): Promise<SiteTheme> {
  const resolved = siteId ?? (await resolveSiteId());

  let rows: Record<string, string> = {};
  try {
    rows = await readThemeSettings(resolved);
  } catch {
    // A theme nobody can read is no theme: the site renders in its stock palette, which is a
    // perfectly good page, rather than failing.
    return {};
  }

  const theme: SiteTheme = {};
  for (const [key, varname] of Object.entries(THEME_VARNAMES) as [
    keyof typeof THEME_VARNAMES,
    string,
  ][]) {
    const value = (rows[varname] ?? "").trim();
    if (isHexColour(value)) theme[key] = value.toLowerCase();
  }
  return theme;
});

/**
 * ===========================================================================
 *  RAISING A COLOUR WITHOUT DRAINING IT
 * ===========================================================================
 *
 *  The first version of this mixed toward white — `c + (255 - c) * amount` per channel. That is
 *  the obvious formula and it is wrong for this palette, because mixing toward white moves every
 *  channel by the SAME absolute amount, which flattens the ratios between them. Ratios between
 *  channels are what hue is.
 *
 *  Measured on this app's own background, #05030A:
 *
 *      mix toward white, 0.03   ->  #0D0B11    R 13, G 11, B 17 — very nearly neutral grey
 *      mix toward white, 0.07   ->  #17151B    R 23, G 21, B 27 — flat grey
 *
 *  Against the shipped palette those same two surfaces are #0A0514 and #0C0618: deep, obviously
 *  violet. So a site that chose the stock background got GREY sections where the design has
 *  purple ones, and every card, panel and alternating band on the page lost its tint at once.
 *  That is what "the colours look washed out" looks like from the inside.
 *
 *  Lifting HSL lightness instead leaves hue and saturation untouched by construction, and it
 *  reconstructs the shipped ramp almost exactly:
 *
 *      #05030A  +2.5pp  ->  #0A0614    the shipped --color-zinc-900, to the byte
 *      #05030A  +3.5pp  ->  #0C0718    the shipped --color-surface-2 (#0C0618), one step of green
 *
 *  Which is the property that matters: PICKING THE STOCK BACKGROUND NOW REPRODUCES THE STOCK
 *  SURFACES. Before this, choosing the colour the site already used repainted it in a different,
 *  greyer palette — the one case a theme editor absolutely must get right.
 *
 *  The steps are percentage points of lightness rather than proportions, because that is how the
 *  hand-built palette in globals.css is spaced and this exists to match it. On a light background
 *  a raised surface should get darker rather than lighter; this design is dark-only and the
 *  editor says so, so the lift is clamped at white rather than complicated.
 */

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;

  if (max === min) return [0, 0, l];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;

  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const value = Math.round(l * 255);
    return [value, value, value];
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  const channel = (t: number) => {
    let value = t;
    if (value < 0) value += 1;
    if (value > 1) value -= 1;
    if (value < 1 / 6) return p + (q - p) * 6 * value;
    if (value < 1 / 2) return q;
    if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
    return p;
  };

  return [
    Math.round(channel(h + 1 / 3) * 255),
    Math.round(channel(h) * 255),
    Math.round(channel(h - 1 / 3) * 255),
  ];
}

/** WCAG relative luminance, for the readability lifts below. */
function luminance(hex: string): number | null {
  const triplet = hexToRgbTriplet(hex);
  if (!triplet) return null;
  const [r, g, b] = triplet.split(" ").map(Number);
  const f = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** Contrast ratio between two hex colours, 1 (identical) to 21 (black on white). */
export function contrastRatio(a: string, b: string): number | null {
  const la = luminance(a);
  const lb = luminance(b);
  if (la === null || lb === null) return null;
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * ---------------------------------------------------------------------------
 *  AN ACCENT THAT CAN ACTUALLY BE READ
 * ---------------------------------------------------------------------------
 *
 *  Lift `colour` in HSL lightness until it reaches `target` contrast against `against`, keeping
 *  its hue and saturation so it stays the same colour. This is the mirror of darkenForWhiteText()
 *  in the logo extractor: that one makes a colour safe to put white text ON, this one makes it
 *  safe to use AS text. Both are needed because the two uses want opposite things.
 *
 *  It gives up at 0.92 lightness rather than marching to white: a hue that cannot reach the target
 *  without becoming a pale wash has failed differently, and near-white is not the accent anybody
 *  chose. 4.5 is the WCAG AA threshold for body text; the accent is used at small sizes for
 *  eyebrow labels, so the strict figure is the right one.
 */
export function liftForReadability(colour: string, against: string, target = 4.5): string {
  if (!isHexColour(colour) || !isHexColour(against)) return colour;

  const triplet = hexToRgbTriplet(colour);
  if (!triplet) return colour;

  const [r, g, b] = triplet.split(" ").map(Number);
  const [h, startSat, startLight] = rgbToHsl(r, g, b);

  /*
   * ---------------------------------------------------------------------------
   *  IT DESATURATES AS IT LIFTS, AND THAT IS THE HALF THAT WAS MISSING
   * ---------------------------------------------------------------------------
   *
   *  Lifting lightness alone turns a brand red into a brighter, more fluorescent red. It clears
   *  the contrast threshold and still reads badly: a fully saturated hue set at 11px on a
   *  near-black page vibrates, and red specifically reads as an error state rather than as an
   *  accent. That is what an entire schedule section of #eb2025 labels looked like.
   *
   *  Pulling saturation down as lightness goes up is how the same colour becomes text. It stays
   *  recognisably the brand — the hue never moves — but it stops shouting. The ceiling of 0.72 is
   *  the important number: a colour arriving above it is brought down even before the lift starts,
   *  which is what catches pure reds, limes and cyans.
   *
   *  Big type is unaffected: headings use the text colour, not the accent. This is tuned for the
   *  small, uppercase, letter-spaced labels the accent is actually used on.
   */
  const ACCENT_SAT_CEILING = 0.72;
  let sat = Math.min(startSat, ACCENT_SAT_CEILING);
  let l = startLight;

  const hex = (hh: number, ss: number, ll: number) => {
    const [nr, ng, nb] = hslToRgb(hh, ss, ll);
    return "#" + [nr, ng, nb].map((c) => c.toString(16).padStart(2, "0")).join("");
  };

  let candidate = hex(h, sat, l);

  for (let i = 0; i < 60; i += 1) {
    const ratio = contrastRatio(candidate, against);
    if (ratio !== null && ratio >= target) break;
    if (l >= 0.92) break;

    l += 0.015;
    // Saturation eases off with every step, to a floor that keeps the hue identifiable rather
    // than letting it drift to grey.
    sat = Math.max(0.45, sat - 0.012);
    candidate = hex(h, sat, l);
  }

  return candidate;
}

/** Raise a hex colour's HSL lightness by `points` percentage points, hue and saturation intact. */
function lift(hex: string, points: number): string | null {
  const triplet = hexToRgbTriplet(hex);
  if (!triplet) return null;

  const [r, g, b] = triplet.split(" ").map(Number);
  const [h, s, l] = rgbToHsl(r, g, b);
  const raised = hslToRgb(h, s, Math.min(1, Math.max(0, l + points / 100)));

  return "#" + raised.map((channel) => channel.toString(16).padStart(2, "0")).join("");
}

/**
 * The CSS to emit, or "" when this site has chosen no colours.
 *
 * ---------------------------------------------------------------------------
 *  WHY THE BACKGROUND SETS EIGHT VARIABLES RATHER THAN ONE
 * ---------------------------------------------------------------------------
 *
 *  The first version set `--color-zinc-950` and stopped, on the reasoning that it is the page
 *  background. It is - the body changed colour correctly - and every section stayed exactly as it
 *  was, which looked like the setting had not saved at all.
 *
 *  Counting what the components actually use explains it. Section backgrounds are spread across
 *  `bg-zinc-950` (274 uses), `bg-zinc-900` (175), `bg-slate-900` (92), `bg-slate-950` (91) and the
 *  `--color-surface-*` variables behind `.main-glow-bg` and the inline gradients. Only the first
 *  was mapped, so only the first moved.
 *
 *  Measured in the browser, on the page itself, rather than guessed:
 *
 *      bg-zinc-950   rgb(164 34 19)   <- the chosen colour, themed
 *      bg-zinc-900   rgb(10 6 20)     <- globals.css literal, untouched
 *      bg-slate-950  lab(1.77 ...)    <- Tailwind's own, untouched
 *      bg-slate-900  lab(7.79 ...)    <- Tailwind's own, untouched
 *
 *  Tailwind v4 compiles `bg-slate-950` to `var(--color-slate-950)`, so those are overridable by
 *  exactly the same mechanism - which `bg-zinc-950` already obeying it proves.
 *
 *  ONE COLOUR, A DERIVED RAMP. Asking for eight colours in the editor would be a worse product
 *  and an easy way to make an incoherent site. Instead the darkest surface is the one that is
 *  chosen and the rest are lifted from it in HSL lightness - see lift() above - by the same small
 *  steps that separate the stock palette's own tones, so the depth relationships between page,
 *  section and card survive the retint and so does the hue.
 *
 *  ONLY THE DARK END OF SLATE IS TOUCHED - 950, 900, 800. `text-slate-300` and `text-slate-400`
 *  are body text, and retinting those would tint the writing rather than the surface behind it.
 */
export function themeCss(theme: SiteTheme): string {
  const declarations: string[] = [];

  const set = (property: string, hex: string | null | undefined, rgbProperty?: string) => {
    if (!hex || !isHexColour(hex)) return;
    declarations.push(`${property}:${hex}`);
    if (rgbProperty) {
      const triplet = hexToRgbTriplet(hex);
      if (triplet) declarations.push(`${rgbProperty}:${triplet}`);
    }
  };

  set("--color-brand-pink", theme.primary, "--color-brand-pink-rgb");
  set("--color-brand-purple", theme.secondary, "--color-brand-purple-rgb");
  set("--color-text-main", theme.text);

  /*
   * THE RAMP, AND WHAT OVERRIDES WHICH RUNG OF IT.
   *
   * `background` is the one colour that must be set for any of this to happen; the rest of the
   * surfaces are lifted from it in HSL lightness by the small steps that separate the stock
   * palette's own tones, so page / section / card keep both their depth relationship and their
   * hue after a retint. The steps are calibrated so that choosing this app's own #05030A
   * reproduces the surfaces globals.css ships.
   *
   * Each named surface then takes its own value if one was chosen, and the derived one if not —
   * so "just pick a background" still produces a whole coherent site, and "I want the navbar
   * darker than everything else" is one field rather than a fork in the design system.
   */
  const base = theme.background;
  if (base && isHexColour(base)) {
    const card = theme.card && isHexColour(theme.card) ? theme.card : lift(base, 2.5);
    const alt =
      theme.surfaceAlt && isHexColour(theme.surfaceAlt) ? theme.surfaceAlt : lift(base, 3.5);

    // The base itself: the page, and the darkest surfaces.
    set("--color-zinc-950", base, "--color-zinc-950-rgb");
    set("--color-slate-950", base);
    set("--color-surface-4", base);

    // Cards and panels sitting on the page.
    set("--color-surface-1", card, "--color-surface-1-rgb");
    set("--color-zinc-900", card);

    // The alternating section band, and the tone just above it.
    set("--color-slate-900", alt, "--color-slate-900-rgb");
    set("--color-surface-2", alt);
    set("--color-slate-800", lift(alt, 3));

    /*
     * The two bars get variables of their own rather than borrowing a surface.
     *
     * The navbar was `bg-surface-1/90`, so it moved with the cards and could never be told apart
     * from them; the footer was the literal `bg-[#03010a]`, so it moved with nothing at all and
     * stayed near-black on every site whatever the palette. Both now read a variable that
     * defaults to where they were — the navbar to the card tone it shared, the footer to a shade
     * below the page base — and can be taken elsewhere without dragging the surfaces with them.
     */
    /*
     * Accent text: the chosen one if there is one, otherwise primary lifted until it is legible on
     * THIS site's page background. Derived rather than required, so every site that has only ever
     * set a primary gets a readable accent with no action from anyone.
     */
    const accent =
      theme.accentText && isHexColour(theme.accentText)
        ? theme.accentText
        : theme.primary && isHexColour(theme.primary)
          ? liftForReadability(theme.primary, base)
          : null;
    set("--color-accent-text", accent, "--color-accent-text-rgb");

    set("--color-nav-bg", theme.navbar && isHexColour(theme.navbar) ? theme.navbar : card);
    // The footer sits a shade BELOW the page in the shipped palette (#03010a against #05030A),
    // so its derived value drops rather than holds - otherwise a themed site loses the seam
    // between the last section and the foot of the page.
    set("--color-footer-bg", theme.footer && isHexColour(theme.footer) ? theme.footer : lift(base, -1));
  }

  if (declarations.length === 0) return "";
  return `:root{${declarations.join(";")}}`;
}
