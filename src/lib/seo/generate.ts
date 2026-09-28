/**
 * ===========================================================================
 *  SEO FIELD GENERATION — SHARED BETWEEN THE HUB SITE EDITOR AND THE CP
 * ===========================================================================
 *
 *  Two screens edit the same eight pieces of metadata: the Hub's Site Edit form
 *  (Meta / SEO tab) and the CP's Settings -> SEO tab. They store them under
 *  different names — camelCase on a `SiteSettings` object, `cp_seo_*` rows in
 *  find_settings — which is exactly the kind of difference that leads to two
 *  copies of the same wording drifting apart. So the vocabulary, the character
 *  budgets, the text hygiene and the fallback copy all live here, once, and each
 *  screen maps the result onto its own field names on the way out.
 *
 *  WHAT "GENERATE" MEANS HERE. Nothing in this file talks to a model; see
 *  ./ai.ts for that. This module defines the shape of the answer, the rules a
 *  valid answer has to satisfy, and a deterministic generator good enough to
 *  ship on its own — which is what the route falls back to when no API key is
 *  configured or the model call fails. A button that silently does nothing when
 *  a key expires is worse than one that produces slightly plainer copy.
 */

/**
 * The eight fields, with the character budget each one has to respect.
 *
 * 60 for titles and 160 for descriptions are not arbitrary: they are roughly
 * where Google truncates a result, and both numbers are already the `maxLength`
 * on the existing inputs on both screens. Keywords and the canonical URL get
 * the 255 the find_settings column allows.
 */
export const SEO_LIMITS = {
  metaTitle: 60,
  metaDescription: 160,
  metaKeywords: 255,
  canonicalUrl: 255,
  ogTitle: 60,
  ogDescription: 160,
  twitterTitle: 60,
  twitterDescription: 160,
} as const;

export type SeoFieldKey = keyof typeof SEO_LIMITS;

export const SEO_FIELD_KEYS = Object.keys(SEO_LIMITS) as SeoFieldKey[];

export type SeoFields = Record<SeoFieldKey, string>;

/**
 * Maps the shared vocabulary onto the CP's find_settings varnames.
 *
 * Exported so the CP page and this module can never disagree about which row is
 * which — the mapping is data, not a convention repeated in two files.
 */
export const CP_SEO_VARNAME: Record<SeoFieldKey, string> = {
  metaTitle: "cp_seo_meta_title",
  metaDescription: "cp_seo_meta_description",
  metaKeywords: "cp_seo_meta_keywords",
  canonicalUrl: "cp_seo_canonical_url",
  ogTitle: "cp_seo_og_title",
  ogDescription: "cp_seo_og_description",
  twitterTitle: "cp_seo_twitter_title",
  twitterDescription: "cp_seo_twitter_description",
};

/**
 * Everything the generator is allowed to reason from.
 *
 * `currentTitle` / `currentDescription` are what the admin has already typed
 * into the Meta title and Meta description boxes. They are the strongest signal
 * in here — someone who has written their own title is telling the generator
 * what this page is about — so they seed the rest rather than being ignored or
 * overwritten with something invented.
 */
export interface SeoSource {
  siteName: string;
  brand?: string | null;
  /** find_domains.link — stored bare ("digitalageexpo.com") as often as not. */
  link?: string | null;
  eventTitle?: string | null;
  eventDescription?: string | null;
  location?: string | null;
  dateStart?: Date | string | null;
  dateEnd?: Date | string | null;
  currentTitle?: string | null;
  currentDescription?: string | null;
}

