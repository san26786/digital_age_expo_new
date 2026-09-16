/**
 * The logo files this site ships with, one per Branding slot.
 *
 * Deliberately its own module with NO imports: these constants are the fallback for both the
 * server-side resolver (src/lib/services/branding.ts, which pulls in Prisma and next/cache) and
 * the CLIENT-side Navbar. Importing the service from Navbar dragged revalidateTag/unstable_cache
 * into the browser bundle, which the App Router rejects outright at build time. A plain value
 * module can be imported from either side safely.
 */
export const DEFAULT_BRAND_ASSETS = {
  favicon: "/favicon.ico",
  primaryLogo: "/images/digitalageexpo_logo.png",
  secondaryLogo: "/images/logo.png",
  mobileLogo: "/images/logo.png",
  footerLogo: "/images/digitalageexpo_logo.png",
  loginLogo: "/images/logo.png",
} as const;

export type BrandAssets = { -readonly [K in keyof typeof DEFAULT_BRAND_ASSETS]: string };
