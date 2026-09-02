import { prisma } from "@/lib/prisma";
import { STAND_TEMPLATE_SLOT_KEYS } from "@/lib/standTemplateSlots";

export interface ResolvedStandSpot {
  id: number;
  title: string | null;
  x_coordinates: string | null;
  y_coordinates: string | null;
  width: string | null;
  height: string | null;
  dimension: string | null;
  spot_type: string | null;
  help_text: string | null;
  asset: any | null;
  gallery: any[];
}

export interface ResolvedStand {
  zoneName: string;
  standImage: string;
  spots: ResolvedStandSpot[];
  /** Fixed template-slot artwork, keyed by STAND_TEMPLATE_SLOTS.key. See the note where it is built. */
  templateSlots: { key: string; url: string }[];
}

/**
 * Resolves everything the stand canvas needs to render for one exhibitor row: zone name, the
 * background template image, and every hotspot + whatever asset/gallery currently fills it.
 * Shared by /api/members/stand-assets (the editor) and the public /virtual-directory/[slug]
 * viewer, so both render exactly the same stand from exactly the same logic.
 *
 * Every step degrades to a safe default instead of throwing — one bad row (a dangling zone id, a
 * missing template) must never blank out the rest of the stand.
 */
export async function resolveExhibitorStand(exhibitor: any, eventId: number): Promise<ResolvedStand> {
  let zoneName = "";
  try {
    if (exhibitor.exhibition_zone_id) {
      const zone = await prisma.find_event_lobby_child_layout_manager.findUnique({
        where: { id: exhibitor.exhibition_zone_id },
      });
      if (zone?.title) zoneName = zone.title;
    }
  } catch {
    // Zone lookup failing shouldn't block the rest of the stand.
  }

  let lobbyChild: any = null;
  try {
    const standLayoutId = exhibitor.ex_stand_layout_id;
    if (standLayoutId) {
      lobbyChild = await prisma.find_event_lobby_child_layout_manager.findUnique({
        where: { id: standLayoutId },
      });
    } else {
      const layout = await prisma.find_event_lobby_layout_manager.findFirst({
        where: { event_id: eventId },
      });
      if (layout) {
        lobbyChild = await prisma.find_event_lobby_child_layout_manager.findFirst({
          where: { layout_type: "exhibition_stand", event_layout_id: layout.id },
        });
      }
    }
  } catch {
    // Fall back to no template — the placeholder canvas still renders.
  }

  let standImage = "";
  try {
    // A custom-uploaded stand background (via the manage_stand_assets editor's "Change Stand
    // Background" control) always wins over the generic template — it's stored as an absolute
    // /images/lobby_assets/... path, so both the editor and the public viewer can use it as-is.
    if (exhibitor.stand_image_url) {
      standImage = exhibitor.stand_image_url;
    }
    if (!standImage && exhibitor.stand_color_id) {
      const colorOption = await prisma.find_event_template_color_options.findUnique({
        where: { id: exhibitor.stand_color_id },
      });
      if (colorOption?.image) standImage = colorOption.image;
    }
    if (!standImage && lobbyChild?.image) {
      standImage = lobbyChild.image;
    }
  } catch {
    // Leave standImage empty; the UI already has a placeholder for this.
  }

  let spots: ResolvedStandSpot[] = [];
  try {
    const rawSpots = lobbyChild
      ? await prisma.find_event_lobby_spots.findMany({
          where: { event_layout_child_id: lobbyChild.id },
        })
      : [];

    const exAssets = await prisma.find_event_lobby_layout_type_assets.findMany({
      where: { exhibition_stand_id: exhibitor.id, event_id: eventId },
    });

    spots = await Promise.all(
      rawSpots.map(async (spot: any) => {
        try {
          // Both ids must actually be set. `a.default_asset_id === spot.exhibitor_asset_id` alone
          // is true when both are null — and 2,869 of the 3,148 spot rows have a null
          // exhibitor_asset_id, while every template-slot asset has a null default_asset_id. So
          // the bare comparison matched every unassigned spot to the same arbitrary asset, which
          // is why one panel appeared repeated across a stand instead of the real artwork.
          const asset =
            spot.exhibitor_asset_id == null
              ? null
              : exAssets.find(
                  (a: any) => a.default_asset_id != null && a.default_asset_id === spot.exhibitor_asset_id
                ) || null;
          const gallery = asset
            ? await prisma.find_event_lobby_asset_gallery.findMany({
                where: { parent_asset_id: asset.id },
              })
            : [];
          return { ...spot, asset, gallery: gallery || [] };
        } catch {
          return { ...spot, asset: null, gallery: [] };
        }
      })
    );
  } catch {
    // No spots resolved — canvas still shows with just the background image.
  }

  /*
   * The fixed template slots (src/lib/standTemplateSlots.ts), keyed by `title`.
   *
   * These are a separate mechanism from the DB hotspots above: six boxes measured off the pixels
   * of the fallback background, written by the editor's `update_template_asset` action. Until now
   * only the editor read them, so artwork uploaded into a slot was invisible on the public booth —
   * which is exactly the state the imported banner packs were in. The caller decides whether to
   * draw them, because they are only meaningful while that fallback background is the one showing.
   */
  let templateSlots: { key: string; url: string }[] = [];
  try {
    const slotAssets = await prisma.find_event_lobby_layout_type_assets.findMany({
      // Matched on `title`, the slot key — exactly what the editor's GET
      // (/api/members/stand-assets) matches on. Filtering on `asset_type: "template_slot"` here
      // instead meant a slot row created before that column was being set was invisible to
      // visitors while still showing in the designer, so the two views disagreed.
      where: { exhibition_stand_id: exhibitor.id, event_id: eventId, title: { in: STAND_TEMPLATE_SLOT_KEYS } },
      select: { id: true, title: true },
    });
    if (slotAssets.length) {
      const galleries = await prisma.find_event_lobby_asset_gallery.findMany({
        where: { parent_asset_id: { in: slotAssets.map((a: any) => a.id) } },
        select: { parent_asset_id: true, asset_url: true },
      });
      const urlByAsset = new Map<number, string>();
      for (const g of galleries) {
        if (g.asset_url && !urlByAsset.has(g.parent_asset_id)) urlByAsset.set(g.parent_asset_id, g.asset_url);
      }
      templateSlots = slotAssets
        .map((a: any) => ({ key: String(a.title ?? ""), url: urlByAsset.get(a.id) ?? "" }))
        .filter((s: { key: string; url: string }) => Boolean(s.key && s.url));
    }
  } catch {
    // Template slots are additive — failing to resolve them must not blank the stand.
  }

  return { zoneName, standImage, spots, templateSlots };
}

