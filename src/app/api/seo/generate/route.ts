import { NextResponse } from "next/server";
import { z } from "zod";
import { canEditSite } from "@/lib/hub/access";
import { CP_PERMISSIONS, getCpSession, hasPermission } from "@/lib/cp/rbac";
import { generateSeoFields } from "@/lib/seo/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ===========================================================================
 *  POST /api/seo/generate — writes the eight metadata fields for one site
 * ===========================================================================
 *
 *  Serves the "Auto Generate SEO" button on BOTH screens that edit this
 *  metadata: the Hub's Site Edit form (Meta / SEO tab) and the CP's
 *  Settings -> SEO tab. It returns the fields; it writes nothing. The admin
 *  reviews what came back in the form and presses Save, exactly as if they had
 *  typed it — which is the whole reason this is a route and not part of the
 *  save action.
 *
 *  WHY IT IS GUARDED. Every call can spend money at a third party, so an
 *  unauthenticated endpoint here is a bill someone else can run up. Two ways in,
 *  matching the two screens: Hub edit rights for the site being edited, or a CP
 *  session carrying SETTINGS_EDIT. Neither screen is reachable without one of
 *  those anyway; this stops the ROUTE being reachable without them.
 *
 *  WHY THE FACTS COME FROM THE CLIENT. The generator works from what is ON THE
 *  FORM, including edits not yet saved — an admin who has just retyped the
 *  title expects the copy to follow it, not the row it replaced. Nothing here is
 *  persisted and the output returns to the same session, so accepting them costs
 *  nothing; they are length-capped below so the prompt cannot be inflated, and
 *  everything the model returns is stripped of markup and clamped by
 *  coerceSeoFields before it reaches the page.
 */

/** Generous enough for a real event description, small enough to bound the prompt. */
const SHORT = 300;
const LONG = 4000;

const bodySchema = z.object({
  siteId: z.number().int().positive().optional(),
  siteName: z.string().max(SHORT).optional().default(""),
  brand: z.string().max(SHORT).optional().default(""),
  link: z.string().max(SHORT).optional().default(""),
  eventTitle: z.string().max(SHORT).optional().default(""),
  eventDescription: z.string().max(LONG).optional().default(""),
  location: z.string().max(SHORT).optional().default(""),
  dateStart: z.string().max(64).optional().default(""),
  dateEnd: z.string().max(64).optional().default(""),
  currentTitle: z.string().max(SHORT).optional().default(""),
  currentDescription: z.string().max(LONG).optional().default(""),
});

/**
 * One generation at a time per signed-in person, with a short floor between them.
 *
 * In-memory and per-process, so it is a courtesy brake on a double-click or a stuck
 * finger rather than a real quota — on several instances each keeps its own map. That is
 * the right size of mechanism for a button only admins can reach; a shared counter would
 * need a store this app does not have.
 */
const RATE_LIMIT_MS = 3000;
const lastCallByKey = new Map<string, number>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const previous = lastCallByKey.get(key);
  if (previous && now - previous < RATE_LIMIT_MS) return true;

  lastCallByKey.set(key, now);
  // The map is keyed by admin, so it stays small; this keeps it from growing without bound
  // across a long-lived process.
  if (lastCallByKey.size > 500) {
    for (const [entry, at] of lastCallByKey) {
      if (now - at > RATE_LIMIT_MS * 10) lastCallByKey.delete(entry);
    }
  }
  return false;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "A JSON body is required." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Those site details could not be read." }, { status: 400 });
  }
  const input = parsed.data;

  const cpSession = await getCpSession();
  const viaCp = hasPermission(cpSession, CP_PERMISSIONS.SETTINGS_EDIT);
  const viaHub = input.siteId ? await canEditSite(input.siteId) : false;

  if (!viaCp && !viaHub) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  const key = cpSession?.email || (input.siteId ? `site:${input.siteId}` : "anonymous");
  if (rateLimited(key)) {
    return NextResponse.json({ error: "Just a moment — try that again in a second." }, { status: 429 });
  }

  const result = await generateSeoFields({
    siteName: input.siteName,
    brand: input.brand,
    link: input.link,
    eventTitle: input.eventTitle,
    eventDescription: input.eventDescription,
    location: input.location,
    dateStart: input.dateStart || null,
    dateEnd: input.dateEnd || null,
    currentTitle: input.currentTitle,
    currentDescription: input.currentDescription,
  });

  return NextResponse.json(result);
}
