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
 * The CSS to emit, or "" when this site has chosen no colours.
 *
 * Every value has been through `isHexColour` before it reaches here, so nothing but `#` and hex
 * digits is ever interpolated — this string goes inside a `<style>` tag, where an unvalidated
 * value would be a stylesheet injection rather than a broken colour. The check is in
 * `getSiteTheme`, and it is why this function takes a `SiteTheme` rather than raw strings.
 */
export function themeCss(theme: SiteTheme): string {
  const declarations: string[] = [];

  const set = (property: string, hex: string | undefined, rgbProperty?: string) => {
    if (!hex || !isHexColour(hex)) return;
    declarations.push(`${property}:${hex}`);
    if (rgbProperty) {
      const triplet = hexToRgbTriplet(hex);
      if (triplet) declarations.push(`${rgbProperty}:${triplet}`);
    }
  };

  set("--color-brand-pink", theme.primary, "--color-brand-pink-rgb");
  set("--color-brand-purple", theme.secondary, "--color-brand-purple-rgb");
  set("--color-zinc-950", theme.background, "--color-zinc-950-rgb");

  if (declarations.length === 0) return "";
  return `:root{${declarations.join(";")}}`;
}