/**
 * Booth lookup by exhibitor id, scoped to the event.
 *
 * The legacy booth URL is `/virtual-event/<event slug>?mybooth=1&ex_id=<id>` — it addresses the
 * exhibitor by id, not by slug. That matters: `find_event_exhibitor.friendly_url` is empty on most
 * migrated rows, so the slug-based lookup below can only reach a minority of stands, which is why
 * the lobby's exhibitor list showed "Booth Coming Soon" for almost everyone.
 */
export async function getExhibitorStandById(exhibitorId: number, eventId: number) {
  if (!exhibitorId || !eventId) return null;
  const exhibitor = await prisma.find_event_exhibitor.findFirst({
    where: { id: exhibitorId, event_id: eventId },
  });
  if (!exhibitor) return null;

  const resolved = await resolveExhibitorStand(exhibitor, eventId);
  return { exhibitor, ...resolved };
}

/** Public lookup for the read-only /virtual-directory/[slug] booth viewer. */
export async function getPublicExhibitorStand(friendlyUrl: string) {
  const exhibitor = await prisma.find_event_exhibitor.findFirst({
    where: { friendly_url: friendlyUrl },
  });
  if (!exhibitor) return null;

  const resolved = await resolveExhibitorStand(exhibitor, exhibitor.event_id);
  return { exhibitor, ...resolved };
}
