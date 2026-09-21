import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { CACHE_TAGS, cachedRead } from "@/lib/cache";
import { resolveSiteId } from "@/lib/tenant";
import { DEFAULT_BRAND_ASSETS, type BrandAssets } from "@/lib/constants/brandAssets";

/**
 * ===========================================================================
 *  BRAND ASSETS — what the header, footer and login screens actually show
 * ===========================================================================
 *
 *  Settings -> Branding wrote six logo slots to find_settings/find_domains and
 *  nothing read them: the header logo was a literal "/images/digitalageexpo_logo.png"
 *  in Navbar.tsx, the mobile drawer used "/images/logo.png", and the footer had
 *  its own copy of the first. Uploading a new logo in the CP changed none of them.
 *
 *  Each slot below resolves to the saved value if there is one, and otherwise to
 *  the exact file that component was already hardcoding — so the site renders
 *  identically until someone deliberately uploads something else.
 *
 *  The bundled fallbacks themselves live in src/lib/constants/brandAssets.ts, an
 *  import-free module, because the CLIENT Navbar needs them too and everything it
 *  imports is bundled for the browser. This file pulls in Prisma and next/cache,
 *  which the App Router rejects outright in a client bundle.
 */

export { DEFAULT_BRAND_ASSETS, type BrandAssets };

/*
 * `siteId` IS AN ARGUMENT, AND THAT IS THE WHOLE POINT OF THIS SIGNATURE.
 *
 * This read used the DOMAIN_ID constant and took no arguments. cachedRead folds a function's
 * arguments into its cache key, so a zero-argument cached read has ONE entry shared by every
 * tenant: whichever site warmed it first would have had its logos served to every other site for
 * the whole revalidate window. On a single-tenant app that was invisible and harmless. The moment
 * a second site existed it would have been a brand leaking across brands, presenting as an
 * intermittent caching oddity rather than as the tenancy bug it is.
 */
const readBrandingSettings = cachedRead(
  ["domain", "brandingAssets"],
  async function readBrandingSettings(siteId: number): Promise<Record<string, string>> {
    const [rows, domain] = await Promise.all([
      prisma.$queryRaw<{ varname: string; value: string | null }[]>`
        SELECT varname, value FROM find_settings
        WHERE "DOMAIN" = ${siteId} AND grouptitle = 'branding'
      `,
      prisma.find_domains.findUnique({ where: { id: siteId }, select: { fav: true } }),
    ]);

    const settings = Object.fromEntries(
      rows.map((row: { varname: string; value: string | null }) => [row.varname, row.value ?? ""])
    );
    // The favicon predates this module and lives on its own find_domains column, not in
    // find_settings — folded in here so callers have one shape to read.
    settings.fav = domain?.fav ?? "";
    return settings;
  },
  { tags: [CACHE_TAGS.domain] }
);

/**
 * @param siteId which site's branding to read. Omitted, it resolves from the request's host —
 *   which is what every caller inside a page render wants. Passed explicitly by the Hub editor,
 *   which is showing one site's branding while being served by another.
 *
 * WRAPPED IN React cache(), AND THAT IS NOT AN OPTIMISATION — IT IS LOAD-BEARING.
 *
 * This is called at least twice on every single page: once by generateMetadata() for the favicon
 * and once by <Header>, both in the ROOT layout. Unmemoised, each call re-resolved the site and
 * re-read the branding rows, and this app's pool is ten connections wide (DATABASE_POOL_SIZE=10,
 * set deliberately after a db-ping report). Adding a handful of reads to the root layout is
 * exactly how a page goes from slow to 500: the admission queue backs up, connections wait out
 * the 30s acquire timeout, and the whole render fails with "Connection terminated due to
 * connection timeout".
 *
 * cache() is request-scoped and keyed on the argument, so `getBrandAssets()` and
 * `getBrandAssets(151)` remain correctly separate while each runs once per request.
 */
export const getBrandAssets = cache(async function getBrandAssets(
  siteId?: number
): Promise<BrandAssets> {
  const resolved = siteId ?? (await resolveSiteId());

  let settings: Record<string, string> = {};
  try {
    settings = await readBrandingSettings(resolved);
  } catch (error) {
    console.warn("[branding] could not read brand assets; using the bundled defaults", error);
  }

  const pick = (varname: string, fallback: string) => (settings[varname] ?? "").trim() || fallback;

  return {
    favicon: pick("fav", DEFAULT_BRAND_ASSETS.favicon),
    primaryLogo: pick("cp_branding_primary_logo", DEFAULT_BRAND_ASSETS.primaryLogo),
    secondaryLogo: pick("cp_branding_secondary_logo", DEFAULT_BRAND_ASSETS.secondaryLogo),
    mobileLogo: pick("cp_branding_mobile_logo", DEFAULT_BRAND_ASSETS.mobileLogo),
    footerLogo: pick("cp_branding_footer_logo", DEFAULT_BRAND_ASSETS.footerLogo),
    loginLogo: pick("cp_branding_login_logo", DEFAULT_BRAND_ASSETS.loginLogo),
  };
});
