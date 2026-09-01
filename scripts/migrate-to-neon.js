#!/usr/bin/env node
/**
 * One-time data migration: local MySQL (connectlocal_website) -> Neon Postgres (neondb).
 *
 * WHY THIS EXISTS
 * The .env was updated to point DATABASE_URL at Neon Postgres, but the app (schema.prisma,
 * package.json, src/lib/prisma.ts) was built for MySQL/MariaDB. Those files have already been
 * converted to Postgres. This script copies the actual ROWS from your local MySQL database into
 * the new (now-empty) Neon database, table by table, using the exact same table/column names —
 * Prisma's schema has zero @relation/foreign-key constraints, so tables can be copied in any
 * order without referential-integrity errors.
 *
 * PREREQUISITES (run these first, in order):
 *   1. npm install                     # picks up @prisma/adapter-pg + pg, drops the old mariadb adapter
 *   2. npx prisma generate             # regenerate the Prisma client against the new postgresql schema
 *   3. npx prisma db push              # creates all tables in the (empty) Neon database
 *   4. npm install --no-save mysql2    # one-time dependency just for THIS script; not added to package.json
 *   5. Make sure your local MySQL server is running and reachable at the DATABASE_URL below
 *      (127.0.0.1:3307 / connectlocal_website) — same connection this app used before.
 *
 * RUN:
 *   node migrate-to-neon.js
 *
 * The script is safe to re-run: each table is TRUNCATEd in Postgres before it's re-copied, so a
 * failed run can just be restarted after you fix whatever caused the failure.
 *
 * After it finishes, spot-check a few tables (row counts, a handful of real records) before
 * relying on the app against the migrated data.
 */

require("dotenv").config(); // plain `node script.js` doesn't auto-load .env the way Next.js does
const mysql = require("mysql2/promise");
const { Pool } = require("pg");

// ---- connection settings -----------------------------------------------------------------
const MYSQL_URL = process.env.OLD_MYSQL_URL || "mysql://root:Geecon0404@127.0.0.1:3307/connectlocal_website";
const PG_URL = process.env.DATABASE_URL; // read from .env — must already be the Neon URL

if (!PG_URL) {
  console.error("DATABASE_URL is not set (expected the Neon Postgres URL). Aborting.");
  process.exit(1);
}

// ============================================================================
//  DAE-ONLY SUBSET MODE   (DAE_ONLY=1)
// ============================================================================
//
//  Added when the data had to be moved a second time, from this same MySQL copy
//  into Prisma Postgres. The difference from the original Neon run is storage:
//  `connectlocal_website` is a multi-tenant legacy platform, and the 103 tables
//  this script copies come to ~2.6 GB — but only a fraction of that belongs to
//  Digital Age Expo. The rest is other tenants' listings plus pure log/history
//  tables (find_events_rsvp alone is 1.2M rows, find_search_log 234k).
//
//  With DAE_ONLY=1 each table is restricted to rows reachable from domain 150,
//  which brings the copy inside a 500 MB budget. Without the flag the script
//  behaves exactly as it always did — a full copy — so the original migration
//  stays reproducible.
//
//  HOW SCOPE IS DERIVED
//
//    domain      find_domains.id = 150            (src/lib/site-config.ts DOMAIN_ID)
//    events      1474 and 852                     see EVENT_IDS below
//    listings    every listing_id referenced by the domain row, those events, and
//                their exhibitors / sponsors / speakers. NOT find_listings.domain_id
//                — that column is 0 for every row here, so filtering on it would
//                silently import nothing.
//    users       the 45 accounts in the administrator-ish groups (so CP login keeps
//                working) plus every user_id referenced by the scoped rows. Again
//                NOT find_users.domain_id, which is likewise unpopulated.
//
//  Any table that cannot be scoped and is too large to copy whole is SKIPPED and
//  named in the summary. Nothing is dropped quietly.
//
const DAE_ONLY = process.env.DAE_ONLY === "1";

/** find_domains.id for digitalageexpo.com — mirrors DOMAIN_ID in src/lib/site-config.ts. */
const DOMAIN_ID = 150;

/**
 * 1474 is the event the live site actually shows ("DIGITAL AGE EXPO 26TH - 28TH AUGUST 2026"),
 * and is what find_domains(150).event_id points at. 852 is kept because it is DEFAULT_EVENT_ID in
 * src/lib/site-config.ts — the value getDomain() falls back to when the CP's active-event setting
 * is missing, which is exactly the state this MySQL copy is in (see the cp_active_event_id note at
 * the end of main()). Importing both means the site renders either way.
 */
const EVENT_IDS = [1474, 852];

/** Groups whose members administer the site; everyone else is an ordinary "Registered User". */
const ADMIN_GROUP_IDS = [1, 2, 3, 6, 8];

