import { prisma } from "@/lib/prisma";
import { CACHE_TAGS, cachedRead } from "@/lib/cache";
import { DOMAIN_ID } from "@/lib/site-config";
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

const readBrandingSettings = cachedRead(
  ["domain", "brandingAssets"],
  async function readBrandingSettings(): Promise<Record<string, string>> {
    const [rows, domain] = await Promise.all([
      prisma.$queryRaw<{ varname: string; value: string | null }[]>`
        SELECT varname, value FROM find_settings
        WHERE "DOMAIN" = ${DOMAIN_ID} AND grouptitle = 'branding'
      `,
      prisma.find_domains.findUnique({ where: { id: DOMAIN_ID }, select: { fav: true } }),
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

export async function getBrandAssets(): Promise<BrandAssets> {
  let settings: Record<string, string> = {};
  try {
    settings = await readBrandingSettings();
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
}
