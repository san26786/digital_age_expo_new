/**
 * ===========================================================================
 *  IMAGE & BANNER REGISTRY — the catalogue behind "Manage Images & Banners"
 * ===========================================================================
 *
 *  PURE DATA. Nothing here reads a database, renders anything, or is imported
 *  by a single public page. It is a description of where each user-visible
 *  image on the site comes from, so one screen can show them all in one place.
 *  Adding, removing or mistyping an entry cannot change what the website
 *  displays — only what the manager screen lists.
 *
 *  ---------------------------------------------------------------------------
 *   WHY SOME SLOTS ARE EDITABLE AND SOME ARE NOT
 *  ---------------------------------------------------------------------------
 *
 *  The site's images come from three different kinds of place:
 *
 *    "content-block"  a find_listing_business_opportunity row — the legacy CMS's
 *                     generic content store. Editable: there is a row to update.
 *    "setting"        a find_settings row scoped to this site. Editable.
 *    "domain-column"  a column on the site's own find_domains row. Editable.
 *    "collection"     a repeating list (every speaker's portrait, every sponsor
 *                     logo). Listed and previewed, but each item belongs to its
 *                     own record and is edited on that record's own screen, so
 *                     this screen does not pretend to own them.
 *    "code"           a literal written into a component. NOT editable, because
 *                     making it editable means changing that component — which
 *                     this feature was explicitly asked not to do. Listed with
 *                     the file and line so it is findable rather than invisible.
 *
 *  A slot is editable if and only if `kind` is one of the first three. That is
 *  enforced by `isEditable()` below and again server-side in the service, so a
 *  hand-crafted request cannot talk this into writing somewhere it should not.
 */

/** A find_listing_business_opportunity row, identified the way the site's own services identify it. */
export interface ContentBlockSource {
  kind: "content-block";
  /** The legacy block code — see the `where` clauses in services/home.ts and services/exhibitors.ts. */
  opportunityIntro: string;
  /** Some blocks are further keyed by page; omitted where the site's own query omits it. */
  domainPageName?: string;
}

export interface SettingSource {
  kind: "setting";
  varname: string;
  grouptitle: string;
}

export interface DomainColumnSource {
  kind: "domain-column";
  /** Only ever "fav" today. Kept narrow on purpose: this is a column name going into a write. */
  column: "fav";
}

export interface CollectionSource {
  kind: "collection";
  /** Where the admin actually edits these, so the screen can say so instead of dead-ending. */
  managedAt: string;
}

export interface CodeSource {
  kind: "code";
  file: string;
  line: number;
  /** For `multiple`, a comma-separated list — it is shown as text, never put in an <img src>. */
  literal: string;
  /** Several images in one block (a row of tiles). There is no single preview to render. */
  multiple?: boolean;
}

export type ImageSource =
  | ContentBlockSource
  | SettingSource
  | DomainColumnSource
  | CollectionSource
  | CodeSource;

export interface ImageSlot {
  /**
   * Stable identifier. It is also part of the find_settings varname that stores this slot's alt
   * text and title, so renaming one orphans that text — treat these as permanent.
   */
  id: string;
  /** Human-facing page name, used as the group heading. */
  page: string;
  /** The route it appears on, shown so an admin can go and look at it. */
  route: string;
  /** The section within the page, as a visitor would recognise it. */
  section: string;
  /** What this particular image is within that section. */
  label: string;
  source: ImageSource;
  /** Shown under the field. Say what the image IS and where it appears, not how it is stored. */
  hint?: string;
  /**
   * What the site falls back to when nothing is stored for this slot.
   *
   * Without this the manager reported "No image set" for every logo on a site that has never
   * overridden one — while the header was visibly showing the bundled wordmark. Both statements
   * were true and the pairing was useless. The preview now shows what a visitor actually sees and
   * says it is the built-in default.
   */
  defaultUrl?: string;
}

export function isEditable(slot: ImageSlot): boolean {
  return (
    slot.source.kind === "content-block" ||
    slot.source.kind === "setting" ||
    slot.source.kind === "domain-column"
  );
}

