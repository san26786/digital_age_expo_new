"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CopyEventModal } from "@/components/dashboard/CopyEventModal";
import {
  Menu,
  Settings,
  Settings2,
  Wrench,
  ListChecks,
  Video,
  ShoppingCart,
  ArrowDownCircle,
  Eye,
  Mail,
  Inbox,
  ZoomOut,
  Info,
  Indent,
  HelpCircle,
  Newspaper,
  Rss,
  Ticket,
  Calendar,
  Copy,
  Building,
  Building2,
  CircleDot,
  Coffee,
  ListOrdered,
  BookOpen,
  Square,
  Bell,
  Users,
  FileText,
  Files,
  Factory,
  Bold,
  UserPlus,
  LineChart,
  Mic,
  Map,
  Tv,
  Download,
  AlignCenter,
  Edit,
  ArrowDownWideNarrow,
  Image as ImageIcon,
  Clapperboard,
  CheckSquare,
  Quote,
  Target,
  Briefcase,
  Database,
  Film,
  List,
  StickyNote,
  Home,
  Megaphone,
  Bookmark,
  Gem,
  Languages,
  PenTool,
  ChevronDown,
  ChevronsDown,
  type LucideIcon,
  Handshake,
} from "lucide-react";
import { DEFAULT_EVENT_ID } from "@/lib/site-config";

/** ---------- Types ---------- */

interface SubItem {
  title: string;
  href: string;
  icon: LucideIcon;
  colorClass?: string;
  modal?: string;
}

interface Tab {
  code: string;
  label: string;
  icon: LucideIcon;
  colorClass: string;
  items: SubItem[];
}

/** ---------- Constants ---------- */

const BASE = "/members";

/**
 * Builds all event admin navigation tabs.
 *
 * If no eventId is passed to the component,
 * eventId will default to DEFAULT_EVENT_ID (852).
 *
 * Every `${BASE}/<segment>` below is verified against the pages that actually exist under
 * src/app/members by `npm run members:check-links` — run it after editing this list. That check
 * matters more than it looks: src/app/members/(event)/[slug]/page.tsx catches every unknown
 * segment and renders a generic module full of MOCK records, so a typo here would not 404. It
 * would quietly show a member a page of fake data.
 */