/** Pure log/history tables with no public or CP read path — never worth their size. */
const SKIP_TABLES = new Set(["find_search_log"]);

/**
 * Tables that HAVE an event_id column but are NOT event-scoped data — platform-wide catalogues
 * every tenant reads. They must be copied whole; scoping them by event_id silently empties them.
 *
 * find_event_lobby_templates is the case that proved this. It is the shared library of lobby
 * layouts (Auditorium Template 1, Exhibition Hall Template 1 (22 Stands), the stand templates),
 * and members/event_lobby_templates.php lists it with a bare `select * from
 * find_event_lobby_templates` — no event filter at all. Its event_id merely records whichever
 * event happened to create a row, and is NULL on the seeded catalogue. Because the generic rule
 * below saw the column and applied `event_id IN (1474, 852)` — which is false for NULL as well
 * as for any other event — not one of the twelve templates came across, and the Templates page
 * came up empty against a database that looked like it had migrated fine.
 *
 * find_event_template_color_options has no scope column at all, so it already copies whole; it
 * is listed here for the reader, since it is meaningless without its parents.
 */
const GLOBAL_TABLES = new Set([
  "find_event_lobby_templates",
  "find_event_template_color_options",
  // independent_mst is the platform's master-data table (industries at typ_id=7, the TST session
  // durations and AGTYPE hall types the agenda form reads, and much else). It carries a
  // listing_id, so the generic rule scoped it to `listing_id IN (SELECT id FROM _dae_lids)` and
  // all but one industry was dropped — the members Event Industry page came up with a single row
  // against a source table holding fifty. Master data belongs to the platform, not to a listing.
  "independent_mst",
  // common_type is independent_mst's parent (typ_cd -> typ_id). It has no scope column so it
  // already copies whole, but the two must not drift apart.
  "common_type",
]);

/** Copy an unscopeable table whole only if it is at most this many MB in MySQL. */
const COPY_WHOLE_MAX_MB = 10;

const sqlList = (ids) => (ids.length ? ids.join(",") : "NULL");

/**
 * Collects the listing ids and user ids reachable from domain 150, using temp tables so the
 * id sets never have to be round-tripped through Node.
 */
async function buildScope(mysqlConn) {
  await mysqlConn.query("DROP TEMPORARY TABLE IF EXISTS _dae_lids, _dae_uids");
  await mysqlConn.query("CREATE TEMPORARY TABLE _dae_lids (id INT PRIMARY KEY)");
  await mysqlConn.query("CREATE TEMPORARY TABLE _dae_uids (id INT PRIMARY KEY)");

  const ev = sqlList(EVENT_IDS);
  const listingSources = [
    `SELECT linked_profile_listing_id FROM find_domains WHERE id = ${DOMAIN_ID} AND linked_profile_listing_id IS NOT NULL`,
    `SELECT faq_listing_id FROM find_domains WHERE id = ${DOMAIN_ID} AND faq_listing_id IS NOT NULL`,
    `SELECT listing_id FROM find_events WHERE id IN (${ev}) AND listing_id IS NOT NULL`,
    `SELECT listing_id FROM find_event_exhibitor WHERE event_id IN (${ev}) AND listing_id IS NOT NULL`,
    `SELECT listing_id FROM find_event_sponsorer WHERE event_id IN (${ev}) AND listing_id IS NOT NULL`,
    `SELECT listing_id FROM find_speakers WHERE event_id IN (${ev}) AND listing_id IS NOT NULL`,
  ];
  for (const q of listingSources) {
    await mysqlConn.query(`INSERT IGNORE INTO _dae_lids (id) ${q}`);
  }

  const userSources = [
    `SELECT user_id FROM find_users_groups_lookup WHERE group_id IN (${sqlList(ADMIN_GROUP_IDS)}) AND user_id IS NOT NULL`,
    `SELECT user_id FROM find_events WHERE id IN (${ev}) AND user_id IS NOT NULL`,
    `SELECT user_id FROM find_speakers WHERE event_id IN (${ev}) AND user_id IS NOT NULL`,
    `SELECT user_id FROM find_event_exhibitor WHERE event_id IN (${ev}) AND user_id IS NOT NULL`,
    `SELECT user_id FROM find_event_sponsorer WHERE event_id IN (${ev}) AND user_id IS NOT NULL`,
    `SELECT l.user_id FROM find_listings l JOIN _dae_lids d ON d.id = l.id WHERE l.user_id IS NOT NULL`,
  ];
  for (const q of userSources) {
    await mysqlConn.query(`INSERT IGNORE INTO _dae_uids (id) ${q}`);
  }

  const [[{ c: listings }]] = await mysqlConn.query("SELECT COUNT(*) c FROM _dae_lids");
  const [[{ c: users }]] = await mysqlConn.query("SELECT COUNT(*) c FROM _dae_uids");
  return { listings, users };
}

