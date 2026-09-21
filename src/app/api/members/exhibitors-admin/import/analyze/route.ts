import { NextResponse } from "next/server";
import { requireEventMember } from "@/lib/auth/requireEventMember";
import { analyzeExhibitorImport } from "@/lib/services/eventExhibitorAdmin";

/** Same ceiling as the import itself; a file too big to insert is too big to classify. */
const MAX_ROWS = 2000;

/**
 * Dry run for the exhibitor CSV import: classify every row against this event and write nothing.
 *
 * Kept as its own route rather than a `?preview=1` flag on the import, so that the endpoint which
 * can create exhibitors and the endpoint the preview screen calls repeatedly are different URLs.
 * A read-only route cannot be made to write by a mistyped query string.
 */
export async function POST(request: Request) {
  const context = await requireEventMember();
  if ("error" in context) return context.error;

  if (context.role !== "organiser") {
    return NextResponse.json({ error: "Only the event organiser can import exhibitors." }, { status: 403 });
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
    const analysis = await analyzeExhibitorImport(context, rows as Record<string, string>[]);
    return NextResponse.json({ success: true, ...analysis });
  } catch (err) {
    console.error("[exhibitors-admin/import/analyze] failed:", err);
    return NextResponse.json({ error: "Could not analyse this file." }, { status: 500 });
  }
}
