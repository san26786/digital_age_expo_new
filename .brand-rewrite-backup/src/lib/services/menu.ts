import { prisma } from "@/lib/prisma";
import { DOMAIN_ID } from "@/lib/site-config";

export interface MenuItem {
  id: number;
  title: string;
  link: string;
  target: string;
  children: MenuItem[];
}

export const DEFAULT_MENU: MenuItem[] = [
  {
    id: 1,
    title: "Free Ticket",
    link: "/free-ticket",
    target: "_self",
    children: [],
  },
  {
    id: 2,
    title: "Visit",
    link: "#",
    target: "_self",
    children: [
      { id: 21, title: "Why Join Exhibit", link: "/why_join_exhibit", target: "_self", children: [] },
      { id: 22, title: "Event Features", link: "/event_features", target: "_self", children: [] },
      { id: 23, title: "Event Zones", link: "/event_zones", target: "_self", children: [] },
      { id: 24, title: "Visitor Login", link: "/enter-the-show", target: "_self", children: [] },
    ],
  },
  {
    id: 3,
    title: "Schedules",
    link: "/event_schedule",
    target: "_self",
    children: [],
  },
  {
    id: 4,
    title: "Exhibitor",
    link: "/exhibitor-registration?action=buy",
    target: "_self",
    children: [
      { id: 41, title: "Stand art work", link: "/Standartworktemplates", target: "_self", children: [] },
      { id: 42, title: "Book a Stand", link: "/exhibitor-registration", target: "_self", children: [] },
      { id: 43, title: "Our Exhibitors", link: "/exhibitors", target: "_self", children: [] },
      { id: 44, title: "Why Exhibit", link: "/why-exhibit", target: "_self", children: [] },
      { id: 45, title: "Stand and Packages", link: "/membership_packages", target: "_self", children: [] },
      { id: 46, title: "Exhibitor Guide", link: "/magazine?id=192", target: "_self", children: [] },
      { id: 47, title: "Glimpse of the show", link: "/glimpse-of-the-show", target: "_self", children: [] },
      { id: 48, title: "Exhibitor Login", link: "/members/index", target: "_self", children: [] },
    ],
  },
  {
    id: 5,
    title: "Speakers",
    link: "/view_speaker",
    target: "_self",
    children: [
      { id: 51, title: "Speaker Registration", link: "/speaker_registration", target: "_self", children: [] },
      { id: 52, title: "Our Speakers", link: "/view_speaker", target: "_self", children: [] },
      { id: 53, title: "Speaker Schedule", link: "/event_schedule", target: "_self", children: [] },
      { id: 54, title: "Speaker Guide", link: "#", target: "_self", children: [] },
    ],
  },
  {
    id: 6,
    title: "Sponsors",
    link: "/sponsors",
    target: "_self",
    children: [
      { id: 61, title: "Our Sponsors", link: "/our_sponsor", target: "_self", children: [] },
      { id: 62, title: "Request for Sponsorship", link: "/sponsor_registration", target: "_self", children: [] },
      { id: 63, title: "Sponsorship Guide", link: "/", target: "_self", children: [] },
      { id: 64, title: "Why Sponsor", link: "/why-sponsor", target: "_self", children: [] },
      { id: 65, title: "Sponsorship Options", link: "/sponsor_opportunity", target: "_self", children: [] },
    ],
  },
  {
    id: 7,
    title: "What's on",
    link: "#",
    target: "_self",
    children: [
      { id: 71, title: "Addon Services", link: "/event-services", target: "_self", children: [] },
      { id: 72, title: "Exhibitor Information", link: "/exhibitor-information", target: "_self", children: [] },
      { id: 73, title: "Webinars", link: "/webinars", target: "_self", children: [] },
      { id: 74, title: "Masterclass", link: "/masterclass", target: "_self", children: [] },
      { id: 75, title: "Speed Networking", link: "/networking", target: "_self", children: [] },
      { id: 76, title: "Vip Lounge", link: "/vip-lounge", target: "_self", children: [] },
      { id: 77, title: "Seminars", link: "/seminars", target: "_self", children: [] },
      { id: 78, title: "Live Workshop", link: "/live-workshop", target: "_self", children: [] },
      { id: 79, title: "Keynote Sessions", link: "/keynote", target: "_self", children: [] },
      { id: 710, title: "Buy Conference Pass", link: "/buy_tickets", target: "_self", children: [] },
      { id: 711, title: "FAQs", link: "/frequently-asked-questions", target: "_self", children: [] },
    ],
  },
  {
    id: 8,
    title: "Login",
    link: "#",
    target: "_self",
    children: [
      { id: 81, title: "Speaker Login", link: "/members/index", target: "_self", children: [] },
      { id: 82, title: "Visitor Login", link: "/enter-the-show", target: "_self", children: [] },
      { id: 83, title: "Exhibitor Login", link: "/members/index", target: "_self", children: [] },
    ],
  },
  {
    id: 9,
    title: "Event Experience",
    link: "/event_experience",
    target: "_blank",
    children: [],
  },
  {
    id: 10,
    title: "About",
    link: "#",
    target: "_self",
    children: [
      { id: 101, title: "Speaker Questionnaires", link: "/speaker-questionaire", target: "_self", children: [] },
      { id: 102, title: "Sponsorship Opportunity", link: "/sponsor_opportunity", target: "_self", children: [] },
      { id: 103, title: "Glimpse of the show", link: "/glimpse-of-the-show", target: "_self", children: [] },
      { id: 104, title: "Show guide", link: "/magazine?id=192", target: "_self", children: [] },
      { id: 105, title: "Gallery", link: "/view_gallery", target: "_self", children: [] },
      { id: 106, title: "Knowledge Center", link: "/articles", target: "_self", children: [] },
      { id: 107, title: "View All Exhibitor", link: "/exhibitors", target: "_self", children: [] },
      { id: 108, title: "View All Speakers", link: "/view_speaker", target: "_self", children: [] },
      { id: 109, title: "View All Sponsors", link: "/view_sponsor", target: "_self", children: [] },
      { id: 110, title: "View Industry List", link: "/view_industry_list", target: "_self", children: [] },
    ],
  },
  {
    id: 11,
    title: "Past Events",
    link: "#",
    target: "_self",
    children: [
      { id: 111, title: "Digital Age Expo July 2021", link: "https://july.digitalageexpo.com/", target: "_blank", children: [] },
      { id: 112, title: "Digital Age Expo Nov 2021", link: "https://november.digitalageexpo.com/", target: "_blank", children: [] },
    ],
  },
  {
    id: 12,
    title: "Contact Us",
    link: "/contact",
    target: "_self",
    children: [],
  },
];