/** Per-table column + size facts, so filter choice is driven by the schema rather than guesswork. */
async function loadTableFacts(mysqlConn, dbName) {
  const [rows] = await mysqlConn.query(
    `SELECT t.table_name AS name,
            ROUND((t.data_length + t.index_length) / 1024 / 1024, 1) AS mb,
            GROUP_CONCAT(c.column_name) AS cols
       FROM information_schema.tables t
       JOIN information_schema.columns c
         ON c.table_schema = t.table_schema AND c.table_name = t.table_name
      WHERE t.table_schema = ?
      GROUP BY t.table_name, mb`,
    [dbName]
  );
  const facts = new Map();
  for (const r of rows) {
    facts.set(r.name, {
      mb: Number(r.mb) || 0,
      cols: new Set(String(r.cols || "").split(",")),
    });
  }
  return facts;
}

/**
 * Returns the WHERE clause (without the keyword) for a table, `null` to copy it whole, or
 * `{ skip, reason }` to leave it out entirely.
 */
function daeFilterFor(table, facts) {
  if (SKIP_TABLES.has(table)) return { skip: true, reason: "log table, no read path" };

  const f = facts.get(table);
  if (!f) return null; // table missing from MySQL — migrateTable reports it

  const ev = sqlList(EVENT_IDS);
  const EXPLICIT = {
    find_domains: `id = ${DOMAIN_ID}`,
    find_events: `id IN (${ev})`,
    find_settings: "`DOMAIN` = " + DOMAIN_ID,
    find_listings: "id IN (SELECT id FROM _dae_lids)",
    find_users: "id IN (SELECT id FROM _dae_uids)",
    find_users_groups_lookup: "user_id IN (SELECT id FROM _dae_uids)",
  };
  if (EXPLICIT[table]) return EXPLICIT[table];

  // Checked BEFORE the scope-column rules: having an event_id does not make a table event data.
  if (GLOBAL_TABLES.has(table)) return null;

  // Scope columns, most selective first: an event is a subset of a listing is a subset of a domain.
  if (f.cols.has("event_id")) return `event_id IN (${ev})`;
  if (f.cols.has("listing_id")) return "listing_id IN (SELECT id FROM _dae_lids)";
  if (f.cols.has("DOMAIN")) return "`DOMAIN` = " + DOMAIN_ID;

  // Unscopeable. Global lookup tables (phrases, pages, common_type, product catalogue...) are
  // small and genuinely needed by every tenant, so copy them whole; anything big is skipped.
  if (f.mb <= COPY_WHOLE_MAX_MB) return null;
  return { skip: true, reason: `no scope column and ${f.mb} MB — too large to copy whole` };
}

// ---- every table Prisma manages, in the exact DB table name Prisma uses (no @@map divergence) --
const TABLES = [
  "common_type",
  "event_schedules",
  "find_advertise_books",
  "find_article",
  "find_banner_stands",
  "find_blog",
  "find_book_section_setting",
  "find_checklist_item_config",
  "find_classifieds",
  "find_domains",
  "find_email_log",
  "find_event_about_show",
  "find_event_advertisor",
  "find_event_checklists",
  "find_event_excluded",
  "find_event_exhibitor",
  "find_event_faqs_permission",
  "find_event_lobby_agenda",
  "find_event_lobby_agenda_items",
  "find_event_lobby_asset_gallery",
  "find_event_lobby_briefcase",
  "find_event_lobby_child_layout_manager",
  "find_event_lobby_layout_manager",
  "find_event_lobby_layout_type_assets",
  "find_event_lobby_menu",
  "find_event_lobby_polling_options",
  "find_event_lobby_polling_questions",
  "find_event_lobby_polling_response",
  "find_event_lobby_spots",
  "find_event_lobby_templates",
  "find_event_lobby_visitor_enquires",
  "find_event_magazine_setup",
  "find_event_marketer",
  "find_event_member",
  "find_event_networking_rooms",
  "find_event_notifications",
  "find_event_partner",
  "find_event_phases",
  "find_event_promotions",
  "find_event_publication_contacts",
  "find_event_schedule_meeting",
  "find_event_sponsorer",
  "find_event_sponsorship_setup",
  "find_event_tab_menu",
  "find_event_template_color_options",
  "find_event_ticket",
  "find_event_ticket_purchased",
  "find_event_tradestand_setup",
  "find_event_welcome_pack",
  "find_events",
  "find_events_book",
  "find_events_categories",
  "find_events_categories_lookup",
  "find_events_dates",
  "find_events_rsvp",
  "find_favorites",
  "find_feeds_external",
  "find_fields",
  "find_fields_groups",
  "find_guest_speaker",
  "find_invoices",
  "find_language_phrases",
  "find_latest_promotion",
  "find_letter_log",
  "find_listing_business_opportunity",
  "find_listing_charity_partners",
  "find_listing_listing_faq",
  "find_listing_members",
  "find_listings",
  "find_magazine_publications",
  "find_magzine_advert_rate_card",
  "find_meeting",
  "find_menu_links",
  "find_news_letter_subscriber",
  "find_orders",
  "find_organiser_image",
  "find_pages",
  "find_products",
  "find_products_groups",
  "find_products_pricing",
  "find_ratings",
  "find_reviews",
  "find_search_log",
  "find_show_info",
  "find_speakers",
  "find_speakers_questions",
  "find_sponsorship_categories",
  "find_sponsorship_option_benefits",
  "find_todo_list",
  "find_transactions",
  "find_user_credits_transactions",
  "find_user_enquiry",
  "find_users",
  "independent_mst",
  "sponsorship_benefits",
  "find_users_groups",
  "find_users_groups_lookup",
  "find_users_permissions",
  "find_users_groups_permissions_lookup",
  "find_settings",
  "find_dashboard_menu",
  "find_event_menus",
  "cp_password_resets",
  "cp_audit_logs",
  "find_email_templates"
];

