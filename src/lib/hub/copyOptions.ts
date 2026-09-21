/**
 * ===========================================================================
 *  WHAT A NEW SITE MAY COPY — ONE LIST, SHARED BY EVERY LAYER
 * ===========================================================================
 *
 *  This is §4.3 of docs/multi-site-spec.md expressed as data. The form renders from it, the
 *  dry-run counts key off it, and the clone engine (Phase 3) will iterate it. Keeping one list
 *  is the point: a toggle that exists in the UI but not in the engine is a promise the app
 *  quietly breaks, and that is exactly the class of bug that is invisible until someone has
 *  built a site expecting their speakers to come across.
 *
 *  EVERY DEFAULT IS OFF, and that is the requirement, not a nicety. "do not copy directly all
 *  data speaker, sponsor, exhibitor, visitor make some button which i want to add in the at the
 *  time for copy" — a new location site starts as a correct, empty shell and you pull across
 *  only what genuinely carries over.
 *
 *  What is NOT here is as deliberate as what is. Orders, invoices, purchased tickets, RSVPs,
 *  briefcases, enquiries, meeting bookings, poll responses, email and letter logs, blog posts
 *  and feeds have no toggle at any level (§4.4). They hold money that was paid and messages
 *  real people sent, against a show that is not the new one. There is no switch for them
 *  because there is no correct setting for them.
 */

export type CopyToggleKey =
  | "lobby"
  | "standArtwork"
  | "exhibitors"
  | "speakers"
  | "sponsors"
  | "schedule"
  | "tickets"
  | "showContent"
  | "registration"
  | "polling"
  | "visitors";

export interface CopyToggle {
  key: CopyToggleKey;
  label: string;
  /** What ticking this actually brings across, in the organiser's language, not table names. */
  detail: string;
  /** Prisma model names counted for the dry run. First one drives the headline number. */
  models: string[];
  /** Ticking this implies these are ticked too — see §5.2. */
  requires?: CopyToggleKey[];
  /**
   * Whether the clone engine actually copies this yet.
   *
   * A toggle the form offers but the engine skips is the exact failure this file's header warns
   * about — a promise the app quietly breaks, invisible until someone has built a site expecting
   * their hall to come across. So the flag lives on the toggle, the form disables what is false,
   * and `notYetReason` says why on screen rather than in a commit message.
   */
  implemented: boolean;
  /** Shown in place of the count when `implemented` is false. */
  notYetReason?: string;
  /** Shown as a warning strip rather than plain help text. */
  caution?: string;
}

