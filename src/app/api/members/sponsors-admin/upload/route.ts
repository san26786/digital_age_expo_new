import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { requireEventMember } from "@/lib/auth/requireEventMember";
import { setSponsorImage } from "@/lib/services/eventSponsorAdmin";
import { IMAGE_UPLOAD_MIME_TYPES, IMAGE_UPLOAD_MAX_BYTES } from "@/lib/validations/eventTodoList";

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

/** Form field name -> [public subfolder, database column]. */
const TARGET_BY_FIELD: Record<string, { folder: string; column: "sponsor_img" | "banner_extension" }> = {
  sponsor_img: { folder: "sponsor", column: "sponsor_img" },
  advert_banner: { folder: "SponsorEventBanner", column: "banner_extension" },
};

/**
 * Sponsor Logo / Event Banner upload — the two `file` fields on the legacy Add Sponsor form
 * (view_sponsor.php:290, :336).
 *
 * Same shape as news-feed/upload: the file is named after the sponsor's own id, so the row must
 * exist before an image can be attached. The modal therefore saves first and uploads second, and
 * for a NEW sponsor uses the id the POST returns.
 *
 * Both columns are written with the full public URL. The legacy schema stored only an extension in
 * banner_extension and rebuilt the path at render time; storing the resolved URL removes that
 * guesswork, and the read path still understands the old bare-extension form for rows the PHP app
 * wrote (see sponsorImageUrl in the service).
 */
export async function POST(request: Request) {
  const context = await requireEventMember(request);
  if ("error" in context) return context.error;

  if (context.role !== "organiser") {
    return NextResponse.json(
      { error: "Only the event organiser can upload sponsor images." },
      { status: 403 },
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  const idRaw = form.get("id");
  const fieldRaw = String(form.get("field") ?? "");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file was uploaded." }, { status: 400 });
  }

  const id = Number(idRaw);
  if (!id || !Number.isInteger(id) || id <= 0) {
    return NextResponse.json(
      { error: "Missing or invalid id. Save the sponsor before uploading an image." },
      { status: 400 },
    );
  }

  const target = TARGET_BY_FIELD[fieldRaw];
  if (!target) {
    return NextResponse.json(
      { error: "Unknown image field. Expected sponsor_img or advert_banner." },
      { status: 400 },
    );
  }

  if (!IMAGE_UPLOAD_MIME_TYPES.includes(file.type as (typeof IMAGE_UPLOAD_MIME_TYPES)[number])) {
    return NextResponse.json(
      { error: "Only JPG, PNG, GIF, or WEBP images are allowed." },
      { status: 400 },
    );
  }
  if (file.size > IMAGE_UPLOAD_MAX_BYTES) {
    return NextResponse.json({ error: "Image must be 5MB or smaller." }, { status: 400 });
  }

  const ext = EXTENSION_BY_MIME[file.type] ?? "jpg";
  const filename = `${id}.${ext}`;
  const diskPath = path.join(process.cwd(), "public", "files", target.folder, filename);
  const publicUrl = `/files/${target.folder}/${filename}`;

  try {
    await mkdir(path.dirname(diskPath), { recursive: true });
    await writeFile(diskPath, Buffer.from(await file.arrayBuffer()));
  } catch (err) {
    console.error("[sponsors-admin/upload] failed to write file:", err);
    return NextResponse.json({ error: "Could not save the uploaded image." }, { status: 500 });
  }

  const result = await setSponsorImage(context, id, target.column, publicUrl);
  if (result.count === 0) {
    return NextResponse.json({ error: "Sponsor not found for this event." }, { status: 404 });
  }

  // Cache-buster: the filename never changes, so without it the browser keeps the old image.
  return NextResponse.json({ success: true, url: `${publicUrl}?v=${Date.now()}` });
}
