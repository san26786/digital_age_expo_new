"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Home,
  Building2,
  DoorOpen,
  Users,
  Briefcase,
  LifeBuoy,
  ExternalLink,
  Circle,
  Headphones,
  List,
  CalendarDays,
  BookOpen,
  Camera,
  Trophy,
  Store,
  MessageSquare,
  Mic,
  Presentation,
  type LucideIcon,
} from "lucide-react";

import {
  ExhibitorListModal,
  type ExhibitorDirectoryEntry,
} from "@/components/virtual-event/ExhibitorListModal";
import { AgendaModal } from "@/components/virtual-event/AgendaModal";
import { PhotoBoothModal } from "@/components/virtual-event/PhotoBoothModal";
import type { ScheduleDay } from "@/lib/services/schedule";

/* =========================================================
   FALLBACK ICONS
========================================================= */

const FALLBACK_ICON_BY_KIND: Record<string, LucideIcon> = {
  lobby: Home,
  layout: Building2,
  chat: LifeBuoy,
  briefcase: Briefcase,
  exhibitor_list: Users,
  "my-booth": DoorOpen,
  "manage-booth": DoorOpen,
  "manage-sessions": DoorOpen,
  asset: ExternalLink,
  link: ExternalLink,
};

/* =========================================================
   ICONS BASED ON MENU LABEL
========================================================= */

const ICON_BY_LABEL: { match: RegExp; icon: LucideIcon }[] = [
  { match: /^home$/, icon: Home },

  { match: /exhibition hall|exhibition/, icon: Building2 },

  { match: /auditorium/, icon: Headphones },

  { match: /exhibitor list/, icon: List },

  { match: /^exhibitors?$/, icon: Store },

  { match: /agenda|schedule/, icon: CalendarDays },

  { match: /show guide|guide/, icon: BookOpen },

  { match: /photo ?booth/, icon: Camera },

  { match: /briefcase/, icon: Briefcase },

  { match: /leaderboard/, icon: Trophy },

  { match: /networking/, icon: MessageSquare },

  { match: /support|help/, icon: LifeBuoy },

  { match: /booth/, icon: DoorOpen },

  { match: /session|speaker/, icon: Mic },

  {
    match: /presentation|workshop|webinar/,
    icon: Presentation,
  },
];

/* =========================================================
   GET ICON FROM LABEL
========================================================= */

function iconForLabel(label: string): LucideIcon | null {
  const normalised = label
    .toLowerCase()
    .replace(/\s*\(\d+\)\s*$/, "")
    .trim();

  return (
    ICON_BY_LABEL.find((entry) =>
      entry.match.test(normalised),
    )?.icon ?? null
  );
}

/* =========================================================
   NAVIGATION ICON

   Clean dark outline icon.
   No fill because Lucide icons become distorted
   when fill="currentColor" is applied.
========================================================= */

function LobbyNavIcon({
  label,
  Fallback,
}: {
  label: string;
  Fallback: LucideIcon;
}) {
  const Glyph = iconForLabel(label) ?? Fallback;

  return (
    <div
      className="
        flex
        h-10
        w-10
        items-center
        justify-center
        rounded-full
        bg-white/75
        shadow-md
        backdrop-blur-sm
        transition-all
        duration-200
        group-hover:scale-110
        group-hover:bg-white/95
      "
    >
      <Glyph
        className="
          h-[22px]
          w-[22px]
          text-slate-950
          transition-colors
          duration-200
          group-hover:text-brand-pink
        "
        strokeWidth={2.4}
        aria-hidden="true"
      />
    </div>
  );
}

/* =========================================================
   TYPES
========================================================= */

export interface FooterChild {
  id: number | string;
  title: string;
  href: string | null;
}

export interface FooterItem {
  key?: string;
  id?: number | string;

  label?: string;
  title?: string;

  iconUrl?: string;
  kind?: string;

  href?: string | null;

  external?: boolean;

  count?: number | null;

  children?: FooterChild[];

  emptyLabel?: string;
}

/* =========================================================
   BOTTOM NAVIGATION
========================================================= */

