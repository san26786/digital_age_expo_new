import { prisma } from "@/lib/prisma";
import { DOMAIN_ID } from "@/lib/site-config";
import { generateSalt, hashPassword } from "@/lib/auth/password";

const PAGE_SIZE = 25;

/**
 * Domain scope for every find_users READ in this module — `{ in: [DOMAIN_ID, 0] }`, never a
 * bare `DOMAIN_ID`.
 *
 * DOMAIN_ID is a find_domains.id (150). find_users.domain_id is a different column, and the
 * MySQL -> Postgres migration left it at 0 on all 1,677 imported rows, so a strict
 * `domain_id: 150` filter matches NOTHING — which is exactly why this list rendered
 * "0 account(s) found" / "No users match this search." on a database full of users.
 *
 * findUserForLogin() in src/lib/services/member.ts and verifyCpCredentials() in
 * src/lib/cp/auth/authRepository.ts already hit this and already allow both values; the same
 * reasoning is spelled out there. Kept identical here so the list, the edit page and the two
 * logins can never disagree about which rows exist.
 *
 * 0 means "unscoped legacy row" rather than dropping the filter altogether, so accounts this
 * CP creates (createUser below WRITES DOMAIN_ID, deliberately unchanged) stay scoped as intended.
 */
const USER_DOMAIN_SCOPE = { in: [DOMAIN_ID, 0] };

/**
 * "Search in <field> for <keyword>" dropdown options — mirrors admin_users.php's own
 * $users_search_fields list field-for-field, minus the dynamic custom_N profile fields (those
 * come from a legacy find_fields/find_fields_groups metadata system this rebuild hasn't ported
 * — out of scope here, and none of them are shown as table columns either).
 */
export const USER_SEARCH_FIELDS = [
  { value: "id", label: "User ID" },
  { value: "login", label: "Username" },
  { value: "user_first_name", label: "First Name" },
  { value: "user_last_name", label: "Last Name" },
  { value: "user_organization", label: "Organization" },
  { value: "user_email", label: "Email" },
  { value: "user_address1", label: "Address Line 1" },
  { value: "user_address2", label: "Address Line 2" },
  { value: "user_city", label: "City" },
  { value: "user_state", label: "State" },
  { value: "user_country", label: "Country" },
  { value: "user_zip", label: "Zip Code" },
  { value: "user_phone", label: "Phone" },
  { value: "user_fax", label: "Fax" },
  { value: "user_comment", label: "Comments" },
] as const;

export type UserSearchField = (typeof USER_SEARCH_FIELDS)[number]["value"];

const STRING_SEARCH_FIELDS = new Set<UserSearchField>(
  USER_SEARCH_FIELDS.map((f) => f.value).filter((v) => v !== "id") as UserSearchField[]
);

/** Mirrors admin_users.php's own where-clause: `id` is an exact match, every other field is a
 * `LIKE 'keyword%'` prefix match (Prisma's `startsWith`) — never a substring `contains`. */
function buildSearchWhere(field: string | undefined, keyword: string | undefined): Record<string, unknown> {
  if (!field || !keyword) return {};

  if (field === "id") {
    const id = Number(keyword);
    // A non-numeric "search for" value against User ID can never match a real row — return a
    // where clause that's guaranteed empty rather than silently ignoring the filter and
    // showing the unfiltered list, which would look like the search did nothing.
    return { id: Number.isInteger(id) ? id : -1 };
  }

  if (!STRING_SEARCH_FIELDS.has(field as UserSearchField)) return {};
  return { [field]: { startsWith: keyword } };
}

export interface UserListItem {
  id: number;
  login: string;
  user_email: string;
  user_first_name: string;
  user_last_name: string;
  user_status: string;
  user_organization: string;
  user_country: string;
  /** City + state, comma-joined — this rebuild's stand-in for admin_users.php's `Location`
   * column (a join through find_locations, a table pruned from schema.prisma as unused before
   * this CP module existed — see cp/README.md). Both fields already live on find_users
   * directly, so this needs no extra table. */
  location: string | null;
  /** Resolved "First Last" of the find_users row `under_franchise_user` points at, mirroring
   * admin_users.php's own per-row subquery — null when unset (0) or the referenced user no
   * longer exists. */
  franchiseName: string | null;
  /** "YYYY-MM-DD", or null when unknown/never set. Fetched as text (see listUsers) rather
   * than through Prisma's typed DateTime column — some legacy rows still hold MySQL's old
   * "zero date" sentinel (0000-00-00 00:00:00), which JS's Date can't represent and which
   * crashes Prisma's own DateTime parsing the moment it has to touch that column. */
  createdLabel: string | null;
  groups: { id: number; name: string }[];
}

