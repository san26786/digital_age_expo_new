import { prisma } from "@/lib/prisma";
import { CACHE_TAGS, cachedRead } from "@/lib/cache";
import { DOMAIN_ID } from "@/lib/site-config";
import { getDomain } from "@/lib/services/domain";

/**
 * ===========================================================================
 *  PUBLIC SOCIAL LINKS — what the site actually shows
 * ===========================================================================
 *
 *  The footer used to read five find_domains columns directly and render a link
 *  for every one that wasn't empty. That made the CP's Social Media tab half
 *  decorative: its Enabled checkbox and Order box were written to find_settings
 *  and then read by nobody, and TikTok/WhatsApp/Pinterest — which have no
 *  find_domains column at all — could never appear no matter what was typed in.
 *
 *  This resolver is the single place that decides which social links the public
 *  site shows and in what order, so the CP page and the footer cannot disagree:
 *
 *    URL      find_domains column (the 5 legacy platforms) or
 *             find_settings cp_social_<key>_url (TikTok/WhatsApp/Pinterest)
 *    Shown?   find_settings cp_social_<key>_enabled ("off" hides it), AND a
 *             non-empty URL — an enabled platform with no URL is not a link
 *    Order    find_settings cp_social_<key>_order, ascending
 *
 *  Unchecking Enabled in the CP therefore removes that icon from the footer on
 *  the next render; the save action invalidates CACHE_TAGS.domain, which is the
 *  tag this read is stored under.
 */

export interface PublicSocialLink {
  key: string;
  label: string;
  /** Two/three-letter badge shown inside the footer pill. */
  short: string;
  href: string;
}

/**
 * Kept deliberately in step with SOCIAL_PLATFORMS in
 * src/app/cp/(shell)/settings/social/fields.ts (same keys, same URL sources). It is a separate
 * literal rather than an import so the public site never pulls the CP admin module into its
 * dependency graph — the same rule domain.ts follows for the active-event setting.
 */
const PUBLIC_SOCIAL_PLATFORMS = [
  { key: "facebook", label: "Facebook", short: "FB", source: "domain" },
  { key: "twitter", label: "Twitter", short: "X", source: "domain" },
  { key: "instagram", label: "Instagram", short: "IG", source: "domain" },
  { key: "youtube", label: "YouTube", short: "YT", source: "domain" },
  { key: "linkedin", label: "LinkedIn", short: "IN", source: "domain" },
  { key: "tiktok", label: "TikTok", short: "TT", source: "setting" },
  { key: "whatsapp", label: "WhatsApp", short: "WA", source: "setting" },
  { key: "pinterest", label: "Pinterest", short: "PIN", source: "setting" },
] as const;

/** Website tab -> "Show Social Links": a master switch over the whole block. */
const SHOW_SOCIAL_LINKS_VARNAME = "cp_website_show_social_links";

/**
 * Bare read, cached across requests under the domain tag. No fallback inside, for the reason
 * domain.ts documents at length: a momentary outage must not be cached as "no social links".
 */
const readSocialSettings = cachedRead(
  ["domain", "socialSettings"],
  async function readSocialSettings(): Promise<Record<string, string>> {
    const rows = await prisma.$queryRaw<{ varname: string; value: string | null }[]>`
      SELECT varname, value
      FROM find_settings
      WHERE "DOMAIN" = ${DOMAIN_ID}
        AND (grouptitle = 'social' OR varname = ${SHOW_SOCIAL_LINKS_VARNAME})
    `;
    return Object.fromEntries(
      rows.map((row: { varname: string; value: string | null }) => [row.varname, row.value ?? ""])
    );
  },
  { tags: [CACHE_TAGS.domain] }
);

export async function getPublicSocialLinks(): Promise<PublicSocialLink[]> {
  let settings: Record<string, string> = {};
  try {
    settings = await readSocialSettings();
  } catch (error) {
    // Degrade to "show whatever has a URL" rather than dropping the whole block: a settings
    // read failing is not a reason for the footer to lose its links.
    console.warn("[social] could not read social settings; falling back to URL-only links", error);
  }

  if (settings[SHOW_SOCIAL_LINKS_VARNAME] === "off") return [];

  const domain = (await getDomain()) as unknown as Record<string, string | null | undefined>;

  return PUBLIC_SOCIAL_PLATFORMS.map((platform, index) => {
    const href = (
      platform.source === "domain" ? domain[platform.key] : settings[`cp_social_${platform.key}_url`]
    )?.trim();

    // Absent row = enabled. The CP seeds these as "on" the first time the tab is opened, so a
    // site that has never visited that page keeps the behaviour it had before this existed.
    const enabled = (settings[`cp_social_${platform.key}_enabled`] ?? "on") !== "off";

    const parsedOrder = Number(settings[`cp_social_${platform.key}_order`]);
    // Anything unnumbered sorts after everything numbered, keeping catalog order among itself.
    const order = Number.isFinite(parsedOrder) && parsedOrder > 0 ? parsedOrder : 1000 + index;

    return { platform, href, enabled, order, index };
  })
    .filter((entry) => entry.enabled && entry.href)
    .sort((a, b) => a.order - b.order || a.index - b.index)
    .map((entry) => ({
      key: entry.platform.key,
      label: entry.platform.label,
      short: entry.platform.short,
      href: entry.href as string,
    }));
}
