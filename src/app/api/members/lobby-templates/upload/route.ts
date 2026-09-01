import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { requireEventMember } from "@/lib/auth/requireEventMember";
import { setLobbyTemplateImage, setTemplateColorImage } from "@/lib/services/eventLobbyTemplates";
import { IMAGE_UPLOAD_MIME_TYPES, IMAGE_UPLOAD_MAX_BYTES } from "@/lib/validations/eventTodoList";

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

/**
 * Mirrors the two upload targets in members/event_lobby_templates.php:
 *
 *   kind=template  ->  /files/lobby/template/<id>.<ext>          (the layout preview)
 *   kind=color     ->  /files/lobby/template/child/<id>.<ext>    (a colourway swatch)
 *
 * Both are named after the row's own id, exactly as the legacy did, so a row has to be saved
 * before its image can be uploaded — the client posts the form first, then the file.
 */
export async function POST(request: Request) {
  const context = await requireEventMember(request);
  if ("error" in context) return context.error;

  if (context.role !== "organiser") {
    return NextResponse.json({ error: "Only the event organiser can upload template images." }, { status: 403 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const id = Number(form.get("id"));
  const kind = String(form.get("kind") ?? "template");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file was uploaded." }, { status: 400 });
  }
  if (!id || !Number.isInteger(id) || id <= 0) {
    return NextResponse.json(
      { error: "Missing or invalid id. Save the template before uploading an image." },
      { status: 400 }
    );
  }
  if (kind !== "template" && kind !== "color") {
    return NextResponse.json({ error: "Unknown upload kind." }, { status: 400 });
  }
  if (!IMAGE_UPLOAD_MIME_TYPES.includes(file.type as (typeof IMAGE_UPLOAD_MIME_TYPES)[number])) {
    return NextResponse.json({ error: "Only JPG, PNG, GIF, or WEBP images are allowed." }, { status: 400 });
  }
  if (file.size > IMAGE_UPLOAD_MAX_BYTES) {
    return NextResponse.json({ error: "Image must be 5MB or smaller." }, { status: 400 });
  }

  const ext = EXTENSION_BY_MIME[file.type] ?? "jpg";
  const segments = kind === "color" ? ["files", "lobby", "template", "child"] : ["files", "lobby", "template"];
  const filename = `${id}.${ext}`;
  const diskPath = path.join(process.cwd(), "public", ...segments, filename);
  const publicUrl = `/${segments.join("/")}/${filename}`;

  try {
    await mkdir(path.dirname(diskPath), { recursive: true });
    await writeFile(diskPath, Buffer.from(await file.arrayBuffer()));
  } catch (err) {
    console.error("[lobby-templates/upload] failed to write file:", err);
    return NextResponse.json({ error: "Could not save the uploaded image." }, { status: 500 });
  }

  const result =
    kind === "color"
      ? await setTemplateColorImage(context, id, publicUrl)
      : await setLobbyTemplateImage(context, id, publicUrl);

  if (result.count === 0) {
    return NextResponse.json({ error: "Row not found." }, { status: 404 });
  }

  // Cache-buster: the filename never changes, so a replaced image would otherwise keep showing
  // the previous one until a hard refresh.
  return NextResponse.json({ success: true, url: `${publicUrl}?v=${Date.now()}` });
}
