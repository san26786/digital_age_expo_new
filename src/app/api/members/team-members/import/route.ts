import { NextResponse } from "next/server";
import { requireEventMember } from "@/lib/auth/requireEventMember";
import { importTeamMembers } from "@/lib/services/eventTeamMembers";

/** Guards against a mis-picked file turning into a very large insert. */
const MAX_ROWS = 2000;

/**
 * Bulk CSV import for the Event Team Members list — counterpart to its Export CSV.
 *
 * No extra role gate here beyond requireEventMember: event_member.php lets any member manage
 * their own team, and the service stamps every imported row with this member's own
 * member_user_id and listing, so an exhibitor can only ever import into their own team.
 */
export async function POST(request: Request) {
  const context = await requireEventMember();
  if ("error" in context) return context.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Could not read the request body." }, { status: 400 });
  }

  const rows = (body as { rows?: unknown })?.rows;
  if (!Array.isArray(rows)) {
    return NextResponse.json({ error: "Expected a `rows` array." }, { status: 400 });
  }
  if (rows.length === 0) {
    return NextResponse.json({ error: "That file has no data rows." }, { status: 400 });
  }
  if (rows.length > MAX_ROWS) {
    return NextResponse.json(
      { error: `That file has ${rows.length} rows; the limit is ${MAX_ROWS}.` },
      { status: 400 },
    );
  }

  try {
    const result = await importTeamMembers(context, rows as never);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error("[team-members/import] failed:", err);
    return NextResponse.json({ error: "The import failed. No partial rows were kept." }, { status: 500 });
  }
}
