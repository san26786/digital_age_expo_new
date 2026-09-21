import { prisma } from "@/lib/prisma";
import { DOMAIN_ID } from "@/lib/site-config";

/**
 * find_domains is NOT an EAV table like find_settings — every field here is a real, typed
 * column on exactly ONE row: this site's row (id = DOMAIN_ID, see site-config.ts — the same
 * row src/lib/services/domain.ts's getDomain() reads for the public site). So "get/set domain
 * settings" is a plain findUnique/update by id, not the varname/grouptitle lookup General
 * Settings uses against find_settings.
 *
 * This repository only reads/writes the subset of find_domains's ~80 legacy columns that the
 * Company Details, Social Media, and Branding CP pages surface — the same "core fields, not
 * every legacy flag" approach eventsRepository.ts takes with find_events. Payment gateway key
 * columns (paypal/stripe/razorpay), membership package group fields (weekly/monthly/yearly
 * package group, business plan one/two/three), and file-upload-only fields (domain ratecard
 * pdf, prospectus image, etc.) are intentionally out of scope for this pass — see
 * schema.prisma's find_domains model for the full column list if/when those need their own CP
 * page.
 *
 * NOTE ON "theme color": find_domains has no color/hex column anywhere — `template` (handled
 * on the Branding page) is the closest existing analog, and it's a legacy template identifier
 * string, not a color. An actual theme-color setting is built separately on the Theme page via
 * find_settings (grouptitle="theme"), the same EAV fallback settingsRepository.ts already
 * documents for "settings the legacy schema never had a varname for yet."
 */

const DOMAIN_SETTINGS_SELECT = {
  id: true,
  name: true,
  brand: true,
  link: true,
  short_description: true,
  email: true,
  phone: true,
  address: true,
  index_page: true,
  parent_domain: true,
  status: true,
  facebook: true,
  instagram: true,
  youtube: true,
  google: true,
  twitter: true,
  linkedin: true,
  template: true,
  alternate_logo: true,
  partner_logo: true,
  partner_url: true,
  fav: true,
  domain_loader: true,
  show_header_brand_logo: true,
  hide_pricing: true,
} as const;

export type DomainSettingsRow = {
  id: number;
  name: string;
  brand: string | null;
  link: string;
  short_description: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  index_page: string | null;
  parent_domain: string | null;
  status: boolean;
  facebook: string | null;
  instagram: string | null;
  youtube: string | null;
  google: string | null;
  twitter: string | null;
  linkedin: string | null;
  template: string | null;
  alternate_logo: string | null;
  partner_logo: string | null;
  partner_url: string | null;
  fav: string | null;
  domain_loader: string | null;
  show_header_brand_logo: number;
  hide_pricing: boolean | null;
};

const FALLBACK_ROW: DomainSettingsRow = {
  id: DOMAIN_ID,
  name: "Digital Age Expo",
  brand: null,
  link: "",
  short_description: "",
  email: null,
  phone: null,
  address: null,
  index_page: null,
  parent_domain: null,
  status: true,
  facebook: null,
  instagram: null,
  youtube: null,
  google: null,
  twitter: null,
  linkedin: null,
  template: null,
  alternate_logo: null,
  partner_logo: null,
  partner_url: null,
  fav: null,
  domain_loader: null,
  show_header_brand_logo: 0,
  hide_pricing: null,
};

/** Reads this site's find_domains row. Falls back to placeholder values if the row can't be reached, mirroring getDomain()'s own try/catch fallback in src/lib/services/domain.ts. */
export async function getDomainSettings(): Promise<DomainSettingsRow> {
  try {
    const row = await prisma.find_domains.findUnique({ where: { id: DOMAIN_ID }, select: DOMAIN_SETTINGS_SELECT });
    return row ?? FALLBACK_ROW;
  } catch (e) {
    console.warn("Failed to fetch find_domains settings row, using fallback", e);
    return FALLBACK_ROW;
  }
}

export interface CompanyDetailsInput {
  name: string;
  brand: string;
  link: string;
  short_description: string;
  email: string;
  phone: string;
  address: string;
  index_page: string;
  parent_domain: string;
  status: boolean;
}

export async function updateCompanyDetails(input: CompanyDetailsInput): Promise<void> {
  await prisma.find_domains.update({ where: { id: DOMAIN_ID }, data: input });
}

export interface SocialMediaInput {
  facebook: string;
  instagram: string;
  youtube: string;
  google: string;
  twitter: string;
  linkedin: string;
}

export async function updateSocialMedia(input: SocialMediaInput): Promise<void> {
  await prisma.find_domains.update({ where: { id: DOMAIN_ID }, data: input });
}

export interface BrandingInput {
  template: string;
  alternate_logo: string;
  partner_logo: string;
  partner_url: string;
  fav: string;
  domain_loader: string;
  show_header_brand_logo: boolean;
  hide_pricing: boolean;
}

export async function updateBranding(input: BrandingInput): Promise<void> {
  await prisma.find_domains.update({
    where: { id: DOMAIN_ID },
    data: {
      template: input.template,
      alternate_logo: input.alternate_logo,
      partner_logo: input.partner_logo,
      partner_url: input.partner_url,
      fav: input.fav,
      domain_loader: input.domain_loader,
      // Both are Int/TinyInt columns in find_domains, not real Prisma Booleans — store as 0/1.
      show_header_brand_logo: input.show_header_brand_logo ? 1 : 0,
      hide_pricing: input.hide_pricing,
    },
  });
}
