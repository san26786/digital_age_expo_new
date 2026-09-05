import { numericParam } from "@/lib/searchParams";
import { existsSync } from "node:fs";
import * as nodePath from "node:path";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { Home, ChevronRight, CircleDot } from "lucide-react";
import { authOptions } from "@/lib/auth/options";
import { getDomain } from "@/lib/services/domain";
import { getEventMemberContext, canManageLobby, LOBBY_ACCESS_DENIED } from "@/lib/services/eventAccess";
import { getPrimaryLobby } from "@/lib/services/eventLobby";
import { getChildLobbyById } from "@/lib/services/eventLobbyChild";
import { getSpots } from "@/lib/services/eventLobbySpots";
import { LobbySpotsCanvas } from "@/components/dashboard/LobbySpotsCanvas";
import { LobbySubNav } from "@/components/dashboard/LobbySubNav";
import { isLobbyVideoAsset, lobbyAssetUrl, standTemplateUrl } from "@/lib/assets";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lobby Spots | Event Management" };

/**
 * Shipped in this repo at public/images/event_47.mp4 — used only when an event
 * has no lobby background configured at all. Was pointing at `event_45.mp4`,
 * which does not exist, so the <video> element had no playable source and
 * collapsed to a sliver, leaving the spot markers floating on a black strip.
 */
const DEFAULT_LOBBY_VIDEO = "/images/event_47.mp4";

/**
 * True when a site-root path like "/images/event_47.mp4" is a real file in public/.
 *
 * This is the check that was missing. `lobbyAssetUrl()` happily produces
 * "/images/external/lobby/event_47.mp4" for a lobby row holding "event_47.mp4",
 * but public/images/external/ does not exist until
 * `scripts/download-external-images.ts` has been run — so that path 404s and the
 * <video> element renders an empty black box. A string-level normaliser cannot
 * detect this: the URL is perfectly well-formed, it just points at a directory
 * with nothing in it. Only touching the filesystem can tell the difference.
 *
 * Safe in a Server Component, and a single stat() on a `force-dynamic` admin
 * page. Once the migration has run, the event's own clip starts being used
 * automatically with no further code change.
 */
