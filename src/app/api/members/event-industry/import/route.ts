import { NextResponse } from "next/server";
import { requireEventMember } from "@/lib/auth/requireEventMember";
import { importIndustries } from "@/lib/services/eventIndustry";

/** Guards against a mis-picked file turning into a very large insert. */
const MAX_ROWS = 2000;

/**
 * Bulk CSV import for the Event Industry list — the counterpart to the page's Export CSV.
 * The browser parses the file and posts plain rows; validation, duplicate detection and the
 * insert all happen server-side (see importIndustries).
 */
export async function POST(request: Request) {
  const context = await requireEventMember();
  if ("error" in context) return context.error;

  if (context.role !== "organiser") {
    return NextResponse.json({ error: "Only organisers manage the industry list." }, { status: 403 });
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
    const result = await importIndustries(rows as never);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error("[event-industry/import] failed:", err);
    return NextResponse.json({ error: "The import failed. No partial rows were kept." }, { status: 500 });
  }
}