export const COPY_TOGGLES: CopyToggle[] = [
  {
    key: "lobby",
    label: "Virtual event & lobby",
    detail:
      "The exhibition hall itself — zones, stand layouts, the spots on them, and the lobby menu. " +
      "Without this the new site has no virtual venue to allocate anyone into.",
    models: [
      "find_event_lobby_child_layout_manager",
      "find_event_lobby_layout_manager",
      "find_event_lobby_spots",
      "find_event_lobby_templates",
      "find_event_lobby_menu",
    ],
    implemented: false,
    notYetReason:
      "Not yet — the hall is four tables of cross-referenced ids (layouts, zones, spots, assets) " +
      "that all have to be renumbered together, and copying it half-done gives a new site booths " +
      "that link into the old show's hall.",
  },
  {
    key: "standArtwork",
    label: "Stand artwork",
    detail: "The generated banner images behind each stand, duplicated as new files on disk.",
    models: ["find_event_lobby_layout_type_assets"],
    requires: ["lobby"],
    implemented: false,
    notYetReason:
      "Not yet — depends on the hall above, and duplicates up to 18,000 banner files on disk.",
  },
  {
    key: "exhibitors",
    label: "Exhibitors",
    detail:
      "Exhibitor records copied as new rows belonging to the new site — not shared with the " +
      "source event, so editing one never changes the other.",
    models: ["find_event_exhibitor"],
    implemented: true,
  },
  {
    key: "speakers",
    label: "Speakers",
    detail: "Speaker profiles, guest speakers, and their questionnaire answers.",
    models: ["find_speakers", "find_guest_speaker", "find_speakers_questions"],
    implemented: true,
  },
  {
    key: "sponsors",
    label: "Sponsors & advertisers",
    detail: "Sponsor and advertiser records, and the banner stands that display them.",
    models: ["find_event_sponsorer", "find_event_advertisor", "find_banner_stands"],
    implemented: true,
  },
  {
    key: "schedule",
    label: "Schedule & agenda",
    detail:
      "The programme — sessions, agenda headings and items. Dates come across as-is and will " +
      "need moving to the new show's dates.",
    models: ["event_schedules", "find_event_lobby_agenda", "find_event_lobby_agenda_items"],
    implemented: true,
  },
  {
    key: "tickets",
    label: "Tickets & pricing",
    detail:
      "Ticket types, sponsorship packages and trade-stand pricing. Prices carry across " +
      "unchanged — check them against the new market before the site goes live.",
    models: ["find_event_ticket", "find_event_sponsorship_setup", "find_event_tradestand_setup"],
    implemented: true,
  },
  {
    key: "showContent",
    label: "Show content",
    detail:
      "About-the-show copy, show info, promotions, the magazine setup, welcome pack and " +
      "networking rooms.",
    models: [
      "find_event_about_show",
      "find_show_info",
      "find_event_promotions",
      "find_event_magazine_setup",
      "find_event_welcome_pack",
      "find_event_networking_rooms",
    ],
    implemented: true,
  },
  {
    key: "registration",
    label: "Registration form",
    detail: "The registration fields visitors fill in, and the FAQ permissions that go with them.",
    models: ["find_event_registration_fields", "find_event_faqs_permission"],
    implemented: true,
  },
  {
    key: "polling",
    label: "Polling",
    detail:
      "Poll questions and their options. Responses are never copied — they belong to the people " +
      "who gave them at the source show.",
    models: ["find_event_lobby_polling_questions", "find_event_lobby_polling_options"],
    implemented: true,
  },
  {
    key: "visitors",
    label: "Visitors",
    detail: "The registered visitor list from the source event, and the accounts behind it.",
    models: ["find_event_member"],
    implemented: true,
    caution:
      "These are real people who registered for the source show. They consented to that event, " +
      "from that organiser, at that domain — not to a new brand appearing in their inbox. The " +
      "toggle exists because you asked for it, but the recommendation is that it stays off and " +
      "new sites build their own list. Switching it on is worth recording with whoever owns data " +
      "protection at Geecon.",
  },
];

export const COPY_TOGGLE_KEYS: CopyToggleKey[] = COPY_TOGGLES.map((toggle) => toggle.key);

/** Every toggle off — the starting state of the form, and the shape the API validates against. */
export function noCopySelections(): Record<CopyToggleKey, boolean> {
  return Object.fromEntries(COPY_TOGGLE_KEYS.map((key) => [key, false])) as Record<
    CopyToggleKey,
    boolean
  >;
}

/**
 * Close the selection over `requires`.
 *
 * Stand artwork without the stands it hangs on is not a smaller copy, it is a broken one — the
 * asset rows would point at layout ids that do not exist in the new site. Rather than letting the
 * form offer an invalid combination and failing at clone time, ticking a dependent toggle ticks
 * what it depends on, and the UI says so.
 */
export function withDependencies(
  selections: Record<CopyToggleKey, boolean>
): Record<CopyToggleKey, boolean> {
  const resolved = { ...selections };
  let changed = true;

  // Loop rather than a single pass: dependencies may themselves have dependencies.
  while (changed) {
    changed = false;
    for (const toggle of COPY_TOGGLES) {
      if (!resolved[toggle.key] || !toggle.requires) continue;
      for (const required of toggle.requires) {
        if (!resolved[required]) {
          resolved[required] = true;
          changed = true;
        }
      }
    }
  }

  return resolved;
}
