/** SEO field catalog — find_settings, grouptitle="seo". Entirely new: nothing in find_domains
 * or elsewhere already models meta/Open Graph/Twitter Card data for this site. */
export const SEO_TEXT_FIELDS = [
  { varname: "cp_seo_meta_title", label: "Meta Title", maxLength: 60 },
  { varname: "cp_seo_meta_description", label: "Meta Description", maxLength: 160, textarea: true },
  { varname: "cp_seo_meta_keywords", label: "Meta Keywords", maxLength: 255 },
  { varname: "cp_seo_canonical_url", label: "Canonical URL", maxLength: 255, isUrl: true },
  { varname: "cp_seo_og_title", label: "Open Graph Title", maxLength: 60 },
  { varname: "cp_seo_og_description", label: "Open Graph Description", maxLength: 160, textarea: true },
  { varname: "cp_seo_twitter_title", label: "Twitter / X Title", maxLength: 60 },
  { varname: "cp_seo_twitter_description", label: "Twitter / X Description", maxLength: 160, textarea: true },
] as const;

export const SEO_ROBOTS_OPTIONS = ["index, follow", "noindex, follow", "index, nofollow", "noindex, nofollow"] as const;

export const SEO_IMAGE_FIELDS = [
  { varname: "cp_seo_og_image", slot: "seo_og_image", label: "Open Graph Image", hint: "Shown when the site is shared on Facebook/LinkedIn. Recommended 1200×630." },
  { varname: "cp_seo_twitter_image", slot: "seo_twitter_image", label: "Twitter / X Image", hint: "Shown when the site is shared on X. Recommended 1200×675." },
] as const;

/* ==========================================================================
 *  SUGGESTED DEFAULTS
 * ==========================================================================
 *
 *  Every field on this tab used to start empty, which is the worst possible
 *  default for SEO: a site with no meta title and no description is one a
 *  search engine and every social preview has to guess at, and "fill this in
 *  later" reliably means never. These build a complete, correct starting set
 *  out of what the site already knows about itself — the find_domains record
 *  and the CP's active event — so the form arrives populated and an admin
 *  edits real copy instead of facing ten blank boxes.
 *
 *  Derived, never invented: the site name, description, URL, event title,
 *  location and dates all come from the database. Only the connective wording
 *  ("Meet exhibitors, attend live sessions...") and the generic keyword tail
 *  are written here, and any of it can be overwritten and saved as normal.
 */

export interface SeoDefaultsInput {
  siteName: string;
  brandName?: string | null;
  shortDescription?: string | null;
  link?: string | null;
  eventTitle?: string | null;
  eventSubtitle?: string | null;
  eventDescription?: string | null;
  location?: string | null;
  dateStart?: Date | null;
  dateEnd?: Date | null;
}

/** Legacy find_* columns routinely hold HTML fragments and entities; meta tags take neither. */
function plainText(value?: string | null): string {
  return (value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** Trims to a hard character budget on a word boundary — a meta tag cut mid-word reads as broken. */
function clamp(value: string, max: number): string {
  const clean = plainText(value);
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  const trimmed = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return trimmed.replace(/[\s,;:.–—-]+$/, "");
}

function formatDateRange(start?: Date | null, end?: Date | null): string {
  if (!start) return "";
  const day = (date: Date) => date.getUTCDate();
  const month = (date: Date) => date.toLocaleString("en-GB", { month: "short", timeZone: "UTC" });
  const year = (date: Date) => date.getUTCFullYear();

  if (!end || start.getTime() === end.getTime()) return `${day(start)} ${month(start)} ${year(start)}`;
  if (year(start) !== year(end)) {
    return `${day(start)} ${month(start)} ${year(start)} – ${day(end)} ${month(end)} ${year(end)}`;
  }
  if (month(start) !== month(end)) {
    return `${day(start)} ${month(start)} – ${day(end)} ${month(end)} ${year(end)}`;
  }
  return `${day(start)}–${day(end)} ${month(end)} ${year(end)}`;
}

/** find_domains.link is stored bare ("digitalageexpo.com") often enough that a raw copy fails URL validation. */
function normaliseUrl(link?: string | null): string {
  const trimmed = plainText(link).replace(/\s+/g, "");
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

export function buildSeoDefaults(input: SeoDefaultsInput): Record<string, string> {
  const siteName = plainText(input.siteName) || "Digital Age Expo";
  const eventTitle = plainText(input.eventTitle);
  const startYear = input.dateStart ? input.dateStart.getUTCFullYear() : null;

  // Prefer the event's own title (it is what visitors are searching for), falling back to the
  // domain name, and only append the year when the title doesn't already carry it.
  const base = eventTitle || siteName;
  const headline = startYear && !base.includes(String(startYear)) ? `${base} ${startYear}` : base;

  const descriptor = plainText(input.location) || "Online Virtual Event";
  const dateRange = formatDateRange(input.dateStart, input.dateEnd);

  const title = clamp(`${headline} | ${descriptor}`, 60);

  const writtenDescription =
    plainText(input.shortDescription) || plainText(input.eventDescription) || plainText(input.eventSubtitle);
  const generatedDescription = `Join ${headline}, ${descriptor.toLowerCase()}${
    dateRange ? ` from ${dateRange}` : ""
  }. Meet exhibitors, attend live sessions and connect with speakers worldwide.`;
  const description = clamp(writtenDescription || generatedDescription, 160);

  const keywordSeeds = [
    base.toLowerCase(),
    startYear ? `${base.toLowerCase()} ${startYear}` : null,
    descriptor.toLowerCase(),
    "virtual event",
    "online exhibition",
    "trade show",
    "exhibitors",
    "speakers",
    "sponsors",
    "business networking",
    "event registration",
  ].filter((seed): seed is string => Boolean(seed));
  const keywords = clamp(Array.from(new Set(keywordSeeds)).join(", "), 255);

  return {
    cp_seo_meta_title: title,
    cp_seo_meta_description: description,
    cp_seo_meta_keywords: keywords,
    cp_seo_canonical_url: clamp(normaliseUrl(input.link), 255),
    cp_seo_og_title: title,
    cp_seo_og_description: description,
    cp_seo_twitter_title: title,
    cp_seo_twitter_description: description,
    cp_seo_robots: SEO_ROBOTS_OPTIONS[0],
  };
}