// ---- tables with a single-column autoincrement primary key, and which column it is.
//      After copying explicit id values, the Postgres sequence backing that column has to be
//      bumped past the max copied id, or the next app-driven insert will collide on a reused id.
const AUTOINCREMENT_COLUMN = {
  "common_type": "id",
  "event_schedules": "id",
  "find_advertise_books": "id",
  "find_article": "id",
  "find_banner_stands": "id",
  "find_blog": "id",
  "find_book_section_setting": "id",
  "find_checklist_item_config": "id",
  "find_classifieds": "id",
  "find_domains": "id",
  "find_email_log": "id",
  "find_event_about_show": "id",
  "find_event_advertisor": "id",
  "find_event_checklists": "id",
  "find_event_excluded": "EID",
  "find_event_exhibitor": "id",
  "find_event_faqs_permission": "id",
  "find_event_lobby_agenda": "id",
  "find_event_lobby_agenda_items": "id",
  "find_event_lobby_asset_gallery": "id",
  "find_event_lobby_briefcase": "id",
  "find_event_lobby_child_layout_manager": "id",
  "find_event_lobby_layout_manager": "id",
  "find_event_lobby_layout_type_assets": "id",
  "find_event_lobby_menu": "id",
  "find_event_lobby_polling_options": "id",
  "find_event_lobby_polling_questions": "id",
  "find_event_lobby_polling_response": "id",
  "find_event_lobby_spots": "id",
  "find_event_lobby_templates": "id",
  "find_event_lobby_visitor_enquires": "id",
  "find_event_magazine_setup": "id",
  "find_event_marketer": "id",
  "find_event_member": "id",
  "find_event_networking_rooms": "id",
  "find_event_notifications": "id",
  "find_event_partner": "id",
  "find_event_phases": "id",
  "find_event_promotions": "id",
  "find_event_publication_contacts": "id",
  "find_event_schedule_meeting": "id",
  "find_event_sponsorer": "id",
  "find_event_sponsorship_setup": "id",
  "find_event_tab_menu": "id",
  "find_event_template_color_options": "id",
  "find_event_ticket": "id",
  "find_event_ticket_purchased": "id",
  "find_event_tradestand_setup": "id",
  "find_event_welcome_pack": "id",
  "find_events": "id",
  "find_events_book": "id",
  "find_events_categories": "id",
  "find_events_dates": "event_id",
  "find_events_rsvp": "id",
  "find_favorites": "id",
  "find_feeds_external": "id",
  "find_fields": "id",
  "find_fields_groups": "id",
  "find_guest_speaker": "id",
  "find_invoices": "id",
  "find_language_phrases": "phraseid",
  "find_latest_promotion": "id",
  "find_letter_log": "id",
  "find_listing_business_opportunity": "id",
  "find_listing_charity_partners": "id",
  "find_listing_listing_faq": "id",
  "find_listing_members": "id",
  "find_listings": "id",
  "find_magazine_publications": "id",
  "find_magzine_advert_rate_card": "id",
  "find_meeting": "id",
  "find_menu_links": "id",
  "find_news_letter_subscriber": "id",
  "find_orders": "id",
  "find_organiser_image": "id",
  "find_pages": "id",
  "find_products": "id",
  "find_products_groups": "id",
  "find_products_pricing": "id",
  "find_ratings": "id",
  "find_reviews": "id",
  "find_search_log": "id",
  "find_show_info": "id",
  "find_speakers": "id",
  "find_speakers_questions": "id",
  "find_sponsorship_categories": "id",
  "find_sponsorship_option_benefits": "id",
  "find_todo_list": "id",
  "find_transactions": "id",
  "find_user_credits_transactions": "id",
  "find_user_enquiry": "id",
  "find_users": "id",
  "independent_mst": "id",
  "sponsorship_benefits": "id",
  "find_users_groups": "id",
  "find_dashboard_menu": "id",
  "find_event_menus": "id",
  "cp_password_resets": "id",
  "cp_audit_logs": "id"
};

