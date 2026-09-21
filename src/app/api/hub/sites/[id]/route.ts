import { NextResponse } from "next/server";
import { CACHE_TAGS, markContentStale } from "@/lib/cache";
import { canEditSite, getSitesHubAccess } from "@/lib/hub/access";
import { removeHubSite } from "@/lib/services/hubCreateSite";
import { saveSiteSettings, type SiteSettingsInput } from "@/lib/services/hubSiteSettings";

export const dynamic = "force-dynamic";

/**
 * Delete a Hub-created site and everything created with it.
 *
 * The real protection is in `removeHubSite` — it refuses DOMAIN_ID, refuses any site without the
 * Hub's own provenance marker, and takes the event to clear from that marker rather than from
 * anything the caller sends. This route adds only the access check and the id parse, and it is
 * DELETE rather than POST so no link, prefetch or crawler can ever reach it.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await getSitesHubAccess();
  if (!access.ok) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  const { id } = await params;
  const domainId = Number(id);
  if (!Number.isInteger(domainId) || domainId <= 0) {
    return NextResponse.json({ error: "A positive integer site id is required" }, { status: 400 });
  }

  try {
    const result = await removeHubSite(domainId);
    markContentStale(CACHE_TAGS.domain);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The site could not be removed.";
    console.error("[hub] removeHubSite failed:", error);
    return NextResponse.json({ error: message }, { status: 409 });
  }
}

/** The fields the edit screen may change. The host is not among them — see saveSiteSettings. */
const EDITABLE = [
  "name",
  "brand",
  // The host. Guarded in saveSiteSettings — normalised, checked for uniqueness, never blanked —
  // because it decides which requests reach this site, not merely what it says on a page.
  "link",
  "email",
  "phone",
  "address",
  "favicon",
  "facebook",
  "instagram",
  "youtube",
  "twitter",
  "linkedin",
  "primaryLogo",
  "secondaryLogo",
  "mobileLogo",
  "footerLogo",
  "loginLogo",
  "primaryColour",
  "secondaryColour",
  "backgroundColour",
  "surfaceAltColour",
  "cardColour",
  "navbarColour",
  "footerColour",
  "textColour",
  "accentTextColour",
  "metaTitle",
  "metaDescription",
  "metaKeywords",
  "canonicalUrl",
  "ogTitle",
  "ogDescription",
  "ogImage",
  "twitterTitle",
  "twitterDescription",
  "twitterImage",
] as const;

/**
 * Save one site's branding, theme and contact details.
 *
 * ---------------------------------------------------------------------------
 *  AN ALLOWLIST, NOT THE REQUEST BODY
 * ---------------------------------------------------------------------------
 *
 *  Only the keys in EDITABLE are read, and each is coerced to a string. Passing the parsed body
 *  through to saveSiteSettings would let a caller name any find_domains column it liked — and
 *  that table holds `status`, the payment credentials and `link`, the host every request is
 *  matched against. Taking only what is listed means an unexpected key is ignored rather than
 *  trusted; `active` is handled separately below because it is the one boolean.
 *
 *  Undefined keys are LEFT OUT rather than sent as empty. The distinction matters: the form sends
 *  what it rendered, and a field it never showed must not be blanked because it arrived
 *  undefined. An empty string is a real value and does clear a field — that is how a logo is
 *  reset to the bundled default.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const siteId = Number(id);
  if (!Number.isInteger(siteId) || siteId <= 0) {
    return NextResponse.json({ error: "A positive integer site id is required" }, { status: 400 });
  }

  /*
   * The id is parsed BEFORE the access check, because the check needs it: a site may be edited by
   * whoever manages every site, or by an organiser on that site itself (see canEditSite). The
   * comparison is against the serving host, never against anything in this request's body.
   */
  if (!(await canEditSite(siteId))) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }

  const input: SiteSettingsInput = {};
  for (const key of EDITABLE) {
    if (body[key] !== undefined) {
      (input as Record<string, unknown>)[key] = String(body[key] ?? "");
    }
  }
  if (typeof body.active === "boolean") input.active = body.active;

  if (Object.keys(input).length === 0) {
    return NextResponse.json({ error: "Nothing to save." }, { status: 400 });
  }

  try {
    await saveSiteSettings(siteId, input);

    /*
     * Bust the `domain` tag, or nothing changes on screen for up to a full revalidate window.
     *
     * Every read this touches — getDomain, getBrandAssets, getSiteTheme — is a cachedRead tagged
     * `domain`, and they render in the ROOT LAYOUT, on every page. Without this the save would
     * succeed, the database would be right, and the site would keep showing the old logo, which
     * reads as a broken save rather than a cache.
     *
     * markContentStale rather than revalidateContent: the latter is built on updateTag, which
     * throws outside a Server Action, and this is a route handler. That exact mistake made
     * /api/diag/zone return a 500 earlier in this project.
     */
    markContentStale(CACHE_TAGS.domain);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The changes could not be saved.";
    console.error("[hub] saveSiteSettings failed:", error);
    // A host clash, a blank host or a malformed one are all the caller's to fix, not faults.
    const status = /already used|is required|not a hostname/i.test(message) ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
