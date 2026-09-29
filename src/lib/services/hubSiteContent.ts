import { prisma } from "@/lib/prisma";

/**
 * ===========================================================================
 *  PER-SITE CONTENT: FORKING AND REBRANDING
 * ===========================================================================
 *
 *  ---------------------------------------------------------------------------
 *   THE PROBLEM THIS FIXES
 *  ---------------------------------------------------------------------------
 *
 *  `createSite` copied the source site's find_domains row and blanked only the
 *  payment keys, so `linked_profile_listing_id` came across verbatim. Every site
 *  the Hub created therefore pointed at the SOURCE SITE'S content rows — not a
 *  copy of them, the same rows.
 *
 *  Two things followed, and the second is the serious one:
 *
 *    1. A new site's About section, Book Your Stand block, Why Exhibit copy and
 *       FAQs all read in the source's words. "London Digital Age Expo" opened
 *       showing "Digital Age Expo 2027 brings together…", because that was
 *       literally Digital Age Expo's row.
 *
 *    2. Editing any of that content on the new site edited the SOURCE SITE'S
 *       LIVE PAGES. One admin tidying up a new microsite would silently rewrite
 *       the flagship. Nothing in the UI said so, because as far as every screen
 *       was concerned it was simply the content of the site being edited.
 *
 *  Forking is what makes the rebrand safe rather than the other way round:
 *  renaming text on a shared row would rename it on the source site too.
 *
 *  ---------------------------------------------------------------------------
 *   WHAT IS AND IS NOT COPIED
 *  ---------------------------------------------------------------------------
 *
 *  Listing-scoped CONTENT is copied: the business-opportunity blocks (About,
 *  Book Your Stand, Why Exhibit, Why Join, exhibitor packages), the charity
 *  partners and the FAQs. Event-scoped data is not — `createSite` already
 *  handles that, and nothing here touches it.
 *
 *  Images are copied BY REFERENCE: the new rows carry the same
 *  `opportunity_images` value. The two sites then show the same picture, which
 *  is what a brand-new copy of a site should look like — but they now own
 *  separate rows, so changing one no longer changes the other.
 */

/** Text columns worth rebranding on a content block. Anything not listed is copied verbatim. */
const BLOCK_TEXT_COLUMNS = ["section_title", "section_sub_title", "section_description", "additional_info"] as const;

/** The event's own copy. `title` is already set by createSite; these were being left behind. */
const EVENT_TEXT_COLUMNS = [
  "label",
  "description",
  "description_short",
  "category_description",
  "meta_title",
  "meta_description",
  "meta_keywords",
  "keywords",
] as const;

/** A host or name reduced to a url-safe slug: "london.digitalageexpo.com" -> "london-digitalageexpo-com". */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Replace one brand name with another inside a piece of copy.
 *
 * CASE IS MATCHED TO THE TEXT IT REPLACES. Section titles in this database are frequently
 * shouted — "DIGITAL AGE EXPO 26TH - 28TH AUGUST 2027" — and dropping a title-case replacement
 * into the middle of that reads as a mistake. An all-caps match gets an all-caps replacement.
 *
 * IT IS IDEMPOTENT, which matters because the repair path can be run twice on the same site and
 * because the new name usually CONTAINS the old one: "Digital Age Expo" → "London Digital Age
 * Expo" applied twice would otherwise produce "London London Digital Age Expo". Text that already
 * carries the new name is left alone.
 *
 * IT MATCHES ON WORD BOUNDARIES, so a hostname is safe: "Digital Age Expo" never matches inside
 * "digitalageexpo.com", and the WHERE line on the About block keeps pointing at a real domain.
 */
