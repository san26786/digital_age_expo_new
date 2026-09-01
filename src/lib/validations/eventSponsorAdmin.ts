import { z } from "zod";

/**
 * find_event_sponsorer.status is a Postgres enum — these are its five members. `approved` /
 * `unapproved` are what the legacy page's Approve / Reject actions write (view_sponsor.php:125-129),
 * alongside `is_approved`, which is the flag the public site actually reads.
 */
export const SPONSOR_STATUSES = ["pending", "active", "approved", "unapproved", "excluded"] as const;

/** The status changes offered by the "Select an Action" dropdown and the quick filter chips. */
export const SPONSOR_BULK_STATUS_ACTIONS = [
  "approved",
  "active",
  "pending",
  "unapproved",
  "excluded",
] as const;

export const SPONSOR_STATUS_LABEL: Record<string, string> = {
  approved: "Approved",
  active: "Active",
  pending: "Pending",
  unapproved: "Unapproved",
  excluded: "Excluded",
};

/**
 * Every foreign key on the legacy sponsor form arrives from a <select> as a string, and an
 * unselected one posts "" — which means "no value", not the number 0. These accept a number, a
 * numeric string or an empty string, and the service normalises them to `number | null`.
 */
const optionalId = z.union([z.number(), z.string()]).optional().nullable();

/** Money fields are typed by hand and may arrive blank. */
const optionalMoney = z.union([z.number(), z.string()]).optional().nullable();

export const eventSponsorAdminSchema = z.object({
  // --- Contact (view_sponsor.php:282-289) -------------------------------------------------
  /** "Business" — a find_listings row belonging to the sponsoring user. */
  listing_id: optionalId,
  name: z.string().trim().min(1, "Name is required"),
  position: z.string().trim().optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().email("Enter a valid email address").optional().or(z.literal("")),
  business: z.string().trim().optional().or(z.literal("")),
  linkedin_user_profile: z.string().trim().optional().or(z.literal("")),
  website: z.string().trim().optional().or(z.literal("")),

  // --- Sponsorship (view_sponsor.php:306-327) ---------------------------------------------
  /** "Sponsorship Type" — find_sponsorship_categories.id, stored as text by the legacy schema. */
  sponsorship_type: z.string().trim().optional().or(z.literal("")),
  /** Read-only code derived from the chosen sponsorship type (e.g. STES). */
  sponsor_type: z.string().trim().optional().or(z.literal("")),
  /** "Sponsorship category" — an event category. */
  sponsorship_category_id: optionalId,
  /** "Available Sponsorship" — an unused find_orders row to consume. */
  order_id: optionalId,
  exchange_services: z.boolean().optional().default(false),
  exchange_amount: optionalMoney,
  discount: optionalMoney,
  charitable_amount: optionalMoney,

  // --- Visibility flags (view_sponsor.php:328-342) ----------------------------------------
  activate_sponsor: z.boolean().optional().default(false),
  enable_home_page: z.boolean().optional().default(false),
  enable_event_banner: z.boolean().optional().default(false),
  enable_display_advert: z.boolean().optional().default(false),
  excluded_from_advertise: z.boolean().optional().default(false),
  featured: z.boolean().optional().default(false),
  sold_out_sponsor: z.boolean().optional().default(false),
  show_home: z.boolean().optional().default(false),
  show_banner: z.boolean().optional().default(false),
  white_background_image: z.boolean().optional().default(false),

  status: z.enum(SPONSOR_STATUSES).default("pending"),
  is_approved: z.boolean().optional().default(false),
});

export type EventSponsorAdminInput = z.infer<typeof eventSponsorAdminSchema>;

/**
 * What the organiser owes on a sponsorship, the way the legacy Change Amount modal computes it:
 * the order subtotal less every deduction agreed with the sponsor.
 *
 * Display-only — find_event_sponsorer has no such column, so nothing stores it.
 */
export function sponsorNetAmount(input: {
  amount?: number | string | null;
  exchange_amount?: number | string | null;
  discount?: number | string | null;
  charitable_amount?: number | string | null;
}): number {
  const n = (v: number | string | null | undefined) => {
    if (v === null || v === undefined || v === "") return 0;
    const parsed = Number(v);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  return n(input.amount) - n(input.exchange_amount) - n(input.discount) - n(input.charitable_amount);
}
