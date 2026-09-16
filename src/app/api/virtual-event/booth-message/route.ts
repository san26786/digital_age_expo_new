/**
 * A visitor's message to one exhibitor's stand, from the booth chat panel.
 *
 *   POST { exhibitorId: number, message: string }
 *
 * There is no chat table in this schema and no socket server behind it, so a panel that only
 * kept messages in React state would look like it was talking to someone and quietly throw the
 * conversation away. It writes to `find_event_lobby_visitor_enquires` instead — the enquiry inbox
 * exhibitors and organisers already read in the members area — with `exhibitor_id` set so it
 * lands on the right stand rather than in the event's general pile.
 *
 * It is one-way: the visitor can reach the stand, the stand replies through the channel it
 * already uses. The panel says as much rather than implying a live agent is typing back.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";
import { getDomain } from "@/lib/services/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MESSAGE = 1000;

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in to message this stand." }, { status: 401 });
  }

  let body: { exhibitorId?: unknown; message?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const exhibitorId = Number(body.exhibitorId) || 0;
  const message = String(body.message ?? "").trim();

  if (!exhibitorId) {
    return NextResponse.json({ error: "Which stand?" }, { status: 400 });
  }
  if (!message) {
    return NextResponse.json({ error: "Type a message first." }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE) {
    return NextResponse.json(
      { error: `Messages are limited to ${MAX_MESSAGE} characters.` },
      { status: 400 }
    );
  }

  const domain = await getDomain();
  const eventId = domain.event_id;
  if (!eventId) {
    return NextResponse.json({ error: "No active event." }, { status: 409 });
  }

  // The exhibitor must belong to THIS event: exhibitorId arrives from the browser, and without
  // this a crafted id would file a message against a stand at someone else's event.
  const exhibitor = await prisma.find_event_exhibitor.findFirst({
    where: { id: exhibitorId, event_id: eventId },
    select: { id: true, business: true },
  });
  if (!exhibitor) {
    return NextResponse.json({ error: "That stand is not at this event." }, { status: 404 });
  }

  const userId = Number(session.user.id) || 0;
  const visitor = userId
    ? await prisma.find_users.findUnique({
        where: { id: userId },
        select: {
          user_first_name: true,
          user_last_name: true,
          user_email: true,
          user_phone: true,
          work_phone: true,
        },
      })
    : null;

  const name =
    [visitor?.user_first_name, visitor?.user_last_name].filter(Boolean).join(" ").trim() ||
    session.user.name ||
    "Visitor";

  await prisma.find_event_lobby_visitor_enquires.create({
    data: {
      name: name.slice(0, 255),
      email: (visitor?.user_email || session.user.email || "").slice(0, 255),
      mobile_no: (visitor?.user_phone || visitor?.work_phone || "").slice(0, 100),
      question_description: message.slice(0, MAX_MESSAGE),
      answer: "",
      event_id: eventId,
      user_id: userId,
      layout_type_setup_id: 0,
      exhibitor_id: exhibitor.id,
    },
  });

  return NextResponse.json({ ok: true, business: exhibitor.business });
}
