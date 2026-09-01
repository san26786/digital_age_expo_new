#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/mnt/digitalexpo"

BASE=src/app/api/members/sponsors-admin
mkdir -p $BASE/stats $BASE/form-options $BASE/email-templates $BASE/send-mail \
         $BASE/import $BASE/bulk-status $BASE/bulk-delete $BASE/bulk-flag $BASE/upload

cat > $BASE/stats/route.ts <<'TS'
import { NextResponse } from "next/server";
import { requireEventMember } from "@/lib/auth/requireEventMember";
import { getSponsorStats } from "@/lib/services/eventSponsorAdmin";

/** Feeds the header badges, including the Available / Used sponsorship-slot counts. */
export async function GET() {
  const context = await requireEventMember();
  if ("error" in context) return context.error;

  return NextResponse.json({ stats: await getSponsorStats(context) });
}
TS

cat > $BASE/form-options/route.ts <<'TS'
import { NextResponse } from "next/server";
import { requireEventMember } from "@/lib/auth/requireEventMember";
import { getSponsorFormOptions } from "@/lib/services/eventSponsorAdmin";

/**
 * Reference data for the Add / Edit Sponsor modal — the dropdowns the legacy form built inline
 * while rendering (members/view_sponsor.php:207-325).
 *
 * `order_id` is optional and only used when editing: it keeps the order already attached to this
 * sponsor in the "Available Sponsorship" list even though it is flagged used.
 */
export async function GET(request: Request) {
  const context = await requireEventMember();
  if ("error" in context) return context.error;

  if (context.role !== "organiser") {
    return NextResponse.json(
      { error: "Only the event organiser can manage sponsors." },
      { status: 403 },
    );
  }

  const raw = new URL(request.url).searchParams.get("order_id");
  const currentOrderId = raw && Number.isFinite(Number(raw)) ? Number(raw) : null;

  return NextResponse.json({ options: await getSponsorFormOptions(context, currentOrderId) });
}
TS

cat > $BASE/email-templates/route.ts <<'TS'
import { NextResponse } from "next/server";
import { requireEventMember } from "@/lib/auth/requireEventMember";
import { getSponsorEmailTemplates } from "@/lib/services/eventSponsorAdmin";

/** Feeds the "Select an Email Template" dropdown. */
export async function GET() {
  const context = await requireEventMember();
  if ("error" in context) return context.error;

  if (context.role !== "organiser") {
    return NextResponse.json({ error: "Only the event organiser can send sponsor mail." }, { status: 403 });
  }

  return NextResponse.json({ templates: await getSponsorEmailTemplates() });
}
TS

cat > $BASE/send-mail/route.ts <<'TS'
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireEventMember } from "@/lib/auth/requireEventMember";
import { prisma } from "@/lib/prisma";
import { sendTemplatedEmail } from "@/lib/email/sendTemplatedEmail";

const schema = z.object({
  ids: z.array(z.number()).min(1, "Select at least one sponsor"),
  templateId: z.string().min(1, "Choose an email template"),
});

/**
 * Sends one templated email per selected sponsor — the "Send Mail" button beside the template
 * dropdown, mirroring view_sponsor.php's `mail_submit` branch.
 *
 * Sends are sequential rather than fanned out with Promise.all: SMTP relays rate-limit, and a
 * burst of parallel connections is the reliable way to get a batch rejected partway through.
 *
 * The result is reported honestly — sent/failed counts plus the first reason — because
 * "smtp_not_configured" is otherwise indistinguishable from a successful send.
 */
