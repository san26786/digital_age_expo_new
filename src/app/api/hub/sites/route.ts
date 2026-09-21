import { NextResponse } from "next/server";
import { getSitesHubAccess } from "@/lib/hub/access";
import { createSite } from "@/lib/services/hubCreateSite";
import { COPY_TOGGLE_KEYS, noCopySelections, type CopyToggleKey } from "@/lib/hub/copyOptions";

export const dynamic = "force-dynamic";

/** Strips scheme, www., path and trailing dots. Mirrors the form, because the form is not trusted. */
function normaliseHost(value: string): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .replace(/\.+$/, "");
}

function slugify(value: string): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Create a site.
 *
 * EVERY FIELD IS RE-VALIDATED HERE even though the form already refuses to submit without them.
 * The form's checks exist to give someone typing a useful message; they are not a security
 * boundary, because this endpoint can be called without the form. The rule this follows is the
 * ordinary one — the client decides what is convenient, the server decides what is allowed — and
 * it matters more than usual for an endpoint whose job is to write several thousand rows.
 *
 * Unknown toggle keys are dropped rather than rejected, and every toggle absent from the request
 * defaults to OFF. A request that arrives garbled therefore copies too little, never too much.
 */
export async function POST(request: Request) {
  const access = await getSitesHubAccess();
  if (!access.ok) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }

  const domain = normaliseHost(body.domain as string);
  const name = String(body.name ?? "").trim();
  const slug = slugify(body.slug as string) || slugify(name);
  const sourceDomainId = Number(body.sourceDomainId);
  const sourceEventId = Number(body.sourceEventId);

  const problems: string[] = [];
  if (!domain) problems.push("A domain is required.");
  else if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain)) problems.push("The domain is not a hostname.");
  if (!name) problems.push("A site name is required.");
  if (!slug) problems.push("A slug is required.");
  if (!Number.isInteger(sourceDomainId) || sourceDomainId <= 0) problems.push("A source site is required.");
  if (!Number.isInteger(sourceEventId) || sourceEventId <= 0) problems.push("A source event is required.");

  if (problems.length > 0) {
    return NextResponse.json({ error: problems.join(" ") }, { status: 400 });
  }

  const requested = (body.selections ?? {}) as Record<string, unknown>;
  const selections = noCopySelections();
  for (const key of COPY_TOGGLE_KEYS) {
    selections[key as CopyToggleKey] = requested[key] === true;
  }

  try {
    const result = await createSite(
      {
        domain,
        name,
        slug,
        year: String(body.year ?? "").replace(/[^0-9]/g, "").slice(0, 4),
        email: String(body.email ?? "").trim(),
        company: String(body.company ?? "").trim(),
        sourceDomainId,
        sourceEventId,
        heroLayout: String(body.heroLayout ?? ""),
        colourScheme: String(body.colourScheme ?? ""),
        selections,
        exhibitorMode: body.exhibitorMode === "allocated" ? "allocated" : "unallocated",
      },
      access.email ?? (access.userId !== null ? `user ${access.userId}` : null)
    );

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The site could not be created.";
    console.error("[hub] createSite failed:", error);
    // 409 rather than 500 for the one failure that is the caller's to fix.
    const status = /already used|not found/i.test(message) ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
