"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CopyEventModal } from "@/components/dashboard/CopyEventModal";
import {
  Menu,
  Settings,
  Settings2,
  Send,
  Server,
  SlidersHorizontal,
  Palette,
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
  ChevronRight,
  ChevronsDown,
  type LucideIcon,
  Handshake,
  Globe2,
  Plus,
  LayoutList,
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
function buildTabs(
  eventId: number | string,
  eventSlug?: string | null,
  canAccessHub = false,
  canManageSites = false
): Tab[] {
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
          /*
           * The purchase form, not the Manage Speakers admin screen it used to open. Mirrors
           * advertise.php?action=add&type=speaker_slot&event_id=<id>.
           */
          href: `${BASE}/buy_speaker_slot?${q}`,
          icon: Megaphone,
          colorClass: "bg-red-600 hover:bg-red-700",
        },
        {
          title: "Buy Banner Stand",
          /*
           * The purchase form, not the Manage Banner Stand admin table it used to open. Mirrors
           * advertise.php?action=add&type=banner_stand&event_id=<id>. Manage Banner Stand still
           * has its own tile under Manage Virtual Booth.
           */
          href: `${BASE}/buy_banner_stand?${q}`,
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

    // ---------------------------------------------------------
    // SITE HUB  (superadmin only)
    //
    // Not under ${BASE}. Every other entry in this navbar points at /members/<segment>, where
    // src/app/members/(event)/[slug]/page.tsx catches anything unrecognised and renders a
    // generic module full of MOCK records - so a Hub link that lived there would not 404 if it
    // broke, it would quietly show fake sites. /hub is a top-level route of its own, with its
    // own layout and its own gate, and a wrong URL there fails loudly.
    //
    // Hidden rather than disabled for people without access: the Hub is not a feature most
    // members are missing out on, it is one they have no business knowing the shape of.
    //
    // The two tabs below are gated separately, and that split is the point.
    //
    // A superadmin is a superadmin on every host. Email Templates is fine that way - it is a
    // screen you want from whichever site you are working on. Hub: Sites is not: without a second
    // question it would appear inside B2B Growth Expo offering to manage B2B Growth Expo's
    // siblings, so it asks getSitesHubAccess() and shows only on the parent site.
    // ---------------------------------------------------------
    ...(canAccessHub
      ? [
          /*
           * SITE SETTINGS — this site's own name, colours, logos and contact details.
           *
           * The same editor the Hub uses, pointed at whichever site is being served. It is here
           * rather than under Hub: Sites because it is not site MANAGEMENT: a created site
           * changing its own colours has nothing to do with the parent site's list of every site,
           * and routing it through there would mean an organiser needs the parent to change a
           * colour. /hub/site-settings resolves the site from the host, so this one entry does the
           * right thing on every site without the link needing to know which one it is on.
           */
          {
            code: "LGTSITECFG",
            label: "Site Settings",
            icon: SlidersHorizontal,
            colorClass: "bg-[#4B0082] hover:bg-black",
            items: [
              {
                title: "Identity, Colours & Logos",
                href: "/hub/site-settings",
                icon: Palette,
              },
            ],
          } satisfies Tab,

          /*
           * EMAIL TEMPLATES, IN FRONT OF THE HUB RATHER THAN INSIDE IT.
           *
           * This module already existed - it was just locked behind a second login at
           * /cp/email-templates, which is the thing Angad asked to stop: "from only one login we
           * can do changes whatever we want from organiser login don't need to cp login".
           *
           * So it is the SAME screen, not a copy of it. /hub/email-templates renders the shared
           * components in src/components/email-templates/shared.tsx behind the Hub's gate, and
           * the CP page now renders those same components behind its own. One implementation,
           * two doors - see that file's header for why the alternative was not acceptable.
           *
           * It sits beside Hub: Sites but is NOT gated with it. The rows are platform-wide -
           * find_email_templates has no DOMAIN column, so editing a template here changes what
           * every site sends, which the screen says above the form - but that is a reason to warn
           * loudly, not a reason to make the screen unreachable from the site somebody happens to
           * be signed in to.
           */
          {
            code: "LGTEMAIL",
            label: "Email Templates",
            icon: Mail,
            colorClass: "bg-[#7C3AED] hover:bg-black",
            items: [
              {
                title: "All Templates",
                href: "/hub/email-templates",
                icon: Files,
              },
            ],
          } satisfies Tab,

          /*
           * SEND QUEUE — the mailbox this site sends from.
           *
           * Beside Email Templates and under the same flag, because it is the same shape of thing:
           * per-site email settings, wanted from whichever site somebody is signed in to. The
           * settings it edits are keyed on the serving domain, so gating it to the parent site
           * would mean a sub-site could never set its own From address, which is the opposite of
           * what it is for.
           *
           * The screen is honest about its own extent: the provider section is wired, and bounce
           * capture, send cadence and the job list are named and marked as not built, because
           * this app has no queue worker and no tables behind any of them.
           */
          {
            code: "LGTSENDQ",
            label: "Send Queue",
            icon: Send,
            colorClass: "bg-[#0F766E] hover:bg-black",
            items: [
              {
                title: "Email Provider",
                href: "/hub/send-queue",
                icon: Server,
              },
            ],
          } satisfies Tab,
        ]
      : []),

    ...(canManageSites
      ? [
          {
            code: "LGTHUB",
            label: "Hub Sites",
            icon: Globe2,
            colorClass: "bg-[#0F766E] hover:bg-black",
            items: [
              {
                title: "All Sites",
                href: "/hub/sites",
                icon: LayoutList,
              },
              {
                title: "New Site",
                href: "/hub/sites/new",
                icon: Plus,
              },
            ],
          } satisfies Tab,
        ]
      : []),
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
   * Whether to show the Site Hub tab.
   *
   * Decided on the SERVER by the caller (getHubAccess), never here: this is a client component,
   * so anything it worked out for itself would be worked out from data already shipped to the
   * browser. Defaults to false so a caller that forgets to pass it hides the tab rather than
   * revealing it - the safe direction for a flag that gates site creation.
   */
  canAccessHub?: boolean;

  /**
   * Whether to show Hub: Sites specifically.
   *
   * Separate from canAccessHub because the two answer different questions. Email Templates is a
   * screen an organiser wants from whichever site they are signed in to; creating and deleting
   * whole sites belongs to the parent site only and must not appear inside one of the sites it
   * manages. Both are decided on the SERVER by the caller - getHubAccess and getSitesHubAccess -
   * and both default to false, so a caller that forgets hides rather than reveals.
   */
  canManageSites?: boolean;

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
  canAccessHub = false,
  canManageSites = false,
  defaultTab,
  onOpenModal,
}: EventAdminNavbarProps) {
  const tabs = buildTabs(eventId, eventSlug, canAccessHub, canManageSites);
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

  /**
   * Per-family presentation tokens.
   *
   * The tab-code -> family mapping is unchanged. What changed is how the family is SPENT.
   *
   * Previously every token in this table was applied to every tab at rest, so with seven of the
   * eleven tabs landing in the pink default branch the strip rendered as a wall of pink icons —
   * colour that varies almost never carries no information, and the one tab that mattered (the
   * selected one) had no more visual weight than the rest. The family colour is now used only
   * where it means something: on the ACTIVE tab, on hover, and throughout the open panel. Tabs
   * at rest are neutral.
   *
   * Flat fills, not gradients: see the note above `.btn-brand-gradient` in globals.css, where the
   * purple -> pink sweep was deliberately removed from primary surfaces. --color-brand-purple is
   * #4B0082, dark enough that a sweep reads as a smudge rather than a highlight.
   */
  const getTabColors = (code: string) => {
    switch (code) {
      case "LGT_ONBOARD":
        return {
          activeBg: "bg-indigo-600",
          glow: "shadow-[0_6px_20px_-6px_rgba(79,70,229,0.65)]",
          hoverBg: "hover:bg-indigo-600/20 hover:text-white",
          textColor: "text-indigo-400",
          iconColor: "text-indigo-400",
          iconHover: "group-hover:text-indigo-400",
          badgeBg: "border-indigo-500/30 bg-indigo-500/15 text-indigo-300",
          rail: "bg-indigo-500",
          cardHover: "hover:border-indigo-500/40 hover:bg-white/[0.06] hover:text-white",
          cardActive:
            "border-indigo-500/45 bg-indigo-500/15 text-white ring-1 ring-indigo-500/30 font-bold shadow-lg",
        };
      case "LGTS":
      case "LGTCL":
      case "LGTBUY":
        return {
          activeBg: "bg-brand-purple",
          glow: "shadow-[0_6px_20px_-6px_rgba(75,0,130,0.9)]",
          hoverBg: "hover:bg-brand-purple/20 hover:text-white",
          textColor: "text-brand-purple",
          iconColor: "text-violet-300",
          iconHover: "group-hover:text-violet-300",
          badgeBg: "border-brand-purple/40 bg-brand-purple/25 text-violet-200",
          rail: "bg-violet-400",
          cardHover: "hover:border-brand-purple/50 hover:bg-white/[0.06] hover:text-white",
          cardActive:
            "border-violet-400/45 bg-brand-purple/35 text-white ring-1 ring-violet-400/30 font-bold shadow-lg",
        };
      case "LTGMVB":
        return {
          activeBg: "bg-zinc-700",
          glow: "shadow-[0_6px_20px_-6px_rgba(0,0,0,0.8)]",
          hoverBg: "hover:bg-white/10 hover:text-white",
          textColor: "text-zinc-300",
          iconColor: "text-zinc-300",
          iconHover: "group-hover:text-zinc-200",
          badgeBg: "border-white/15 bg-white/10 text-zinc-200",
          rail: "bg-zinc-400",
          cardHover: "hover:border-white/20 hover:bg-white/[0.06] hover:text-white",
          cardActive:
            "border-white/25 bg-white/[0.12] text-white ring-1 ring-white/20 font-bold shadow-lg",
        };
      case "LGTMM":
      case "LGTME":
      case "LTGDO":
      default:
        return {
          activeBg: "bg-brand-pink",
          glow: "shadow-[0_6px_20px_-6px_rgba(199,21,133,0.65)]",
          hoverBg: "hover:bg-brand-pink/20 hover:text-white",
          textColor: "text-brand-pink",
          iconColor: "text-pink-300",
          iconHover: "group-hover:text-pink-300",
          badgeBg: "border-brand-pink/35 bg-brand-pink/20 text-pink-200",
          rail: "bg-brand-pink",
          cardHover: "hover:border-brand-pink/50 hover:bg-white/[0.06] hover:text-white",
          cardActive:
            "border-brand-pink/50 bg-brand-pink/20 text-white ring-1 ring-brand-pink/35 font-bold shadow-lg",
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

  const CurrentIcon = current.icon;

  return (
    <div className="w-full">
      {/* =====================================================
          TABBED CARD — strip and panel in ONE container

          They used to be two separately bordered boxes with a gap between them, so nothing in the
          markup said the panel belonged to the selected tab; it read as a second, unrelated
          widget that happened to sit underneath. One container, a darker ground under the strip
          and a hairline divider make the relationship visible.

          Tabs still size to their own label and WRAP to a second row rather than truncating —
          "VIEW EVENT SUMM...", "CONFIGURE VIRTUA...", "MANAGE VIRTUAL B..." A menu you cannot
          read is not a menu.
      ====================================================== */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/25 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.95)] backdrop-blur-xl">
        <div
          role="tablist"
          aria-label="Event admin sections"
          className="flex flex-wrap gap-2 border-b border-white/[0.07] bg-black/30 p-3"
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
                  group inline-flex flex-none items-center gap-2 whitespace-nowrap
                  rounded-xl border px-3.5 py-2.5
                  text-[11px] font-bold uppercase leading-none tracking-wide
                  transition-all duration-200
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50
                  ${
                    isActive
                      ? `border-transparent ${tabStyle.activeBg} ${tabStyle.glow} font-black text-white`
                      : "border-white/[0.07] bg-white/[0.03] text-zinc-400 hover:-translate-y-px hover:border-white/15 hover:bg-white/[0.07] hover:text-white"
                  }
                `}
              >
                {/*
                  Inactive icons are neutral and pick up their family colour on hover. Tinting all
                  eleven at rest is what turned the strip into a block of pink.
                */}
                <Icon
                  size={14}
                  className={`shrink-0 transition-colors ${
                    isActive ? "text-white" : `text-zinc-500 ${tabStyle.iconHover}`
                  }`}
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
          className="p-4 sm:p-6"
        >
          {/* Panel header. The section name was a small pill sitting beside grey helper text at
              the same size, so the panel had no title — just two labels. Icon tile plus heading
              gives it one. */}
          <div className="mb-5 flex items-center gap-3 border-b border-white/[0.07] pb-4">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${currentTabColors.badgeBg}`}
            >
              <CurrentIcon size={18} />
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-xs font-black uppercase tracking-[0.2em] text-white">
                {current.label}
              </h3>
              <p className="mt-0.5 text-[11px] font-medium text-zinc-500">
                {current.items.length}{" "}
                {current.items.length === 1 ? "option" : "options"} available
              </p>
            </div>
          </div>

          {current.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="text-sm font-medium italic text-zinc-500">
                No options available in this section yet.
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                  group relative flex min-h-[64px] w-full items-center gap-3
                  overflow-hidden rounded-xl border py-3 pl-5 pr-3.5 text-left
                  text-[13px] font-semibold leading-snug
                  transition-all duration-200
                  hover:-translate-y-0.5 hover:shadow-lg
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50
                  ${
                    isCurrentPage
                      ? currentTabColors.cardActive
                      : `border-white/[0.07] bg-white/[0.025] text-zinc-300 ${currentTabColors.cardHover}`
                  }
                `;

                const body = (
                  <>
                    {/*
                      Accent rail — full height on the page you are on, and it grows from the
                      centre on hover. The old "current page" style was a flat /30 tint which,
                      against cards already sitting on a light-on-dark wash, landed DARKER than
                      its neighbours: the page you were on looked disabled rather than selected.
                      A rail reads as selection at any tint.
                    */}
                    <span
                      className={`absolute left-0 top-0 h-full w-[3px] origin-center transition-transform duration-200 ${
                        currentTabColors.rail
                      } ${isCurrentPage ? "scale-y-100" : "scale-y-0 group-hover:scale-y-100"}`}
                      aria-hidden="true"
                    />

                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                        isCurrentPage
                          ? "border-white/20 bg-white/15 text-white"
                          : `border-white/[0.07] bg-white/[0.04] ${currentTabColors.iconColor} group-hover:bg-white/10`
                      }`}
                    >
                      <Icon size={16} />
                    </span>

                    <span className="min-w-0 flex-1">{item.title}</span>

                    <ChevronRight
                      className={`h-4 w-4 shrink-0 transition-all duration-200 ${
                        isCurrentPage
                          ? "translate-x-0 opacity-70"
                          : "-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-60"
                      }`}
                      aria-hidden="true"
                    />
                  </>
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
                      {body}
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
                      {body}
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
                    {body}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <CopyEventModal
        open={internalModalId === "copyEventModal"}
        eventId={eventId}
        onClose={() => setInternalModalId(null)}
      />
    </div>
  );
}
