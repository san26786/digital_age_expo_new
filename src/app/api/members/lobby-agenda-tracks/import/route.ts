import { NextResponse } from "next/server";
import { requireEventMember } from "@/lib/auth/requireEventMember";
import { getPrimaryLobby } from "@/lib/services/eventLobby";
import { importAgendaTracks, getAgendaLayoutOptions } from "@/lib/services/eventLobbyAgendaItems";

/** Guards against a mis-picked file turning into a very large insert. */
const MAX_ROWS = 2000;

/** Bulk CSV import for the Lobby Agenda list — counterpart to its Export CSV. */
export async function POST(request: Request) {
  const context = await requireEventMember();
  if ("error" in context) return context.error;

  if (context.role !== "organiser") {
    return NextResponse.json({ error: "Only the event organiser can import agendas." }, { status: 403 });
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

  // event_layout_id is NOT NULL, so every imported row needs a home. Rows naming a layout are
  // matched by name inside the service; this is the fallback for the rest.
  const lobby = await getPrimaryLobby(context);
  const layouts = await getAgendaLayoutOptions(context);
  const fallbackLayoutId = lobby?.id ?? layouts[0]?.id ?? null;
  if (!fallbackLayoutId) {
    return NextResponse.json(
      { error: "Set up the parent lobby on the Configure Lobby page before importing agendas." },
      { status: 400 },
    );
  }

  try {
    const result = await importAgendaTracks(context, rows as never, fallbackLayoutId);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error("[lobby-agenda-tracks/import] failed:", err);
    return NextResponse.json({ error: "The import failed. No partial rows were kept." }, { status: 500 });
  }
}