export function rebrandText(value: string | null | undefined, fromName: string, toName: string): string {
  const text = value ?? "";
  const from = fromName.trim();
  const to = toName.trim();

  // A one- or two-character "brand" would match half the dictionary; refuse rather than mangle.
  if (!text || !from || !to || from.length < 3) return text;
  if (from.toLowerCase() === to.toLowerCase()) return text;

  // Already rebranded — see the note on idempotence above.
  if (text.toLowerCase().includes(to.toLowerCase())) return text;

  const pattern = new RegExp(`\\b${escapeRegex(from)}\\b`, "gi");
  return text.replace(pattern, (matched) =>
    matched === matched.toUpperCase() && /[A-Z]/.test(matched) ? to.toUpperCase() : to
  );
}

type Row = Record<string, unknown>;

/** Applies rebrandText to the named columns of a row, leaving every other column untouched. */
function rebrandRow(row: Row, columns: readonly string[], fromName: string, toName: string): Row {
  const next: Row = { ...row };
  for (const column of columns) {
    if (typeof next[column] === "string") {
      next[column] = rebrandText(next[column] as string, fromName, toName);
    }
  }
  return next;
}

const delegates = () =>
  prisma as unknown as Record<
    string,
    | {
        findMany?: (args: unknown) => Promise<Row[]>;
        createMany?: (args: unknown) => Promise<{ count: number }>;
      }
    | undefined
  >;

/**
 * Copy every row of one listing-scoped table onto a new listing id.
 *
 * `skipDuplicates` for the same reason copyTable in hubCreateSite uses it: these legacy tables
 * carry unique indexes this code has no map of, and a collision should cost one row rather than
 * the whole fork.
 */
async function copyListingTable(
  model: string,
  fromListingId: number,
  toListingId: number,
  textColumns: readonly string[],
  fromName: string,
  toName: string
): Promise<number> {
  const delegate = delegates()[model];
  if (!delegate?.findMany || !delegate.createMany) return 0;

  const rows = await delegate.findMany({ where: { listing_id: fromListingId } });
  if (rows.length === 0) return 0;

  const batch = rows.map((row) => {
    // `id` is dropped so Postgres assigns a new one; keeping it would collide with the source.
    const { id: _ignored, ...rest } = row as Row & { id?: unknown };
    return rebrandRow({ ...rest, listing_id: toListingId }, textColumns, fromName, toName);
  });

  const result = await delegate.createMany({ data: batch, skipDuplicates: true });
  return result.count;
}

export interface ForkResult {
  /** Null when nothing needed doing — the site already had content of its own. */
  newListingId: number | null;
  sharedWith: number[];
  copied: { table: string; rows: number }[];
  eventFieldsRebranded: number;
  note: string;
}

/**
 * Give one site its own copy of its content, renamed to its own brand.
 *
 * Safe to run on a site that already has its own listing: it checks first and does nothing. That
 * is deliberate — this is the repair path for sites created before the fix, and a repair that
 * cannot be run twice is one nobody dares run once.
 */
