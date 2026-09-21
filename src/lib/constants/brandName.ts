/**
 * The name shown when the database cannot say what this site is called.
 *
 * Its own import-free module for the same reason src/lib/constants/brandAssets.ts is one: both
 * the server resolver (src/lib/brand.ts, which pulls in Prisma) and the CLIENT provider need it,
 * and everything a client component imports is bundled for the browser.
 *
 * It is the MAIN site's name deliberately. This deployment's own fallback identity is Digital Age
 * Expo — that is what site-config.ts's DOMAIN_ID points at — so a sub-site that cannot be read
 * degrades to the main brand rather than to a blank or a placeholder.
 */
export const DEFAULT_BRAND_NAME = "Digital Age Expo";
