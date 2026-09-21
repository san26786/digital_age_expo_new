import { prisma } from "@/lib/prisma";
import { CACHE_TAGS, cachedRead } from "@/lib/cache";
import { DOMAIN_ID } from "@/lib/site-config";
import { getDomain } from "@/lib/services/domain";

/**
 * ===========================================================================
 *  FOOTER CONTENT — one source for the CP tab and the rendered footer
 * ===========================================================================
 *
 *  The footer's description paragraph, copyright line and legal links were
 *  written directly into src/components/layout/Footer.tsx, while Settings ->
 *  Footer wrote the same things to find_settings and nothing read them back.
 *  Editing the tab changed nothing on the site, and the only way to reword the
 *  footer was to edit the component.
 *
 *  Everything below resolves in one direction: a saved find_settings value
 *  wins; if it is empty, the default is what the footer has always shown. So
 *  the rendered page is unchanged until someone deliberately saves something
 *  else, and the CP tab can show those same defaults in its inputs instead of
 *  eight empty boxes (see buildFooterDefaults, used by both sides).
 */

/** Rendered when no description has been saved — the wording the footer shipped with. */
export function defaultFooterDescription(siteName: string): string {
  return `Connect, discover and grow at ${siteName}. Explore innovative businesses, meet industry leaders and build valuable connections through our global business event.`;
}

/** These two routes are served by the [...slug] CMS catch-all, and the footer already links to them. */
export const DEFAULT_PRIVACY_URL = "/privacy-policy";
export const DEFAULT_TERMS_URL = "/terms-and-conditions";

export interface FooterDefaultsInput {
  siteName: string;
  shortDescription?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

function plainText(value?: string | null): string {
  return (value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The value each footer setting takes when it has never been saved, keyed by varname so the CP
 * page can drop it straight into its inputs and its "Restore Defaults" button.
 *
 * Cookie Policy is deliberately left empty: unlike privacy and terms, this site has no such
 * page, and a footer link to a URL that 404s is worse than no link at all. The rendered footer
 * only shows that link once a URL is actually saved.
 */
export function buildFooterDefaults(input: FooterDefaultsInput): Record<string, string> {
  const siteName = plainText(input.siteName) || "Digital Age Expo";

  return {
    cp_footer_description: plainText(input.shortDescription) || defaultFooterDescription(siteName),
    cp_footer_copyright_text: `${siteName}. All rights reserved.`,
    cp_footer_email: plainText(input.email),
    cp_footer_phone: plainText(input.phone),
    cp_footer_address: plainText(input.address),
    cp_footer_privacy_policy_url: DEFAULT_PRIVACY_URL,
    cp_footer_terms_url: DEFAULT_TERMS_URL,
    cp_footer_cookie_policy_url: "",
  };
}

export interface FooterContent {
  description: string;
  /** Shown after "© {year}" — the year itself is computed at render time, never stored. */
  copyrightText: string;
  email: string;
  phone: string;
  address: string;
  legalLinks: { href: string; label: string }[];
}

/** Bare read, cached under the domain tag. No fallback inside — see the note in domain.ts. */
const readFooterSettings = cachedRead(
  ["domain", "footerSettings"],
  async function readFooterSettings(): Promise<Record<string, string>> {
    const rows = await prisma.$queryRaw<{ varname: string; value: string | null }[]>`
      SELECT varname, value FROM find_settings
      WHERE "DOMAIN" = ${DOMAIN_ID} AND grouptitle = 'footer'
    `;
    return Object.fromEntries(
      rows.map((row: { varname: string; value: string | null }) => [row.varname, row.value ?? ""])
    );
  },
  { tags: [CACHE_TAGS.domain] }
);

export async function getFooterContent(): Promise<FooterContent> {
  let settings: Record<string, string> = {};
  try {
    settings = await readFooterSettings();
  } catch (error) {
    console.warn("[footer] could not read footer settings; using built-in defaults", error);
  }

  const domain = await getDomain();
  const defaults = buildFooterDefaults({
    siteName: domain.name,
    email: domain.email,
    phone: domain.phone,
  });

  const value = (varname: string) => (settings[varname] ?? "").trim() || defaults[varname] || "";

  const legalLinks = [
    { href: value("cp_footer_privacy_policy_url"), label: "Privacy Policy" },
    { href: value("cp_footer_terms_url"), label: "Terms & Conditions" },
    { href: value("cp_footer_cookie_policy_url"), label: "Cookie Policy" },
  ].filter((link) => link.href);

  return {
    description: value("cp_footer_description"),
    copyrightText: value("cp_footer_copyright_text"),
    email: value("cp_footer_email"),
    phone: value("cp_footer_phone"),
    address: value("cp_footer_address"),
    legalLinks,
  };
}