export async function forkSiteContent(domainId: number, fromNameOverride?: string): Promise<ForkResult> {
  const domain = await prisma.find_domains.findUnique({
    where: { id: domainId },
    // find_domains has no friendly_url column — the site's host lives in `link`.
    select: { id: true, name: true, brand: true, event_id: true, linked_profile_listing_id: true, link: true },
  });
  if (!domain) throw new Error(`Site ${domainId} not found.`);

  const listingId = domain.linked_profile_listing_id;
  if (!listingId) {
    return {
      newListingId: null,
      sharedWith: [],
      copied: [],
      eventFieldsRebranded: 0,
      note: "This site has no linked content listing, so there is nothing to fork.",
    };
  }

  // Who else points at this listing? If nobody, the site already owns its content.
  const sharers = await prisma.find_domains.findMany({
    where: { linked_profile_listing_id: listingId, id: { not: domainId } },
    select: { id: true, name: true },
  });

  if (sharers.length === 0) {
    return {
      newListingId: null,
      sharedWith: [],
      copied: [],
      eventFieldsRebranded: 0,
      note: "This site already has content of its own — nothing was changed.",
    };
  }

  const toName = (domain.name || domain.brand || "").trim();
  // The name being replaced: whoever this site was copied from. Falls back to the first site it
  // shares with, which for a Hub-created site is the same thing.
  const fromName = (fromNameOverride || sharers[0]?.name || "").trim();

  const sourceListing = await prisma.find_listings.findUnique({ where: { id: listingId } });
  if (!sourceListing) throw new Error(`Listing ${listingId} not found.`);

  /*
   * A REAL find_listings ROW, not just a new id.
   *
   * The content blocks only need an integer to be keyed by, so inventing one would have worked
   * for the pages in the screenshot. But `linked_profile_listing_id` is read in several places
   * that do go on to look the listing up, and a dangling id fails there silently and much later.
   * One extra insert removes that whole class of bug.
   */
  const { id: _sourceId, ...listingRest } = sourceListing as unknown as Row & { id?: unknown };
  const created = await prisma.find_listings.create({
    data: {
      ...(rebrandRow(listingRest, ["title", "trading_name", "description", "description_short", "meta_title", "meta_description", "meta_keywords", "keywords"], fromName, toName) as never),
      /*
       * A slug of its own, derived from the site's host.
       *
       * find_listings.friendly_url is not unique-constrained in this schema, but two listings
       * answering to the same slug is the kind of thing that bites much later, so the domain id
       * is appended: it is the one value guaranteed distinct per site.
       */
      friendly_url: `${slugify(domain.link || toName || `site-${domainId}`)}-${domainId}`.slice(0, 255),
    },
    select: { id: true },
  });

  const copied: ForkResult["copied"] = [];
  for (const [model, columns] of [
    ["find_listing_business_opportunity", BLOCK_TEXT_COLUMNS],
    // Legacy column names, checked against schema.prisma rather than guessed — rebrandRow skips
    // anything that is not a string on the row, so a wrong name here would fail silently.
    ["find_listing_listing_faq", ["faq_question", "faq_response"]],
    ["find_listing_charity_partners", ["charity_name"]],
  ] as const) {
    const rows = await copyListingTable(model, listingId, created.id, columns, fromName, toName);
    copied.push({ table: model, rows });
  }

  // Repoint the site at its own content. Until this line the fork is invisible; after it, the
  // site reads its own rows and the source's are untouched.
  await prisma.find_domains.update({
    where: { id: domainId },
    data: { linked_profile_listing_id: created.id },
  });

  const eventFieldsRebranded = domain.event_id
    ? await rebrandEventCopy(domain.event_id, fromName, toName)
    : 0;

  return {
    newListingId: created.id,
    sharedWith: sharers.map((row) => row.id),
    copied,
    eventFieldsRebranded,
    note: `Content forked from listing ${listingId} to ${created.id} and renamed from "${fromName}" to "${toName}".`,
  };
}

/**
 * Rename the event's own copy.
 *
 * `createSite` sets `title` to the new site's name and copies everything else verbatim, which is
 * why a new site's About paragraph still opened with the source's name — the homepage reads
 * `find_events.description`, not the title.
 *
 * Returns how many columns actually changed, so a caller can report "nothing needed renaming"
 * honestly rather than claiming a rename that was a no-op.
 */
export async function rebrandEventCopy(eventId: number, fromName: string, toName: string): Promise<number> {
  const event = (await prisma.find_events.findUnique({ where: { id: eventId } })) as Row | null;
  if (!event) return 0;

  const data: Row = {};
  for (const column of EVENT_TEXT_COLUMNS) {
    const current = event[column];
    if (typeof current !== "string") continue;
    const next = rebrandText(current, fromName, toName);
    if (next !== current) data[column] = next;
  }

  const changed = Object.keys(data).length;
  if (changed === 0) return 0;

  await prisma.find_events.update({ where: { id: eventId }, data: data as never });
  return changed;
}
