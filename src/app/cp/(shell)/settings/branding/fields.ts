/**
 * Branding field catalog, in two groups:
 *
 * BRANDING_LOGO_FIELDS — real upload widgets (preview/replace/remove), one legacy
 * (find_domains.fav) and five brand new (find_settings, grouptitle="branding" — find_domains
 * has no primary/secondary/mobile/footer/login logo columns at all; the public site's current
 * header logo is actually a hardcoded /images/logo.png in Navbar.tsx, not DB-driven yet, so
 * these are genuinely new settings, following the same "legacy schema never had a varname for
 * this" pattern the Theme page established for colors).
 *
 * BRANDING_TEXT_FIELDS — unchanged from before: the legacy find_domains text fields
 * (template/alternate_logo/partner_logo/partner_url/domain_loader). alternate_logo and
 * partner_logo are left as plain text here rather than upgraded to upload widgets — they're
 * legacy co-branding/partner fields with their own established meaning elsewhere in the
 * legacy app, distinct from "this site's own logo," so they're kept exactly as they were
 * rather than reinterpreted.
 */
/**
 * The asset each slot falls back to when nothing has been uploaded: the files this site is
 * actually serving today, so the tab shows the real marks instead of six "No image" boxes.
 *
 *   /favicon.ico                       src/app/favicon.ico (Next's file convention)
 *   /images/digitalageexpo_logo.png    the 2172x724 wordmark in Navbar.tsx and Footer.tsx
 *   /images/logo.png                   the compact 600x141 mark used lower in Navbar.tsx
 *
 * Favicons are the one slot with a hard format rule (see faviconPath in ../_lib/validation):
 * .ico is the only format every browser, crawler and bookmark bar reads without a <link> hint,
 * which is exactly what a favicon has to survive.
 */
export const BRANDING_LOGO_FIELDS = [
  {
    key: "fav",
    slot: "branding_favicon",
    label: "Favicon",
    source: "domain",
    defaultValue: "/favicon.ico",
    accept: ".ico,image/x-icon,image/vnd.microsoft.icon",
    hint: "Square icon shown in browser tabs. Must be a .ico file.",
  },
  {
    key: "cp_branding_primary_logo",
    slot: "branding_primary_logo",
    label: "Primary Logo",
    source: "setting",
    defaultValue: "/images/digitalageexpo_logo.png",
    hint: "Main header logo shown across the site.",
  },
  {
    key: "cp_branding_secondary_logo",
    slot: "branding_secondary_logo",
    label: "Secondary Logo",
    source: "setting",
    defaultValue: "/images/logo.png",
    hint: "Alternate logo variant (e.g. for dark/light backgrounds).",
  },
  {
    key: "cp_branding_mobile_logo",
    slot: "branding_mobile_logo",
    label: "Mobile Logo",
    source: "setting",
    defaultValue: "/images/logo.png",
    hint: "Compact logo shown on small screens.",
  },
  {
    key: "cp_branding_footer_logo",
    slot: "branding_footer_logo",
    label: "Footer Logo",
    source: "setting",
    defaultValue: "/images/digitalageexpo_logo.png",
    hint: "Logo shown in the site footer.",
  },
  {
    key: "cp_branding_login_logo",
    slot: "branding_login_logo",
    label: "Login Logo",
    source: "setting",
    defaultValue: "/images/logo.png",
    hint: "Logo shown on the CP and member login screens.",
  },
] as const;

export const BRANDING_TEXT_FIELDS = [
  {
    key: "template",
    label: "Template / Theme",
    type: "text",
    // find_domains has no color/hex column at all — `template` (a legacy template identifier
    // string, e.g. a numeric template ID) is the closest existing field to "theme". An actual
    // theme *color* setting lives on the separate Theme page (find_settings, not find_domains).
    hint: "Legacy template identifier — not a color. For an actual theme color, see the Theme page.",
  },
  { key: "alternate_logo", label: "Alternate Logo (filename)", type: "text" },
  { key: "partner_logo", label: "Partner Logo (filename)", type: "text" },
  { key: "partner_url", label: "Partner URL", type: "text" },
  { key: "domain_loader", label: "Domain Loader (filename)", type: "text" },
] as const;