/** Legacy multi-domain gate, inherited from class_menu_links.php: a row with a blank/null
 * domain_id applies everywhere; otherwise it applies only if its comma-separated domain_id
 * list includes this site's DOMAIN_ID. Exported so menuLinksRepository.ts (the CP's Menu
 * Manager) can scope its own listing the same way — without this, the Menu Manager shows
 * every domain's rows mixed together (727 of them, from the shared legacy install), not just
 * this site's. */
export function appliesToDomain(domainId: string | null): boolean {
  if (!domainId || domainId.trim() === "") return true;
  return domainId
    .split(",")
    .map((id) => id.trim())
    .includes(String(DOMAIN_ID));
}

/**
 * Every host the old platform was served from.
 *
 * The virtual-event experience lived on the `apps.` subdomain — a CMS row for
 * "Visitor Login" points at
 *   https://www.apps.digitalageexpo.com/login/<friendly_url>?from=<base64>
 * Stripping only `digitalageexpo.com` left that absolute URL intact, so the nav
 * item navigated the visitor OFF this app and back onto the legacy PHP site
 * instead of opening our own VisitorLoginForm. `apps.` and `www.apps.` (plus the
 * sibling brands sharing the install) all have to be recognised as "us".
 */
const LEGACY_SITE_HOST_RE =
  /^https?:\/\/(?:www\.)?(?:apps\.)?(?:digitalageexpo|tradeshowslocal|findusonweb)\.com/i;

/**
 * Legacy path SHAPES -> this app's routes.
 *
 * These carry a slug, so an exact-match table can't express them.
 *   /login/<friendly_url>  ->  /virtual-event/<friendly_url>/login   (the Visitor Login form)
 *   /lobby/<friendly_url>  ->  /virtual-event/<friendly_url>         (the show floor itself)
 */
