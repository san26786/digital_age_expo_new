import { prisma } from "@/lib/prisma";
import { getSiteId } from "@/lib/services/domain";

/**
 * Project Settings backing store — reuses find_settings, the legacy admin CP's own DOMAIN-
 * scoped EAV settings table (see cp/admin_settings.php), grouped by `grouptitle` into exactly
 * the sections the spec asks for (General/Company/Branding/Theme/SEO/Social Media).
 *
 * find_settings has no unique constraint Prisma recognizes on (varname, DOMAIN) — the real
 * table allows it (the legacy app enforces uniqueness itself in application code, not the DB
 * schema) — so schema.prisma marks it @@ignore and this file talks to it via $queryRaw/
 * $executeRaw instead of a generated model delegate, mirroring admin_settings.php's own
 * SELECT/UPDATE/INSERT-if-missing pattern exactly (see the block comment on each function).
 *
 * NOTE on the `DOMAIN` column: schema.prisma declares the field as `DOMAIN` (no @map), and
 * Prisma's migration engine always double-quotes identifiers exactly as written when it
 * creates them — so the real Postgres column is the case-sensitive `"DOMAIN"`, not lowercase
 * `domain`. Every raw-SQL reference below MUST quote it as `"DOMAIN"`; an unquoted `DOMAIN` in
 * a raw query gets folded to lowercase by Postgres and fails with `column "domain" does not
 * exist` (this bit us once already — see the fix that added these quotes).
 */

export interface SettingRow {
  varname: string;
  grouptitle: string;
  value: string | null;
  optioncode: string | null;
  optioncode_type: string;
  optioncode_parse_type: string;
  validationcode: string | null;
}

/** All settings in a grouptitle (e.g. "general", "company", "branding", "theme", "seo", "social") for this domain. */
export async function getSettingsGroup(grouptitle: string, domainId?: number): Promise<SettingRow[]> {
  const domain = domainId ?? (await getSiteId());
  return prisma.$queryRaw<SettingRow[]>`
    SELECT varname, grouptitle, value, optioncode, optioncode_type, optioncode_parse_type, validationcode
    FROM find_settings
    WHERE grouptitle = ${grouptitle} AND "DOMAIN" = ${domain}
    ORDER BY varname
  `;
}

export async function getSetting(varname: string, domainId?: number): Promise<string | null> {
  const domain = domainId ?? (await getSiteId());
  const rows = await prisma.$queryRaw<{ value: string | null }[]>`
    SELECT value FROM find_settings WHERE varname = ${varname} AND "DOMAIN" = ${domain} LIMIT 1
  `;
  return rows[0]?.value ?? null;
}

/**
 * Registers a brand-new setting key (metadata + this domain's initial value). Use this once,
 * up front (e.g. from a migration/seed step) for settings the legacy schema never had a
 * varname for yet (this spec's Theme fields, most Branding fields beyond logo/favicon, and
 * most SEO/Social fields) — NOT on every save. Mirrors the shape find_settings rows already
 * have for legacy-known settings like `site_name`.
 */
export async function defineSetting(input: {
  varname: string;
  grouptitle: string;
  value: string;
  optioncodeType?: string;
  domainId?: number;
}): Promise<void> {
  const domainId = input.domainId ?? (await getSiteId());
  const optioncodeType = input.optioncodeType ?? "text";
  const existing = await prisma.$queryRaw<{ varname: string }[]>`
    SELECT varname FROM find_settings WHERE varname = ${input.varname} AND "DOMAIN" = ${domainId} LIMIT 1
  `;
  if (existing.length > 0) return;

  await prisma.$executeRaw`
    INSERT INTO find_settings (varname, grouptitle, value, optioncode, optioncode_type, optioncode_parse_type, validationcode, "DOMAIN")
    VALUES (${input.varname}, ${input.grouptitle}, ${input.value}, NULL, ${optioncodeType}, 'static', NULL, ${domainId})
  `;
}

/**
 * Updates a setting's value for this domain. Mirrors admin_settings.php's own save logic
 * (lines ~185-194): UPDATE if a row already exists for (varname, DOMAIN); otherwise copy the
 * varname's metadata (grouptitle/optioncode/optioncode_type/validationcode) from whichever
 * domain already defines it and INSERT a new row for this domain. Throws if the varname has
 * never been defined anywhere — call defineSetting() first for a genuinely new key.
 */
export async function setSetting(varname: string, value: string, domainIdInput?: number): Promise<void> {
  const domainId = domainIdInput ?? (await getSiteId());
  const existing = await prisma.$queryRaw<{ varname: string }[]>`
    SELECT varname FROM find_settings WHERE varname = ${varname} AND "DOMAIN" = ${domainId} LIMIT 1
  `;

  if (existing.length > 0) {
    await prisma.$executeRaw`
      UPDATE find_settings SET value = ${value} WHERE varname = ${varname} AND "DOMAIN" = ${domainId}
    `;
    return;
  }

  const parent = await prisma.$queryRaw<SettingRow[]>`
    SELECT varname, grouptitle, value, optioncode, optioncode_type, optioncode_parse_type, validationcode
    FROM find_settings WHERE varname = ${varname} LIMIT 1
  `;
  if (parent.length === 0) {
    throw new Error(
      `Setting "${varname}" has never been defined for any domain — call defineSetting() first.`
    );
  }
  const meta = parent[0];
  await prisma.$executeRaw`
    INSERT INTO find_settings (varname, grouptitle, value, optioncode, optioncode_type, optioncode_parse_type, validationcode, "DOMAIN")
    VALUES (${varname}, ${meta.grouptitle}, ${value}, ${meta.optioncode}, ${meta.optioncode_type}, ${meta.optioncode_parse_type}, ${meta.validationcode}, ${domainId})
  `;
}

/** Bulk save — used by each settings sub-page's Server Action (one call per form submit). */
export async function setSettings(values: Record<string, string>, domainIdInput?: number): Promise<void> {
  // Resolved once here rather than per key, so a bulk save can't straddle two sites.
  const domainId = domainIdInput ?? (await getSiteId());
  for (const [varname, value] of Object.entries(values)) {
    await setSetting(varname, value, domainId);
  }
}