/** Legacy find_* columns routinely hold HTML fragments and entities; meta tags take neither. */
export function plainText(value?: string | null): string {
  return (value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Strips a separator left dangling at the end of a value.
 *
 * Applied to EVERY value, not only truncated ones, because the input can already carry one: a
 * title saved as "Digital Age Expo | Virtual Event |" — the tail of some earlier edit — otherwise
 * seeds a keyword list and a share card that both repeat the stray pipe.
 *
 * A full stop is not in this set. A description legitimately ends in one, and removing it would
 * turn every generated sentence into a fragment. Truncation handles that case separately below,
 * where a trailing stop is genuinely an artifact of the cut.
 */
function trimDanglingSeparator(value: string): string {
  return value.replace(/[\s,;:|–—-]+$/, "").trim();
}

/** Trims to a hard character budget on a word boundary — a meta tag cut mid-word reads as broken. */
export function clamp(value: string, max: number): string {
  const clean = trimDanglingSeparator(plainText(value));
  if (clean.length <= max) return clean;

  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  const trimmed = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  // Here a full stop IS an artifact — it is wherever the budget happened to land, not the end of
  // a sentence — so it comes off with the rest.
  return trimmed.replace(/[\s,;:.|–—-]+$/, "");
}

function asDate(value?: Date | string | null): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateRange(start?: Date | string | null, end?: Date | string | null): string {
  const from = asDate(start);
  const to = asDate(end);
  if (!from) return "";

  const day = (date: Date) => date.getUTCDate();
  const month = (date: Date) => date.toLocaleString("en-GB", { month: "short", timeZone: "UTC" });
  const year = (date: Date) => date.getUTCFullYear();

  if (!to || from.getTime() === to.getTime()) return `${day(from)} ${month(from)} ${year(from)}`;
  if (year(from) !== year(to)) {
    return `${day(from)} ${month(from)} ${year(from)} – ${day(to)} ${month(to)} ${year(to)}`;
  }
  if (month(from) !== month(to)) return `${day(from)} ${month(from)} – ${day(to)} ${month(to)} ${year(to)}`;
  return `${day(from)}–${day(to)} ${month(to)} ${year(to)}`;
}

/** find_domains.link is stored bare often enough that a raw copy fails URL validation. */
export function normaliseUrl(link?: string | null): string {
  const trimmed = plainText(link).replace(/\s+/g, "");
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

/**
 * Deterministic generator. Used as the fallback when the model is unavailable,
 * and as the source of the `canonicalUrl` in every case — a canonical URL is
 * the site's own address, which is a fact to be copied rather than copy to be
 * written, and asking a language model to reproduce a hostname exactly is
 * inviting a plausible-looking typo into the one field where that silently
 * breaks indexing.
 *
 * The three channels get DIFFERENT wording on purpose. The previous version of
 * this logic wrote one title and one description into all three, which is what
 * a search engine and both social previews then showed verbatim; a share card
 * that repeats the search snippet wastes the only line anyone reads.
 */
export function buildSeoFallback(source: SeoSource): SeoFields {
  const siteName = plainText(source.siteName) || plainText(source.brand) || "This site";
  const eventTitle = plainText(source.eventTitle);
  const typedTitle = plainText(source.currentTitle);
  const typedDescription = plainText(source.currentDescription);

  const from = asDate(source.dateStart);
  const startYear = from ? from.getUTCFullYear() : null;

  // Tidied before anything is built from them: base and headline are embedded in the keyword
  // list and both share-card lines, so a stray separator here would be repeated three times.
  const base = trimDanglingSeparator(typedTitle || eventTitle || siteName);
  const headline = startYear && !base.includes(String(startYear)) ? `${base} ${startYear}` : base;

  const descriptor = plainText(source.location) || "Online Virtual Event";
  const dateRange = formatDateRange(source.dateStart, source.dateEnd);
  const whenWhere = [dateRange, descriptor].filter(Boolean).join(" · ");

  const written = typedDescription || plainText(source.eventDescription);
  const metaDescription =
    written ||
    `Join ${headline}, ${descriptor.toLowerCase()}${dateRange ? ` from ${dateRange}` : ""}. ` +
      `Meet exhibitors, attend live sessions and connect with speakers worldwide.`;

  const keywordSeeds = [
    base.toLowerCase(),
    // `headline`, not `base` — headline is base with the year appended ONLY when it is not
    // already in there, so a title of "Digital Age Expo 2027" does not seed "…2027 2027".
    headline.toLowerCase(),
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

  return {
    metaTitle: clamp(`${headline} | ${descriptor}`, SEO_LIMITS.metaTitle),
    metaDescription: clamp(metaDescription, SEO_LIMITS.metaDescription),
    metaKeywords: clamp(Array.from(new Set(keywordSeeds)).join(", "), SEO_LIMITS.metaKeywords),
    canonicalUrl: clamp(normaliseUrl(source.link), SEO_LIMITS.canonicalUrl),
    // Share cards lead with the occasion rather than the keyword string: a card is read by a
    // person scrolling a feed, not matched against a query.
    ogTitle: clamp(whenWhere ? `${headline} — ${whenWhere}` : headline, SEO_LIMITS.ogTitle),
    /*
     * Deliberately NOT the written description, even when there is one — that is what
     * metaDescription already carries, and a share card that reprints the search snippet wastes
     * the one line anybody reads. This is the social line: what is happening, when, and why to
     * click. The request asked for the eight values to be unique, and descriptions are where
     * duplication actually costs something.
     */
    ogDescription: clamp(
      `${headline} brings exhibitors, speakers and buyers together${dateRange ? ` on ${dateRange}` : ""}. Register free and plan who you meet.`,
      SEO_LIMITS.ogDescription
    ),
    // Same reason as the keywords above: headline already carries the year, once.
    twitterTitle: clamp(headline, SEO_LIMITS.twitterTitle),
    twitterDescription: clamp(
      `${descriptor}${dateRange ? `, ${dateRange}` : ""}. Live sessions, virtual stands and direct introductions — free to attend.`,
      SEO_LIMITS.twitterDescription
    ),
  };
}

/**
 * Forces any candidate set of fields — a model's answer included — into a valid
 * one: plain text, inside budget, with every missing field filled from the
 * deterministic generator. The route applies this to the model's output so a
 * truncated, over-long or partially-parsed response degrades into good copy
 * instead of an error or a half-filled form.
 */
export function coerceSeoFields(candidate: Partial<Record<SeoFieldKey, unknown>>, source: SeoSource): SeoFields {
  const fallback = buildSeoFallback(source);
  const out = {} as SeoFields;

  for (const key of SEO_FIELD_KEYS) {
    const raw = candidate[key];
    const value = typeof raw === "string" ? clamp(raw, SEO_LIMITS[key]) : "";
    out[key] = value || fallback[key];
  }

  // Never take a URL from the model — see the note on buildSeoFallback.
  out.canonicalUrl = fallback.canonicalUrl;
  return out;
}
