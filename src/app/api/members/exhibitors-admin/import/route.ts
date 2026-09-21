import { NextResponse } from "next/server";
import { requireEventMember } from "@/lib/auth/requireEventMember";
import { importExhibitors } from "@/lib/services/eventExhibitorAdmin";

/** Guards against a mis-picked file turning into a very large insert. */
const MAX_ROWS = 2000;

/**
 * Bulk CSV import for the exhibitor list — counterpart to its Export CSV.
 *
 * The rows arriving here are the ones the admin ticked on the preview screen, not the whole file,
 * and each carries a `_row` field naming its position in the original file so the outcomes can be
 * read against the spreadsheet the admin still has open.
 *
 * The service classifies them AGAIN before inserting anything. The preview the admin approved was
 * a photograph of the event a minute or ten minutes ago; this is the only classification that
 * decides what is written.
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
    return NextResponse.json({ error: "No rows were selected." }, { status: 400 });
  }
  if (rows.length > MAX_ROWS) {
    return NextResponse.json(
      { error: `That file has ${rows.length} rows; the limit is ${MAX_ROWS}.` },
      { status: 400 },
    );
  }

  try {
    const result = await importExhibitors(context, rows as Record<string, string>[]);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error("[exhibitors-admin/import] failed:", err);
    return NextResponse.json({ error: "The import failed." }, { status: 500 });
  }
}
