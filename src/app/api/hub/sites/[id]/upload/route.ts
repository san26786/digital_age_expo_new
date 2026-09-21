import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { canEditSite } from "@/lib/hub/access";

export const dynamic = "force-dynamic";

/**
 * Image upload for one site's branding slots.
 *
 * ---------------------------------------------------------------------------
 *  WHY THIS IS NOT /api/cp/settings/upload
 * ---------------------------------------------------------------------------
 *
 *  That route already uploads exactly these images, and reusing it was the obvious move. It
 *  cannot be reused, for one decisive reason: it writes each slot to a FIXED filename —
 *  `public/files/settings/branding_primary_logo.png`. With one site that is a feature (a
 *  re-upload replaces the old file and leaves nothing orphaned). With two sites it means the
 *  second site's logo silently overwrites the first's, on disk, with no error and no way back.
 *  The path here carries the site id for that reason and no other.
 *
 *  It also gates differently: that route requires a CP session with SETTINGS_EDIT; the Hub has
 *  its own superadmin check, and a superadmin need not hold a CP session.
 *
 *  ---------------------------------------------------------------------------
 *  THE PATH IS BUILT FROM A CLOSED SLOT LIST AND AN INTEGER
 *  ---------------------------------------------------------------------------
 *
 *  Nothing the client sends reaches the filesystem as text. The slot must be one of the six
 *  literals below, the site id is parsed as an integer, and the extension comes from a lookup
 *  keyed on the detected MIME type — so `../../` in a filename has nowhere to land.
 */
const SLOTS = [
  "favicon",
  "primary_logo",
  "secondary_logo",
  "mobile_logo",
  "footer_logo",
  "login_logo",
] as const;
type Slot = (typeof SLOTS)[number];

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
};

const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const siteId = Number(id);
  if (!Number.isInteger(siteId) || siteId <= 0) {
    return NextResponse.json({ error: "A positive integer site id is required" }, { status: 400 });
  }

  // Same rule as PATCH: whoever manages every site, or an organiser on this site itself. Without
  // it the self-serve settings screen could change a colour but never upload a logo.
  if (!(await canEditSite(siteId))) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const slotRaw = form.get("slot");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file was uploaded." }, { status: 400 });
  }
  if (typeof slotRaw !== "string" || !SLOTS.includes(slotRaw as Slot)) {
    return NextResponse.json({ error: "Unrecognised upload slot." }, { status: 400 });
  }
  if (!EXTENSION_BY_MIME[file.type]) {
    return NextResponse.json(
      { error: "Only PNG, JPG, WEBP, SVG or ICO images are allowed." },
      { status: 400 }
    );
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Image must be 3MB or smaller." }, { status: 400 });
  }

  const filename = `${slotRaw}.${EXTENSION_BY_MIME[file.type]}`;
  const folder = `site-${siteId}`;

  /*
   * Literal path segments, not a spread array.
   *
   * `path.join(process.cwd(), "public", ...SEGMENTS, filename)` is what the members upload routes
   * used to do, and Turbopack's static file tracing turned the dynamic portion into a glob that
   * pulled 10,633 files into the trace and ran the build out of memory. Written out literally it
   * traces as one path. See the note in next.config.ts's outputFileTracingExcludes.
   */
  const diskPath = path.join(process.cwd(), "public", "files", "settings", folder, filename);
  const publicUrl = `/files/settings/${folder}/${filename}`;

  try {
    await mkdir(path.dirname(diskPath), { recursive: true });
    await writeFile(diskPath, Buffer.from(await file.arrayBuffer()));
  } catch (error) {
    console.error("[hub/upload] failed to write file:", error);
    return NextResponse.json({ error: "Could not save the uploaded image." }, { status: 500 });
  }

  /*
   * The stored value carries no cache-buster; the returned one does.
   *
   * A `?v=` baked into find_settings would be a new row value on every re-upload and would defeat
   * the `domain` cache tag's own invalidation. The query string exists only so the browser that
   * just uploaded stops showing the previous image in its preview.
   */
  return NextResponse.json({ success: true, url: publicUrl, preview: `${publicUrl}?v=${Date.now()}` });
}
