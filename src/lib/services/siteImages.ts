import { prisma } from "@/lib/prisma";
import { assetUrl } from "@/lib/assets";
import {
  IMAGE_META_GROUP,
  IMAGE_SLOTS,
  altVarname,
  findSlot,
  isEditable,
  titleVarname,
  type ImageSlot,
} from "@/lib/images/registry";

/**
 * ===========================================================================
 *  READ AND WRITE FOR "MANAGE IMAGES & BANNERS"
 * ===========================================================================
 *
 *  Server-only. Used by the Hub's image manager screen and its API route, and
 *  by nothing else — no public page imports this file.
 *
 *  ---------------------------------------------------------------------------
 *   THE RULE THIS FILE EXISTS TO KEEP
 *  ---------------------------------------------------------------------------
 *
 *  Reading changes nothing, and a write happens only for the ONE slot named in
 *  an explicit request. There is no "save all", no bulk apply, no migration
 *  step, and no code path that writes an image anywhere as a side effect of
 *  listing them. An admin who opens the screen, looks around and leaves has
 *  changed nothing, and that is enforced here rather than trusted to the UI.
 *
 *  Alt text and image title go into NEW find_settings rows under their own
 *  grouptitle. No existing row is read or written for them, and no public
 *  component renders them yet, so filling them in cannot alter the site.
 */

export interface ResolvedImageSlot {
  slot: ImageSlot;
  /** What the site shows for this slot today, resolved exactly as the page resolves it. */
  currentUrl: string | null;
  /** The raw stored value, before assetUrl() — what a write would replace. */
  storedValue: string | null;
  editable: boolean;
  /** Set for content blocks: the row a write would update. Null means no row exists to update. */
  rowId: number | null;
  altText: string;
  imageTitle: string;
  /** For collections: how many images are behind this entry, when it is cheap to count. */
  count?: number;
  /** True when nothing is stored and `currentUrl` is the site's built-in fallback. */
  usingDefault: boolean;
}

interface SiteContext {
  siteId: number;
  eventId: number | null;
  listingId: number | null;
  favicon: string | null;
}

async function loadSiteContext(siteId: number): Promise<SiteContext | null> {
  const row = await prisma.find_domains.findUnique({
    where: { id: siteId },
    select: { id: true, event_id: true, linked_profile_listing_id: true, fav: true },
  });
  if (!row) return null;
  return {
    siteId: row.id,
    eventId: row.event_id ?? null,
    listingId: row.linked_profile_listing_id ?? null,
    favicon: row.fav ?? null,
  };
}

/** find_settings has no Prisma delegate (@@ignore in schema.prisma) — raw SQL is the only way in. */
async function readSettings(siteId: number, varnames: string[]): Promise<Map<string, string>> {
  if (varnames.length === 0) return new Map();
  const rows = await prisma.$queryRaw<{ varname: string; value: string | null }[]>`
    SELECT varname, value FROM find_settings
    WHERE "DOMAIN" = ${siteId} AND varname = ANY(${varnames})
  `;
  return new Map(rows.map((row) => [row.varname, row.value ?? ""]));
}

/**
 * One find_settings row, updated where it exists and inserted where it does not.
 *
 * Deliberately a local copy of the same two statements hubSiteSettings.writeSetting runs, rather
 * than an import: that function's `grouptitle` parameter is typed to the three groups it knows
 * about, and widening it would change a signature the existing save path depends on. This feature
 * was asked not to modify existing code, and duplicating six lines is the cheaper side of that
 * trade than reopening a working write path.
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

/** The content-block row a slot points at — the same `where` the public service uses. */
async function findContentBlock(
  listingId: number,
  opportunityIntro: string,
  domainPageName?: string
) {
  return prisma.find_listing_business_opportunity.findFirst({
    where: {
      listing_id: listingId,
      opportunity_intro: opportunityIntro,
      ...(domainPageName ? { domain_page_name: domainPageName } : {}),
    },
    orderBy: { sequence: "asc" },
    select: { id: true, opportunity_images: true },
  });
}