// Zero-date sentinel MySQL allows ('0000-00-00' / '0000-00-00 00:00:00') that Postgres rejects
// outright (there is no valid Postgres timestamp for it). Anything matching this gets remapped to
// the same 1970-01-01 epoch fallback used in the converted schema.prisma's @default(dbgenerated(...)).
const ZERO_DATE_RE = /^0000-00-00([ T]00:00:00)?$/;

// ---- Postgres enum columns -----------------------------------------------------------------
// MySQL never enforced these as real enums (they were just VARCHAR/ENUM columns with loose or no
// constraints), so legacy rows routinely contain "" or other stale values that the new Postgres
// enum type rejects outright. Rather than discover each one the slow way (a rejected 500-row
// batch silently falls back to row-by-row inserts — that's what made this crawl), values outside
// the enum's valid set are coerced up front: to the column's schema @default if it has one, else
// to null if the column is nullable, else (last resort, no safe target exists) to the enum's first
// value. Every coercion is counted and reported in the summary — nothing is silently dropped.
const ENUMS = {
  "sponsorship_benefits_benefit_type": [
    "before_the_event",
    "at_the_event",
    "judging_day",
    "after_the_event",
    "standard_benefit"
  ],
  "find_listings_status": [
    "active",
    "pending",
    "suspended",
    "unpublish",
    "deleted",
    "missing",
    "missed"
  ],
  "find_event_lobby_layout_manager_status": [
    "enabled",
    "disabled"
  ],
  "find_todo_list_status": [
    "success",
    "unsuccess",
    "deactive"
  ],
  "find_user_credits_transactions_type": [
    "paid",
    "receive"
  ],
  "sponsorship_benefits_status": [
    "enabled",
    "disabled"
  ],
  "find_feeds_external_type": [
    "external_feed",
    "internal_feed",
    "community_feed",
    "leadership_board",
    "people_in_business",
    "new_recruits"
  ],
  "find_speakers_questions_status": [
    "active",
    "pending",
    "reject"
  ],
  "find_event_promotions_status": [
    "active",
    "pending",
    "inactive"
  ],
  "find_banner_stands_status": [
    "active",
    "pending",
    "reject"
  ],
  "find_event_sponsorer_status": [
    "active",
    "pending",
    "excluded",
    "approved",
    "unapproved"
  ],
  "find_invoices_status": [
    "unpaid",
    "canceled",
    "paid"
  ],
  "find_event_advertisor_status": [
    "active",
    "pending",
    "inactive",
    "suspended",
    "excluded"
  ],
  "find_event_marketer_status": [
    "active",
    "pending",
    "inactive",
    "suspended",
    "excluded"
  ],
  "independent_mst_status": [
    "enabled",
    "disabled"
  ],
  "find_event_partner_status": [
    "active",
    "pending",
    "excluded"
  ],
  "find_invoices_discount_code_type": [
    "onetime",
    "recurring"
  ],
  "find_invoices_discount_code_discount_type": [
    "fixed",
    "percentage"
  ],
  "find_meeting_action_name": [
    "callback",
    "no_answer",
    "voicemail"
  ],
  "find_event_exhibitor_status": [
    "active",
    "pending",
    "excluded",
    "Interested",
    "Reserved",
    "Not Interested",
    "Unable to attend",
    "Call Back",
    "No Answer",
    "Invalid Number",
    "Voice Mail",
    "Meeting Scheduled"
  ],
  "find_orders_discount_code_type": [
    "onetime",
    "recurring"
  ],
  "find_orders_discount_code_discount_type": [
    "fixed",
    "percentage"
  ],
  "find_speakers_status": [
    "pending",
    "active",
    "reject"
  ],
  "find_events_check_eligibility_at": [
    "event",
    "application"
  ],
  "find_users_user_status": [
    "active",
    "deactive",
    "missing",
    "pending",
    "suspended"
  ],
  "find_events_rsvp_email_status": [
    "verified",
    "not verified",
    "blocked",
    "EMPTY_ENUM_VALUE"
  ],
  "find_event_phases_status": [
    "active",
    "pending",
    "EMPTY_ENUM_VALUE"
  ],
  "find_events_award_defalt_application_page": [
    "dashboard",
    "application",
    "EMPTY_ENUM_VALUE"
  ],
  "find_settings_optioncode_type": [
    "text",
    "textarea",
    "select",
    "radio",
    "checkbox",
    "file",
    "eval",
    "text_tags",
    "number_toggle"
  ],
  "find_settings_optioncode_parse_type": [
    "static",
    "eval_options",
    "eval"
  ]
};

