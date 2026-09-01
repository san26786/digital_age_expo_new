import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { requireEventMember } from "@/lib/auth/requireEventMember";
import {
  setExhibitorImage,
  EXHIBITOR_IMAGE_FIELDS,
  type ExhibitorImageField,
} from "@/lib/services/eventExhibitorAdmin";
import { IMAGE_UPLOAD_MIME_TYPES, IMAGE_UPLOAD_MAX_BYTES } from "@/lib/validations/eventTodoList";

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

/** One subfolder per field, mirroring the legacy EXHIBITOR_*_PATH constants. */
const FOLDER_BY_FIELD: Record<ExhibitorImageField, string> = {
  profile_pic: "profile",
  logo: "logo",
  stand_logo: "stand_logo",
};

/**
 * Profile Image / Website Logo / Stand Logo for one exhibitor — the three `file` fields on the
 * legacy Add Trade Stand form (view_exhibitor.php:573-607).
 *
 * Same shape as news-feed/upload: the file is named after the exhibitor's own id, so the row must
 * exist before an image can be attached. The modal therefore saves first and uploads second, and
 * for a NEW exhibitor uses the id the POST returns.
 */
export async function POST(request: Request) {
  const context = await requireEventMember(request);
  if ("error" in context) return context.error;

  if (context.role !== "organiser") {
    return NextResponse.json(
      { error: "Only the event organiser can upload exhibitor images." },
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
      { error: "Missing or invalid id. Save the exhibitor before uploading an image." },
      { status: 400 },
    );
  }

  if (!(EXHIBITOR_IMAGE_FIELDS as readonly string[]).includes(fieldRaw)) {
    return NextResponse.json(
      { error: "Unknown image field. Expected profile_pic, logo or stand_logo." },
      { status: 400 },
    );
  }
  const field = fieldRaw as ExhibitorImageField;

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
  const folder = FOLDER_BY_FIELD[field];
  const filename = `${id}.${ext}`;
  const diskPath = path.join(process.cwd(), "public", "files", "exhibitor", folder, filename);
  const publicUrl = `/files/exhibitor/${folder}/${filename}`;

  try {
    await mkdir(path.dirname(diskPath), { recursive: true });
    await writeFile(diskPath, Buffer.from(await file.arrayBuffer()));
  } catch (err) {
    console.error("[exhibitors-admin/upload] failed to write file:", err);
    return NextResponse.json({ error: "Could not save the uploaded image." }, { status: 500 });
  }

  const result = await setExhibitorImage(context, id, field, publicUrl);
  if (result.count === 0) {
    return NextResponse.json({ error: "Exhibitor not found for this event." }, { status: 404 });
  }

  // Cache-buster: the filename never changes, so without it the browser keeps showing the old image.
  return NextResponse.json({ success: true, url: `${publicUrl}?v=${Date.now()}` });
}
