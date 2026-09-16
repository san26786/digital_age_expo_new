/**
 * A visitor's meeting request against one exhibitor's stand.
 *
 *   GET  ?exhibitorId=123&date=2026-09-16   -> ["09:00", "14:30"]  times already taken
 *   POST { exhibitorId, date: "YYYY-MM-DD", time: "HH:MM" }
 *
 * Writes `find_event_schedule_meeting`, which is the table the members area already reads, so a
 * request made from the booth shows up wherever the organiser and exhibitor look today.
 *
 * The GET exists so the modal can grey out slots that are gone. Without it two visitors can pick
 * the same 10:00 and both be told it worked, which is a worse failure than a greyed-out button.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";
import { getDomain } from "@/lib/services/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** "YYYY-MM-DD" -> a UTC midnight Date, or null. Parsed by hand: `new Date("2026-09-16")` is
 *  UTC while `new Date(2026, 8, 16)` is local, and mixing the two shifts a booking by a day. */
function parseDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  if (Number.isNaN(date.getTime())) return null;
  if (date.getUTCMonth() !== Number(m) - 1 || date.getUTCDate() !== Number(d)) return null;
  return date;
}

function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value.trim());
}

async function exhibitorOfActiveEvent(exhibitorId: number) {
  const domain = await getDomain();
  const eventId = domain.event_id;
  if (!eventId || !exhibitorId) return null;

  // The id comes from the browser, so the stand must be proven to belong to this event before
  // anything is written against it.
  const exhibitor = await prisma.find_event_exhibitor.findFirst({
    where: { id: exhibitorId, event_id: eventId },
    select: { id: true, business: true },
  });
  return exhibitor ? { exhibitor, eventId } : null;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const exhibitorId = Number(params.get("exhibitorId")) || 0;
  const date = parseDate(params.get("date") ?? "");
  if (!exhibitorId || !date) return NextResponse.json({ taken: [] });

  const found = await exhibitorOfActiveEvent(exhibitorId);
  if (!found) return NextResponse.json({ taken: [] });

  const rows = await prisma.find_event_schedule_meeting.findMany({
    where: { exhibitor_id: exhibitorId, event_id: found.eventId, meeting_date: date },
    select: { meeting_time: true },
  });

  return NextResponse.json(
    { taken: rows.map((r: { meeting_time: string }) => r.meeting_time) },
    { headers: { "cache-control": "no-store" } }
  );
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in to request a meeting." }, { status: 401 });
  }

  let body: { exhibitorId?: unknown; date?: unknown; time?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const exhibitorId = Number(body.exhibitorId) || 0;
  const date = parseDate(String(body.date ?? ""));
  const time = String(body.time ?? "").trim();

  if (!date) return NextResponse.json({ error: "Pick a date." }, { status: 400 });
  if (!isValidTime(time)) return NextResponse.json({ error: "Pick a time." }, { status: 400 });

  // Yesterday cannot be booked. Compared at UTC midnight, the same basis parseDate() produced.
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (date < today) {
    return NextResponse.json({ error: "That date has passed." }, { status: 400 });
  }

  const found = await exhibitorOfActiveEvent(exhibitorId);
  if (!found) {
    return NextResponse.json({ error: "That stand is not at this event." }, { status: 404 });
  }

  const clash = await prisma.find_event_schedule_meeting.findFirst({
    where: {
      exhibitor_id: exhibitorId,
      event_id: found.eventId,
      meeting_date: date,
      meeting_time: time,
    },
    select: { id: true, user_id: true },
  });
  if (clash) {
    return NextResponse.json(
      {
        error:
          clash.user_id === (Number(session.user.id) || 0)
            ? "You have already requested that slot."
            : "That slot has just been taken — pick another.",
      },
      { status: 409 }
    );
  }

  await prisma.find_event_schedule_meeting.create({
    data: {
      meeting_date: date,
      meeting_time: time,
      exhibitor_id: exhibitorId,
      event_id: found.eventId,
      user_id: Number(session.user.id) || 0,
    },
  });

  return NextResponse.json({ ok: true, business: found.exhibitor.business });
}
