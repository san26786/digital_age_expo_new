import { NextResponse } from "next/server";
import { requireEventMember } from "@/lib/auth/requireEventMember";
import { prisma } from "@/lib/prisma";
import { resolveExhibitorStand } from "@/lib/services/exhibitorStand";
import { STAND_TEMPLATE_SLOT_KEYS, findSlotByKey } from "@/lib/standTemplateSlots";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function GET(request: Request) {
  const context = await requireEventMember(request);
  if ("error" in context) return context.error;

  const { searchParams } = new URL(request.url);
  const eventId = Number(searchParams.get("event_id") || context.eventId);
  
  // Resolve ex_id (selected exhibitor)
  let exIdStr = searchParams.get("ex_id");
  let selectedExId: number | null = null;

  if (exIdStr) {
    selectedExId = Number(exIdStr);
  } else {
    // If not provided, try to find the exhibitor for this user/event
    const exhibitor = await prisma.find_event_exhibitor.findFirst({
      where: { event_id: eventId, user_id: context.userId },
      select: { id: true },
    });
    if (exhibitor) {
      selectedExId = exhibitor.id;
    }
  }

  // 1. Get all exhibitors list for dropdown. This is the one thing every render of the page
  // needs, so it's fetched outside the "rest of the stand" try/catch below — a bad row further
  // down (a broken spot, a missing zone, etc.) must never blank out the exhibitor list itself.
  let exhibitors: any[] = [];
  try {
    exhibitors = await prisma.find_event_exhibitor.findMany({
      where: { event_id: eventId },
      select: {
        id: true,
        business: true,
        name: true,
        status: true,
      },
      orderBy: { business: "asc" },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load exhibitors" }, { status: 500 });
  }

  if (!selectedExId && exhibitors.length > 0) {
    // Default to first exhibitor if organiser or multiple
    selectedExId = exhibitors[0].id;
  }

  if (!selectedExId) {
    return NextResponse.json({
      exhibitors,
      selectedExId: null,
      exhibitor: null,
      spots: [],
      layoutChild: null,
    });
  }

  // 2. Fetch the selected exhibitor
  let exhibitor: any;
  try {
    exhibitor = await prisma.find_event_exhibitor.findUnique({
      where: { id: selectedExId },
    });
  } catch (error: any) {
    return NextResponse.json({ exhibitors, selectedExId, error: error.message || "Failed to load exhibitor" }, { status: 500 });
  }

  if (!exhibitor) {
    return NextResponse.json({ exhibitors, selectedExId: null, error: "Exhibitor not found" }, { status: 404 });
  }

  // Everything below enriches the canvas (zone name, background image, hotspots, brochures).
  // None of it should be able to take down the exhibitor list/selection above — the shared
  // resolveExhibitorStand() helper degrades each step to a safe default instead of throwing.
  const { zoneName, standImage, spots, standLayoutTitle } = await resolveExhibitorStand(exhibitor, eventId);

  // The editor additionally needs a real find_event_lobby_layout_type_assets row per spot so
  // there's something to attach uploads/links to — the public read-only viewer doesn't need this.
  let enrichedSpots: any[] = [];
  try {
    enrichedSpots = await Promise.all(
      spots.map(async (spot: any) => {
        try {
          if (spot.asset || !spot.exhibitor_asset_id) return spot;

          const asset = await prisma.find_event_lobby_layout_type_assets.create({
            data: {
              title: spot.title || "Asset Spot",
              exhibition_stand_id: selectedExId!,
              event_id: eventId,
              default_asset_id: spot.exhibitor_asset_id,
              asset_type: spot.spot_type || "image",
              asset_attachment: "",
              extension: "",
              agenda_id: 0,
              layout_type_setup_id: 0,
              is_exhibitor_asset: true,
              user_id: exhibitor.user_id,
            },
          });
          return { ...spot, asset, gallery: [] };
        } catch {
          // One broken spot shouldn't hide every other editable hotspot on the stand.
          return spot;
        }
      })
    );
  } catch {
    enrichedSpots = spots;
  }

  // 7. Load standalone brochures/documents
  let brochures: any[] = [];
  try {
    brochures = await prisma.find_event_lobby_layout_type_assets.findMany({
      where: {
        exhibition_stand_id: selectedExId,
        event_id: eventId,
        asset_type: "brochure",
      },
    });
  } catch {
    // Brochure list is non-critical to the editor rendering.
  }

  // 8. Load the six fixed template-slot uploads (top banner, hanging banners, pull-up banners,
  // tabletop image) — see STAND_TEMPLATE_SLOTS. These are only relevant while the exhibitor is on
  // the generic fallback background (no real ex_stand_layout_id template), but resolving them here
  // is cheap and harmless either way; the editor decides whether to render them.
  let templateAssets: Record<string, { id: number; imageUrl: string | null }> = {};
  try {
    const rows = await prisma.find_event_lobby_layout_type_assets.findMany({
      where: {
        exhibition_stand_id: selectedExId,
        event_id: eventId,
        title: { in: STAND_TEMPLATE_SLOT_KEYS },
      },
    });
    const withGallery = await Promise.all(
      rows.map(async (row: { id: number; title: string | null; asset_attachment: string | null }) => {
        const gallery = await prisma.find_event_lobby_asset_gallery.findFirst({
          where: { parent_asset_id: row.id },
          orderBy: { id: "desc" },
        });
        return { row, imageUrl: gallery?.asset_url || row.asset_attachment || null };
      })
    );
    for (const { row, imageUrl } of withGallery) {
      if (row.title) templateAssets[row.title] = { id: row.id, imageUrl };
    }
  } catch {
    // No template-slot uploads yet — the editor just shows empty slots.
  }

  return NextResponse.json({
    exhibitors,
    selectedExId,
    exhibitor,
    zoneName,
    standImage,
    /** Picks the slot set on the client — see slotsForStandLayout(). */
    standLayoutTitle,
    spots: enrichedSpots,
    brochures,
    templateAssets,
  });
}

export async function POST(request: Request) {
  const context = await requireEventMember(request);
  if ("error" in context) return context.error;

  try {
    const formData = await request.formData();
    const action = formData.get("action") as string;
    const exId = Number(formData.get("ex_id"));
    const eventId = Number(formData.get("event_id") || context.eventId);

    if (!exId) {
      return NextResponse.json({ error: "Exhibitor ID is required" }, { status: 400 });
    }

    // Security validation: Only organiser or the owner of the exhibitor stand can edit
    if (context.role !== "organiser") {
      const ownedExhibitor = await prisma.find_event_exhibitor.findFirst({
        where: { id: exId, user_id: context.userId },
      });
      if (!ownedExhibitor) {
        return NextResponse.json({ error: "Unauthorized access to this stand" }, { status: 403 });
      }
    }

    if (action === "update_asset") {
      const assetId = Number(formData.get("asset_id"));
      const assetLink = (formData.get("asset_link") as string) || "";
      const files = formData.getAll("files") as File[];

      let asset = await prisma.find_event_lobby_layout_type_assets.findUnique({
        where: { id: assetId },
      });

      if (!asset) {
        return NextResponse.json({ error: "Asset layout row not found" }, { status: 404 });
      }

      // Handle video embedding link transformation if youtube/vimeo
      let finalAssetUrl = assetLink;
      if (assetLink) {
        if (assetLink.includes("youtube") && !assetLink.includes("embed")) {
          const match = assetLink.match(/[?&]v=([^&#]+)/);
          if (match) finalAssetUrl = `https://www.youtube.com/embed/${match[1]}`;
        } else if (assetLink.includes("vimeo") && !assetLink.includes("video")) {
          const vId = assetLink.split("/").pop();
          if (vId) finalAssetUrl = `https://player.vimeo.com/video/${vId}`;
        }
      }

      // If it's a replace-only asset type (like logo or single image), clear previous gallery first
      const assetTitleLower = (asset.title || "").toLowerCase();
      const isSingleAsset = ["image 1", "image 3", "company logo", "logo", "image", "video"].some((t) =>
        assetTitleLower.includes(t)
      );

      if (isSingleAsset && files.length > 0) {
        await prisma.find_event_lobby_asset_gallery.deleteMany({
          where: { parent_asset_id: assetId },
        });
      }

      // Save files to public/images/lobby_assets (filesystem)
      const uploadDir = join(process.cwd(), "public", "images", "lobby_assets");
      try {
        await mkdir(uploadDir, { recursive: true });
      } catch {}

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const filename = `event_${assetId}_${Date.now()}_${i}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const filePath = join(uploadDir, filename);
        await writeFile(filePath, buffer);

        // Record in find_event_lobby_asset_gallery
        await prisma.find_event_lobby_asset_gallery.create({
          data: {
            parent_asset_id: assetId,
            asset_url: filename,
          },
        });

        // Set primary attachment if first file
        if (i === 0) {
          const ext = file.name.split(".").pop() || "";
          await prisma.find_event_lobby_layout_type_assets.update({
            where: { id: assetId },
            data: {
              asset_attachment: filename,
              extension: ext.substring(0, 11),
            },
          });
        }
      }

      // Update asset URL/links and increment version
      await prisma.find_event_lobby_layout_type_assets.update({
        where: { id: assetId },
        data: {
          asset_url: finalAssetUrl || asset.asset_url,
          external_link: finalAssetUrl || asset.external_link,
          version: { increment: 1 },
        },
      });

      // Increment exhibitor stand version
      await prisma.find_event_exhibitor.update({
        where: { id: exId },
        data: { stand_version: { increment: 1 } },
      });

      return NextResponse.json({ success: true });
    }

    if (action === "update_template_asset") {
      const slotKey = (formData.get("slot_key") as string) || "";
      const files = formData.getAll("files") as File[];

      if (!STAND_TEMPLATE_SLOT_KEYS.includes(slotKey)) {
        return NextResponse.json({ error: "Unknown template slot" }, { status: 400 });
      }
      if (files.length === 0) {
        return NextResponse.json({ error: "Please choose a file to upload" }, { status: 400 });
      }

      let asset = await prisma.find_event_lobby_layout_type_assets.findFirst({
        where: { exhibition_stand_id: exId, event_id: eventId, title: slotKey },
      });
      if (!asset) {
        asset = await prisma.find_event_lobby_layout_type_assets.create({
          data: {
            title: slotKey,
            exhibition_stand_id: exId,
            event_id: eventId,
            asset_type: "template_slot",
            asset_attachment: "",
            extension: "",
            agenda_id: 0,
            layout_type_setup_id: 0,
            is_exhibitor_asset: true,
          },
        });
      }

      // Each slot only ever shows one file — replace, don't accumulate.
      await prisma.find_event_lobby_asset_gallery.deleteMany({ where: { parent_asset_id: asset.id } });

      const file = files[0];

      /* A slot declares what it accepts (see standTemplateSlots.ts): the Basic Stand's wall
       * screen takes a video, every other slot takes an image. Validated here as well as in the
       * browser because the client check is only a convenience — this is the one that counts. */
      const slotDef = findSlotByKey(slotKey);
      const wantsVideo = slotDef?.kind === "video";
      const mime = String(file.type || "");
      if (wantsVideo && !mime.startsWith("video/")) {
        return NextResponse.json(
          { error: "This slot is a screen — please choose an MP4 or WebM video." },
          { status: 400 }
        );
      }
      if (!wantsVideo && !mime.startsWith("image/")) {
        return NextResponse.json({ error: "Please choose an image file for this slot." }, { status: 400 });
      }
      // A stand video is streamed to every visitor's browser, so keep it modest.
      const maxBytes = wantsVideo ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
      if (file.size > maxBytes) {
        return NextResponse.json(
          { error: wantsVideo ? "Video must be 50MB or smaller." : "Image must be 5MB or smaller." },
          { status: 400 }
        );
      }
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const uploadDir = join(process.cwd(), "public", "images", "lobby_assets");
      try {
        await mkdir(uploadDir, { recursive: true });
      } catch {}

      const fallbackExt = wantsVideo ? "mp4" : "png";
      const ext = (file.name.split(".").pop() || fallbackExt).toLowerCase().replace(/[^a-z0-9]/g, "");
      const filename = `event_${asset.id}_${slotKey}_${Date.now()}.${ext || fallbackExt}`;
      await writeFile(join(uploadDir, filename), buffer);

      await prisma.find_event_lobby_asset_gallery.create({
        data: { parent_asset_id: asset.id, asset_url: filename },
      });
      await prisma.find_event_lobby_layout_type_assets.update({
        where: { id: asset.id },
        data: {
          asset_attachment: filename,
          extension: ext.substring(0, 11),
          version: { increment: 1 },
        },
      });
      await prisma.find_event_exhibitor.update({
        where: { id: exId },
        data: { stand_version: { increment: 1 } },
      });

      return NextResponse.json({ success: true, assetId: asset.id, imageUrl: filename });
    }

    if (action === "update_stand_image") {
      const files = formData.getAll("files") as File[];
      if (files.length === 0) {
        return NextResponse.json({ error: "Please choose an image to upload" }, { status: 400 });
      }

      const file = files[0];
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const uploadDir = join(process.cwd(), "public", "images", "lobby_assets");
      try {
        await mkdir(uploadDir, { recursive: true });
      } catch {}

      const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
      const filename = `event_${exId}_stand_${Date.now()}.${ext || "png"}`;
      const filePath = join(uploadDir, filename);
      await writeFile(filePath, buffer);

      const standImageUrl = `/images/lobby_assets/${filename}`;

      await prisma.find_event_exhibitor.update({
        where: { id: exId },
        data: { stand_image_url: standImageUrl, stand_version: { increment: 1 } },
      });

      return NextResponse.json({ success: true, standImage: standImageUrl });
    }

    if (action === "add_brochure") {
      const title = (formData.get("brochure_title") as string) || "Brochure";
      const files = formData.getAll("files") as File[];

      if (files.length === 0) {
        return NextResponse.json({ error: "Please upload a brochure file" }, { status: 400 });
      }

      const file = files[0];
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Create brochure asset layout
      const asset = await prisma.find_event_lobby_layout_type_assets.create({
        data: {
          title,
          asset_type: "brochure",
          exhibition_stand_id: exId,
          event_id: eventId,
          asset_attachment: "",
          extension: "",
          agenda_id: 0,
          layout_type_setup_id: 0,
          is_exhibitor_asset: true,
        },
      });

      const uploadDir = join(process.cwd(), "public", "images", "lobby_assets");
      try {
        await mkdir(uploadDir, { recursive: true });
      } catch {}

      const ext = file.name.split(".").pop() || "";
      const filename = `event_${asset.id}_brochure_${Date.now()}.${ext}`;
      const filePath = join(uploadDir, filename);
      await writeFile(filePath, buffer);

      // Save in layout type assets
      await prisma.find_event_lobby_layout_type_assets.update({
        where: { id: asset.id },
        data: {
          asset_attachment: filename,
          extension: ext.substring(0, 11),
          thumbnail_url: ext.toLowerCase() === "pdf" ? "/images/pdf-icon.png" : `/images/lobby_assets/${filename}`,
        },
      });

      // Save in gallery as well
      await prisma.find_event_lobby_asset_gallery.create({
        data: {
          parent_asset_id: asset.id,
          asset_url: filename,
        },
      });

      // Update exhibitor stand version
      await prisma.find_event_exhibitor.update({
        where: { id: exId },
        data: { stand_version: { increment: 1 } },
      });

      return NextResponse.json({ success: true });
    }

    if (action === "save_status") {
      const publish = formData.get("publish") === "true";
      await prisma.find_event_exhibitor.update({
        where: { id: exId },
        data: {
          status: publish ? "active" : "pending",
          stand_version: { increment: 1 },
        },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to process stand assets action" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const context = await requireEventMember(request);
  if ("error" in context) return context.error;

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const exId = Number(searchParams.get("ex_id"));

  if (!exId) {
    return NextResponse.json({ error: "Exhibitor ID is required" }, { status: 400 });
  }

  // Security validation: Only organiser or the owner of the exhibitor stand can delete
  if (context.role !== "organiser") {
    const ownedExhibitor = await prisma.find_event_exhibitor.findFirst({
      where: { id: exId, user_id: context.userId },
    });
    if (!ownedExhibitor) {
      return NextResponse.json({ error: "Unauthorized access to this stand" }, { status: 403 });
    }
  }

  try {
    if (action === "delete_brochure") {
      const brochureId = Number(searchParams.get("id"));
      await prisma.find_event_lobby_asset_gallery.deleteMany({
        where: { parent_asset_id: brochureId },
      });
      await prisma.find_event_lobby_layout_type_assets.delete({
        where: { id: brochureId },
      });
      await prisma.find_event_exhibitor.update({
        where: { id: exId },
        data: { stand_version: { increment: 1 } },
      });
      return NextResponse.json({ success: true });
    }

    if (action === "remove_gallery_item") {
      const assetId = Number(searchParams.get("asset_id"));
      const galleryId = Number(searchParams.get("gallery_id"));

      await prisma.find_event_lobby_asset_gallery.delete({
        where: { id: galleryId },
      });

      // Update layout asset to clear attachment if it matched this deleted file
      const remaining = await prisma.find_event_lobby_asset_gallery.findFirst({
        where: { parent_asset_id: assetId },
      });

      await prisma.find_event_lobby_layout_type_assets.update({
        where: { id: assetId },
        data: {
          asset_attachment: remaining ? remaining.asset_url || "" : "",
          extension: remaining ? (remaining.asset_url || "").split(".").pop()?.substring(0, 11) || "" : "",
          version: { increment: 1 },
        },
      });

      await prisma.find_event_exhibitor.update({
        where: { id: exId },
        data: { stand_version: { increment: 1 } },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid delete action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete" }, { status: 500 });
  }
}