export async function POST(request: Request) {
  const context = await requireEventMember();
  if ("error" in context) return context.error;

  if (context.role !== "organiser") {
    return NextResponse.json({ error: "Only the event organiser can send sponsor mail." }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const fields = parsed.error.flatten().fieldErrors;
    const first = Object.values(fields).find((m) => Array.isArray(m) && m.length > 0)?.[0];
    return NextResponse.json({ error: first ?? "Invalid payload" }, { status: 400 });
  }

  // Scoped by event as well as id, so one organiser cannot mail another event's sponsors by
  // posting guessed ids.
  const sponsors = await prisma.find_event_sponsorer.findMany({
    where: { id: { in: parsed.data.ids }, event_id: context.eventId },
    select: { id: true, email: true, name: true, business: true, batch_number: true },
  });

  let sent = 0;
  let failed = 0;
  let firstReason: string | null = null;

  for (const sponsor of sponsors) {
    const to = (sponsor.email ?? "").trim();
    if (!to) {
      failed += 1;
      firstReason ??= "no_email_address";
      continue;
    }

    const result = await sendTemplatedEmail(
      parsed.data.templateId,
      {
        name: sponsor.name ?? "",
        business: sponsor.business ?? "",
        batch_number: sponsor.batch_number ?? "",
        email: to,
      },
      { to },
    );

    if (result.sent) sent += 1;
    else {
      failed += 1;
      firstReason ??= result.reason ?? "send_failed";
    }
  }

  const missing = parsed.data.ids.length - sponsors.length;
  return NextResponse.json({ success: true, sent, failed, missing, reason: firstReason });
}
TS

cat > $BASE/import/route.ts <<'TS'
import { NextResponse } from "next/server";
import { requireEventMember } from "@/lib/auth/requireEventMember";
import { importSponsors } from "@/lib/services/eventSponsorAdmin";

/** Guards against a mis-picked file turning into a very large insert. */
const MAX_ROWS = 5000;

/** Bulk CSV import for the sponsor list. */
export async function POST(request: Request) {
  const context = await requireEventMember();
  if ("error" in context) return context.error;

  if (context.role !== "organiser") {
    return NextResponse.json({ error: "Only the event organiser can import sponsors." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Could not read the request body." }, { status: 400 });
  }

  const rows = (body as { rows?: unknown })?.rows;
  if (!Array.isArray(rows)) {
    return NextResponse.json({ error: "Expected a `rows` array." }, { status: 400 });
  }
  if (rows.length === 0) {
    return NextResponse.json({ error: "That file has no data rows." }, { status: 400 });
  }
  if (rows.length > MAX_ROWS) {
    return NextResponse.json(
      { error: `That file has ${rows.length} rows; the limit is ${MAX_ROWS}.` },
      { status: 400 },
    );
  }

  try {
    const result = await importSponsors(context, rows as Record<string, string>[]);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error("[sponsors-admin/import] failed:", err);
    return NextResponse.json({ error: "The import failed." }, { status: 500 });
  }
}
TS

cat > $BASE/bulk-status/route.ts <<'TS'
import { NextResponse } from "next/server";
import { requireEventMember } from "@/lib/auth/requireEventMember";
import { SPONSOR_BULK_STATUS_ACTIONS } from "@/lib/validations/eventSponsorAdmin";
import { bulkSetSponsorStatus } from "@/lib/services/eventSponsorAdmin";

export async function POST(request: Request) {
  const context = await requireEventMember();
  if ("error" in context) return context.error;

  if (context.role !== "organiser") {
    return NextResponse.json({ error: "Only the event organiser can update sponsors." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const ids = Array.isArray(body?.ids)
    ? body.ids.map(Number).filter((n: number) => Number.isInteger(n) && n > 0)
    : [];
  const status = typeof body?.status === "string" ? body.status : "";

  if (ids.length === 0) {
    return NextResponse.json({ error: "No rows were selected." }, { status: 400 });
  }
  if (!SPONSOR_BULK_STATUS_ACTIONS.includes(status as (typeof SPONSOR_BULK_STATUS_ACTIONS)[number])) {
    return NextResponse.json({ error: "Unrecognised status." }, { status: 400 });
  }

  const result = await bulkSetSponsorStatus(context, ids, status);
  return NextResponse.json({ success: true, count: result.count });
}
TS

cat > $BASE/bulk-flag/route.ts <<'TS'
import { NextResponse } from "next/server";
import { requireEventMember } from "@/lib/auth/requireEventMember";
import { bulkSetSponsorFlag, SPONSOR_FLAGS, type SponsorFlag } from "@/lib/services/eventSponsorAdmin";

/**
 * The on/off promotion actions — Featured, Sold Out, the two banner placements and Enable
 * Sponsorship. Kept separate from bulk-status because these are independent flags, not one
 * mutually-exclusive state.
 */
export async function POST(request: Request) {
  const context = await requireEventMember();
  if ("error" in context) return context.error;

  if (context.role !== "organiser") {
    return NextResponse.json({ error: "Only the event organiser can update sponsors." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const ids = Array.isArray(body?.ids)
    ? body.ids.map(Number).filter((n: number) => Number.isInteger(n) && n > 0)
    : [];
  const flag = typeof body?.flag === "string" ? body.flag : "";
  const value = Boolean(body?.value);

  if (ids.length === 0) {
    return NextResponse.json({ error: "No rows were selected." }, { status: 400 });
  }
  if (!(SPONSOR_FLAGS as readonly string[]).includes(flag)) {
    return NextResponse.json({ error: "Unrecognised flag." }, { status: 400 });
  }

  const result = await bulkSetSponsorFlag(context, ids, flag as SponsorFlag, value);
  return NextResponse.json({ success: true, count: result.count });
}
TS

cat > $BASE/bulk-delete/route.ts <<'TS'
import { NextResponse } from "next/server";
import { requireEventMember } from "@/lib/auth/requireEventMember";
import { bulkDeleteSponsors } from "@/lib/services/eventSponsorAdmin";

export async function POST(request: Request) {
  const context = await requireEventMember();
  if ("error" in context) return context.error;

  if (context.role !== "organiser") {
    return NextResponse.json({ error: "Only the event organiser can delete sponsors." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const ids = Array.isArray(body?.ids)
    ? body.ids.map(Number).filter((n: number) => Number.isInteger(n) && n > 0)
    : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "No rows were selected." }, { status: 400 });
  }

  const result = await bulkDeleteSponsors(context, ids);
  return NextResponse.json({ success: true, count: result.count });
}
TS

cat > $BASE/upload/route.ts <<'TS'
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
TS

echo "routes written"