function buildTabs(eventId: number | string, eventSlug?: string | null): Tab[] {
  const q = `event_id=${eventId}`;

  return [
    // ---------------------------------------------------------
    // ACCOUNT ONBOARDING
    // ---------------------------------------------------------


    // ---------------------------------------------------------
    // VIEW EVENT SUMMARY
    // ---------------------------------------------------------
    {
      code: "LGTS",
      label: "View Event Summary",
      icon: Menu,
      colorClass: "bg-[#4B0082] hover:bg-black",
      items: [
        {
          title: "Event Summary",
          href: `${BASE}/user_event_summary?${q}`,
          icon: Menu,
          colorClass: "bg-[#4B0082] hover:bg-black",
        },
        {
          title: "View Public Event",
          href: `${BASE}/event_show_info?${q}`,
          icon: Eye,
        },
        {
          title: "Marketing Tools",
          href: `${BASE}/event_marketing_tools?${q}`,
          icon: Settings2,
        },
        {
          title: "Email Logs",
          href: `${BASE}/event_mail_logs?${q}`,
          icon: Mail,
        },
        {
          title: "Letter Logs",
          href: `${BASE}/event_letter_logs?${q}`,
          icon: Inbox,
        },
      ],
    },

    // ---------------------------------------------------------
    // SETUP EVENT
    // ---------------------------------------------------------
    {
      code: "LGTMM",
      label: "Setup Event",
      icon: Settings,
      colorClass: "bg-[#C71585] hover:bg-black",
      items: [
        {
          title: "Event Details",
          href: `${BASE}/event_details?${q}`,
          icon: Settings,
        },
        {
          title: "Setup My Show Profile",
          href: `${BASE}/event_todo_list?${q}`,
          icon: ZoomOut,
        },
        {
          title: "Setup Show Info",
          href: `${BASE}/event_show_info?${q}`,
          icon: Info,
        },
        {
          title: "Setup About the Show",
          href: `${BASE}/event_about_us?${q}`,
          icon: Indent,
        },
        {
          title: "Setup FAQs",
          href: `${BASE}/event_faq?${q}`,
          icon: HelpCircle,
        },
        {
          title: "Setup Event Blog",
          href: `${BASE}/user_blog?${q}`,
          icon: Newspaper,
        },
        {
          title: "Setup News Feed",
          href: `${BASE}/news_feed?${q}`,
          icon: Rss,
        },
        {
          title: "Setup Event Tickets",
          href: `${BASE}/event_ticket?${q}`,
          icon: Ticket,
        },
        {
          title: "Setup Event Schedule",
          href: `${BASE}/event_schedule_meeting?${q}`,
          icon: Calendar,
        },
        {
          title: "Setup Sponsorship",
          href: `${BASE}/event_sponsorship_setup?${q}`,
          icon: Settings,
        },
        {
          title: "Setup Trade stand",
          href: `${BASE}/event_tradestand_setup?${q}`,
          icon: Wrench,
        },
        {
          title: "Manage Magazine Page Setup",
          href: `${BASE}/event_magazine_setup?${q}`,
          icon: ListChecks,
        },
        {
          title: "Copy Event",
          href: "#",
          icon: Copy,
          colorClass: "bg-green-600 hover:bg-green-700",
          modal: "copyEventModal",
        },
      ],
    },

    // ---------------------------------------------------------
    // CONFIGURE VIRTUAL EVENT
    // ---------------------------------------------------------
    {
      code: "LGTCL",
      label: "Configure Virtual Event",
      icon: Wrench,
      colorClass: "bg-[#4B0082] hover:bg-black",
      items: [
        {
          title: "Configure Lobby",
          href: `${BASE}/event_lobby_layout_manager?${q}`,
          icon: Building,
        },
        {
          title: "Configure Lobby Child",
          href: `${BASE}/event_lobby_layout_child?${q}`,
          icon: Building2,
        },
        {
          title: "Configure Lobby Spots",
          href: `${BASE}/event_lobby_spots?${q}`,
          icon: CircleDot,
        },
        {
          title: "Configure Lobby Welcome Tour",
          href: `${BASE}/event_lobby_welcome_tour?${q}`,
          icon: Coffee,
        },
        {
          title: "Configure Lobby Assets",
          href: `${BASE}/event_lobby_layout_type_assets?${q}`,
          icon: ListOrdered,
        },
        {
          title: "Configure Lobby Agenda",
          href: `${BASE}/event_lobby_agenda_items?${q}`,
          icon: BookOpen,
        },
        {
          title: "Configure Lobby Polling",
          href: `${BASE}/event_lobby_polling?${q}`,
          icon: Square,
        },
        {
          title: "Exhibitor Spots",
          href: `${BASE}/event_lobby_spots_tabular?${q}`,
          icon: Building2,
        },
        {
          title: "Manage Registration Form",
          href: `${BASE}/manage_registration?${q}`,
          icon: Square,
        },
        {
          title: "Event Menu",
          href: `${BASE}/manage_event_menu?${q}`,
          icon: Menu,
        },
        {
          title: "Event Notification",
          href: `${BASE}/event_notifications?${q}`,
          icon: Bell,
        },
        {
          title: "Networking Rooms",
          href: `${BASE}/event_networking_room?${q}`,
          icon: Users,
        },
        {
          title: "Event Welcome Pack",
          href: `${BASE}/event_welcome_pack?${q}`,
          icon: FileText,
        },
        {
          title: "Event Templates",
          href: `${BASE}/event_lobby_templates?${q}`,
          icon: Files,
        },
      ],
    },

    // ---------------------------------------------------------
    // MANAGE EVENTS
    // ---------------------------------------------------------
    {
      code: "LGTME",
      label: "Manage Events",
      icon: ListChecks,
      colorClass: "bg-[#C71585] hover:bg-black",
      items: [
        {
          title: "Event Industry",
          href: `${BASE}/view_industry_list?${q}`,
          icon: Factory,
        },
        {
          title: "Manage Leadership Boards",
          href: `${BASE}/leadership_board?${q}`,
          icon: Bold,
        },
        {
          title: "Manage Agenda",
          href: `${BASE}/event_lobby_agenda_items?${q}`,
          icon: BookOpen,
        },
        {
          title: "Manage My Team",
          href: `${BASE}/event_member?${q}`,
          icon: UserPlus,
        },
        {
          title: "Manage Visitor",
          href: `${BASE}/view_visitor?${q}`,
          icon: Users,
        },
        {
          title: "Manage Exhibitor",
          href: `${BASE}/view_exhibitor?${q}`,
          icon: Users,
        },
        {
          title: "Manage Sponsorship",
          href: `${BASE}/view_sponsor?${q}`,
          icon: LineChart,
        },
        {
          title: "Manage View Speaker Slots",
          href: `${BASE}/manage_speaker_slots?${q}`,
          icon: Mic,
        },
        {
          title: "Manage Speaker",
          href: `${BASE}/manage_speakers?${q}`,
          icon: Mic,
        },
        {
          title: "Manage Speaker Questionnaire",
          href: `${BASE}/manage_speaker_questionaire?${q}`,
          icon: Mic,
        },
        {
          title: "Manage Banner Stand",
          href: `${BASE}/manage_banner_stands?${q}`,
          icon: Map,
        },
        {
          title: "Manage Advertiser",
          href: `${BASE}/manage_event_advertiser?${q}`,
          icon: Tv,
        },
        {
          title: "Manage Magazine",
          href: `${BASE}/event_advertise_book?${q}`,
          icon: Newspaper,
        },
        {
          title: "Manage Partner",
          href: `${BASE}/manage_awards_partner?${q}`,
          icon: Users,
        },
        {
          title: "Manage Marketer",
          href: `${BASE}/manage_event_marketer?${q}`,
          icon: Tv,
        },
        {
          title: "Manage Publication Contacts",
          href: `${BASE}/publication_contacts?${q}`,
          icon: UserPlus,
        },
        {
          title: "Manage Download",
          href: `${BASE}/manage_event_download?${q}`,
          icon: Download,
        },
        {
          title: "Manage Artwork",
          href: `${BASE}/manage_event_artwork?${q}`,
          icon: AlignCenter,
        },
        {
          title: "Manage Content Writing",
          href: `${BASE}/manage_event_content_request?${q}`,
          icon: Edit,
        },
        {
          title: "Manage Promotions",
          href: `${BASE}/manage_event_promotions?${q}`,
          icon: ArrowDownWideNarrow,
        },
        {
          title: "Manage Exhibitor Information",
          href: `${BASE}/view_exhibitor_information?${q}`,
          icon: Users,
        },
        {
          title: "Manage Photos",
          href: `${BASE}/manage_organiser_photos?${q}`,
          icon: ImageIcon,
        },
        {
          title: "Manage Videos",
          href: `${BASE}/manage_organiser_videos?${q}`,
          icon: Clapperboard,
        },
        {
          title: "Manage Checklist",
          href: `${BASE}/event_checklist?${q}`,
          icon: CheckSquare,
        },
        {
          title: "Manage Ticket Buyers",
          href: `${BASE}/event_ticket_buyers?${q}`,
          icon: Users,
        },
      ],
    },

    // ---------------------------------------------------------
    // MANAGE VIRTUAL BOOTH
    // ---------------------------------------------------------
    {
      code: "LTGMVB",
      label: "Manage Virtual Booth",
      icon: Video,
      colorClass: "bg-black hover:bg-[#4B0082]",
      items: [
        {
          title: "Manage Lobby Visitor Enquires",
          href: `${BASE}/event_lobby_visitor_enquires?${q}`,
          icon: Quote,
        },
        {
          title: "View My Booth",
          /*
           * Straight to the public lobby — no members-side hop.
           *
           * This used to point at event_lobby_layout_manager?action=view_my_booth, which is a
           * normal page that only redirects AFTER it renders its organiser guard. Anyone who is
           * not an organiser (i.e. the exhibitors this link is for) hit that guard and stopped on
           * /members/event_lobby_layout_manager instead of ever reaching the redirect.
           *
           * The slug comes from the parent, which is a server component and can read it; the
           * old URL stays as the fallback for the one caller that doesn't pass it, so nothing
           * breaks if it's missing.
           */
          href: eventSlug
            ? `/virtual-event/${eventSlug}`
            : `${BASE}/event_lobby_layout_manager?action=view_my_booth&${q}`,
          icon: Target,
        },
        {
          title: "Manage My Booth",
          href: `${BASE}/manage_stand_assets?${q}`,
          icon: Briefcase,
        },
        {
          title: "Manage My Assets",
          href: `${BASE}/manage_event_assets?${q}`,
          icon: Database,
        },
        {
          title: "Enter the show",
          /*
           * The lobby itself, same as "View My Booth" above and for the same reason: the old
           * href went to event_lobby_layout_manager?action=view_lobby, a members page that only
           * redirects after rendering its organiser guard, so an exhibitor clicking this landed
           * on the guard instead of the show.
           *
           * The slug is the event's own friendly_url, passed down from the server component —
           * never hardcoded, so this stays correct for every event, not just 1474.
           */
          href: eventSlug
            ? `/virtual-event/${eventSlug}`
            : `${BASE}/event_lobby_layout_manager?action=view_lobby&${q}`,
          icon: Eye,
        },
        {
          title: "Change Auditorium link",
          href: `${BASE}/event_lobby_layout_manager?action=change_auditiorium_link&${q}`,
          icon: Film,
        },
        {
          title: "Reports",
          href: `${BASE}/reports?${q}`,
          icon: List,
        },
        {
          title: "Visitor Timeline",
          href: `${BASE}/event_user_activity_report?${q}`,
          icon: LineChart,
        },
      ],
    },

    // ---------------------------------------------------------
    // MANAGE EVENT ORDERS
    // ---------------------------------------------------------
    {
      code: "LGTBUY",
      label: "Manage Event Orders",
      icon: ShoppingCart,
      colorClass: "bg-[#4B0082] hover:bg-[#C71585]",
      items: [
        {
          title: "Manage Orders",
          href: `${BASE}/event_invoices?${q}`,
          icon: FileText,
        },
        {
          title: "View Invoices",
          href: `${BASE}/event_invoices?${q}`,
          icon: StickyNote,
        },
        {
          title: "Buy Sponsorship",
          /*
           * The purchase form, not the Event Tickets admin screen this used to open — which is
           * why clicking Buy Sponsorship landed on "Event Tickets". Mirrors the legacy
           * advertise.php?action=add&type=sponsorship_option&event_id=<id>.
           */
          href: `${BASE}/buy_sponsorship?${q}`,
          icon: Handshake,
          colorClass: "bg-red-600 hover:bg-red-700",
        },
        {
          title: "Buy Speaker Slot",
          href: `${BASE}/manage_speakers?${q}`,
          icon: Megaphone,
          colorClass: "bg-red-600 hover:bg-red-700",
        },
        {
          title: "Buy Banner Stand",
          href: `${BASE}/manage_banner_stands?${q}`,
          icon: Bookmark,
          colorClass: "bg-red-600 hover:bg-red-700",
        },
        {
          title: "Buy Advert",
          href: `${BASE}/event_magazine_setup?${q}`,
          icon: Gem,
          colorClass: "bg-red-600 hover:bg-red-700",
        },
        {
          title: "Buy Artwork",
          href: `${BASE}/manage_event_artwork?${q}`,
          icon: Languages,
          colorClass: "bg-red-600 hover:bg-red-700",
        },
        {
          title: "Buy Content Writing",
          href: `${BASE}/manage_event_content_request?${q}`,
          icon: PenTool,
          colorClass: "bg-red-600 hover:bg-red-700",
        },
      ],
    },

    // ---------------------------------------------------------
    // DOWNLOAD ORDERS
    // ---------------------------------------------------------
    {
      code: "LTGDO",
      label: "Download Orders",
      icon: ArrowDownCircle,
      colorClass: "bg-[#C71585] hover:bg-black",
      items: [
        {
          title: "Download Purchase Order PDF",
          href: `${BASE}/reports?${q}`,
          icon: ChevronDown,
        },
        {
          title: "Download Invoice PDF",
          href: `${BASE}/reports?${q}`,
          icon: ChevronsDown,
        },
        {
          title: "Download Credit Note PDF",
          href: `${BASE}/reports?${q}`,
          icon: ArrowDownCircle,
        },
      ],
    },
  ];
}

