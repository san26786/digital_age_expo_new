/**
 * AUTO-GENERATED — do not edit by hand.
 * Regenerate with:  npx tsx scripts/generate-member-routes.ts
 *
 * Every page that actually exists under src/app/members (the "(event)" route group adds no URL
 * segment, so its folders are real /members/<segment> routes).
 *
 * Why this file has to exist: src/app/members/(event)/[slug]/page.tsx is a catch-all that
 * renders a generic placeholder module with MOCK data for any unknown segment. That means a
 * wrong or stale link in find_event_menus never 404s — it silently lands the member on a
 * convincing-looking fake page. Checking a link against this set is the only way to tell a real
 * destination from one the catch-all is about to fake.
 */
export const MEMBER_ROUTES: ReadonlySet<string> = new Set([
  "award_manage_partner",
  "event_about_us",
  "event_advertise_book",
  "event_checklist",
  "event_configurations",
  "event_details",
  "event_faq",
  "event_invoices",
  "event_letter_logs",
  "event_lobby_agenda_items",
  "event_lobby_layout_child",
  "event_lobby_layout_manager",
  "event_lobby_layout_type_assets",
  "event_lobby_polling",
  "event_lobby_spots",
  "event_lobby_spots_tabular",
  "event_lobby_templates",
  "event_lobby_visitor_enquires",
  "event_lobby_welcome_tour",
  "event_magazine_setup",
  "event_mail_logs",
  "event_marketing_tools",
  "event_member",
  "event_networking_room",
  "event_notifications",
  "event_schedule_meeting",
  "event_show_info",
  "event_sponsorship_setup",
  "event_ticket",
  "event_ticket_buyers",
  "event_todo_list",
  "event_tradestand_setup",
  "event_user_activity_report",
  "event_welcome_pack",
  "index",
  "leadership_board",
  "manage_awards_partner",
  "manage_banner_stands",
  "manage_event_advertiser",
  "manage_event_artwork",
  "manage_event_assets",
  "manage_event_content_request",
  "manage_event_download",
  "manage_event_marketer",
  "manage_event_menu",
  "manage_event_promotions",
  "manage_organiser_photos",
  "manage_organiser_videos",
  "manage_registration",
  "manage_speaker_questionaire",
  "manage_speaker_slots",
  "manage_speakers",
  "manage_stand_assets",
  "news_feed",
  "publication_contacts",
  "register",
  "reports",
  "user_blog",
  "user_event_sumary",
  "user_event_summary",
  "user_index",
  "view_exhibitor",
  "view_exhibitor_information",
  "view_industry_list",
  "view_sponsor",
  "view_visitor",
]);

/** True when `/members/<segment>` is a real implemented page rather than the [slug] catch-all. */
export function isRealMemberRoute(segment: string): boolean {
  return MEMBER_ROUTES.has(segment);
}
