import { z } from "zod";

/**
 * Shared Zod building blocks for the Settings module. Every field here always arrives as an
 * actual string (Server Actions read it via `String(formData.get(name) ?? "")` before parsing —
 * see actions.ts in each section), never `undefined`, so none of these use `.optional()`: a
 * blank/empty value is simply a valid string, not a missing one. That keeps `z.infer<...>`
 * clean (`string`, not `string | undefined`) so `setSettings()` — which wants a plain
 * `Record<string, string>` — can take parsed output directly with no cast.
 */
export const optionalText = (max?: number) => {
  const base = z.string().trim();
  return max ? base.max(max, `Must be ${max} characters or fewer.`) : base;
};

export const optionalEmail = z.union([
  z.literal(""),
  z.string().trim().email("Enter a valid email address."),
]);

export const optionalUrl = z.union([
  z.literal(""),
  z
    .string()
    .trim()
    .refine((v) => /^https?:\/\/.+/i.test(v), "Enter a valid URL starting with http:// or https://."),
]);

export const optionalHexColor = z.union([
  z.literal(""),
  z.string().trim().regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, "Enter a valid hex color, e.g. #192B64."),
]);

export const onOffToggle = z.enum(["on", "off"]);

/** Reads a checkbox's on/off state out of FormData — an unchecked HTML checkbox simply never
 * appears in FormData at all (there's no "off" value to read), same convention already used by
 * domainRepository.ts's `status`/`hide_pricing` checkboxes. */
export function checkboxToOnOff(formData: FormData, name: string): "on" | "off" {
  return formData.get(name) === "on" ? "on" : "off";
}

/**
 * Uploaded-image fields travel through the form as a plain hidden text input (see
 * ImageUploadField.tsx) — the browser sets its value from our own /api/cp/settings/upload
 * response, but a raw POST could still put an arbitrary string there. This accepts only what
 * our own upload route could have produced (a relative /files/settings/... path) or a genuine
 * absolute http(s) URL (for cases like re-pointing a favicon at an external asset), and rejects
 * anything else (data: URIs, javascript:, bare filenames, etc.) rather than persisting it.
 */
export const optionalImagePath = z.union([
  z.literal(""),
  z
    .string()
    .trim()
    .refine(
      isSiteImagePath,
      "Must be an uploaded image, a file bundled with the site, or a valid http(s) URL."
    ),
]);

/**
 * Accepts what our own upload route produces (/files/settings/...), any other same-origin
 * asset path (/images/..., /favicon.ico — the logos committed to public/ are referenced this
 * way and are legitimate values for these fields), or a genuine absolute http(s) URL.
 *
 * Everything else is rejected, which is the point: these values are rendered straight into
 * src/img attributes, so "//evil.example/x.png" (protocol-relative, NOT a local path),
 * "data:text/html;base64,...", "javascript:..." and bare filenames must never round-trip
 * through the form into a page.
 */
function isSiteImagePath(value: string): boolean {
  if (/^https?:\/\/.+/i.test(value)) return true;
  if (!value.startsWith("/") || value.startsWith("//")) return false;
  return !/[\s<>"']/.test(value);
}

/** Strips a cache-busting ?v=… suffix before looking at the extension. */
function pathWithoutQuery(value: string): string {
  return value.split(/[?#]/)[0];
}

/**
 * Favicon slot only. Browsers, crawlers and bookmark bars all read /favicon.ico without being
 * told to; a .png or .svg in that slot works in some places and silently doesn't in others,
 * which is the kind of half-broken that only shows up in someone else's browser.
 */
export const faviconPath = z.union([
  z.literal(""),
  z
    .string()
    .trim()
    .refine(isSiteImagePath, "Must be an uploaded file or a valid http(s) URL.")
    .refine(
      (v) => pathWithoutQuery(v).toLowerCase().endsWith(".ico"),
      "The favicon must be a .ico file — upload an .ico, or point this at one."
    ),
]);

/** Formats the first Zod issue into a single human-readable line for the SettingsForm toast —
 * these forms show one summary message, not a per-field error list, matching the plain
 * top-of-form banner style already used elsewhere in this CP (see StandAssetsManager.tsx). */
export function firstZodIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Some values weren't valid.";
  const path = issue.path.join(".");
  return path ? `${path}: ${issue.message}` : issue.message;
}
