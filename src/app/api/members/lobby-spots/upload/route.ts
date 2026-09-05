import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { requireEventMember } from "@/lib/auth/requireEventMember";
import { canManageLobby } from "@/lib/services/eventAccess";
import { setSpotImage } from "@/lib/services/eventLobbySpots";
import { IMAGE_UPLOAD_MIME_TYPES, IMAGE_UPLOAD_MAX_BYTES } from "@/lib/validations/eventTodoList";

/**
 * ---------------------------------------------------------------------------
 * Artwork for one lobby spot.
 * ---------------------------------------------------------------------------
 *
 * The sized spots on a zone — the two hall screens in the auditorium, for instance — are blank
 * panels until something is put on them. This is the "Browse" behind each panel.
 *
 * Mirrors the upload half of members/event_lobby_spots.php, which copies the posted file to the
 * lobby folder and records the filename against the spot. Named after the spot's own id, exactly
 * as the legacy did, so a spot must exist before it can be given artwork — there is no orphaned
 * file to clean up if the request fails halfway.
 */

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

const SEGMENTS = ["files", "lobby", "spot"];

export async function POST(request: Request) {
  const context = await requireEventMember(request);
  if ("error" in context) return context.error;

  // Same rule as the page this is called from — see canManageLobby() for what it grants.
  if (!canManageLobby(context)) {
    return NextResponse.json({ error: "You cannot configure this event's lobby." }, { status: 403 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const id = Number(form.get("id"));

  if (!id || !Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Missing or invalid spot id." }, { status: 400 });
  }

  // An explicit clear: no file, `remove=1`. Kept on the same route so the column is only ever
  // written in one place.
  if (String(form.get("remove") ?? "") === "1") {
    const cleared = await setSpotImage(context, id, null);
    if (cleared.count === 0) {
      return NextResponse.json({ error: "Spot not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true, url: null });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file was uploaded." }, { status: 400 });
  }
  if (!IMAGE_UPLOAD_MIME_TYPES.includes(file.type as (typeof IMAGE_UPLOAD_MIME_TYPES)[number])) {
    return NextResponse.json({ error: "Only JPG, PNG, GIF, or WEBP images are allowed." }, { status: 400 });
  }
  if (file.size > IMAGE_UPLOAD_MAX_BYTES) {
    return NextResponse.json({ error: "Image must be 5MB or smaller." }, { status: 400 });
  }

  const ext = EXTENSION_BY_MIME[file.type] ?? "jpg";
  const filename = `${id}.${ext}`;
  const diskPath = path.join(process.cwd(), "public", ...SEGMENTS, filename);
  const publicUrl = `/${SEGMENTS.join("/")}/${filename}`;

  try {
    await mkdir(path.dirname(diskPath), { recursive: true });
    await writeFile(diskPath, Buffer.from(await file.arrayBuffer()));
  } catch (err) {
    console.error("[lobby-spots/upload] failed to write file:", err);
    return NextResponse.json({ error: "Could not save the uploaded image." }, { status: 500 });
  }

  // Write the DB row only after the bytes are on disk: the reverse order can leave a spot
  // pointing at a file that was never written.
  const result = await setSpotImage(context, id, publicUrl);
  if (result.count === 0) {
    return NextResponse.json({ error: "Spot not found." }, { status: 404 });
  }

  /*
   * Cache-buster. The filename is derived from the spot id and therefore NEVER changes when the
   * artwork is replaced, so without this the browser keeps showing the previous image until a
   * hard refresh — which reads as "the upload didn't work".
   */
  return NextResponse.json({ success: true, url: `${publicUrl}?v=${Date.now()}` });
}