/** How many images sit behind each collection entry, for the "N images" line on the card. */
async function countCollection(slotId: string, context: SiteContext): Promise<number | undefined> {
  const { eventId, listingId } = context;
  try {
    switch (slotId) {
      case "home-partner-logos":
        if (!listingId) return 0;
        return prisma.find_listing_business_opportunity.count({
          where: { listing_id: listingId, opportunity_intro: "LOSONI", domain_page_name: "Home" },
        });
      case "why-join-reason-icons":
        if (!listingId) return 0;
        return prisma.find_listing_business_opportunity.count({
          where: { listing_id: listingId, opportunity_intro: "LOSNWJ" },
        });
      case "exhibitor-reg-gain-backgrounds":
        if (!listingId) return 0;
        return prisma.find_listing_business_opportunity.count({
          where: { listing_id: listingId, opportunity_intro: "LOSNWYGFE", domain_page_name: "Exhibitor" },
        });
      case "home-speaker-portraits":
        if (!eventId) return 0;
        return prisma.find_speakers.count({ where: { event_id: eventId, status: "active" } });
      case "home-exhibitor-logos":
        if (!eventId) return 0;
        return prisma.find_event_exhibitor.count({ where: { event_id: eventId } });
      case "sponsors-logo-grid":
        if (!eventId) return 0;
        return prisma.find_event_sponsorer.count({ where: { event_id: eventId, status: "approved" } });
      case "gallery-photos":
        if (!eventId) return 0;
        return prisma.find_organiser_image.count({ where: { event_id: eventId, inactive: false } });
      default:
        return undefined;
    }
  } catch {
    // A count is decoration on a card. If one of these legacy tables refuses the query, the slot
    // should still list — losing the whole screen over a number would be the wrong trade.
    return undefined;
  }
}

/**
 * Everything the manager screen needs, for one site.
 *
 * Strictly read-only. Every branch below is a SELECT.
 */
export async function listSiteImages(siteId: number): Promise<ResolvedImageSlot[] | null> {
  const context = await loadSiteContext(siteId);
  if (!context) return null;

  // One round trip for every setting the registry mentions, plus the alt/title pair for each slot.
  const settingVarnames = IMAGE_SLOTS.flatMap((slot) =>
    slot.source.kind === "setting" ? [slot.source.varname] : []
  );
  const metaVarnames = IMAGE_SLOTS.flatMap((slot) => [altVarname(slot.id), titleVarname(slot.id)]);
  const settings = await readSettings(siteId, [...settingVarnames, ...metaVarnames]);

  const resolved: ResolvedImageSlot[] = [];

  for (const slot of IMAGE_SLOTS) {
    const base = {
      slot,
      editable: isEditable(slot),
      altText: settings.get(altVarname(slot.id)) ?? "",
      imageTitle: settings.get(titleVarname(slot.id)) ?? "",
      usingDefault: false,
    };

    switch (slot.source.kind) {
      case "setting": {
        const stored = settings.get(slot.source.varname) ?? "";
        resolved.push({
          ...base,
          storedValue: stored || null,
          currentUrl: stored || slot.defaultUrl || null,
          usingDefault: !stored && Boolean(slot.defaultUrl),
          rowId: null,
        });
        break;
      }

      case "domain-column": {
        const stored = context.favicon ?? "";
        resolved.push({
          ...base,
          storedValue: stored || null,
          currentUrl: stored || slot.defaultUrl || null,
          usingDefault: !stored && Boolean(slot.defaultUrl),
          rowId: null,
        });
        break;
      }

      case "content-block": {
        if (!context.listingId) {
          resolved.push({ ...base, storedValue: null, currentUrl: null, rowId: null, editable: false });
          break;
        }
        const row = await findContentBlock(
          context.listingId,
          slot.source.opportunityIntro,
          slot.source.domainPageName
        );
        resolved.push({
          ...base,
          storedValue: row?.opportunity_images ?? null,
          // Resolved the same way the page resolves it, so the preview is what a visitor sees.
          currentUrl: assetUrl(row?.opportunity_images) ?? null,
          rowId: row?.id ?? null,
          // No row means nothing to update. Offering an upload here would have to CREATE a legacy
          // content block, which is a different and much larger decision than replacing an image.
          editable: Boolean(row),
        });
        break;
      }

      case "collection": {
        resolved.push({
          ...base,
          storedValue: null,
          currentUrl: null,
          rowId: null,
          count: await countCollection(slot.id, context),
        });
        break;
      }

      case "code": {
        // A multi-image block has no single URL to preview, so it carries none — the card shows
        // the literal list as text rather than putting a comma-separated string in an <img src>.
        resolved.push({
          ...base,
          storedValue: slot.source.literal,
          currentUrl: slot.source.multiple ? null : assetUrl(slot.source.literal) ?? slot.source.literal,
          rowId: null,
        });
        break;
      }
    }
  }

  return resolved;
}

