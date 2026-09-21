import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { CACHE_TAGS, cachedRead } from "@/lib/cache";
import { resolveSiteId } from "@/lib/tenant";

/**
 * ===========================================================================
 *  SEO — AND, AGAIN, THE FACT THAT NOTHING WAS READING IT
 * ===========================================================================
 *
 *  `src/app/cp/(shell)/settings/seo/` has written ten `cp_seo_*` values for some time: meta
 *  title, description and keywords, a canonical URL, and Open Graph / Twitter titles,
 *  descriptions and images. A grep for `cp_seo_` outside that folder returns nothing. Every one
 *  of them saved and none of them ever reached a page.
 *
 *  That is the third time the same shape has turned up in this codebase — the six branding logo
 *  slots, the nine theme colours, now the ten SEO fields. Each was a settings page wired to the
 *  database and not to the site. So the Hub's Meta tab could not simply be another writer of
 *  these rows; it had to come with the reader that makes them true.
 *
 *  ---------------------------------------------------------------------------
 *  EVERY FIELD IS OPTIONAL AND FALLS BACK TO WHAT THE PAGE DID BEFORE
 *  ---------------------------------------------------------------------------
 *
 *  A site that has set nothing gets exactly the metadata it had — title from the site name,
 *  description generated from it — so Digital Age Expo is unchanged until somebody deliberately
 *  fills a field in. Open Graph and Twitter fall back to the meta title and description rather
 *  than to nothing, because a share card with a blank title is worse than one that repeats the
 *  page's own.
 */
export const SEO_VARNAMES = {
  metaTitle: "cp_seo_meta_title",
  metaDescription: "cp_seo_meta_description",
  metaKeywords: "cp_seo_meta_keywords",
  canonicalUrl: "cp_seo_canonical_url",
  ogTitle: "cp_seo_og_title",
  ogDescription: "cp_seo_og_description",
  ogImage: "cp_seo_og_image",
  twitterTitle: "cp_seo_twitter_title",
  twitterDescription: "cp_seo_twitter_description",
  twitterImage: "cp_seo_twitter_image",
} as const;

export type SiteSeo = Partial<Record<keyof typeof SEO_VARNAMES, string>>;

const readSeoSettings = cachedRead(
  ["domain", "seoSettings"],
  async function readSeoSettings(siteId: number): Promise<Record<string, string>> {
    const rows = await prisma.$queryRaw<{ varname: string; value: string | null }[]>`
      SELECT varname, value FROM find_settings
      WHERE "DOMAIN" = ${siteId} AND grouptitle = 'seo'
    `;
    return Object.fromEntries(rows.map((row) => [row.varname, (row.value ?? "").trim()]));
  },
  { tags: [CACHE_TAGS.domain] }
);

/**
 * Memoised per request for the same reason resolveSiteId and getSiteTheme are: this runs in the
 * root layout's generateMetadata, on every page, against a ten-connection pool.
 */
export const getSiteSeo = cache(async function getSiteSeo(siteId?: number): Promise<SiteSeo> {
  const resolved = siteId ?? (await resolveSiteId());

  let rows: Record<string, string> = {};
  try {
    rows = await readSeoSettings(resolved);
  } catch {
    // Metadata nobody can read is no metadata: the page keeps the title it derives from the site
    // name, which is a perfectly good title, rather than failing to render at all.
    return {};
  }

  const seo: SiteSeo = {};
  for (const [key, varname] of Object.entries(SEO_VARNAMES) as [keyof typeof SEO_VARNAMES, string][]) {
    const value = rows[varname];
    if (value) seo[key] = value;
  }
  return seo;
});
