import { NextResponse } from "next/server";
import { z } from "zod";
import { canEditSite } from "@/lib/hub/access";
import { CACHE_TAGS, markContentStale } from "@/lib/cache";
import { listSiteImages, updateSiteImage } from "@/lib/services/siteImages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET  — every image slot for one site, with its current value. Reads only.
 * PATCH — update ONE slot. Nothing else is touched.
 *
 * Same gate as the rest of the site-editing surface: whoever manages every site, or an organiser
 * on this site itself (canEditSite). A route that can replace a live site's banner has no business
 * being reachable without it.
 */

function parseSiteId(id: string): number | null {
  const siteId = Number(id);
  return Number.isInteger(siteId) && siteId > 0 ? siteId : null;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const siteId = parseSiteId(id);
  if (siteId === null) {
    return NextResponse.json({ error: "A positive integer site id is required" }, { status: 400 });
  }
  if (!(await canEditSite(siteId))) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  const slots = await listSiteImages(siteId);
  if (!slots) return NextResponse.json({ error: "Unknown site." }, { status: 404 });

  return NextResponse.json({ slots });
}

/**
 * Every field is optional, and that is load-bearing rather than lax.
 *
 * An absent `imageUrl` means "leave the image alone" — it is how the text fields are saved without
 * touching the picture. Only a key the client actually sent is written, so a form that renders
 * three inputs can never blank a fourth it never showed.
 */
const patchSchema = z.object({
  slotId: z.string().min(1).max(100),
  imageUrl: z.string().max(500).optional(),
  altText: z.string().max(300).optional(),
  imageTitle: z.string().max(300).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const siteId = parseSiteId(id);
  if (siteId === null) {
    return NextResponse.json({ error: "A positive integer site id is required" }, { status: 400 });
  }
  if (!(await canEditSite(siteId))) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "A JSON body is required." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "That update could not be read." }, { status: 400 });
  }

  const { slotId, ...input } = parsed.data;
  const result = await updateSiteImage(siteId, slotId, input);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  /*
   * Only when the picture actually moved.
   *
   * The public pages read branding and content blocks through cachedRead, so a changed image would
   * otherwise sit behind the 30-minute window. Alt text and title are not rendered by anything, so
   * saving those alone expires nothing — there is no reason to make every visitor's next request
   * re-fetch the site because somebody typed a caption.
   */
  if (input.imageUrl !== undefined) {
    markContentStale(CACHE_TAGS.domain, CACHE_TAGS.event);
  }

  const slots = await listSiteImages(siteId);
  return NextResponse.json({ ok: true, slots });
}
