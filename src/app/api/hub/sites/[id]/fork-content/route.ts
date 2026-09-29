import { NextResponse } from "next/server";
import { canEditSite } from "@/lib/hub/access";
import { CACHE_TAGS, markContentStale } from "@/lib/cache";
import { forkSiteContent } from "@/lib/services/hubSiteContent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Give one site its own copy of its content, renamed to its own brand.
 *
 * THE REPAIR PATH for sites the Hub created before createSite started doing this — every one of
 * which points at its source site's content rows rather than a copy of them, so editing the new
 * site rewrites the source site's live pages.
 *
 * POST, not GET, because it writes. Guarded by canEditSite like the rest of the site-editing
 * surface.
 *
 * SAFE TO RUN TWICE. forkSiteContent checks whether anyone else points at the same listing and
 * returns without writing when the site already owns its content — a repair nobody dares run
 * twice is one nobody dares run once.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const siteId = Number(id);
  if (!Number.isInteger(siteId) || siteId <= 0) {
    return NextResponse.json({ error: "A positive integer site id is required" }, { status: 400 });
  }
  if (!(await canEditSite(siteId))) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  try {
    const result = await forkSiteContent(siteId);
    if (result.newListingId !== null) markContentStale(CACHE_TAGS.domain, CACHE_TAGS.event);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The content could not be forked.";
    console.error("[hub/fork-content] failed:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