const ENUM_COLUMNS = {
  "find_banner_stands": {
    "status": {
      "enum": "find_banner_stands_status",
      "nullable": true,
      "default": "active"
    }
  },
  "find_event_advertisor": {
    "status": {
      "enum": "find_event_advertisor_status",
      "nullable": true,
      "default": "active"
    }
  },
  "find_event_exhibitor": {
    "status": {
      "enum": "find_event_exhibitor_status",
      "nullable": false,
      "default": "pending"
    }
  },
  "find_event_lobby_layout_manager": {
    "status": {
      "enum": "find_event_lobby_layout_manager_status",
      "nullable": true,
      "default": null
    }
  },
  "find_event_marketer": {
    "status": {
      "enum": "find_event_marketer_status",
      "nullable": true,
      "default": "active"
    }
  },
  "find_event_partner": {
    "status": {
      "enum": "find_event_partner_status",
      "nullable": false,
      "default": "active"
    }
  },
  "find_event_phases": {
    "status": {
      "enum": "find_event_phases_status",
      "nullable": false,
      "default": null
    }
  },
  "find_event_promotions": {
    "status": {
      "enum": "find_event_promotions_status",
      "nullable": true,
      "default": "active"
    }
  },
  "find_event_sponsorer": {
    "status": {
      "enum": "find_event_sponsorer_status",
      "nullable": true,
      "default": "active"
    }
  },
  "find_events": {
    "award_defalt_application_page": {
      "enum": "find_events_award_defalt_application_page",
      "nullable": true,
      "default": null
    },
    "check_eligibility_at": {
      "enum": "find_events_check_eligibility_at",
      "nullable": true,
      "default": "event"
    }
  },
  "find_events_rsvp": {
    "email_status": {
      "enum": "find_events_rsvp_email_status",
      "nullable": true,
      "default": null
    }
  },
  "find_feeds_external": {
    "type": {
      "enum": "find_feeds_external_type",
      "nullable": false,
      "default": "external_feed"
    }
  },
  "find_invoices": {
    "status": {
      "enum": "find_invoices_status",
      "nullable": true,
      "default": "unpaid"
    },
    "discount_code_type": {
      "enum": "find_invoices_discount_code_type",
      "nullable": true,
      "default": null
    },
    "discount_code_discount_type": {
      "enum": "find_invoices_discount_code_discount_type",
      "nullable": true,
      "default": null
    }
  },
  "find_listings": {
    "status": {
      "enum": "find_listings_status",
      "nullable": false,
      "default": "active"
    }
  },
  "find_meeting": {
    "action_name": {
      "enum": "find_meeting_action_name",
      "nullable": true,
      "default": null
    }
  },
  "find_orders": {
    "discount_code_type": {
      "enum": "find_orders_discount_code_type",
      "nullable": true,
      "default": null
    },
    "discount_code_discount_type": {
      "enum": "find_orders_discount_code_discount_type",
      "nullable": true,
      "default": null
    }
  },
  "find_speakers": {
    "status": {
      "enum": "find_speakers_status",
      "nullable": false,
      "default": "pending"
    }
  },
  "find_speakers_questions": {
    "status": {
      "enum": "find_speakers_questions_status",
      "nullable": false,
      "default": "active"
    }
  },
  "find_todo_list": {
    "status": {
      "enum": "find_todo_list_status",
      "nullable": false,
      "default": "unsuccess"
    }
  },
  "find_user_credits_transactions": {
    "type": {
      "enum": "find_user_credits_transactions_type",
      "nullable": false,
      "default": null
    }
  },
  "find_users": {
    "user_status": {
      "enum": "find_users_user_status",
      "nullable": false,
      "default": "active"
    }
  },
  "independent_mst": {
    "status": {
      "enum": "independent_mst_status",
      "nullable": false,
      "default": "enabled"
    }
  },
  "sponsorship_benefits": {
    "benefit_type": {
      "enum": "sponsorship_benefits_benefit_type",
      "nullable": true,
      "default": null
    },
    "status": {
      "enum": "sponsorship_benefits_status",
      "nullable": false,
      "default": "enabled"
    }
  },
  "find_settings": {
    "optioncode_type": {
      "enum": "find_settings_optioncode_type",
      "nullable": false,
      "default": null
    },
    "optioncode_parse_type": {
      "enum": "find_settings_optioncode_parse_type",
      "nullable": false,
      "default": null
    }
  }
};

function cleanValue(v) {
  if (v === undefined) return null;
  if (Buffer.isBuffer(v)) {
    // MySQL BIT(n) columns (only is_static in this schema) come back as a Buffer — treat as boolean.
    return v.length > 0 && (v[0] & 1) === 1;
  }
  if (typeof v === "string" && ZERO_DATE_RE.test(v.trim())) {
    return "1970-01-01 00:00:00";
  }
  return v;
}

