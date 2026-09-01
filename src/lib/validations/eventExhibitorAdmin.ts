import { z } from "zod";

export const EXHIBITOR_STATUSES = [
  "pending",
  "active",
  "Interested",
  "Reserved",
  "Not Interested",
  "Unable to attend",
  "Call Back",
  "No Answer",
  "Invalid Number",
  "Voice Mail",
  "Meeting Scheduled",
  "excluded",
] as const;

export const EXHIBITOR_BULK_STATUS_ACTIONS = [
  "active",
  "pending",
  "Interested",
  "Reserved",
  "Not Interested",
  "Unable to attend",
  "Call Back",
  "No Answer",
  "Invalid Number",
  "Voice Mail",
  "Meeting Scheduled",
  "excluded",
] as const;

/**
 * The legacy "Add Trade Stand" form (members/view_exhibitor.php) posts every dropdown as a string,
 * including the ones that are really foreign keys — Exhibitor business (find_listings.id),
 * Available Stand Size (find_orders.id), Exhibition Zone / Exhibitor Stand Layout
 * (find_event_lobby_child_layout_manager.id), Virtual Booth Number (find_event_lobby_spots.id) and
 * Stand Color (find_event_template_color_options.id). An unselected <select> posts "", which is
 * "no value" and not the number 0 — so these accept a number, a numeric string or an empty string
 * and are normalised to `number | null` at the service boundary by `toNumberOrNull()`.
 */
const optionalId = z.union([z.number(), z.string()]).optional().nullable();

export const eventExhibitorAdminSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required"),
  last_name: z.string().trim().min(1, "Last name is required"),
  email: z.string().trim().email("Enter a valid email address"),
  phone: z.string().trim().optional().or(z.literal("")),
  work_phone: z.string().trim().optional().or(z.literal("")),
  business: z.string().trim().min(1, "Business name is required"),
  position: z.string().trim().optional().or(z.literal("")),
  website: z.string().trim().optional().or(z.literal("")),
  linkedin_user_profile: z.string().trim().optional().or(z.literal("")),
  facebook: z.string().trim().optional().or(z.literal("")),
  twitter: z.string().trim().optional().or(z.literal("")),
  instagram: z.string().trim().optional().or(z.literal("")),
  whatsapp_no: z.string().trim().optional().or(z.literal("")),
  zoom: z.string().trim().optional().or(z.literal("")),
  calendly: z.string().trim().optional().or(z.literal("")),
  youtube: z.string().trim().optional().or(z.literal("")),
  about_us: z.string().trim().optional().or(z.literal("")),
  stand_number: z.string().trim().optional().or(z.literal("")),
  stand_size: z.string().trim().optional().or(z.literal("")),
  stand_price: z.union([z.number(), z.string()]).optional().nullable(),
  discount: z.union([z.number(), z.string()]).optional().nullable(),
  charitable_amount: z.union([z.number(), z.string()]).optional().nullable(),
  exchange_amount: z.union([z.number(), z.string()]).optional().nullable(),
  exchange_services: z.boolean().optional().default(false),
  featured: z.boolean().optional().default(false),
  member_company_profile: z.boolean().optional().default(false),
  excluded_from_advertise: z.boolean().optional().default(false),
  enable_video_calling: z.boolean().optional().default(false),
  video_calling_software_provider: z.string().trim().optional().or(z.literal("")),
  video_call_url: z.string().trim().optional().or(z.literal("")),
  special_instructions: z.string().trim().optional().or(z.literal("")),
  referral_code: z.string().trim().optional().or(z.literal("")),
  referral_mstr_id: z.string().trim().optional().or(z.literal("")),
  referrer_from: z.string().trim().optional().or(z.literal("")),
  keynote_speech_topic: z.string().trim().optional().or(z.literal("")),
  is_webinars: z.boolean().optional().default(false),
  is_workshops: z.boolean().optional().default(false),
  is_business_presentation: z.boolean().optional().default(false),
  is_e_magazine: z.boolean().optional().default(false),
  is_newsletter: z.boolean().optional().default(false),
  visitor_notification_mail: z.boolean().optional().default(true),
  // --- Trade stand allocation (legacy: Exhibitor / Available Stand Size / Exhibition Zone /
  // Virtual Booth Number / Exhibitor Stand Layout / Stand Color) ---------------------------
  listing_id: optionalId,
  available_stand_size: optionalId,
  exhibition_zone_id: optionalId,
  spot_id: optionalId,
  ex_stand_layout_id: optionalId,
  stand_color_id: optionalId,
  include_column_listing: z.boolean().optional().default(false),
  include_logo_listing: z.boolean().optional().default(false),
  status: z.enum(EXHIBITOR_STATUSES).default("pending"),
});

export type EventExhibitorAdminInput = z.infer<typeof eventExhibitorAdminSchema>;

/**
 * Total Amount as the legacy form computes it (view_exhibitor.php:728):
 *   $exhibitor['order_subtotal'] = stand_price - discount - exchange_amount - charitable_amount
 *
 * It is a READ-ONLY display field on the form and is deliberately NOT part of the schema: it is
 * never posted and never stored — find_event_exhibitor has no order_subtotal column, the legacy
 * page recomputes it on every render. Exported here so the form and any server-side report derive
 * it the same way instead of each re-implementing the arithmetic.
 */
export function exhibitorOrderSubtotal(input: {
  stand_price?: number | string | null;
  discount?: number | string | null;
  exchange_amount?: number | string | null;
  charitable_amount?: number | string | null;
}): number {
  const n = (v: number | string | null | undefined) => {
    if (v === null || v === undefined || v === "") return 0;
    const parsed = Number(v);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  return n(input.stand_price) - n(input.discount) - n(input.exchange_amount) - n(input.charitable_amount);
}