const LEGACY_PATH_PATTERNS: { test: RegExp; to: (m: RegExpMatchArray) => string }[] = [
  { test: /^\/login\/([^/?#]+)\/?$/i, to: (m) => `/virtual-event/${m[1]}/login` },
  { test: /^\/lobby\/([^/?#]+)\/?$/i, to: (m) => `/virtual-event/${m[1]}` },
  { test: /^\/virtual-event\/([^/?#]+)\/login\/?$/i, to: (m) => `/virtual-event/${m[1]}/login` },
];

/**
 * Legacy `.php` page -> this app's route.
 *
 * `find_menu_links` rows were authored against the old PHP site and were never
 * rewritten when it moved to Next, so some still point at filenames that don't
 * exist here. Left alone they fall through to src/app/[...slug], which renders a
 * generic "Return To Home" placeholder.
 *
 * Add a row here whenever another stale legacy target turns up — cheaper and
 * safer than hand-editing production CMS data.
 */
const LEGACY_PATH_ROUTES: Record<string, string> = {
  "enter_the_show.php": "/enter-the-show",
  "enter-the-show.php": "/enter-the-show",
  "visitor_login.php": "/enter-the-show",
  "visitor-login.php": "/enter-the-show",
  "lobby_login.php": "/enter-the-show",
  "lobby.php": "/enter-the-show",
  "contact.php": "/contact",
  "frequently-asked-questions.php": "/frequently-asked-questions",
  "faq.php": "/frequently-asked-questions",
  "magazine.php": "/magazine",
  "view_speaker.php": "/view_speaker",
  "view_sponsor.php": "/view_sponsor",
  "view_gallery.php": "/view_gallery",
  "view_industry_list.php": "/view_industry_list",
  "event_schedule.php": "/event_schedule",
  "exhibitor_registration.php": "/exhibitor-registration",
  "speaker_registration.php": "/speaker_registration",
  "sponsor_registration.php": "/sponsor_registration",
  "buy_tickets.php": "/buy_tickets",
  "members/index.php": "/members/index",
};

function normaliseTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/**
 * title -> route, derived from DEFAULT_MENU so there is exactly one source of
 * truth for "where should the nav item called X actually go". Titles whose
 * default link is itself a non-destination ("#" or "/") are skipped, so this can
 * only ever upgrade a broken link — never introduce one.
 */
const DEFAULT_ROUTE_BY_TITLE: Map<string, string> = (() => {
  const map = new Map<string, string>();
  const walk = (items: MenuItem[]) => {
    for (const item of items) {
      const key = normaliseTitle(item.title);
      if (item.link && item.link !== "#" && item.link !== "/" && !map.has(key)) {
        map.set(key, item.link);
      }
      walk(item.children);
    }
  };
  walk(DEFAULT_MENU);
  return map;
})();

/**
 * Normalises a CMS menu link into something this app can actually route to.
 *
 * The `title` argument is the important part. A number of legacy rows store the
 * bare site root (`https://digitalageexpo.com/`, or just `/`) as their link,
 * because on the old site the real destination came from a query string or a PHP
 * include rather than from the URL. Those collapse to "/" and silently drop the
 * visitor on the home page — which is exactly what "Visitor Login" was doing.
 * When the stored link carries no destination, fall back to the route
 * DEFAULT_MENU defines for that title.
 *
 * Precedence: real path > legacy .php mapping > title fallback.
 */
function resolveLink(link: string, title = ""): string {
  const titleFallback = DEFAULT_ROUTE_BY_TITLE.get(normaliseTitle(title));

  // Anything on a host the old platform used is really OUR content — bring it
  // back in-app rather than bouncing the visitor to the legacy site.
  let clean = (link ?? "").trim().replace(LEGACY_SITE_HOST_RE, "");

  // Past-event subdomains (july./november.) and partner sites are genuinely
  // external and must keep their absolute URL.
  if (/^https?:\/\//i.test(clean)) return clean;

  if (clean && !clean.startsWith("/") && !clean.startsWith("#") && !clean.startsWith("?")) {
    clean = `/${clean}`;
  }

  const [pathOnly, query] = clean.split("?");

  // Legacy path shape carrying a slug (/login/<friendly_url>, /lobby/<slug>).
  // The legacy `?from=<base64>` return-url param is deliberately dropped: this
  // app's VisitorLoginForm routes to /virtual-event/<slug> on success itself.
  for (const { test, to } of LEGACY_PATH_PATTERNS) {
    const match = pathOnly.match(test);
    if (match) return to(match);
  }

  // Legacy .php target -> real route, preserving any query string.
  const legacy = LEGACY_PATH_ROUTES[pathOnly.replace(/^\//, "").toLowerCase()];
  if (legacy) {
    return query ? `${legacy}?${query}` : legacy;
  }

  // Link carries no destination — use the title's known route if we have one.
  if (!clean || clean === "/" || clean === "#") {
    return titleFallback ?? (clean || "#");
  }

  return clean;
}

/** CMS-managed navigation (find_menu_links), mirrors class_menu_links.php::getLinks(). */
export async function getMenu(): Promise<MenuItem[]> {
  try {
    const rows = await prisma.find_menu_links.findMany({
      where: { active: 1, logged_out: 1 },
      orderBy: { ordering: "asc" },
      select: {
        id: true,
        title: true,
        link: true,
        target: true,
        parent_id: true,
        domain_id: true,
      },
    });

    const visible = rows.filter((row: any) => appliesToDomain(row.domain_id));

    if (visible.length >= 3) {
      const byId = new Map<number, MenuItem>();
      for (const row of visible) {
        byId.set(row.id, {
          id: row.id,
          title: row.title,
          link: resolveLink(row.link, row.title),
          target: row.target || "_self",
          children: [],
        });
      }

      const roots: MenuItem[] = [];
      for (const row of visible) {
        const item = byId.get(row.id)!;
        if (row.parent_id && byId.has(row.parent_id)) {
          byId.get(row.parent_id)!.children.push(item);
        } else if (!row.parent_id) {
          roots.push(item);
        }
      }
      if (roots.length > 0) {
        return roots;
      }
    }
  } catch {
    // Fallback if DB query fails or is empty
  }

  return DEFAULT_MENU;
}