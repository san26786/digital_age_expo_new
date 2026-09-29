import { prisma } from "@/lib/prisma";
import { generateEventCopy, generateSeoFields } from "@/lib/seo/ai";
import { CP_SEO_VARNAME, SEO_FIELD_KEYS, clamp } from "@/lib/seo/generate";

/**
 * ===========================================================================
 *  EVENT DETAILS AND SEO FOR A NEWLY CREATED SITE
 * ===========================================================================
 *
 *  ---------------------------------------------------------------------------
 *   WHY A NEW SITE NEEDS THIS
 *  ---------------------------------------------------------------------------
 *
 *  `createSite` clones the source event row and sets `title` to the new site's
 *  name. Everything else in Members -> Event Details arrives as the source
 *  event's copy: the description, the short description, and every meta field.
 *  forkSiteContent then renames the brand inside them, which stops the new site
 *  claiming to be Digital Age Expo — but a renamed copy is still copy written
 *  about a different show, and the meta title and keywords are still tuned for
 *  it.
 *
 *  This writes the new event its own. Description and short description from the
 *  event's title and dates; meta title, description and keywords from the SEO
 *  generator, which also fills the site's cp_seo_* settings so the rendered
 *  <head> and the CP's SEO tab agree from the first page view.
 *
 *  ---------------------------------------------------------------------------
 *   WHAT IT WILL NOT DO
 *  ---------------------------------------------------------------------------
 *
 *  It never overwrites a description with a template. If the model is
 *  unreachable — no API key, a network failure, a refused model — the existing
 *  description is LEFT EXACTLY AS IT IS and the result says so. A renamed copy
 *  of real prose beats a generated stub, so silently trading down is not a
 *  behaviour worth having.
 *
 *  The SEO fields are the opposite trade and deliberately so: empty meta tags
 *  are worse than plain ones, so those fall back to the deterministic generator.
 *
 *  It is also SAFE TO RUN TWICE. Nothing here depends on the event still being
 *  freshly created, so it doubles as the repair path for sites made before it
 *  existed.
 */

/** Only the fields this function owns. Dates, venue, contact details and the hide flags are not its business. */
const EVENT_SEO_COLUMNS = ["meta_title", "meta_description", "meta_keywords", "keywords"] as const;

export interface GenerateSiteCopyResult {
  domainId: number;
  eventId: number | null;
  /** "ai" when the model wrote the description; "kept" when the existing one was left alone. */
  descriptionSource: "ai" | "kept";
  /** "ai" or "fallback" — the SEO fields are always written, one way or the other. */
  seoSource: "ai" | "fallback";
  updatedEventColumns: string[];
  updatedSettings: string[];
  notes: string[];
}

/**
 * One find_settings row, updated where it exists and inserted where it does not.
 *
 * find_settings is @@ignore'd in schema.prisma (no primary key, so Prisma generates no delegate),
 * which is why this is raw SQL rather than an upsert. The same two statements appear in
 * hubSiteSettings.writeSetting, whose `grouptitle` parameter is typed to the three groups it
 * knows about; widening that signature would reopen a working save path for no gain here.
 */
async function writeSetting(siteId: number, varname: string, grouptitle: string, value: string) {
  const updated = await prisma.$executeRaw`
    UPDATE find_settings SET value = ${value}
    WHERE varname = ${varname} AND "DOMAIN" = ${siteId}
  `;
  if (updated === 0) {
    await prisma.$executeRaw`
      INSERT INTO find_settings
        (varname, grouptitle, value, optioncode_type, optioncode_parse_type, "DOMAIN")
      VALUES (
        ${varname}, ${grouptitle}, ${value},
        'text'::find_settings_optioncode_type, 'static'::find_settings_optioncode_parse_type,
        ${siteId}
      )
    `;
  }
}

/** The bare host of a url or a stored domain: "http://www.digitalageexpo.com/x" -> "digitalageexpo.com". */
function normaliseHost(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .split("?")[0];
}

