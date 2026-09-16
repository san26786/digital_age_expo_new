/**
 * Site Information field catalog — the varnames stored in find_settings under
 * grouptitle="general". Split into its own file (rather than inline in page.tsx) so
 * actions.ts can iterate the same list without a client/server import cycle.
 *
 * Site Name, Organisation Name, and Short Description are deliberately NOT repeated here even
 * though the original feature request listed them under "Site Information" — this site already
 * has real, typed columns for exactly those (find_domains.name / brand / short_description),
 * surfaced on the Company tab. Duplicating them into a second, unrelated find_settings row
 * would just give two places that can silently disagree about the same fact; the Company tab
 * is the one source of truth for those three, and this page says so below its form.
 *
 * cp_maintenance_mode (a free-text "on"/"off" flag) has been retired from this list — it never
 * actually gated anything (proxy.ts only ever checked the CP auth cookie), and it's superseded
 * by the real Website Behaviour tab's maintenance toggle. Its old row is simply left inert in
 * find_settings rather than deleted, in keeping with "preserve all existing data."
 */
export const GENERAL_SETTINGS_FIELDS = [
  { varname: "cp_site_name", label: "Website Name", type: "text", defaultValue: "", maxLength: 255 },
  { varname: "cp_site_title", label: "Site Title", type: "text", defaultValue: "", maxLength: 255 },
  { varname: "cp_site_tagline", label: "Tagline", type: "text", defaultValue: "", maxLength: 255 },
  { varname: "cp_full_description", label: "Full Description", type: "textarea", defaultValue: "" },
  /* These three have no source anywhere in the database, and they are matters of record rather
     than wording — a registration number or founding year that someone invented is worse than an
     empty field, because it looks authoritative. They stay blank, with a placeholder showing the
     expected shape, and only a human can fill them in. */
  {
    varname: "cp_organisation_type",
    label: "Business / Organisation Type",
    type: "text",
    defaultValue: "",
    placeholder: "e.g. Exhibition & events organiser",
  },
  {
    varname: "cp_registration_number",
    label: "Company / Registration Number",
    type: "text",
    defaultValue: "",
    placeholder: "e.g. 12345678 (Companies House number)",
  },
  { varname: "cp_founded_year", label: "Founded Year", type: "text", defaultValue: "", placeholder: "e.g. 2019" },
  { varname: "cp_site_url", label: "Website URL", type: "text", defaultValue: "" },
  { varname: "cp_default_timezone", label: "Default Timezone", type: "text", defaultValue: "Europe/London" },
  { varname: "cp_default_currency", label: "Default Currency", type: "text", defaultValue: "GBP" },
  { varname: "cp_default_language", label: "Default Language", type: "text", defaultValue: "en" },
] as const;

export type GeneralSettingsVarname = (typeof GENERAL_SETTINGS_FIELDS)[number]["varname"];


/* ==========================================================================
 *  SUGGESTED VALUES
 * ==========================================================================
 *
 *  Same approach as the SEO and Footer tabs: rather than presenting eleven
 *  empty boxes, fill in everything the project already knows about itself from
 *  find_domains and the CP's active event. Only wording is composed here — no
 *  fact is invented (see the note on the three fields above).
 */

export interface GeneralDefaultsInput {
  siteName: string;
  brandName?: string | null;
  shortDescription?: string | null;
  link?: string | null;
  eventTitle?: string | null;
  eventSubtitle?: string | null;
  eventDescription?: string | null;
  location?: string | null;
  dateStart?: Date | null;
  dateEnd?: Date | null;
}

function plainText(value?: string | null): string {
  return (value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDateRange(start?: Date | null, end?: Date | null): string {
  if (!start) return "";
  const day = (date: Date) => date.getUTCDate();
  const month = (date: Date) => date.toLocaleString("en-GB", { month: "short", timeZone: "UTC" });
  const year = (date: Date) => date.getUTCFullYear();

  if (!end || start.getTime() === end.getTime()) return `${day(start)} ${month(start)} ${year(start)}`;
  if (year(start) !== year(end)) {
    return `${day(start)} ${month(start)} ${year(start)} \u2013 ${day(end)} ${month(end)} ${year(end)}`;
  }
  if (month(start) !== month(end)) {
    return `${day(start)} ${month(start)} \u2013 ${day(end)} ${month(end)} ${year(end)}`;
  }
  return `${day(start)}\u2013${day(end)} ${month(end)} ${year(end)}`;
}

/** find_domains.link is often stored bare ("digitalageexpo.com"). */
function normaliseUrl(link?: string | null): string {
  const trimmed = plainText(link).replace(/\s+/g, "");
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed.replace(/^\/+/, "")}`;
}

export function buildGeneralDefaults(input: GeneralDefaultsInput): Record<string, string> {
  const siteName = plainText(input.siteName) || "Digital Age Expo";
  const eventTitle = plainText(input.eventTitle);
  const startYear = input.dateStart ? input.dateStart.getUTCFullYear() : null;

  const base = eventTitle || siteName;
  const headline = startYear && !base.includes(String(startYear)) ? `${base} ${startYear}` : base;

  const descriptor = plainText(input.location) || "Online Virtual Event";
  const dateRange = formatDateRange(input.dateStart, input.dateEnd);

  // The tagline mirrors the strip the site already shows above its header, so the CP and the
  // live page say the same thing.
  const tagline =
    plainText(input.eventSubtitle) || [descriptor, dateRange].filter(Boolean).join(" \u2022 ");

  const description =
    plainText(input.shortDescription) ||
    plainText(input.eventDescription) ||
    `Connect, discover and grow at ${siteName}. Explore innovative businesses, meet industry leaders and build valuable connections through our global business event.`;

  return {
    cp_site_name: siteName,
    cp_site_title: headline,
    cp_site_tagline: tagline,
    cp_full_description: description,
    cp_organisation_type: "",
    cp_registration_number: "",
    cp_founded_year: "",
    cp_site_url: normaliseUrl(input.link),
    cp_default_timezone: "Europe/London",
    cp_default_currency: "GBP",
    cp_default_language: "en",
  };
}
