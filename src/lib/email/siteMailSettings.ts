import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { CACHE_TAGS, cachedRead } from "@/lib/cache";
import { resolveSiteId } from "@/lib/tenant";

/**
 * ===========================================================================
 *  HOW THIS SITE SENDS EMAIL
 * ===========================================================================
 *
 *  Until this existed, every site on the platform sent from one mailbox: SMTP_HOST, SMTP_USER and
 *  SMTP_PASS in the environment, read once into a module-level transport in mailer.ts. That was
 *  right while there was one site. With several, a visitor to B2B Growth Expo gets a confirmation
 *  from Digital Age Expo's address, which looks like a mistake because it is one.
 *
 *  So the mailbox becomes per-site data with the environment as the fallback: a site that has
 *  configured nothing sends exactly as it did before this file existed.
 *
 *  ---------------------------------------------------------------------------
 *  THE PASSWORD IS STORED IN PLAIN TEXT, AND THAT IS WORTH SAYING OUT LOUD
 *  ---------------------------------------------------------------------------
 *
 *  find_settings is the legacy EAV table that already holds this app's theme colours, logos and
 *  SEO strings. It has no encryption and no column that offers any. An SMTP password put here is
 *  readable by anything with SELECT on that table — a database backup, a CP screen that dumps
 *  settings, anyone with the connection string.
 *
 *  What is done about it: the password is WRITE-ONLY through the app. getSiteMailSettings()
 *  returns whether one is set, never the value; only the mailer reads the secret, on the server,
 *  at send time. That closes the obvious hole — a settings page that hands the password back to
 *  the browser on every load — and it does not pretend to close the other one. Encrypting at rest
 *  against an env key is the next step if this deployment wants it; that trade (a lost key means
 *  every site re-enters its password) was a decision to take deliberately rather than by default.
 */

export const MAIL_VARNAMES = {
  provider: "cp_mail_provider",
  fromAddress: "cp_mail_from",
  replyTo: "cp_mail_reply_to",
  signatureHtml: "cp_mail_signature_html",
  host: "cp_mail_smtp_host",
  port: "cp_mail_smtp_port",
  username: "cp_mail_smtp_user",
  password: "cp_mail_smtp_pass",
  secure: "cp_mail_smtp_secure",
} as const;

/** What the settings screen is allowed to see. Note the absence of the password itself. */
export interface SiteMailSettings {
  /** "" = inherit the platform mailbox from the environment. "smtp" = this site has its own. */
  provider: "" | "smtp";
  fromAddress: string;
  replyTo: string;
  signatureHtml: string;
  host: string;
  port: string;
  username: string;
  secure: boolean;
  /** True when a password is stored. The value never leaves the server. */
  passwordSet: boolean;
}

/** What the mailer needs, password included. Server-side only, never serialised to a client. */
export interface ResolvedMailTransport {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromAddress: string;
  replyTo: string;
  signatureHtml: string;
  /** Where these came from, for the "inherited" wording on screen and for log lines. */
  source: "site" | "environment";
}

const readMailSettings = cachedRead(
  ["domain", "mailSettings"],
  async function readMailSettings(siteId: number): Promise<Record<string, string>> {
    const rows = await prisma.$queryRaw<{ varname: string; value: string | null }[]>`
      SELECT varname, value FROM find_settings
      WHERE "DOMAIN" = ${siteId} AND grouptitle = 'mail'
    `;
    return Object.fromEntries(rows.map((row) => [row.varname, row.value ?? ""]));
  },
  { tags: [CACHE_TAGS.domain] }
);

/**
 * Settings for the screen. Memoised per request for the same reason getSiteTheme is: this app's
 * pool is ten connections wide and an unguarded extra read has taken it down before.
 */
export const getSiteMailSettings = cache(async function getSiteMailSettings(
  siteId?: number
): Promise<SiteMailSettings> {
  const resolved = siteId ?? (await resolveSiteId());

  let rows: Record<string, string> = {};
  try {
    rows = await readMailSettings(resolved);
  } catch {
    // Unreadable settings mean "this site has configured nothing", which is the safe answer: the
    // environment mailbox is what sends, exactly as before.
    rows = {};
  }

  const pick = (key: keyof typeof MAIL_VARNAMES) => (rows[MAIL_VARNAMES[key]] ?? "").trim();

  return {
    provider: pick("provider") === "smtp" ? "smtp" : "",
    fromAddress: pick("fromAddress"),
    replyTo: pick("replyTo"),
    signatureHtml: rows[MAIL_VARNAMES.signatureHtml] ?? "",
    host: pick("host"),
    port: pick("port"),
    username: pick("username"),
    secure: pick("secure") !== "0",
    passwordSet: Boolean(pick("password")),
  };
});