export async function generateSiteCopy(domainId: number): Promise<GenerateSiteCopyResult> {
  const domain = await prisma.find_domains.findUnique({
    where: { id: domainId },
    select: { id: true, name: true, brand: true, link: true, event_id: true },
  });
  if (!domain) throw new Error(`Site ${domainId} not found.`);

  const notes: string[] = [];
  const updatedEventColumns: string[] = [];
  const updatedSettings: string[] = [];

  const event = domain.event_id
    ? await prisma.find_events.findUnique({
        where: { id: domain.event_id },
        select: {
          id: true,
          title: true,
          description: true,
          description_short: true,
          location: true,
          venue: true,
          date_start: true,
          date_end: true,
          website: true,
        },
      })
    : null;

  if (!event) {
    return {
      domainId,
      eventId: null,
      descriptionSource: "kept",
      seoSource: "fallback",
      updatedEventColumns: [],
      updatedSettings: [],
      notes: ["This site has no event attached, so there was nothing to write."],
    };
  }

  /*
   * The facts both generators work from.
   *
   * `currentTitle` is the EVENT's title rather than any stored meta title: on a site this new
   * the meta title is still the source event's, and feeding it back in would anchor everything
   * that follows to the show this site was copied from.
   */
  const source = {
    siteName: domain.name || domain.brand || event.title,
    brand: domain.brand,
    link: domain.link,
    eventTitle: event.title,
    eventDescription: event.description,
    location: event.location || event.venue,
    dateStart: event.date_start,
    dateEnd: event.date_end,
    currentTitle: event.title,
    currentDescription: event.description,
  };

  /*
   * ---- 0. Fields that belong to the SITE, not to the copy ------------------------------------
   *
   * `website` is the event's own address, and createSite clones it from the source event along
   * with everything else — so a new site's Event Details pointed visitors at the show it was
   * copied from. Not a wording problem: the brand rename deliberately leaves URLs alone (it
   * matches on word boundaries so "digitalageexpo.com" is never mangled), which is right for
   * prose inside a sentence and leaves this field wrong.
   *
   * Compared by HOST rather than by string, so an admin who has set "https://london.
   * digitalageexpo.com/en" or dropped the trailing slash keeps their value. Only a website
   * pointing at a genuinely different site is replaced.
   */
  const siteHost = normaliseHost(domain.link);
  if (siteHost && normaliseHost(event.website) !== siteHost) {
    const siteUrl = `https://${siteHost}/`;
    await prisma.find_events.update({ where: { id: event.id }, data: { website: siteUrl } });
    updatedEventColumns.push("website");
    notes.push(`Website set to ${siteUrl} (was ${event.website || "empty"}).`);
  }

  // ---- 1. The description -------------------------------------------------------------------
  const copy = await generateEventCopy(source);
  let descriptionSource: "ai" | "kept" = "kept";

  if (copy.source === "ai") {
    await prisma.find_events.update({
      where: { id: event.id },
      data: { description: copy.description, description_short: copy.descriptionShort },
    });
    descriptionSource = "ai";
    updatedEventColumns.push("description", "description_short");
  } else {
    notes.push(`Description left unchanged: ${copy.reason}`);
  }

  // ---- 2. Search and social metadata --------------------------------------------------------
  /*
   * Generated AFTER the description, and from the new one when there is one.
   *
   * A meta description written from the source event's copy would describe the wrong show, which
   * is the whole problem this function exists to fix.
   */
  const seo = await generateSeoFields({
    ...source,
    eventDescription: copy.source === "ai" ? copy.description : event.description,
    currentDescription: copy.source === "ai" ? copy.descriptionShort : event.description_short,
  });
  if (seo.reason) notes.push(seo.reason);

  const eventSeo: Record<string, string> = {
    meta_title: clamp(seo.fields.metaTitle, 255),
    meta_description: seo.fields.metaDescription,
    meta_keywords: seo.fields.metaKeywords,
    keywords: seo.fields.metaKeywords,
  };
  await prisma.find_events.update({ where: { id: event.id }, data: eventSeo as never });
  updatedEventColumns.push(...EVENT_SEO_COLUMNS);

  /*
   * The same values into the site's own cp_seo_* rows.
   *
   * find_events.meta_* is what the legacy pages read; the rendered <head> and the CP's SEO tab
   * read find_settings. Writing only one of them is how a site ends up with two different
   * descriptions depending on which screen you ask.
   */
  for (const key of SEO_FIELD_KEYS) {
    const value = seo.fields[key];
    if (!value) continue;
    await writeSetting(domainId, CP_SEO_VARNAME[key], "seo", value);
    updatedSettings.push(CP_SEO_VARNAME[key]);
  }

  return {
    domainId,
    eventId: event.id,
    descriptionSource,
    seoSource: seo.source,
    updatedEventColumns,
    updatedSettings,
    notes,
  };
}