/** '0000-00-00' (MySQL's zero-date sentinel) and empty/missing values both mean "unknown". */
function normalizeDateLabel(raw: string | null | undefined): string | null {
  if (!raw || raw === "0000-00-00") return null;
  return raw;
}

/** Paginated, searchable list of find_users on this domain, with each user's group memberships. */
export async function listUsers(params: {
  page?: number;
  field?: string;
  keyword?: string;
  groupId?: number;
}): Promise<{
  users: UserListItem[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const page = Math.max(1, params.page ?? 1);

  // admin_users.php scopes its own list to members of at least one group (an INNER JOIN on
  // find_users_groups_lookup) — that looked like it'd quietly hide any user with no role
  // assigned, which is exactly the kind of account an admin needs to be able to *see* to fix,
  // so this list intentionally doesn't require group membership. The "in group" filter below
  // still narrows to a specific group on request, same as legacy.
  let groupFilterIds: number[] | null = null;
  if (params.groupId) {
    const lookups = await prisma.find_users_groups_lookup.findMany({
      where: { group_id: params.groupId },
      select: { user_id: true },
    });
    groupFilterIds = lookups.map((l) => l.user_id);
  }

  const where = {
    domain_id: USER_DOMAIN_SCOPE,
    ...buildSearchWhere(params.field, params.keyword?.trim()),
    ...(groupFilterIds ? { id: { in: groupFilterIds } } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.find_users.findMany({
      where,
      select: {
        id: true,
        login: true,
        user_email: true,
        user_first_name: true,
        user_last_name: true,
        user_status: true,
        user_organization: true,
        user_country: true,
        user_city: true,
        user_state: true,
        under_franchise_user: true,
      },
      orderBy: { id: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.find_users.count({ where }),
  ]);

  const userIds = rows.map((r) => r.id);
  const lookups = await prisma.find_users_groups_lookup.findMany({ where: { user_id: { in: userIds } } });
  const groupIds = Array.from(new Set(lookups.map((l) => l.group_id)));
  const groups = await prisma.find_users_groups.findMany({ where: { id: { in: groupIds } }, select: { id: true, name: true } });
  const groupById = new Map(groups.map((g) => [g.id, g]));

  const franchiseIds = Array.from(new Set(rows.map((r) => r.under_franchise_user).filter((id): id is number => !!id)));
  const franchiseUsers = franchiseIds.length
    ? await prisma.find_users.findMany({
        where: { id: { in: franchiseIds } },
        select: { id: true, user_first_name: true, user_last_name: true },
      })
    : [];
  const franchiseNameById = new Map(
    franchiseUsers.map((f) => [f.id, `${f.user_first_name} ${f.user_last_name}`.trim() || null])
  );

  // Raw SQL, not a typed Prisma select: TO_CHAR (Postgres's equivalent of MySQL's DATE_FORMAT)
  // forces the DB to hand back plain text for `created` (even for a zero-date row, now stored
  // as 1970-01-01 post-migration) instead of a value Prisma has to parse into a JS Date — see
  // the createdLabel doc comment above for why that matters here. userIds is our own
  // just-fetched list of numeric ids, never user input, so building this IN (...) list
  // directly is safe.
  const createdRows = userIds.length
    ? await prisma.$queryRawUnsafe<{ id: number; created_label: string | null }[]>(
        `SELECT id, TO_CHAR(created, 'YYYY-MM-DD') AS created_label FROM find_users WHERE id IN (${userIds.join(",")})`
      )
    : [];
  const createdLabelById = new Map(createdRows.map((r) => [r.id, normalizeDateLabel(r.created_label)]));

  const users: UserListItem[] = rows.map((r) => {
    const location = [r.user_city, r.user_state].filter((v) => v && v.trim().length > 0).join(", ");
    return {
      id: r.id,
      login: r.login,
      user_email: r.user_email,
      user_first_name: r.user_first_name,
      user_last_name: r.user_last_name,
      user_status: r.user_status,
      user_organization: r.user_organization,
      user_country: r.user_country,
      location: location || null,
      franchiseName: r.under_franchise_user ? franchiseNameById.get(r.under_franchise_user) ?? null : null,
      createdLabel: createdLabelById.get(r.id) ?? null,
      groups: lookups
        .filter((l) => l.user_id === r.id)
        .map((l) => groupById.get(l.group_id))
        .filter((g): g is { id: number; name: string } => !!g),
    };
  });

  return { users, total, page, pageSize: PAGE_SIZE };
}

export async function getUserForEdit(id: number) {
  const user = await prisma.find_users.findFirst({
    where: { id, domain_id: USER_DOMAIN_SCOPE },
    select: {
      id: true,
      login: true,
      user_email: true,
      user_first_name: true,
      user_last_name: true,
      user_phone: true,
      user_organization: true,
      user_status: true,
    },
  });
  if (!user) return null;

  const lookups = await prisma.find_users_groups_lookup.findMany({ where: { user_id: id } });
  return { ...user, groupIds: lookups.map((l) => l.group_id) };
}

/**
 * find_users has several legacy DATETIME columns (logged_last, date_of_birth,
 * allocation_date, franchise_request_updated_on, ...) that predate this rebuild and, on some
 * rows, still hold MySQL's old "zero date" sentinel (0000-00-00 00:00:00) — valid to store in
 * non-strict SQL mode, but not a value JS's Date can represent. update() with no `select`
 * returns (and therefore has to parse) every column of the updated row, and Prisma's
 * DateTime handling throws a RangeError ("Invalid time value") the instant it hits one of
 * those. Both write functions below use a narrow `select: { id: true }` — the caller never
 * uses the returned row anyway — so Prisma never has to touch those columns.
 */
export async function updateUserProfile(
  id: number,
  input: { user_first_name: string; user_last_name: string; user_email: string; user_phone: string; user_organization: string }
): Promise<void> {
  await prisma.find_users.update({ where: { id }, data: input, select: { id: true } });
}

/**
 * find_users has no soft-delete flag and hard-deleting a row this central (dozens of other
 * legacy tables likely reference the id informally) risks orphaning data across the app.
 * "Delete" in this CP means suspending login instead — same reversible pattern the legacy
 * admin_users.php itself favors (it has a moderate_disable/out_disable toggle already on
 * this table, alongside user_status).
 */
export async function setUserStatus(id: number, status: "active" | "suspended"): Promise<void> {
  await prisma.find_users.update({ where: { id }, data: { user_status: status }, select: { id: true } });
}

export async function setUserGroups(id: number, groupIds: number[]): Promise<void> {
  await prisma.$transaction([
    prisma.find_users_groups_lookup.deleteMany({ where: { user_id: id } }),
    ...groupIds.map((groupId) =>
      prisma.find_users_groups_lookup.create({ data: { user_id: id, group_id: groupId } })
    ),
  ]);
}

export interface CreateUserInput {
  login: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  organization?: string;
  groupIds: number[];

  // "User Information" extras — mirrors admin_users.php's add-user form field-for-field
  // (minus Profile Picture and Send Registration Email, which need an upload/email pipeline
  // this rebuild doesn't have yet, and the OTP/OTP-stamp/phone-verification trio, which are
  // runtime verification state, not something an admin fills in at creation time).
  disableOverdueNotices?: boolean;
  taxExempt?: boolean;
  moderateDisable?: boolean;
  timezone?: string;
  signature?: string;
  vatId?: string; // custom_5
  invoicesByEmail?: boolean; // custom_6 — legacy defaults this checkbox to checked
  securityQuestion?: string; // custom_11
  securityAnswer?: string; // custom_12
  sellerAccount?: boolean; // custom_13
  sellerGrades?: string[]; // custom_55 — legacy renders as checkboxes into one VARCHAR(33) column
  sessionCost?: string; // custom_57

  // Address
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  country?: string;
  zip?: string;
  fax?: string;

  // Notifications
  favoritesNotify?: boolean;
  franchiseAllowExport?: boolean;
  franchiseAllowExportListings?: boolean;
  franchiseAllowExportRegiRequest?: boolean;
  enableEventbrite?: boolean;

  isSngMember?: boolean;
  comment?: string;
}

/**
 * Mirrors createMemberAccount() in src/lib/services/member.ts field-for-field (see
 * LEGACY_UNUSED_USER_FIELDS there) — a CP-created user is indistinguishable from one who
 * registered normally, just also assigned to one or more CP roles up front.
 */
export async function createUser(input: CreateUserInput): Promise<number> {
  const salt = generateSalt();
  const hash = hashPassword(input.password, salt, "sha256");

  const created = await prisma.find_users.create({
    data: {
      domain_id: DOMAIN_ID,
      login: input.login,
      user_email: input.email,
      pass: hash,
      password_salt: salt,
      password_hash: "sha256",
      user_first_name: input.firstName,
      user_last_name: input.lastName,
      user_phone: input.phone,
      user_organization: input.organization || "",
      user_status: "active",
      terms_accepted: 1,
      created: new Date(),
      date_of_birth: new Date("1970-01-01T00:00:00Z"),
      work_phone: "",
      bank_account_holder_name: "",
      bank_account_sort_code: "",
      bank_account_number: "",
      bank_account_ifsc: "",
      bank_name: "",
      bank_address: "",

      disable_overdue_notices: input.disableOverdueNotices ? 1 : 0,
      tax_exempt: input.taxExempt ? 1 : 0,
      moderate_disable: input.moderateDisable ? 1 : 0,
      timezone: input.timezone || "",
      signature: input.signature || "",
      custom_5: input.vatId || "",
      custom_6: input.invoicesByEmail ? "1" : "",
      custom_11: input.securityQuestion || "",
      custom_12: input.securityAnswer || "",
      custom_13: input.sellerAccount ? "1" : "",
      custom_55: (input.sellerGrades ?? []).join(", "),
      custom_57: input.sessionCost || "0",

      user_address1: input.address1 || "",
      user_address2: input.address2 || "",
      user_city: input.city || "",
      user_state: input.state || "",
      user_country: input.country || "",
      user_zip: input.zip || "",
      user_fax: input.fax || "",

      favorites_notify: input.favoritesNotify ? 1 : 0,
      franchise_allow_export: input.franchiseAllowExport ? 1 : 0,
      franchise_allow_export_listings: input.franchiseAllowExportListings ? 1 : 0,
      franchise_allow_export_regi_request: input.franchiseAllowExportRegiRequest ? 1 : 0,
      enable_eventbrite: input.enableEventbrite ?? false,

      is_sng_member: input.isSngMember ? 1 : 0,
      user_comment: input.comment || "",

      custom_1202: "",
      custom_1203: "",
      custom_1204: "",
      under_franchise_user: 0,
      allocation_date: new Date("1970-01-01T00:00:00Z"),
      under_support_user: 0,
      request_for_frenchise: 0,
      franchise_request_updated_on: new Date("1970-01-01T00:00:00Z"),
      email_verified: 0,
      email_verifed_code: 0,
      is_synced_to_crm: 0,
      is_invoice_sent: 0,
      is_email_sent: 0,
      razorpay_customer_id: "",
      credit_balance: 0,
    },
    select: { id: true },
  });

  if (input.groupIds.length > 0) {
    await prisma.find_users_groups_lookup.createMany({
      data: input.groupIds.map((groupId) => ({ user_id: created.id, group_id: groupId })),
    });
  }

  return created.id;
}

export async function findRegistrationConflict(login: string, email: string): Promise<"login_taken" | "email_taken" | null> {
  const existing = await prisma.find_users.findFirst({
    where: { domain_id: USER_DOMAIN_SCOPE, OR: [{ login }, { user_email: email }] },
    select: { login: true, user_email: true },
  });
  if (!existing) return null;
  return existing.login === login ? "login_taken" : "email_taken";
}
