import { NextResponse } from "next/server";
import { getSitesHubAccess } from "@/lib/hub/access";
import { dryRunCounts } from "@/lib/services/hubSites";

export const dynamic = "force-dynamic";

/**
 * How many rows each toggle would actually copy, for one source event.
 *
 * Its own route rather than part of the page's data because the source event changes while the
 * form is open — that is the whole point of the picker — and re-rendering the server page on
 * every change of a select would throw away everything typed into the form above it.
 *
 * GATED LIKE THE PAGES ARE. It is tempting to treat counts as harmless, but this endpoint will
 * happily report how many registered visitors any event on the platform has to anyone who can
 * guess the URL. Same guard, same reasons.
 */
export async function GET(request: Request) {
  const access = await getSitesHubAccess();
  if (!access.ok) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  const eventId = Number(new URL(request.url).searchParams.get("event_id"));
  if (!Number.isInteger(eventId) || eventId <= 0) {
    return NextResponse.json({ error: "A positive integer event_id is required" }, { status: 400 });
  }

  const lines = await dryRunCounts(eventId);
  return NextResponse.json({ eventId, lines });
}
