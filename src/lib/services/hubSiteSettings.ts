import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/db-errors";
import { getBrandAssets } from "@/lib/services/branding";
import { THEME_VARNAMES, isHexColour } from "@/lib/services/siteTheme";
import { SEO_VARNAMES } from "@/lib/services/siteSeo";
import { normaliseHost } from "@/lib/tenant";

/**
 * ===========================================================================
 *  EDITING ONE SITE'S IDENTITY
 * ===========================================================================
 *
 *  What the Hub's edit screen reads and writes. Everything here takes an explicit `siteId` —
 *  this code runs while serving site 150 and edits site 151, so nothing may resolve the site
 *  from the request.
 *
 *  ---------------------------------------------------------------------------
 *  THE FIELDS LIVE IN THREE DIFFERENT PLACES, AND THAT IS NOT A CHOICE
 *  ---------------------------------------------------------------------------
 *
 *    - Contact details, socials and the favicon are COLUMNS on find_domains, where the legacy
 *      platform put them.
 *    - The five logo slots are find_settings rows under grouptitle 'branding' — there are no
 *      columns for them, which is why the CP put them there.
 *    - The colours are find_settings rows under grouptitle 'theme', same reason.
 *
 *  Spreading one form across three storage shapes is the price of not migrating a live legacy
 *  schema. This module is where that price is paid, so the screen above it can present one form.
 *
 *  ---------------------------------------------------------------------------
 *  WHY THE SETTINGS WRITES ARE UPDATE-THEN-INSERT RATHER THAN AN UPSERT
 *  ---------------------------------------------------------------------------
 *
 *  find_settings has no primary key and no unique constraint (it is @@ignore'd in the Prisma
 *  schema for exactly that reason), so `ON CONFLICT` has nothing to conflict on and Prisma
 *  generates no delegate to upsert through. UPDATE first, INSERT only when it affected no rows,
 *  is the honest equivalent — and it keeps grouptitle correct, which matters more than it looks:
 *  getBrandAssets() selects `WHERE grouptitle = 'branding'`, so a logo written under the wrong
 *  group would save successfully and never be read.
 */

export interface SiteSettings {
  id: number;
  name: string;
  brand: string;
  link: string;
  email: string;
  phone: string;
  address: string;
  active: boolean;
  /** find_domains.fav — the browser-tab icon. */
  favicon: string;
  facebook: string;
  instagram: string;
  youtube: string;
  twitter: string;
  linkedin: string;
  primaryLogo: string;
  secondaryLogo: string;
  mobileLogo: string;
  footerLogo: string;
  loginLogo: string;
  primaryColour: string;
  secondaryColour: string;
  backgroundColour: string;
  surfaceAltColour: string;
  cardColour: string;
  navbarColour: string;
  footerColour: string;
  textColour: string;
  accentTextColour: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  /** What the site actually renders today, defaults included — for the previews on the form. */
  resolved: { favicon: string; primaryLogo: string; footerLogo: string; mobileLogo: string };
}

const BRANDING_VARNAMES = {
  primaryLogo: "cp_branding_primary_logo",
  secondaryLogo: "cp_branding_secondary_logo",
  mobileLogo: "cp_branding_mobile_logo",
  footerLogo: "cp_branding_footer_logo",
  loginLogo: "cp_branding_login_logo",
} as const;

