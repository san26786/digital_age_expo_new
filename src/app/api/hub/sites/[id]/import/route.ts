import { NextResponse } from "next/server";
import { CACHE_TAGS, markContentStale } from "@/lib/cache";
import { getSitesHubAccess } from "@/lib/hub/access";
import { importEventContent } from "@/lib/services/hubCreateSite";
import { COPY_TOGGLE_KEYS, noCopySelections, type CopyToggleKey } from "@/lib/hub/copyOptions";

export const dynamic = "force-dynamic";

/**
 * Copy content from any event into an existing site.
 *
 * The same allowlist discipline as the edit endpoint: every toggle absent from the request
 * defaults to OFF, and unknown keys are dropped rather than trusted. A request that arrives
 * garbled therefore copies too little, never too much — which matters more here than usual,
 * because this writes thousands of rows and there is no undo for a single import.
 *
 * `importEventContent` holds the guards that matter: it refuses a site with no event of its own,
 * and it refuses a source event equal to the destination, which would otherwise duplicate the
 * site's own content in one click.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await getSitesHubAccess();
  if (!access.ok) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  const { id } = await params;
  const siteId = Number(id);
  if (!Number.isInteger(siteId) || siteId <= 0) {
    return NextResponse.json({ error: "A positive integer site id is required" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }

  const sourceEventId = Number(body.sourceEventId);
  if (!Number.isInteger(sourceEventId) || sourceEventId <= 0) {
    return NextResponse.json({ error: "A source event is required." }, { status: 400 });
  }

  const requested = (body.selections ?? {}) as Record<string, unknown>;
  const selections = noCopySelections();
  for (const key of COPY_TOGGLE_KEYS) {
    selections[key as CopyToggleKey] = requested[key] === true;
  }

  if (!Object.values(selections).some(Boolean)) {
    return NextResponse.json({ error: "Nothing was selected to import." }, { status: 400 });
  }

  try {
    const result = await importEventContent(
      siteId,
      sourceEventId,
      selections,
      body.exhibitorMode === "allocated" ? "allocated" : "unallocated"
    );

    // The imported rows are read through cachedRead entries tagged `domain`; without this the
    // site would keep showing its old, emptier self until the revalidate window expired, which
    // reads as an import that silently did nothing.
    markContentStale(CACHE_TAGS.domain);

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The import failed.";
    console.error("[hub] importEventContent failed:", error);
    const status = /not found|own event|nothing to import/i.test(message) ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