/**
 * The catalogue.
 *
 * Ordered the way an admin thinks about the site: the things that appear everywhere first, then
 * page by page in roughly the order they sit in the navigation.
 */
export const IMAGE_SLOTS: ImageSlot[] = [
  /* ------------------------------------------------------------ SITE-WIDE */
  {
    id: "brand-primary-logo",
    page: "Site-wide",
    route: "/",
    section: "Header & footer",
    label: "Primary logo (dark backgrounds)",
    source: { kind: "setting", varname: "cp_branding_primary_logo", grouptitle: "branding" },
    defaultUrl: "/images/digitalageexpo_logo.png",
    hint: "The wordmark in the header on every page. Shown when the site is in dark mode.",
  },
  {
    id: "brand-light-logo",
    page: "Site-wide",
    route: "/",
    section: "Header & footer",
    label: "Logo for light mode",
    source: { kind: "setting", varname: "cp_branding_light_logo", grouptitle: "branding" },
    defaultUrl: "/images/digitalageexpo_logo_light.png",
    hint: "Swapped in when a visitor switches the site to light mode. A dark-ink version of the wordmark.",
  },
  {
    id: "brand-mobile-logo",
    page: "Site-wide",
    route: "/",
    section: "Mobile menu",
    label: "Mobile logo",
    source: { kind: "setting", varname: "cp_branding_mobile_logo", grouptitle: "branding" },
    defaultUrl: "/images/logo.png",
    hint: "Shown at the top of the slide-out menu on phones.",
  },
  {
    id: "brand-footer-logo",
    page: "Site-wide",
    route: "/",
    section: "Footer",
    label: "Footer logo",
    source: { kind: "setting", varname: "cp_branding_footer_logo", grouptitle: "branding" },
    defaultUrl: "/images/digitalageexpo_logo.png",
  },
  {
    id: "brand-secondary-logo",
    page: "Site-wide",
    route: "/",
    section: "Brand assets",
    label: "Secondary logo",
    source: { kind: "setting", varname: "cp_branding_secondary_logo", grouptitle: "branding" },
    defaultUrl: "/images/logo.png",
    hint: "Stored for future use — no public page renders this one today.",
  },
  {
    id: "brand-login-logo",
    page: "Site-wide",
    route: "/",
    section: "Brand assets",
    label: "Login logo",
    source: { kind: "setting", varname: "cp_branding_login_logo", grouptitle: "branding" },
    defaultUrl: "/images/logo.png",
    hint: "Stored for future use — no public page renders this one today.",
  },
  {
    id: "site-favicon",
    page: "Site-wide",
    route: "/",
    section: "Browser tab",
    label: "Favicon",
    source: { kind: "domain-column", column: "fav" },
    defaultUrl: "/favicon.ico",
    hint: "The small icon in the browser tab and in bookmarks.",
  },
  {
    id: "seo-og-image",
    page: "Site-wide",
    route: "/",
    section: "Share cards",
    label: "Open Graph image",
    source: { kind: "setting", varname: "cp_seo_og_image", grouptitle: "seo" },
    hint: "The picture shown when a page is shared on Facebook or LinkedIn. 1200×630 works best.",
  },
  {
    id: "seo-twitter-image",
    page: "Site-wide",
    route: "/",
    section: "Share cards",
    label: "X / Twitter image",
    source: { kind: "setting", varname: "cp_seo_twitter_image", grouptitle: "seo" },
    hint: "The picture shown when a page is shared on X. 1200×675 works best.",
  },

  /* ------------------------------------------------------------ HOME PAGE */
  {
    id: "home-hero-background",
    page: "Home page",
    route: "/",
    section: "Hero",
    label: "Hero background",
    source: {
      kind: "code",
      file: "src/components/home/HeroSection.tsx",
      line: 19,
      literal: "https://digitalageexpo.com/files/listing_pages/818073-dae_index_top_banner.jpg",
    },
    hint: "The full-width banner behind the event title. Also used as the hero on several other pages.",
  },
  {
    id: "home-about-photo",
    page: "Home page",
    route: "/",
    section: "About The Event",
    label: "Section photo",
    source: { kind: "content-block", opportunityIntro: "LOSNABTEV", domainPageName: "About Events" },
    hint: "The framed photo beside the About copy. The same image appears on the /about page.",
  },
  {
    id: "home-partner-logos",
    page: "Home page",
    route: "/",
    section: "Our Partners & Sponsors",
    label: "Partner logo strip",
    source: { kind: "collection", managedAt: "the legacy content blocks for this listing" },
    hint: "The row of partner logos. Several images, held as separate rows.",
  },
  {
    id: "home-speaker-portraits",
    page: "Home page",
    route: "/",
    section: "Speakers",
    label: "Speaker portraits",
    source: { kind: "collection", managedAt: "Members → Speakers" },
    hint: "One portrait per speaker. Edited on each speaker's own record.",
  },
  {
    id: "home-exhibitor-logos",
    page: "Home page",
    route: "/",
    section: "Featured Exhibitors",
    label: "Exhibitor logos",
    source: { kind: "collection", managedAt: "Members → Exhibitors" },
    hint: "One logo per exhibitor. Edited on each exhibitor's own record.",
  },
  {
    id: "home-book-stand-photo",
    page: "Home page",
    route: "/",
    section: "Book Your Stand",
    label: "Main photo",
    source: { kind: "content-block", opportunityIntro: "LOSNWHEXH", domainPageName: "book_your_stand" },
  },
  {
    id: "home-book-stand-secondary",
    page: "Home page",
    route: "/",
    section: "Book Your Stand",
    label: "Second photo",
    source: {
      kind: "code",
      file: "src/components/home/BookYourStand.tsx",
      line: 672,
      literal: "/images/exhibitor_2.jpg",
    },
  },
  {
    id: "home-schedule-photo",
    page: "Home page",
    route: "/",
    section: "Schedule preview",
    label: "Schedule photo",
    source: {
      kind: "code",
      file: "src/components/home/HomeSchedulePreview.tsx",
      line: 274,
      literal: "/images/exhibitor_2.jpg",
    },
  },
  {
    id: "home-intro-video",
    page: "Home page",
    route: "/",
    section: "Event intro",
    label: "Intro video",
    source: {
      kind: "code",
      file: "src/components/home/EventIntroVideo.tsx",
      line: 6,
      literal: "/images/817601-05_INTRO_OK-1.mp4",
    },
    hint: "A video rather than an image.",
  },

  /* ------------------------------------------------------------ TICKETS */
  {
    id: "tickets-hero",
    page: "Buy Tickets",
    route: "/buy_tickets",
    section: "Hero",
    label: "Hero background",
    source: {
      kind: "code",
      file: "src/app/buy_tickets/page.tsx",
      line: 39,
      literal: "https://digitalageexpo.com/files/buy_ticket_banner1.jpg",
    },
  },
  {
    id: "tickets-urgency-background",
    page: "Buy Tickets",
    route: "/buy_tickets",
    section: "Urgency band",
    label: "Band background",
    source: {
      kind: "code",
      file: "src/components/home/TicketUrgency.tsx",
      line: 17,
      literal: "https://digitalageexpo.com/images/croped_hurry.jpg",
    },
  },

  /* ------------------------------------------------------------ SPONSORS */
  {
    id: "sponsors-logo-grid",
    page: "Sponsors",
    route: "/sponsors",
    section: "Sponsor grid",
    label: "Sponsor logos",
    source: { kind: "collection", managedAt: "Members → Sponsors" },
    hint: "One logo per approved sponsor. Edited on each sponsor's own record.",
  },

  /* ------------------------------------------------------------ EXHIBITING */
  {
    id: "why-exhibit-photo",
    page: "Why Exhibit",
    route: "/why-exhibit",
    section: "Why Exhibit",
    label: "Section photo",
    source: { kind: "content-block", opportunityIntro: "LOSNWHEXH", domainPageName: "Why Exhibit" },
  },
  {
    id: "why-join-reason-icons",
    page: "Why Join / Exhibit",
    route: "/why_join_exhibit",
    section: "Reasons to join",
    label: "Reason card icons",
    source: { kind: "collection", managedAt: "the legacy content blocks for this listing" },
    hint: "One small image per reason card. Cards without one fall back to a drawn icon.",
  },
  {
    id: "exhibitor-reg-package-background",
    page: "Exhibitor Registration",
    route: "/exhibitor-registration",
    section: "Package Includes",
    label: "Section background",
    source: { kind: "content-block", opportunityIntro: "LOSNYEPI", domainPageName: "Exhibitor" },
  },
  {
    id: "exhibitor-reg-gain-backgrounds",
    page: "Exhibitor Registration",
    route: "/exhibitor-registration",
    section: "What You Gain",
    label: "Card backgrounds",
    source: { kind: "collection", managedAt: "the legacy content blocks for this listing" },
  },

  /* ------------------------------------------------------------ OTHER PAGES */
  {
    id: "zones-artwork",
    page: "Event Zones",
    route: "/event_zones",
    section: "Zone cards",
    label: "Zone artwork",
    source: { kind: "collection", managedAt: "Members → Lobby templates" },
  },
  {
    id: "gallery-photos",
    page: "Gallery",
    route: "/view_gallery",
    section: "Photo grid",
    label: "Gallery photos",
    source: { kind: "collection", managedAt: "Members → Manage organiser photos" },
    hint: "The one place on the site that already stores a title and description per image.",
  },
  {
    id: "magazine-cover",
    page: "Magazine",
    route: "/magazine",
    section: "Cover",
    label: "Magazine cover",
    source: { kind: "collection", managedAt: "Members → Magazine setup" },
    hint: "Belongs to whichever issue is published, so it changes with the issue.",
  },
  {
    id: "faq-hero",
    page: "FAQs",
    route: "/frequently-asked-questions",
    section: "Hero",
    label: "Hero background",
    source: {
      kind: "code",
      file: "src/app/frequently-asked-questions/FaqPageContent.tsx",
      line: 59,
      literal: "https://digitalageexpo.com/files/listing_pages/817601-exibitor.png",
    },
  },
  {
    id: "glimpse-tour-tiles",
    page: "Glimpse of the Show",
    route: "/glimpse-of-the-show",
    section: "Take a tour",
    label: "Tour tiles",
    source: {
      kind: "code",
      file: "src/app/glimpse-of-the-show/page.tsx",
      line: 261,
      literal: "/images/event_lobby.png, /images/photobooth.png, /images/photob.jpg, /images/speaker_hall.png",
      multiple: true,
    },
    hint: "Four bundled images.",
  },
  {
    id: "event-features-tiles",
    page: "Event Features",
    route: "/event_features",
    section: "Feature tiles",
    label: "Feature tiles",
    source: {
      kind: "code",
      file: "src/app/event_features/page.tsx",
      line: 36,
      literal: "/images/event_lobby.png, /images/speaker_hall.png, /images/exhibition.png, /images/photobooth.png, /images/exhibitor.png",
      multiple: true,
    },
    hint: "Five bundled images.",
  },
];

/** Grouped for rendering, preserving the order above. */
export function slotsByPage(): { page: string; slots: ImageSlot[] }[] {
  const groups: { page: string; slots: ImageSlot[] }[] = [];
  for (const slot of IMAGE_SLOTS) {
    const existing = groups.find((group) => group.page === slot.page);
    if (existing) existing.slots.push(slot);
    else groups.push({ page: slot.page, slots: [slot] });
  }
  return groups;
}

export function findSlot(id: string): ImageSlot | undefined {
  return IMAGE_SLOTS.find((slot) => slot.id === id);
}

/**
 * Where this slot's alt text and title are stored.
 *
 * New find_settings rows under their own grouptitle, scoped to the site like every other setting.
 * Nothing existing reads this group, and nothing existing writes it, so adding a row here cannot
 * affect any current behaviour — which is the point. No public component renders these values yet.
 */
export const IMAGE_META_GROUP = "image_meta";

export function altVarname(slotId: string): string {
  return `cp_image_${slotId}_alt`;
}

export function titleVarname(slotId: string): string {
  return `cp_image_${slotId}_title`;
}
