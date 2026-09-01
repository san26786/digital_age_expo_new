import { NextResponse } from "next/server";
import { requireEventMember } from "@/lib/auth/requireEventMember";
import { importSponsors } from "@/lib/services/eventSponsorAdmin";

/** Guards against a mis-picked file turning into a very large insert. */
const MAX_ROWS = 5000;

/** Bulk CSV import for the sponsor list. */
export async function POST(request: Request) {
  const context = await requireEventMember();
  if ("error" in context) return context.error;

  if (context.role !== "organiser") {
    return NextResponse.json({ error: "Only the event organiser can import sponsors." }, { status: 403 });
  }

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
    const result = await importSponsors(context, rows as Record<string, string>[]);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error("[sponsors-admin/import] failed:", err);
    return NextResponse.json({ error: "The import failed." }, { status: 500 });
  }
}