export async function getSiteSettings(siteId: number): Promise<SiteSettings | null> {
  const row = await safeQuery(
    () =>
      prisma.find_domains.findUnique({
        where: { id: siteId },
        select: {
          id: true,
          name: true,
          brand: true,
          link: true,
          email: true,
          phone: true,
          address: true,
          status: true,
          fav: true,
          facebook: true,
          instagram: true,
          youtube: true,
          twitter: true,
          linkedin: true,
        },
      }),
    null
  );

  if (!row) return null;

  const settings = await safeQuery<{ varname: string; value: string | null }[]>(
    () => prisma.$queryRaw`
      SELECT varname, value FROM find_settings
      WHERE "DOMAIN" = ${siteId} AND grouptitle IN ('branding', 'theme', 'seo')
    `,
    []
  );

  const byName = new Map<string, string>(
    settings.map((entry) => [entry.varname, (entry.value ?? "").trim()])
  );
  const get = (varname: string) => byName.get(varname) ?? "";

  // What the site would actually show right now, defaults and all — so the previews on the form
  // are the site as it is, not the form as it was filled in.
  const resolved = await getBrandAssets(siteId);

  return {
    id: row.id,
    name: row.name ?? "",
    brand: row.brand ?? "",
    link: row.link ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    address: row.address ?? "",
    active: row.status,
    favicon: row.fav ?? "",
    facebook: row.facebook ?? "",
    instagram: row.instagram ?? "",
    youtube: row.youtube ?? "",
    twitter: row.twitter ?? "",
    linkedin: row.linkedin ?? "",
    primaryLogo: get(BRANDING_VARNAMES.primaryLogo),
    secondaryLogo: get(BRANDING_VARNAMES.secondaryLogo),
    mobileLogo: get(BRANDING_VARNAMES.mobileLogo),
    footerLogo: get(BRANDING_VARNAMES.footerLogo),
    loginLogo: get(BRANDING_VARNAMES.loginLogo),
    primaryColour: get(THEME_VARNAMES.primary),
    secondaryColour: get(THEME_VARNAMES.secondary),
    backgroundColour: get(THEME_VARNAMES.background),
    surfaceAltColour: get(THEME_VARNAMES.surfaceAlt),
    cardColour: get(THEME_VARNAMES.card),
    navbarColour: get(THEME_VARNAMES.navbar),
    footerColour: get(THEME_VARNAMES.footer),
    textColour: get(THEME_VARNAMES.text),
    accentTextColour: get(THEME_VARNAMES.accentText),
    metaTitle: get(SEO_VARNAMES.metaTitle),
    metaDescription: get(SEO_VARNAMES.metaDescription),
    metaKeywords: get(SEO_VARNAMES.metaKeywords),
    canonicalUrl: get(SEO_VARNAMES.canonicalUrl),
    ogTitle: get(SEO_VARNAMES.ogTitle),
    ogDescription: get(SEO_VARNAMES.ogDescription),
    ogImage: get(SEO_VARNAMES.ogImage),
    twitterTitle: get(SEO_VARNAMES.twitterTitle),
    twitterDescription: get(SEO_VARNAMES.twitterDescription),
    twitterImage: get(SEO_VARNAMES.twitterImage),
    resolved: {
      favicon: resolved.favicon,
      primaryLogo: resolved.primaryLogo,
      footerLogo: resolved.footerLogo,
      mobileLogo: resolved.mobileLogo,
    },
  };
}

export type SiteSettingsInput = Partial<
  Omit<SiteSettings, "id" | "resolved" | "active">
> & { active?: boolean };

/** One find_settings row, written where it does not exist and updated where it does. */
async function writeSetting(
  siteId: number,
  varname: string,
  grouptitle: "branding" | "theme" | "seo",
  value: string
): Promise<void> {
  const updated = await prisma.$executeRaw`
    UPDATE find_settings SET value = ${value}
    WHERE varname = ${varname} AND "DOMAIN" = ${siteId}
  `;

  if (updated === 0) {
    await prisma.$executeRaw`
      INSERT INTO find_settings
        (varname, grouptitle, value, optioncode_type, optioncode_parse_type, "DOMAIN")
      VALUES (
        ${varname}, ${grouptitle}, ${value},
        'text'::find_settings_optioncode_type, 'static'::find_settings_optioncode_parse_type,
        ${siteId}
      )
    `;
  }
}

/**
 * Save the edits.
 *
 * Only keys actually present in `input` are touched — the form sends what it holds, and a field
 * it never rendered must not be blanked because it arrived undefined. An empty STRING is a real
 * value and does clear a field; that is how you remove a logo.
 */
