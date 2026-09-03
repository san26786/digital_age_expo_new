import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { getEventByFriendlyUrl } from "@/lib/services/events";
import { getPublicLobby } from "@/lib/services/eventLobby";
import {
  getLobbyHotspots,
  getLobbyMenuGroups,
  findMenuGroupByTitle,
  getVisitorBriefcase,
  getLobbyFooterMenu,
  getExhibitorMenuExtras,
} from "@/lib/services/publicLobby";
import { getEventExhibitorDirectory } from "@/lib/services/exhibitors";
import { getEventSchedule } from "@/lib/services/schedule";
import { isLobbyVideoAsset, lobbyAssetUrl, staticAssetUrl } from "@/lib/assets";
import { LobbyTopBar } from "@/components/virtual-event/LobbyTopBar";
import { LobbyHotspots, type HotspotWithMenu } from "@/components/virtual-event/LobbyHotspots";
import { LobbyFooterNav, type FooterItem } from "@/components/virtual-event/LobbyFooterNav";
import { getExhibitorStandById } from "@/lib/services/exhibitorStand";
import { exhibitorAssetUrl, standTemplateUrl } from "@/lib/assets";
import { findSlotByKey } from "@/lib/standTemplateSlots";
import { BoothView, type BoothSpot } from "@/components/virtual-event/BoothView";
import { createOutageCollector } from "@/lib/db-errors";
import { DatabaseOutageNotice } from "@/components/common/DatabaseOutageNotice";

export const dynamic = "force-dynamic";

/**
 * Public /virtual-event/[slug] lobby — the Next.js native replacement for legacy lobby.php,
 * reached via /enter-the-show -> /virtual-event/[slug]/login -> here. Gated behind the site's
 * existing NextAuth member session (any authenticated find_users login — organiser, exhibitor,
 * speaker, or the "visitor" fallback role — may view it; see eventAccess.ts). Deliberately does
 * NOT use the "demo session" fallback pattern seen on member-area pages (e.g.
 * event_lobby_layout_manager/page.tsx's `?? { user: { id: "1", ... } }`) — that convenience
 * would let every unauthenticated visitor straight past the login gate, which is exactly what
 * this page exists to enforce.
 */
