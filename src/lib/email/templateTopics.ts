/**
 * ===========================================================================
 *  WHICH TEMPLATES BELONG ON AN EXPO'S SCREEN
 * ===========================================================================
 *
 *  `find_email_templates` is a legacy platform table shared by every product that ever ran on
 *  this system, and it is not scoped to anything - no DOMAIN column, no event, no product. Listing
 *  it raw means an organiser scrolling past rows for flows this app does not have, looking for
 *  the six that matter to them. Angad's instruction: keep the ones we use - visitors, exhibitors,
 *  speakers, sponsors, registration, RSVP, the expo's own - "other unwanted do not include here".
 *
 *  ---------------------------------------------------------------------------
 *  MATCHED ON THE TABLE'S OWN CATEGORY, NOT ON A LIST OF IDS I WROTE DOWN
 *  ---------------------------------------------------------------------------
 *
 *  The obvious implementation is an allowlist of ids. It is also the one that quietly breaks:
 *  nobody can name the ids in a legacy table from memory, so the list would be a guess, and every
 *  template it failed to guess would silently vanish from the only screen that edits it.
 *
 *  The table already categorises itself. `process_name` is what the existing send-mail dropdowns
 *  filter on - eventVisitors.ts matches "isitor", eventExhibitorAdmin.ts matches "xhibitor",
 *  eventSponsorAdmin.ts matches "ponsor" - so the categories are real data that predates this
 *  screen, not a convention invented for it. Topics below match `process_name`, `type` AND `id`,
 *  because the ten templates ensureDefaultTemplates() seeds are created with no process_name at
 *  all and would otherwise be filtered out by the very filter meant to keep them.
 *
 *  NOTHING IS MADE UNREACHABLE. The default view is the expo's own templates; a "show everything"
 *  link stays in the corner with the count of what is hidden. A screen that is the only way to
 *  edit a row must never be the reason a row cannot be edited - hiding is a default, not a wall.
 */
export interface EmailTemplateTopic {
  key: string;
  label: string;
  /** Lower-case substrings matched against id, type and process_name. */
  keywords: string[];
  /**
   * What to WRITE into process_name when a template is created under this topic.
   *
   * Reading and writing have to agree, and until there was a create form only reading existed.
   * A new template whose id happened to match no keyword would have landed in "Other" and then
   * been hidden by the expo filter entirely - created, then vanished. Stamping the column the
   * filter reads is what stops that.
   *
   * These are also the exact strings the existing send-mail dropdowns match on: eventVisitors.ts
   * looks for "isitor", eventExhibitorAdmin.ts for "xhibitor", eventSponsorAdmin.ts for "ponsor".
   * So a template created as a Visitor one shows up in the visitor send-mail picker too, which is
   * the whole point of using the table's own convention rather than inventing a parallel one.
   */
  processName: string;
}

export const EMAIL_TEMPLATE_TOPICS: EmailTemplateTopic[] = [
  {
    key: "visitors",
    label: "Visitors & RSVP",
    keywords: ["visitor", "rsvp", "attendee", "delegate", "guest"],
    processName: "Visitor",
  },
  {
    key: "exhibitors",
    label: "Exhibitors",
    keywords: ["exhibitor", "tradestand", "stand", "booth"],
    processName: "Exhibitor",
  },
  {
    key: "speakers",
    label: "Speakers",
    keywords: ["speaker", "session", "agenda"],
    processName: "Speaker",
  },
  {
    key: "sponsors",
    label: "Sponsors",
    keywords: ["sponsor", "sponsorship"],
    processName: "Sponsor",
  },
  {
    key: "accounts",
    label: "Registration & accounts",
    keywords: ["registration", "register", "signup", "sign_up", "password", "login", "account", "welcome"],
    processName: "Registration",
  },
  {
    key: "event",
    label: "The expo itself",
    keywords: ["expo", "dae", "dea", "event", "ticket", "invitation", "reminder", "schedule", "meeting", "contact", "enquiry", "notification"],
    processName: "Event",
  },
];

/** Every field a topic is allowed to match on, lower-cased. */
function haystack(row: { id: string; type?: string | null; process_name?: string | null }): string {
  return [row.id, row.type ?? "", row.process_name ?? ""].join(" ").toLowerCase();
}

/** Which topic a row belongs to, or null when it is not one of this expo's templates. */
export function topicForTemplate(row: {
  id: string;
  type?: string | null;
  process_name?: string | null;
}): EmailTemplateTopic | null {
  const text = haystack(row);
  return EMAIL_TEMPLATE_TOPICS.find((topic) => topic.keywords.some((word) => text.includes(word))) ?? null;
}

export type EmailTemplateScope = "expo" | "all";

/**
 * ---------------------------------------------------------------------------
 *  A NAME A PERSON CAN READ
 * ---------------------------------------------------------------------------
 *
 *  The ids in this table are legacy slugs, and some of them are long enough to wrap twice:
 *  `01_preshow-reach_out_to_contacts_from_last_year's_show`. As a card heading that is unusable -
 *  you cannot scan a grid of them, which is the entire point of a grid.
 *
 *  `action_btn_name` is the human label the CP sets and is the right answer when it exists; the
 *  existing send-mail dropdowns already prefer it for exactly this reason (see
 *  getVisitorEmailTemplates and friends). When it does not, the slug is unpicked into words:
 *  separators to spaces, the leading sequence number dropped, first letter capitalised.
 *
 *  THE RAW ID IS STILL SHOWN, underneath, in monospace. It is the primary key, it is what appears
 *  in the mail logs, and a screen that only ever showed a prettified version would leave someone
 *  holding a log line with no way to find the template it names.
 */
export function templateTitle(row: {
  id: string;
  type?: string | null;
  action_btn_name?: string | null;
}): string {
  const label = (row.action_btn_name ?? "").trim();
  if (label) return label;

  const words = row.id
    // A leading sequence number is dropped only when a separator follows it: "01_preshow" is
    // numbered, "1st_reminder" is not, and the greedy version turned the second into "St reminder".
    .replace(/^\d+[_-]+/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!words) return row.id;
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * ---------------------------------------------------------------------------
 *  WHAT A NEW TEMPLATE'S ID IS ALLOWED TO BE
 * ---------------------------------------------------------------------------
 *
 *  The id is the primary key, it appears in URLs, and it is what the mail logs record, so it is
 *  constrained rather than accepted as typed: lower case, digits, underscore and dash only.
 *
 *  "new" is reserved because /hub/email-templates/new is the create form. Next resolves a static
 *  segment before a dynamic one, so a template with that id would exist in the table and be the
 *  one row the Edit link could never open.
 */
export const RESERVED_TEMPLATE_IDS = ["new"];

export function normaliseTemplateId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function templateIdError(value: string): string | null {
  const id = normaliseTemplateId(value);
  if (!id) return "Give the template an id — lower case letters, numbers, underscores or dashes.";
  if (id.length > 120) return "That id is too long; keep it under 120 characters.";
  if (RESERVED_TEMPLATE_IDS.includes(id)) return `"${id}" is reserved by this screen — choose another id.`;
  return null;
}