export async function saveSiteSettings(siteId: number, input: SiteSettingsInput): Promise<void> {
  const domainData: Record<string, unknown> = {};
  const put = (column: string, value: string | undefined) => {
    if (value !== undefined) domainData[column] = value;
  };

  put("name", input.name?.trim());
  put("brand", input.brand?.trim());
  put("email", input.email?.trim());
  put("phone", input.phone?.trim());
  put("address", input.address?.trim());
  put("fav", input.favicon?.trim());
  put("facebook", input.facebook?.trim());
  put("instagram", input.instagram?.trim());
  put("youtube", input.youtube?.trim());
  put("twitter", input.twitter?.trim());
  put("linkedin", input.linkedin?.trim());
  if (input.active !== undefined) domainData.status = input.active;

  /*
   * ---------------------------------------------------------------------------
   *  THE HOST — EDITABLE, BUT NOT AS AN ORDINARY TEXT FIELD
   * ---------------------------------------------------------------------------
   *
   *  This was deliberately left out at first, on the grounds that `link` is what resolveSiteId()
   *  matches a request against: changing it renames the site's front door. That reasoning was
   *  right about the danger and wrong about the conclusion — a site created with a typo in its
   *  domain had no way to ever be corrected, which is worse.
   *
   *  So it is editable, with the three guards the original comment said it would need:
   *
   *    1. NORMALISED before it is stored. Scheme, `www.` and any path are stripped, so what goes
   *       in is what the resolver compares against and two spellings of one host cannot both
   *       exist.
   *    2. UNIQUE across every other site. Two rows sharing a host makes which one answers a
   *       matter of `ORDER BY id` — a coin toss deciding whose brand a visitor sees.
   *    3. NEVER BLANK. A site with no host can never be reached by anything.
   *
   *  It is also only written when it actually CHANGES. Without that, opening the form and saving
   *  an unrelated field would rewrite Digital Age Expo's stored `https://digitalageexpo.com` to
   *  the bare `digitalageexpo.com` — harmless to the resolver, but a silent edit to a live row
   *  nobody asked for.
   */
  if (input.link !== undefined) {
    const host = normaliseHost(input.link);

    if (!host) {
      throw new Error("A website address is required — a site with no host can never be reached.");
    }
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host)) {
      throw new Error(`"${input.link}" is not a hostname. Example: b2bgrowthexpo.com`);
    }

    const current = await prisma.find_domains.findUnique({
      where: { id: siteId },
      select: { link: true },
    });

    if (normaliseHost(current?.link) !== host) {
      const others = await prisma.find_domains.findMany({
        where: { id: { not: siteId } },
        select: { id: true, name: true, link: true },
      });
      const clash = others.find((row) => normaliseHost(row.link) === host);
      if (clash) {
        throw new Error(`${host} is already used by ${clash.name || "another site"} (site #${clash.id}).`);
      }
      domainData.link = host;
    }
  }


  if (Object.keys(domainData).length > 0) {
    await prisma.find_domains.update({ where: { id: siteId }, data: domainData });
  }

  for (const [key, varname] of Object.entries(BRANDING_VARNAMES) as [
    keyof typeof BRANDING_VARNAMES,
    string,
  ][]) {
    const value = input[key];
    if (value !== undefined) await writeSetting(siteId, varname, "branding", value.trim());
  }

  const colours: [string | undefined, string][] = [
    [input.primaryColour, THEME_VARNAMES.primary],
    [input.secondaryColour, THEME_VARNAMES.secondary],
    [input.backgroundColour, THEME_VARNAMES.background],
    [input.surfaceAltColour, THEME_VARNAMES.surfaceAlt],
    [input.cardColour, THEME_VARNAMES.card],
    [input.navbarColour, THEME_VARNAMES.navbar],
    [input.footerColour, THEME_VARNAMES.footer],
    [input.textColour, THEME_VARNAMES.text],
    [input.accentTextColour, THEME_VARNAMES.accentText],
  ];

  /*
   * SEO is plain text, so unlike the colours it needs no validation beyond trimming — an empty
   * string is a real value meaning "this site has not set one", which is what makes the layout
   * fall back to the title derived from the site name.
   */
  const seoFields: [string | undefined, string][] = [
    [input.metaTitle, SEO_VARNAMES.metaTitle],
    [input.metaDescription, SEO_VARNAMES.metaDescription],
    [input.metaKeywords, SEO_VARNAMES.metaKeywords],
    [input.canonicalUrl, SEO_VARNAMES.canonicalUrl],
    [input.ogTitle, SEO_VARNAMES.ogTitle],
    [input.ogDescription, SEO_VARNAMES.ogDescription],
    [input.ogImage, SEO_VARNAMES.ogImage],
    [input.twitterTitle, SEO_VARNAMES.twitterTitle],
    [input.twitterDescription, SEO_VARNAMES.twitterDescription],
    [input.twitterImage, SEO_VARNAMES.twitterImage],
  ];

  for (const [value, varname] of seoFields) {
    if (value !== undefined) await writeSetting(siteId, varname, "seo", value.trim());
  }

  for (const [value, varname] of colours) {
    if (value === undefined) continue;
    const trimmed = value.trim();
    // Anything that is not a hex colour is stored as "" rather than rejected: the alternative is
    // failing a whole save over one malformed field, and "" is the value that means "this site
    // has not chosen a colour", which is precisely what a colour we cannot use amounts to.
    await writeSetting(siteId, varname, "theme", isHexColour(trimmed) ? trimmed.toLowerCase() : "");
  }
}