export interface UpdateSlotInput {
  /** Omit to leave the image exactly as it is and change only the text fields. */
  imageUrl?: string;
  altText?: string;
  imageTitle?: string;
}

export type UpdateSlotResult = { ok: true } | { ok: false; error: string };

/**
 * Update ONE slot.
 *
 * `imageUrl` is applied only when the caller sends it AND the slot is one of the editable kinds.
 * A request naming a "code" or "collection" slot is refused rather than quietly ignored, because
 * a UI bug that silently drops a save is worse than one that says no.
 */
export async function updateSiteImage(
  siteId: number,
  slotId: string,
  input: UpdateSlotInput
): Promise<UpdateSlotResult> {
  const slot = findSlot(slotId);
  if (!slot) return { ok: false, error: "Unknown image slot." };

  const context = await loadSiteContext(siteId);
  if (!context) return { ok: false, error: "Unknown site." };

  // The text fields are additive and safe for every slot, including the read-only ones: an admin
  // can record the alt text a hardcoded banner ought to have before anyone wires it up.
  if (input.altText !== undefined) {
    await writeSetting(siteId, altVarname(slotId), IMAGE_META_GROUP, input.altText.trim());
  }
  if (input.imageTitle !== undefined) {
    await writeSetting(siteId, titleVarname(slotId), IMAGE_META_GROUP, input.imageTitle.trim());
  }

  if (input.imageUrl === undefined) return { ok: true };

  if (!isEditable(slot)) {
    return {
      ok: false,
      error:
        slot.source.kind === "code"
          ? "This image is set in the site's code, so it cannot be changed from here."
          : "These images are edited on their own records, not from this screen.",
    };
  }

  const value = input.imageUrl.trim();

  switch (slot.source.kind) {
    case "setting":
      await writeSetting(siteId, slot.source.varname, slot.source.grouptitle, value);
      return { ok: true };

    case "domain-column":
      // `column` is typed to the single literal "fav", so this is not a dynamic column write.
      await prisma.find_domains.update({ where: { id: siteId }, data: { fav: value } });
      return { ok: true };

    case "content-block": {
      if (!context.listingId) return { ok: false, error: "This site has no linked content listing." };
      const row = await findContentBlock(
        context.listingId,
        slot.source.opportunityIntro,
        slot.source.domainPageName
      );
      if (!row) return { ok: false, error: "The content block for this section no longer exists." };
      // By primary key. The row was located with the same query the public page uses, so this
      // updates the row that section actually reads and no other.
      await prisma.find_listing_business_opportunity.update({
        where: { id: row.id },
        data: { opportunity_images: value },
      });
      return { ok: true };
    }

    default:
      return { ok: false, error: "This image cannot be changed from here." };
  }
}