/**
 * Coerces a single column's raw MySQL value to something the target Postgres enum will accept.
 * Returns { value, coerced } — coerced is true when the original value had to be replaced.
 */
function coerceEnumValue(table, column, value) {
  const info = ENUM_COLUMNS[table] && ENUM_COLUMNS[table][column];
  if (!info) return { value, coerced: false };

  const validValues = ENUMS[info.enum] || [];
  if (value !== null && value !== undefined && validValues.includes(value)) {
    return { value, coerced: false };
  }

  if (info.default && validValues.includes(info.default)) {
    return { value: info.default, coerced: true };
  }
  if (info.nullable) {
    return { value: null, coerced: true };
  }
  // No default, not nullable — no safe target exists. Fall back to the enum's first value so the
  // row isn't lost, but this table/column combo is worth a manual look afterward.
  return { value: validValues[0] ?? null, coerced: true };
}

async function migrateTable(mysqlConn, pgPool, table, where = null) {
  const sql = `SELECT * FROM \`${table}\`` + (where ? ` WHERE ${where}` : "");
  const [rows] = await mysqlConn.query(sql);
  if (rows.length === 0) {
    await pgPool.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
    console.log(`  ${table}: 0 rows (nothing to copy)`);
    return { table, rows: 0, errors: 0, coercions: 0 };
  }

  const columns = Object.keys(rows[0]);
  const quotedCols = columns.map((c) => `"${c}"`).join(", ");
  const enumCols = ENUM_COLUMNS[table] || {};

  await pgPool.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);

  // Batch by PARAMETER count, not row count.
  //
  // A parameterised INSERT can carry at most 65535 bind parameters, and a batch uses
  // rows x columns of them. The old flat 500 blew that ceiling on every wide table in this schema
  // — find_listings has 236 columns (118,000 params), find_events_rsvp 181 (90,500), find_users
  // 156 (78,000) — so their very first full batch was rejected and the code below fell back to
  // inserting row by row. Over a network connection that measured ~4 rows/second: find_events_rsvp
  // alone (26k rows in the DAE subset) would have taken over an hour and a half, and the whole
  // migration about four hours.
  //
  // Sizing from the column count keeps every batch legal, so wide tables go at batch speed too.
  // The 1000-row ceiling is just to bound memory for narrow tables (find_language_phrases has 6
  // columns, which would otherwise allow ~10k rows in one statement).
  const BATCH_SIZE = Math.max(1, Math.min(1000, Math.floor(65535 / Math.max(1, columns.length))));
  let inserted = 0;
  let errors = 0;
  let coercions = 0;
  const coercionSamples = new Set();

  function prepareRow(row) {
    return columns.map((c) => {
      let v = cleanValue(row[c]);
      if (enumCols[c]) {
        const { value, coerced } = coerceEnumValue(table, c, v);
        if (coerced) {
          coercions += 1;
          coercionSamples.add(`${c}: ${JSON.stringify(v)} -> ${JSON.stringify(value)}`);
        }
        v = value;
      }
      return v;
    });
  }

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const values = [];
    const placeholders = batch.map((row, rowIdx) => {
      const rowValues = prepareRow(row);
      const rowPlaceholders = rowValues.map((_, colIdx) => {
        values.push(rowValues[colIdx]);
        return `$${rowIdx * columns.length + colIdx + 1}`;
      });
      return `(${rowPlaceholders.join(", ")})`;
    });
    const sql = `INSERT INTO "${table}" (${quotedCols}) VALUES ${placeholders.join(", ")}`;
    try {
      await pgPool.query(sql, values);
      inserted += batch.length;
    } catch (batchErr) {
      // Fall back to row-by-row so one bad row doesn't sink the whole batch — log and continue.
      for (const row of batch) {
        const rowValues = prepareRow(row);
        const rowPlaceholders = rowValues.map((_, idx) => `$${idx + 1}`).join(", ");
        try {
          await pgPool.query(`INSERT INTO "${table}" (${quotedCols}) VALUES (${rowPlaceholders})`, rowValues);
          inserted += 1;
        } catch (rowErr) {
          errors += 1;
          console.error(`  ${table}: failed to insert row (pk-ish values: ${JSON.stringify(row[columns[0]])}): ${rowErr.message}`);
        }
      }
    }
  }

  const autoincCol = AUTOINCREMENT_COLUMN[table];
  if (autoincCol) {
    await pgPool.query(
      `SELECT setval(pg_get_serial_sequence('"${table}"', '${autoincCol}'), COALESCE((SELECT MAX("${autoincCol}") FROM "${table}"), 1))`
    );
  }

  const coercionNote = coercions
    ? `, ${coercions} enum value(s) coerced (${[...coercionSamples].slice(0, 3).join("; ")}${coercionSamples.size > 3 ? "; ..." : ""})`
    : "";
  console.log(`  ${table}: ${inserted}/${rows.length} rows copied${errors ? `, ${errors} FAILED` : ""}${coercionNote}`);
  return { table, rows: inserted, errors, coercions };
}