export default async function VirtualEventLobbyPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  /**
   * `?mybooth=1&ex_id=<id>` switches this route from the lobby scene to one exhibitor's booth —
   * the legacy booth URL, reused rather than given a page of its own so the footer nav, the
   * session gate and the top-right actions stay in exactly one place.
   */
  searchParams?: Promise<{ mybooth?: string; ex_id?: string }>;
}) {
  const { slug } = await params;
  const query = searchParams ? await searchParams : {};
  const boothExhibitorId = Number(query.ex_id) || 0;
  const wantsBooth = Boolean(boothExhibitorId) || query.mybooth === "1";

  /*
   * Every read below goes through this collector.
   *
   * The lobby ran its loaders bare inside Promise.all, so one infrastructure-level rejection —
   * Prisma Postgres answering "Failed to connect to upstream database" when the instance is
   * asleep, over quota or unreachable — propagated out of the server component and replaced the
   * whole route with a Prisma stack trace. Now each read degrades to a safe empty value and the
   * page explains what is actually wrong. Keep the collector object intact: `current` is a
   * getter, so destructuring it here would snapshot the still-null value before any query ran.
   */
  const collector = createOutageCollector();
  const guard = collector.guard;

  const event = await guard(() => getEventByFriendlyUrl(slug), null);

  // A database outage must not be reported as "this link is no longer valid" — that sends the
  // visitor off to fix a URL that was never the problem.
  if (!event && collector.current) {
    return <DatabaseOutageNotice outage={collector.current} />;
  }

  if (!event) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-center text-white">
        <div>
          <h1 className="text-2xl font-bold">Event Not Found</h1>
          <p className="mt-3 text-zinc-400">This virtual event link is no longer valid.</p>
        </div>
      </div>
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect(`/virtual-event/${slug}/login`);
  }

  const userId = Number(session.user.id);

  const [lobby, menuGroups, footerMenu, exhibitorExtras, exhibitorDirectory, scheduleDays] = await Promise.all([
    guard(() => getPublicLobby(event.id), null),
    guard(() => getLobbyMenuGroups(event.id), [] as Awaited<ReturnType<typeof getLobbyMenuGroups>>),
    guard(() => getLobbyFooterMenu(event.id, slug), [] as Awaited<ReturnType<typeof getLobbyFooterMenu>>),
    guard(() => getExhibitorMenuExtras(event.id, userId), [] as Awaited<ReturnType<typeof getExhibitorMenuExtras>>),
    guard(() => getEventExhibitorDirectory(event.id), [] as Awaited<ReturnType<typeof getEventExhibitorDirectory>>),
    // Feeds the footer's Agenda modal — the same programme /event_schedule renders, so the lobby
    // and the public schedule page can never disagree.
    guard(() => getEventSchedule(event.id), [] as Awaited<ReturnType<typeof getEventSchedule>>),
  ]);

  const [hotspotRows, briefcase] = await Promise.all([
    lobby
      ? guard(() => getLobbyHotspots(event.id, lobby.id), [] as Awaited<ReturnType<typeof getLobbyHotspots>>)
      : Promise.resolve([] as Awaited<ReturnType<typeof getLobbyHotspots>>),
    lobby
      ? guard(() => getVisitorBriefcase(lobby.id, userId), [] as Awaited<ReturnType<typeof getVisitorBriefcase>>)
      : Promise.resolve([] as Awaited<ReturnType<typeof getVisitorBriefcase>>),
  ]);

  // Nothing usable came back and the database is the reason — an empty lobby would read as
  // "this event has not been set up", which is a different and misleading problem.
  if (!lobby && collector.current) {
    return <DatabaseOutageNotice outage={collector.current} />;
  }

  const hotspots: HotspotWithMenu[] = hotspotRows.map((spot) => ({
    id: spot.id,
    title: spot.title,
    xPct: spot.xPct,
    yPct: spot.yPct,
    color: spot.color,
    children: findMenuGroupByTitle(menuGroups, spot.title)?.children ?? [],
  }));

  // The footer's own menu comes straight from find_event_lobby_menu (getLobbyFooterMenu) — the
  // one exception is "briefcase", which is a DB row with no children of its own; its live count
  // and contents come from getVisitorBriefcase() instead, same as lobby.php's separate
  // getBriefcaseAssets() call. Exhibitor/speaker-only items (View/Manage My Booth, Manage My
  // Sessions) are appended on top, mirroring getEventUserMenu().
  const footerItems: FooterItem[] = [
    ...footerMenu.map((item) =>
      item.kind === "briefcase"
        ? {
            ...item,
            count: briefcase.length,
            children: briefcase.map((b) => ({ id: b.id, title: b.title, href: b.url })),
            emptyLabel: "Your briefcase is empty.",
          }
        : item
    ),
    ...exhibitorExtras,
  ];

  /*
   * Booth mode.
   *
   * `mybooth=1` with no ex_id means "my own booth", which is the exhibitor's own stand — the
   * exhibitor menu extras already link that way. Falling back to the first exhibitor in the
   * directory would show a stranger's stand, so an unresolvable id simply drops back to the
   * lobby rather than guessing.
   */
  const boothId =
    boothExhibitorId ||
    (wantsBooth
      ? exhibitorDirectory.find((e) => e.id === Number(session.user.id))?.id ?? 0
      : 0);

  const stand = wantsBooth && boothId ? await guard(() => getExhibitorStandById(boothId, event.id), null) : null;

  if (wantsBooth && stand) {
    const { exhibitor, zoneName: boothZone, standImage: boothStandImage, spots: boothSpots, templateSlots } = stand;

    const boothBackground = boothStandImage
      ? boothStandImage.startsWith("/") || boothStandImage.startsWith("http")
        ? boothStandImage
        : standTemplateUrl(boothStandImage)
      : undefined;

    /* Percentage boxes for everything drawn over the artwork.
     *
     * Three sources, in the order they must paint: the DB hotspots' own uploads, then the six
     * fixed banner slots (which sit on top of the hotspot that shares their box), then the
     * interactive hotspots which get a red marker instead of an image. A hotspot with no artwork
     * and no interactivity contributes nothing — drawing a box for it is what cluttered the
     * designer canvas before. */
    const artworkSpots: BoothSpot[] = boothSpots.map((spot: any) => {
      let x = 0;
      let y = 0;
      let width = 12;
      let height = 12;
      try {
        const d = spot.dimension ? JSON.parse(spot.dimension) : null;
        x = parseFloat(d?.x ?? spot.x_coordinates ?? "0");
        y = parseFloat(d?.y ?? spot.y_coordinates ?? "0");
        width = parseFloat(d?.width ?? spot.width ?? "12");
        height = parseFloat(d?.height ?? spot.height ?? "12");
      } catch {
        x = parseFloat(spot.x_coordinates || "0");
        y = parseFloat(spot.y_coordinates || "0");
        width = parseFloat(spot.width || "12");
        height = parseFloat(spot.height || "12");
      }

      const src = spot.gallery?.[0]?.asset_url ? exhibitorAssetUrl(spot.gallery[0].asset_url) : undefined;
      // Anything the exhibitor can act on — the legacy stand marks these by asset type, and the
      // meeting/chat/video/sales tiles are exactly the ones that carry no uploaded image.
      const assetType = String(spot.asset?.asset_type ?? "").toUpperCase();
      const interactive = !src && ["MEETING", "CHAT", "VIDEO", "SALES", "TEAM"].some((k) => assetType.includes(k));

      return { id: spot.id, title: spot.title, x, y, width, height, src, interactive };
    });

    const slotSpots: BoothSpot[] = templateSlots
      .map((slot: { key: string; url: string }, i: number): BoothSpot | null => {
        const def = findSlotByKey(slot.key);
        const src = exhibitorAssetUrl(slot.url);
        if (!def || !src) return null;
        return {
          id: 100000 + i,
          title: def.label,
          x: def.left,
          y: def.top,
          width: def.width,
          height: def.height,
          src,
          isVideo: def.kind === "video",
        };
      })
      .filter((s): s is BoothSpot => s !== null);

    // Aisle order for Previous / Next booth — the same order the footer's Exhibitor List shows,
    // so walking the aisle and picking from the list agree with each other.
    const index = exhibitorDirectory.findIndex((e) => e.id === exhibitor.id);
    const previousBooth = index > 0 ? exhibitorDirectory[index - 1] : null;
    const nextBooth =
      index >= 0 && index < exhibitorDirectory.length - 1 ? exhibitorDirectory[index + 1] : null;

    return (
      <div className="relative h-screen w-full overflow-hidden bg-zinc-950 text-white">
        <BoothView
          eventSlug={slug}
          eventTitle={event.title}
          business={exhibitor.business || "Exhibitor"}
          zoneName={boothZone || null}
          standNumber={exhibitor.stand_number}
          standImageUrl={boothBackground}
          spots={[...artworkSpots, ...slotSpots]}
          previousBooth={previousBooth ? { id: previousBooth.id, business: previousBooth.business } : null}
          nextBooth={nextBooth ? { id: nextBooth.id, business: nextBooth.business } : null}
          boothUrl={`/virtual-event/${slug}?mybooth=1&ex_id=${exhibitor.id}`}
          dealsUrl={
            exhibitor.website
              ? exhibitor.website.startsWith("http")
                ? exhibitor.website
                : `https://${exhibitor.website}`
              : null
          }
        />

        <LobbyFooterNav
          items={footerItems}
          exhibitors={exhibitorDirectory}
          scheduleDays={scheduleDays}
          eventTitle={event.title}
          eventSlug={slug}
        />
      </div>
    );
  }

  const backgroundFile = lobby?.image ?? null;
  const backgroundUrl = lobbyAssetUrl(backgroundFile ?? undefined);
  const backgroundIsVideo = isLobbyVideoAsset(backgroundFile);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-zinc-950 text-white">
      <LobbyTopBar eventTitle={event.title} />

      {/* <div className="absolute inset-0">
        {backgroundUrl ? (
          backgroundIsVideo ? (
            <video src={backgroundUrl} className="h-full w-full object-cover" autoPlay muted loop playsInline />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={backgroundUrl} alt={lobby?.title ?? event.title} className="h-full w-full object-cover" />
          )
        ) : (
          <div className="main-glow-bg h-full w-full" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/10 to-zinc-950/40" />
      </div> */}
<video
    className="w-full h-auto object-cover"
    autoPlay
    muted
    loop
    playsInline
    preload="auto"
  >
    <source
      src={staticAssetUrl("https://digitalageexpo.com/files/lobby/event_47.mp4?revision=4aa25b9fb8b4163cbe17606b34b74288")}
      type="video/mp4"
    />
  </video>
      {!backgroundUrl && (
        <div className="relative z-10 flex h-full items-center justify-center px-6 pb-20 text-center">
          <div className="glass-panel max-w-md rounded-2xl p-8">
            <h1 className="text-2xl font-black uppercase text-white">{lobby?.title || event.title}</h1>
            <p className="mt-3 text-sm text-zinc-400">
              {lobby?.description ||
                "The lobby's background and hotspots haven't been configured yet — an organiser can set this up from Lobby Manager in the Members area."}
            </p>
          </div>
        </div>
      )}

      {backgroundUrl && <LobbyHotspots hotspots={hotspots} />}

      <LobbyFooterNav
        items={footerItems}
        exhibitors={exhibitorDirectory}
        scheduleDays={scheduleDays}
        eventTitle={event.title}
        eventSlug={slug}
      />
    </div>
  );
}
