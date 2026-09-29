import { NextResponse } from "next/server";
import { canEditSite } from "@/lib/hub/access";
import { CACHE_TAGS, markContentStale } from "@/lib/cache";
import { generateSiteCopy } from "@/lib/services/hubSiteCopy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** The model call can take a while; the default serverless budget is not generous enough. */
export const maxDuration = 60;

/**
 * Write one site's event description and SEO metadata from its own title and dates.
 *
 * Runs automatically at the end of createSite. Exposed as a route as well because every site
 * created before that existed still carries the source event's copy, and because an admin who
 * renames a site will want to regenerate rather than edit eight fields by hand.
 *
 * POST, not GET, because it writes. Guarded by canEditSite like the rest of the site-editing
 * surface — each call can spend money at a third party, so an open endpoint here is a bill
 * somebody else can run up.
 *
 * SAFE TO RUN TWICE. It reads the event's title and dates, not any marker of freshness.
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
    const result = await generateSiteCopy(siteId);
    markContentStale(CACHE_TAGS.domain, CACHE_TAGS.event);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The copy could not be generated.";
    console.error("[hub/generate-copy] failed:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