async function main() {
  console.log("Connecting to source MySQL:", MYSQL_URL.replace(/:[^:@]*@/, ":****@"));
  const mysqlConn = await mysql.createConnection({ uri: MYSQL_URL, dateStrings: true });

  console.log("Connecting to target Neon Postgres...");
  const pgPool = new Pool({ connectionString: PG_URL });

  const summary = [];
  const skipped = [];
  let facts = new Map();

  if (DAE_ONLY) {
    const dbName = new URL(MYSQL_URL).pathname.replace(/^\//, "");
    console.log(`\nDAE_ONLY mode — restricting every table to domain ${DOMAIN_ID} / events ${EVENT_IDS.join(", ")}`);
    facts = await loadTableFacts(mysqlConn, dbName);
    const scope = await buildScope(mysqlConn);
    console.log(`  scope: ${scope.listings} listing ids, ${scope.users} user ids`);
  }

  console.log(`\nMigrating ${TABLES.length} tables...\n`);
  for (const table of TABLES) {
    let where = null;
    if (DAE_ONLY) {
      const decision = daeFilterFor(table, facts);
      if (decision && decision.skip) {
        console.log(`  ${table}: SKIPPED — ${decision.reason}`);
        skipped.push(`${table} (${decision.reason})`);
        continue;
      }
      where = decision;
    }
    try {
      const result = await migrateTable(mysqlConn, pgPool, table, where);
      summary.push(result);
    } catch (err) {
      console.error(`  ${table}: TABLE FAILED — ${err.message}`);
      summary.push({ table, rows: 0, errors: -1, tableFailed: true });
    }
  }

  if (DAE_ONLY) {
    // getDomain() resolves the site's event from this setting, NOT from find_domains.event_id (see
    // src/lib/services/domain.ts). The legacy MySQL copy has no such row for this domain, so
    // without writing it the site would fall back to DEFAULT_EVENT_ID (852 — the 2021 event) and
    // show the wrong show. Production had it set through the CP; recreate that here.
    const [[existing]] = await mysqlConn.query(
      "SELECT value FROM find_settings WHERE varname = 'cp_active_event_id' AND `DOMAIN` = ?",
      [DOMAIN_ID]
    );
    const activeEventId = existing ? Number(existing.value) : EVENT_IDS[0];
    // optioncode_type / optioncode_parse_type are NOT NULL enum columns with no defaults, so they
    // have to be given explicitly — 'text' / 'static' is what every other scalar setting row in
    // this table uses (e.g. varname='backup_path').
    await pgPool.query(
      `INSERT INTO "find_settings"
         ("varname", "grouptitle", "value", "optioncode_type", "optioncode_parse_type", "DOMAIN")
       SELECT 'cp_active_event_id', 'events', $1, 'text', 'static', $2
       WHERE NOT EXISTS (
         SELECT 1 FROM "find_settings" WHERE "varname" = 'cp_active_event_id' AND "DOMAIN" = $2
       )`,
      [String(activeEventId), DOMAIN_ID]
    );
    console.log(`\n  active event setting: cp_active_event_id = ${activeEventId} (domain ${DOMAIN_ID})`);
  }

  await mysqlConn.end();
  await pgPool.end();

  console.log("\n=== Migration summary ===");
  const totalRows = summary.reduce((a, s) => a + s.rows, 0);
  const totalErrors = summary.reduce((a, s) => a + (s.errors > 0 ? s.errors : 0), 0);
  const failedTables = summary.filter((s) => s.tableFailed).map((s) => s.table);
  const tablesWithRowErrors = summary.filter((s) => s.errors > 0).map((s) => s.table);
  console.log(`Total rows copied: ${totalRows}`);
  console.log(`Total row-level errors: ${totalErrors}`);
  if (failedTables.length) console.log(`Tables that failed entirely: ${failedTables.join(", ")}`);
  if (tablesWithRowErrors.length) console.log(`Tables with some failed rows: ${tablesWithRowErrors.join(", ")}`);
  if (skipped.length) {
    // Stated explicitly rather than left implicit: a subset migration that does not say what it
    // left behind reads as a complete one.
    console.log(`\nDeliberately NOT copied (${skipped.length}):`);
    for (const s of skipped) console.log(`  - ${s}`);
  }
  if (!failedTables.length && !tablesWithRowErrors.length) console.log("No errors. ✅");
}

main().catch((err) => {
  console.error("Migration aborted:", err);
  process.exit(1);
});