/** Get pathname without query parameters */
function pathOf(href: string) {
  return href.split("?")[0];
}

/** ---------- Component Props ---------- */

interface EventAdminNavbarProps {
  /**
   * Event ID is optional.
   * If not provided, DEFAULT_EVENT_ID (852) will be used automatically.
   */
  eventId?: number | string;

  /**
   * The event's friendly_url. When supplied, "View My Booth" links directly to
   * /virtual-event/<slug> instead of bouncing through the members-side redirect page.
   */
  eventSlug?: string | null;

  /**
   * Optional tab to open initially.
   */
  defaultTab?: string;

  /**
   * Callback for modal-triggered items.
   */
  onOpenModal?: (modalId: string) => void;
}

/** ---------- Component ---------- */

export default function EventAdminNavbar({
  eventId = DEFAULT_EVENT_ID,
  eventSlug,
  defaultTab,
  onOpenModal,
}: EventAdminNavbarProps) {
  const tabs = buildTabs(eventId, eventSlug);
  const pathname = usePathname();

  /**
   * Falls back to managing its own modal state when no `onOpenModal` is supplied by the parent —
   * so "Copy Event" works out of the box on every page that renders this navbar, without every
   * caller (both `(event)/layout.tsx` and `user_event_summary/page.tsx`) needing to wire it up.
   */
  const [internalModalId, setInternalModalId] = useState<string | null>(null);
  const openModal = (modalId: string) => {
    if (onOpenModal) {
      onOpenModal(modalId);
    } else {
      setInternalModalId(modalId);
    }
  };

  /**
   * Find which tab contains the current page.
   */
  function tabForPath(path: string): string | null {
    for (const tab of tabs) {
      if (
        tab.items.some(
          (item) =>
            !item.modal &&
            pathOf(item.href) === path
        )
      ) {
        return tab.code;
      }
    }

    return null;
  }

  /**
   * Determine the initial active tab.
   *
   * Priority:
   * 1. defaultTab
   * 2. Current URL pathname
   * 3. First tab
   */
  const matchedTabOnMount = tabForPath(pathname);
  const [activeTab, setActiveTab] = useState(
    defaultTab ?? matchedTabOnMount ?? tabs[0].code
  );

  /**
   * Keep active tab synchronized with URL changes.
   *
   * We only trigger this if the pathname actually changes,
   * allowing manual tab switching to persist until a new page is loaded.
   */
  useEffect(() => {
    const matchedTab = tabForPath(pathname);
    if (matchedTab && matchedTab !== activeTab) {
      setActiveTab(matchedTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  /**
   * Get currently selected tab.
   */
  const current =
    tabs.find((tab) => tab.code === activeTab) ??
    tabs[0];

  const getTabColors = (code: string) => {
    switch (code) {
      case "LGT_ONBOARD":
        return {
          activeBg: "bg-indigo-600 text-white border-indigo-600",
          hoverBg: "hover:bg-indigo-600/20 hover:text-white",
          textColor: "text-indigo-400",
          badgeBg: "bg-indigo-600/20 text-white border-indigo-600/30",
          cardHover: "hover:border-indigo-600/50 hover:bg-white/5 hover:text-white",
          cardActive: "bg-indigo-600/30 text-white border-indigo-600/50 ring-1 ring-indigo-600/30 font-bold",
          iconColor: "text-indigo-400",
        };
      case "LGTS":
      case "LGTCL":
      case "LGTBUY":
        return {
          activeBg: "bg-brand-purple text-white border-brand-purple",
          hoverBg: "hover:bg-brand-purple/20 hover:text-white",
          textColor: "text-brand-purple",
          badgeBg: "bg-brand-purple/20 text-white border-brand-purple/30",
          cardHover: "hover:border-brand-purple/50 hover:bg-white/5 hover:text-white",
          cardActive: "bg-brand-purple/30 text-white border-brand-purple/50 ring-1 ring-brand-purple/30 font-bold",
          iconColor: "text-brand-purple",
        };
      case "LTGMVB":
        return {
          activeBg: "bg-zinc-900 text-white border-zinc-800",
          hoverBg: "hover:bg-white/10 hover:text-white",
          textColor: "text-zinc-300",
          badgeBg: "bg-zinc-800 text-zinc-300 border-zinc-700",
          cardHover: "hover:border-zinc-700 hover:bg-white/5 hover:text-white",
          cardActive: "bg-zinc-800 text-white border-zinc-700 font-bold",
          iconColor: "text-zinc-400",
        };
      case "LGTMM":
      case "LGTME":
      case "LTGDO":
      default:
        return {
          activeBg: "bg-brand-pink text-white border-brand-pink",
          hoverBg: "hover:bg-brand-pink/20 hover:text-white",
          textColor: "text-brand-pink",
          badgeBg: "bg-brand-pink/20 text-white border-brand-pink/30",
          cardHover: "hover:border-brand-pink/50 hover:bg-white/5 hover:text-white",
          cardActive: "bg-brand-pink/30 text-white border-brand-pink/50 ring-1 ring-brand-pink/30 font-bold",
          iconColor: "text-brand-pink",
        };
    }
  };

  const currentTabColors = getTabColors(current.code);

  /**
   * Roving-focus keyboard navigation across the tab strip (Left/Right/Home/End), which is what
   * `role="tablist"` promises a screen-reader or keyboard user. Only the active tab is in the
   * tab order (`tabIndex`), so Tab moves past the whole strip into the panel rather than
   * stepping through seven buttons.
   */
  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();

    const index = tabs.findIndex((tab) => tab.code === activeTab);
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
        ? tabs.length - 1
        : event.key === "ArrowLeft"
        ? (index - 1 + tabs.length) % tabs.length
        : (index + 1) % tabs.length;

    const code = tabs[next].code;
    setActiveTab(code);
    document.getElementById(`event-admin-tab-${code}`)?.focus();
  };

  return (
    <div className="w-full">
      {/* =====================================================
          TOP TAB / PILL BAR

          Tabs size to their own label and WRAP to a second row when they run out of width.
          The previous `flex-1 basis-[120px]` + `truncate` forced all seven into a single row,
          which is what produced "VIEW EVENT SUMM...", "CONFIGURE VIRTUA..." and
          "MANAGE VIRTUAL B..." — a menu you cannot read is not a menu. `whitespace-nowrap`
          keeps each label on one line; the flex container handles the overflow by wrapping.
      ====================================================== */}
      <div
        role="tablist"
        aria-label="Event admin sections"
        className="flex flex-wrap gap-1.5 rounded-2xl border border-white/10 bg-black/40 p-1.5 shadow-2xl backdrop-blur-md"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.code === activeTab;
          const tabStyle = getTabColors(tab.code);

          return (
            <button
              key={tab.code}
              id={`event-admin-tab-${tab.code}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`event-admin-panel-${tab.code}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveTab(tab.code)}
              onKeyDown={onTabKeyDown}
              className={`
                inline-flex flex-none items-center gap-2 whitespace-nowrap
                rounded-xl px-4 py-2.5
                text-[11px] font-bold uppercase leading-none tracking-wide
                transition-all duration-200
                focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40
                ${
                  isActive
                    ? `${tabStyle.activeBg} font-black shadow-lg`
                    : `text-zinc-400 ${tabStyle.hoverBg}`
                }
              `}
            >
              <Icon
                size={14}
                className={`shrink-0 ${isActive ? "text-white" : tabStyle.iconColor}`}
              />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* =====================================================
          SUB ITEM PANEL
      ====================================================== */}
      <div
        id={`event-admin-panel-${current.code}`}
        role="tabpanel"
        aria-labelledby={`event-admin-tab-${current.code}`}
        className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-lg sm:p-6"
      >
        {/* Panel Header */}
        <div className="mb-5 flex flex-wrap items-center gap-3 border-b border-white/10 pb-4">
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest ${currentTabColors.badgeBg}`}
          >
            {current.label}
          </span>
          <span className="text-xs font-medium text-zinc-500">
            {current.items.length} {current.items.length === 1 ? "option" : "options"} available
          </span>
        </div>

        {current.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <span className="text-sm font-medium italic text-zinc-500">
              No options available in this section yet.
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {current.items.map((item) => {
              const Icon = item.icon;
              const isCurrentPage = !item.modal && pathOf(item.href) === pathname;
              /*
               * Titles WRAP rather than truncate. "Manage Speaker Questionnaire",
               * "Configure Lobby Welcome Tour" and "Download Purchase Order PDF" do not fit on
               * one line in a four-column grid at any sensible font size, and a clipped label
               * is the same failure as a clipped tab. `min-h` keeps the rows aligned once some
               * titles run to two lines.
               */
              const classes = `
                group flex min-h-[68px] w-full items-center gap-3
                rounded-xl border px-4 py-3.5 text-left
                text-[13px] font-semibold leading-snug tracking-normal
                shadow-lg transition-all duration-200
                hover:-translate-y-0.5 hover:shadow-brand-purple/10
                focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40
                ${
                  isCurrentPage
                    ? currentTabColors.cardActive
                    : `border-white/10 bg-zinc-900/50 text-zinc-300 ${currentTabColors.cardHover}`
                }
              `;

              const iconBox = (
                <span
                  className={`
                    flex h-9 w-9 shrink-0 items-center justify-center rounded-lg
                    border border-white/10 bg-white/5 transition-colors
                    ${isCurrentPage ? "text-white" : currentTabColors.iconColor}
                  `}
                >
                  <Icon size={16} />
                </span>
              );

              // Modal trigger item (like Copy Event)
              if (item.modal) {
                return (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => openModal(item.modal!)}
                    className={classes}
                  >
                    {iconBox}
                    <span className="min-w-0">{item.title}</span>
                  </button>
                );
              }

              // External URL
              const isExternal = item.href.startsWith("http");
              if (isExternal) {
                return (
                  <a
                    key={item.title}
                    href={item.href}
                    className={classes}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {iconBox}
                    <span className="min-w-0">{item.title}</span>
                  </a>
                );
              }

              // Internal Next.js Link
              return (
                <Link
                  key={item.title}
                  href={item.href}
                  aria-current={isCurrentPage ? "page" : undefined}
                  className={classes}
                >
                  {iconBox}
                  <span className="min-w-0">{item.title}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <CopyEventModal
        open={internalModalId === "copyEventModal"}
        eventId={eventId}
        onClose={() => setInternalModalId(null)}
      />
    </div>
  );
}