export function LobbyFooterNav({
  items,
  exhibitors = [],
  scheduleDays = [],
  eventTitle = "DAE",
  eventSlug,
}: {
  items: FooterItem[];
  exhibitors?: ExhibitorDirectoryEntry[];
  /** Powers the "Agenda" item's modal. When empty the item is not rendered at all — an Agenda
   *  button that opens an empty programme is worse than no button. */
  scheduleDays?: ScheduleDay[];
  /** Passed to the photo booth overlay, which covers the lobby's own top bar. */
  eventTitle?: string;
  /** This event's friendly_url — the Exhibitor List's "Visit Booth" links need it to build the
   *  booth URL `/virtual-event/<slug>?mybooth=1&ex_id=<id>`. */
  eventSlug?: string;
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  const [showExhibitorList, setShowExhibitorList] =
    useState(false);

  const [showAgenda, setShowAgenda] = useState(false);

  const [showPhotoBooth, setShowPhotoBooth] = useState(false);

  /*
   * The bar's items come from find_event_lobby_menu, which on this event has no Agenda row. Rather
   * than render a second, differently-styled button outside the list, an Agenda entry is spliced
   * into the same items array so it picks up the identical icon, label and layout treatment.
   *
   * Only added when the programme actually has sessions, and only when the menu does not already
   * carry an Agenda row of its own — so if an organiser adds one in the CP later, this does not
   * produce two side by side.
   */
  const navItems = useMemo(() => {
    /*
     * Agenda is always shown, even when the programme is empty.
     *
     * This used to bail out on `scheduleDays.length === 0` on the theory that a button opening an
     * empty panel is worse than no button. That was wrong here: the item vanishing gives no clue
     * that the feature exists or why it is missing, whereas the modal's own empty state says the
     * agenda has not been published yet — which is the useful answer.
     */
    const alreadyHasAgenda = items.some(
      (i) =>
        i.kind === "agenda" ||
        /agenda|schedule/i.test(i.label ?? i.title ?? ""),
    );
    if (alreadyHasAgenda) return items;

    const next = [...items];
    // Sits after Exhibitor List, matching the live lobby's ordering.
    const at = next.findIndex((i) => i.kind === "exhibitor_list");
    next.splice(at >= 0 ? at + 1 : next.length, 0, {
      key: "agenda",
      label: "Agenda",
      kind: "agenda",
    });
    return next;
  }, [items]);

  return (
    <>
      {/* =====================================================
          FIXED TRANSPARENT BOTTOM NAVIGATION
      ====================================================== */}

      {/*
        NOTE: the item list must not be an overflow container. It used to carry `overflow-x-auto`
        for narrow screens, but CSS computes the other axis to `auto` as soon as one axis is not
        `visible` — so `overflow-y` stopped being visible too and clipped the submenus, which open
        UPWARD out of the bar (Auditorium, Exhibition Halls, Exhibitors). Only the bottom sliver of
        the panel showed. The row wraps instead, which needs no clipping.
      */}
      <nav className="fixed inset-x-0 bottom-0 z-30 pointer-events-none">

        {/*
          The lobby's scrim gradient, taken verbatim from the live site's CSS. Inline rather than a
          Tailwind arbitrary value because the stop list contains commas and spaces that the class
          parser would need escaped, leaving something unreadable.

          180deg runs top -> bottom: fully transparent at the top so the floor and the crowd show
          through, reaching solid #fff behind the icons. The trailing `#fff 0` is in the source as
          written; CSS clamps a stop position lower than the one before it, so it resolves to 90%
          and changes nothing - kept as-is to stay identical to the reference.
        */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-32"
          style={{
            background:
              "linear-gradient(180deg, hsla(0, 0%, 86.7%, 0) 5.98%, hsla(0, 0%, 100%, 0.5) 25.24%, hsla(0, 0%, 100%, 0.95) 59.38%, #fff 90%, #fff 0)",
          }}
        />
        <div className="relative">

          <ul
            className="
              pointer-events-auto
              mx-auto
              flex
              max-w-6xl
              flex-wrap
              items-end
              justify-center
              gap-2
              px-3
              pb-3
              pt-6
              sm:gap-3
              lg:gap-5
            "
          >
            {navItems.map((item, index) => {
              const itemKey = String(
                item.key ?? item.id ?? index,
              );

              const label =
                item.label ??
                item.title ??
                "";

              const FallbackIcon =
                FALLBACK_ICON_BY_KIND[
                  item.kind ?? ""
                ] ?? Circle;

              /* Exhibitor list opens modal */

              const opensExhibitorModal =
                item.kind === "exhibitor_list" &&
                exhibitors.length > 0;

              /* Agenda opens modal */

              const opensAgendaModal =
                item.kind === "agenda" ||
                /agenda|schedule/i.test(
                  item.label ?? item.title ?? "",
                );

              /* Photo Booth opens modal */

              const opensPhotoBooth =
                item.kind === "photobooth" ||
                /photo\s*booth/i.test(
                  item.label ?? item.title ?? "",
                );

              const hasChildren =
                !!item.children?.length;

              /* Dropdown */

              const isDropdown =
                !opensExhibitorModal &&
                !opensAgendaModal &&
                !opensPhotoBooth &&
                (hasChildren || !item.href);

              const isOpen =
                openKey === itemKey;

              /* =================================================
                 MENU CONTENT
              ================================================= */

              const content = (
                <>
                  <LobbyNavIcon
                    label={label}
                    Fallback={FallbackIcon}
                  />

                  <span
                    className="
                      mt-2
                      whitespace-nowrap
                      text-[11px]
                      font-semibold
                      tracking-tight
                      text-slate-900
                      transition-colors
                      duration-200
                      group-hover:text-brand-pink
                      sm:text-xs
                    "
                  >
                    {label}

                    {typeof item.count === "number"
                      ? ` (${item.count})`
                      : ""}
                  </span>
                </>
              );

              /* =================================================
                 BUTTON STYLE
              ================================================= */

              const buttonClass =
                `
                  group
                  flex
                  flex-shrink-0
                  flex-col
                  items-center
                  justify-center
                  rounded-xl
                  px-2
                  py-2
                  transition-all
                  duration-200
                  hover:scale-105
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-brand-pink/60
                  sm:px-3
                `;

              return (
                <li
                  key={itemKey}
                  className="relative flex-shrink-0"
                >

                  {/* =============================================
                      EXHIBITOR LIST BUTTON
                  ============================================== */}

                  {opensExhibitorModal ? (
                    <button
                      type="button"
                      onClick={() =>
                        setShowExhibitorList(true)
                      }
                      className={buttonClass}
                    >
                      {content}
                    </button>

                  ) : opensAgendaModal ? (
                    <button
                      type="button"
                      onClick={() => setShowAgenda(true)}
                      className={buttonClass}
                    >
                      {content}
                    </button>

                  ) : opensPhotoBooth ? (
                    <button
                      type="button"
                      onClick={() => setShowPhotoBooth(true)}
                      className={buttonClass}
                    >
                      {content}
                    </button>

                  ) : isDropdown ? (

                    /* =============================================
                        DROPDOWN BUTTON
                    ============================================== */

                    <button
                      type="button"
                      onClick={() =>
                        setOpenKey(
                          isOpen
                            ? null
                            : itemKey,
                        )
                      }
                      className={buttonClass}
                    >
                      {content}
                    </button>

                  ) : (

                    /* =============================================
                        NORMAL LINK
                    ============================================== */

                    <Link
                      href={item.href!}
                      target={
                        item.external
                          ? "_blank"
                          : undefined
                      }
                      rel={
                        item.external
                          ? "noreferrer"
                          : undefined
                      }
                      className={buttonClass}
                    >
                      {content}
                    </Link>
                  )}

                  {/* =============================================
                      DROPDOWN MENU
                  ============================================== */}

                  {isDropdown && isOpen && (
                    <div
                      className="
                        submenu-dropdown
                        absolute
                        bottom-full
                        left-1/2
                        mb-3
                        w-56
                        -translate-x-1/2
                        rounded-xl
                        p-2
                      "
                    >

                      {hasChildren ? (

                        /*
                          Capped and scrollable. Zone lists run to 40+ entries (Micro Business -
                          Zone 1..24 and friends), and an uncapped panel grew straight off the top
                          of the viewport, putting the first items out of reach with no way to
                          scroll to them.

                          min() against vh keeps it on screen at any window height; overscroll-
                          contain stops the scroll chaining to the lobby behind once the list ends.
                          Scrollbar styling is the global one in globals.css.

                          Overflow here is safe — unlike the bar itself, this element only ever
                          needs to clip its OWN children, not a popup escaping upward.
                        */
                        <ul className="max-h-[min(60vh,22rem)] min-h-[2.75rem] space-y-1 overflow-y-auto overscroll-contain pr-1">

                          {item.children!.map(
                            (child) => (
                              <li key={child.id}>

                                {child.href ? (

                                  <Link
                                    href={child.href}
                                    onClick={() =>
                                      setOpenKey(null)
                                    }
                                    className="
                                      block
                                      rounded-lg
                                      px-3
                                      py-2
                                      text-sm
                                      font-medium
                                      text-white
                                      transition
                                      hover:bg-brand-pink/15
                                      hover:text-brand-pink
                                    "
                                  >
                                    {child.title}
                                  </Link>

                                ) : (

                                  <span
                                    title="Coming soon"
                                    className="
                                      block
                                      cursor-default
                                      rounded-lg
                                      px-3
                                      py-2
                                      text-sm
                                      font-medium
                                      text-zinc-500
                                    "
                                  >
                                    {child.title}
                                  </span>

                                )}

                              </li>
                            ),
                          )}

                        </ul>

                      ) : (

                        <p
                          className="
                            px-3
                            py-2
                            text-xs
                            text-zinc-400
                          "
                        >
                          {item.emptyLabel ??
                            "Coming soon."}
                        </p>

                      )}

                    </div>
                  )}

                </li>
              );
            })}
          </ul>

        </div>

      </nav>

      {/* =====================================================
          EXHIBITOR LIST MODAL
      ====================================================== */}

      <ExhibitorListModal
        open={showExhibitorList}
        onClose={() =>
          setShowExhibitorList(false)
        }
        exhibitors={exhibitors}
        eventSlug={eventSlug}
      />

      {/* ======================================================
          AGENDA MODAL
      ====================================================== */}

      <AgendaModal
        open={showAgenda}
        onClose={() => setShowAgenda(false)}
        days={scheduleDays}
      />

      {/* ======================================================
          PHOTO BOOTH MODAL
      ====================================================== */}

      <PhotoBoothModal
        open={showPhotoBooth}
        onClose={() => setShowPhotoBooth(false)}
        eventTitle={eventTitle}
      />
    </>
  );
}