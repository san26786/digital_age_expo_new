import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { getCpSession, CP_PERMISSIONS } from "@/lib/cp/rbac";

/**
 * Shared image upload endpoint for every Settings sub-page that needs one (Branding's five new
 * logo slots + favicon, SEO's Open Graph / Twitter card images). Mirrors the existing, working
 * upload pattern already used by /api/members/leadership-board/upload and
 * /api/members/todo-list/upload (local disk under public/, fs/promises.writeFile, MIME + size
 * validated, cache-busted public URL) — this project has no S3/Cloudinary dependency installed,
 * so introducing one here would be a second, inconsistent storage mechanism for no reason.
 *
 * Unlike those two routes (which gate on the *member*-portal session via requireEventMember()),
 * this one is CP-only: it checks the CP session cookie directly and requires
 * admin_settings_edit, matching every other Settings mutation in this module. A closed
 * SETTINGS_UPLOAD_SLOTS whitelist (rather than accepting any client-supplied filename) is what
 * keeps the on-disk path fully server-controlled — the client can only ever pick from these
 * known slots, never influence the actual path written to.
 */
const SETTINGS_UPLOAD_SLOTS = [
  "branding_favicon",
  "branding_primary_logo",
  "branding_secondary_logo",
  "branding_mobile_logo",
  "branding_footer_logo",
  "branding_login_logo",
  "seo_og_image",
  "seo_twitter_image",
] as const;
type SettingsUploadSlot = (typeof SETTINGS_UPLOAD_SLOTS)[number];

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  // Favicons must be .ico (see faviconPath in the settings validation), so the uploader has to
  // accept one. Browsers disagree on the MIME type they report for .ico files — x-icon is the
  // de-facto one, vnd.microsoft.icon is the registered one, and some send neither.
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
};
const ALLOWED_MIME_TYPES = Object.keys(EXTENSION_BY_MIME);
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024; // 3MB — logos/favicons/social-card images, not photos.

export async function POST(request: Request) {
  const session = await getCpSession();
  if (!session || !session.perms.includes(CP_PERMISSIONS.SETTINGS_EDIT)) {
    return NextResponse.json({ error: "You do not have permission to upload settings images." }, { status: 403 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const slotRaw = form.get("slot");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file was uploaded." }, { status: 400 });
  }
  if (typeof slotRaw !== "string" || !SETTINGS_UPLOAD_SLOTS.includes(slotRaw as SettingsUploadSlot)) {
    return NextResponse.json({ error: "Unrecognised upload slot." }, { status: 400 });
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Only PNG, JPG, WEBP, SVG, or ICO images are allowed." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Image must be 3MB or smaller." }, { status: 400 });
  }

  const slot = slotRaw as SettingsUploadSlot;
  const ext = EXTENSION_BY_MIME[file.type] ?? "png";
  const filename = `${slot}.${ext}`;
  const diskPath = path.join(process.cwd(), "public", "files", "settings", filename);
  const publicUrl = `/files/settings/${filename}`;

  try {
    await mkdir(path.dirname(diskPath), { recursive: true });
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(diskPath, bytes);
  } catch (err) {
    console.error("[cp/settings/upload] failed to write file:", err);
    return NextResponse.json({ error: "Could not save the uploaded image." }, { status: 500 });
  }

  // Cache-bust so the CP preview (and, once Phase 2 wires the public site to these same URLs,
  // the live site too) picks up a re-upload to the same slot immediately.
  return NextResponse.json({ success: true, url: `${publicUrl}?v=${Date.now()}` });
}
