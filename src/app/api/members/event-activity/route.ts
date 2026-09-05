import { NextResponse } from "next/server";
import { requireEventMember } from "@/lib/auth/requireEventMember";
import { canManageLobby } from "@/lib/services/eventAccess";
import { getActivityFeed, ACTIVITY_PAGE_SIZE } from "@/lib/services/eventActivityReport";

/**
 * Paging for the User Activity Report's "Load More".
 *
 * The legacy did this by POSTing to the page itself with `loadMore=1` and echoing a blob of
 * server-rendered HTML back into the timeline. This returns DATA instead, so the markup lives in
 * one place (the component) rather than being duplicated in a PHP string builder and a template.
 */

/** YYYY-MM-DD or nothing — anything else is dropped rather than passed to the query. */
function dateParam(value: string | null): string | null {
  if (!value) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

export async function GET(request: Request) {
  const context = await requireEventMember(request);
  if ("error" in context) return context.error;

  if (!canManageLobby(context)) {
    return NextResponse.json({ error: "You cannot view this event's activity." }, { status: 403 });
  }

  const url = new URL(request.url);
  const userId = Number(url.searchParams.get("user_id")) || null;
  const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);

  const page = await getActivityFeed(context, {
    userId,
    from: dateParam(url.searchParams.get("from")),
    to: dateParam(url.searchParams.get("to")),
    offset,
    limit: ACTIVITY_PAGE_SIZE,
  });

  return NextResponse.json(page);
}
