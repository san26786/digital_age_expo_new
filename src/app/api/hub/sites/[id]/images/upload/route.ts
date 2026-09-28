import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { canEditSite } from "@/lib/hub/access";
import { findSlot, isEditable } from "@/lib/images/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Upload one image for one slot on one site.
 *
 * ---------------------------------------------------------------------------
 *  WHY THIS IS NOT THE EXISTING /api/hub/sites/[id]/upload
 * ---------------------------------------------------------------------------
 *
 *  That route takes a closed list of six branding slots and names the file after the slot. It
 *  could not accept a seventh without editing it, and this feature was asked to add rather than
 *  change. It also writes into `files/settings/site-<id>/`, where the branding images live; a
 *  section banner landing in that folder would be indistinguishable from a logo.
 *
 *  So: its own folder, and the slot list is the registry's, checked the same way the API route
 *  checks it.
 *
 *  ---------------------------------------------------------------------------
 *   NOTHING THE CLIENT SENDS REACHES THE FILESYSTEM AS TEXT
 *  ---------------------------------------------------------------------------
 *
 *  The site id is parsed as an integer. The slot must match a registry entry by exact string
 *  equality, and the registry's ids are `[a-z-]` literals written in this repository. The
 *  extension comes from a lookup keyed on the detected MIME type, never from the filename — so a
 *  file called `../../../etc/passwd.png` has nowhere to land.
 *
 *  UPLOADING DOES NOT PUBLISH. This writes a file and returns its URL; the image is not attached
 *  to anything until the admin saves that slot through the PATCH route above. An upload the admin
 *  abandons leaves an unreferenced file and nothing else.
 */

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
};

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const siteId = Number(id);
  if (!Number.isInteger(siteId) || siteId <= 0) {
    return NextResponse.json({ error: "A positive integer site id is required" }, { status: 400 });
  }
  if (!(await canEditSite(siteId))) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const slotIdRaw = form.get("slotId");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file was uploaded." }, { status: 400 });
  }
  if (typeof slotIdRaw !== "string") {
    return NextResponse.json({ error: "No image slot was given." }, { status: 400 });
  }

  const slot = findSlot(slotIdRaw);
  if (!slot || !isEditable(slot)) {
    return NextResponse.json({ error: "That image cannot be changed from here." }, { status: 400 });
  }
  if (!EXTENSION_BY_MIME[file.type]) {
    return NextResponse.json(
      { error: "Only PNG, JPG, WEBP, GIF, SVG or ICO images are allowed." },
      { status: 400 }
    );
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Image must be 5MB or smaller." }, { status: 400 });
  }

  const filename = `${slot.id}.${EXTENSION_BY_MIME[file.type]}`;
  const folder = `site-${siteId}`;

  /*
   * Literal path segments, not a spread array — Turbopack's static file tracing turns a spread
   * into a glob and pulls the whole public tree into the trace. Same shape as the branding
   * uploader for the same reason; see the note in next.config.ts's outputFileTracingExcludes.
   */
  const diskPath = path.join(process.cwd(), "public", "files", "site-images", folder, filename);
  const publicUrl = `/files/site-images/${folder}/${filename}`;

  try {
    await mkdir(path.dirname(diskPath), { recursive: true });
    await writeFile(diskPath, Buffer.from(await file.arrayBuffer()));
  } catch (error) {
    console.error("[hub/site-images] failed to write file:", error);
    return NextResponse.json({ error: "Could not save the uploaded image." }, { status: 500 });
  }

  // The stored value carries no cache-buster; the preview does, so the browser that just uploaded
  // stops showing the previous file at the same filename.
  return NextResponse.json({ ok: true, url: publicUrl, preview: `${publicUrl}?v=${Date.now()}` });
}