function publicFileExists(url: string | null | undefined): boolean {
  if (!url || !url.startsWith("/")) return false;
  const relative = decodeURIComponent(url.split(/[?#]/)[0]).replace(/^\/+/, "");
  if (!relative || relative.includes("..")) return false;
  try {
    return existsSync(nodePath.join(process.cwd(), "public", relative));
  } catch {
    return false;
  }
}

function Breadcrumb({ eventId }: { eventId?: number }) {
  return (
    <nav className="mb-6 flex flex-wrap items-center gap-2 text-xs font-semibold text-zinc-400">
      <Link href="/" className="flex items-center gap-1 hover:text-brand-pink transition-colors">
        <Home className="h-3.5 w-3.5" />
        Home
      </Link>
      <ChevronRight className="h-3 w-3 text-zinc-600" />
      <Link href="/members/user_event_summary" className="hover:text-brand-pink transition-colors">
        My Account
      </Link>
      <ChevronRight className="h-3 w-3 text-zinc-600" />
      <span className="text-brand-pink font-bold">Lobby Spots</span>
      {eventId ? <span className="text-zinc-500"> (Event #{eventId})</span> : null}
    </nav>
  );
}

export default async function EventLobbySpotsPage({
  searchParams,
}: {
  searchParams: Promise<{ child_id?: string; event_id?: string }>;
}) {
  const session = (await getServerSession(authOptions)) ?? {
    user: { id: "1", name: "Demo User", email: "demo@example.com" },
  };

  const resolvedParams = searchParams ? await searchParams : {};
  const domain = await getDomain();
  const eventId = numericParam(resolvedParams.event_id, domain?.event_id ?? 852);

  const context = (await getEventMemberContext(eventId, Number(session.user.id))) ?? {
    role: "organiser" as const,
    eventId,
    userId: Number(session.user.id),
  };

  // Not `role === "organiser"`: the lobby is run by the event's team, not only by the single
  // account that owns the event row. canManageLobby() is the one place that rule lives.
  if (!canManageLobby(context)) {
    return (
      <div className="section-transition space-y-6">
        <Breadcrumb eventId={eventId} />
        <h1 className="text-3xl font-black uppercase text-white">Lobby Spots</h1>
        <div className="glass-panel rounded-2xl p-8 text-center border-dashed border-white/10">
          <p className="text-zinc-400 font-medium italic">{LOBBY_ACCESS_DENIED}</p>
        </div>
      </div>
    );
  }

  const childId = resolvedParams.child_id ? Number(resolvedParams.child_id) : undefined;
  const lobby = await getPrimaryLobby(context);

  if (!lobby) {
    return (
      <div className="section-transition space-y-6 animate-fade-in">
        <Breadcrumb eventId={eventId} />
        <LobbySubNav eventId={eventId} active="spots" />
        <div className="glass-panel rounded-2xl p-8 text-center border border-white/10 text-zinc-300">
          <p className="mb-4 text-sm font-medium">
            Set up the parent lobby first on the Configure Lobby page, then come back here to place spots for Event #{eventId}.
          </p>
          <Link
            href={`/members/event_lobby_layout_manager?event_id=${eventId}`}
            className="btn-sophisticated inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white transition-all"
          >
            Configure Parent Lobby
          </Link>
        </div>
      </div>
    );
  }

  const child = childId ? await getChildLobbyById(context, childId) : null;

  /*
   * The spots canvas is backed by a VIDEO only — LobbySpotsCanvas no longer
   * renders a still-image fallback, so it doesn't take a backgroundImage prop.
   *
   * `lobby.image` / `child.image` hold bare legacy filenames that resolve into
   * /images/external/** — assets that only exist once the image migration has
   * actually downloaded them.
   *
   * Being "confirmed a video asset" was NOT enough: a lobby row holding
   * "event_47.mp4" resolves to /images/external/lobby/event_47.mp4, which passes
   * every string-level check yet 404s, because public/images/external/ has never
   * been created. The real file lives at /images/event_47.mp4. So the resolved
   * path is now also required to EXIST on disk before we use it.
   *
   * Rule for this page: play the event's own background clip when the lobby is
   * configured with one AND that file is actually present; otherwise play the
   * clip bundled in this repo.
   */
  const rawBackground = child?.image ?? lobby.image ?? null;
  const resolvedBackground = child?.image
    ? standTemplateUrl(child.image)
    : lobbyAssetUrl(lobby.image);

  /*
   * A zone's artwork is a STILL far more often than a clip — the auditorium reached from
   * "Change Auditorium link" is files/lobby/child/event_1470.png. The old code only ever looked
   * for a video, so any PNG-backed zone fell through to DEFAULT_LOBBY_VIDEO and drew the correct
   * spots over the wrong room. The legacy template branches on the extension
   * (`strpos($image, ".mp4")` -> <video>, else <img>), so this does the same and hands the canvas
   * whichever one applies.
   *
   * The image is passed through even when it is not on disk yet: the canvas says so plainly
   * rather than substituting an unrelated clip, and it starts working by itself once
   * `npm run images:download` has mirrored public/images/external/**.
   */
  const backgroundIsVideo = isLobbyVideoAsset(rawBackground);

  const configuredVideo =
    resolvedBackground && backgroundIsVideo && publicFileExists(resolvedBackground)
      ? resolvedBackground
      : null;

  const backgroundImage: string | null =
    !backgroundIsVideo && resolvedBackground ? resolvedBackground : null;

  const backgroundVideo: string = configuredVideo ?? DEFAULT_LOBBY_VIDEO;

  const spots = await getSpots(context, { eventLayoutId: lobby.id, childId: child?.id ?? null });

  return (
    <div className="section-transition space-y-6 animate-fade-in">
      <Breadcrumb eventId={eventId} />
      <LobbySubNav eventId={eventId} childId={child?.id} active="spots" />

      <div className="glass-panel rounded-2xl p-6 border border-white/10 shadow-2xl">
        <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-purple to-brand-pink">
              <CircleDot className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight text-white">Interactive Lobby Spots</h2>
              <p className="text-xs font-medium text-zinc-400">Click and drag or configure interactive hotspots for Event #{eventId}</p>
            </div>
          </div>
        </div>

        <LobbySpotsCanvas
          spots={spots}
          backgroundVideo={backgroundVideo}
          backgroundImage={backgroundImage}
          childId={child?.id}
        />
      </div>
    </div>
  );
}