/**
 * What actually sends, for one site.
 *
 * A site counts as having its own mailbox only when the provider is set to smtp AND a host, a
 * username and a password are all present. A half-filled form must not take the site off the
 * working environment mailbox and onto a transport that cannot connect — the failure would show
 * up as mail silently not arriving, days later, with nothing on screen having said so.
 */
export async function resolveMailTransport(siteId?: number): Promise<ResolvedMailTransport | null> {
  const resolved = siteId ?? (await resolveSiteId());

  let rows: Record<string, string> = {};
  try {
    rows = await readMailSettings(resolved);
  } catch {
    rows = {};
  }

  const value = (key: keyof typeof MAIL_VARNAMES) => (rows[MAIL_VARNAMES[key]] ?? "").trim();

  const host = value("host");
  const username = value("username");
  const password = value("password");
  const signatureHtml = rows[MAIL_VARNAMES.signatureHtml] ?? "";

  if (value("provider") === "smtp" && host && username && password) {
    const port = Number(value("port")) || 587;
    return {
      host,
      port,
      secure: value("secure") !== "0",
      username,
      password,
      fromAddress: value("fromAddress") || username,
      replyTo: value("replyTo"),
      signatureHtml,
      source: "site",
    };
  }

  const envHost = process.env.SMTP_HOST ?? "";
  const envUser = process.env.SMTP_USER ?? "";
  const envPass = process.env.SMTP_PASS ?? "";
  if (!envHost || !envUser || !envPass) return null;

  const envPort = Number(process.env.SMTP_PORT ?? 587) || 587;

  /*
   * The environment mailbox, but this site's own from/reply-to/signature where it has set them.
   * Sending through the platform mailbox is a deliverability decision; showing the platform's
   * name in the From line of another site's mail is not, and the two should not be tied together.
   */
  return {
    host: envHost,
    port: envPort,
    secure: envPort === 465,
    username: envUser,
    password: envPass,
    fromAddress: value("fromAddress") || process.env.SMTP_FROM || envUser,
    replyTo: value("replyTo"),
    signatureHtml,
    source: "environment",
  };
}

/**
 * Apply this site's signature to a rendered body.
 *
 * `{{signature}}` in the template is replaced where it stands, so the sign-off lands inside the
 * design. A template without it gets the signature appended below, which is the only other place
 * it can honestly go.
 */
export function applySignature(html: string, signatureHtml: string): string {
  const signature = signatureHtml.trim();
  if (!signature) return html.replace(/\{\{\s*signature\s*\}\}/g, "");
  if (/\{\{\s*signature\s*\}\}/.test(html)) return html.replace(/\{\{\s*signature\s*\}\}/g, signature);
  return `${html}\n<div style="margin-top:24px">${signature}</div>`;
}

/* ------------------------------------------------------------------ writing */

type MailSettingKey = keyof typeof MAIL_VARNAMES;

async function writeMailSetting(siteId: number, key: MailSettingKey, value: string): Promise<void> {
  const varname = MAIL_VARNAMES[key];

  const updated = await prisma.$executeRaw`
    UPDATE find_settings SET value = ${value}
    WHERE varname = ${varname} AND "DOMAIN" = ${siteId}
  `;

  if (updated === 0) {
    await prisma.$executeRaw`
      INSERT INTO find_settings
        (varname, grouptitle, value, optioncode_type, optioncode_parse_type, "DOMAIN")
      VALUES (
        ${varname}, 'mail', ${value},
        'text'::find_settings_optioncode_type, 'static'::find_settings_optioncode_parse_type,
        ${siteId}
      )
    `;
  }
}

export interface SiteMailSettingsInput {
  provider: string;
  fromAddress: string;
  replyTo: string;
  signatureHtml: string;
  host: string;
  port: string;
  username: string;
  /** Blank means "keep what is stored" — the form never receives the current value to send back. */
  password: string;
  secure: boolean;
}

export async function saveSiteMailSettings(siteId: number, input: SiteMailSettingsInput): Promise<void> {
  await writeMailSetting(siteId, "provider", input.provider === "smtp" ? "smtp" : "");
  await writeMailSetting(siteId, "fromAddress", input.fromAddress.trim());
  await writeMailSetting(siteId, "replyTo", input.replyTo.trim());
  await writeMailSetting(siteId, "signatureHtml", input.signatureHtml);
  await writeMailSetting(siteId, "host", input.host.trim());
  await writeMailSetting(siteId, "port", input.port.trim());
  await writeMailSetting(siteId, "username", input.username.trim());
  await writeMailSetting(siteId, "secure", input.secure ? "1" : "0");

  /*
   * A blank password means "leave it alone", not "clear it". The field is write-only, so a blank
   * one is what the form ALWAYS submits unless somebody typed a new secret — treating that as a
   * clear would wipe the mailbox every time anyone saved a from-address change.
   */
  if (input.password.trim()) {
    await writeMailSetting(siteId, "password", input.password.trim());
  }
}
