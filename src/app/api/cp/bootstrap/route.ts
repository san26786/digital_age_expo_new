import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DOMAIN_ID } from "@/lib/site-config";
import { generateSalt, hashPassword } from "@/lib/auth/password";
import { CP_PERMISSIONS, CP_SEED_ROLES } from "@/lib/cp/rbac";
import { ADMIN_LOGIN_PERMISSION } from "@/lib/cp/auth/authRepository";

/**
 * DEV-ONLY, ONE-TIME bootstrap for the CP's first admin login. Exists as a Next.js route
 * (instead of a standalone `tsx` script) specifically so it runs inside the actual Next.js
 * server process — the same one the /cp/login page already successfully talks to the real
 * database through. A bare `npx tsx script.ts` invocation doesn't load .env the way `next
 * dev` does, and this project's Prisma client (src/lib/prisma.ts) silently falls back to a
 * mock (no-op) client rather than crashing when it can't get a real DATABASE_URL — which is
 * almost certainly why the standalone bootstrap script appeared to succeed but created
 * nothing real. Hitting this URL from your browser guarantees the same env/DB connection the
 * running app already uses.
 *
 * Visit: http://localhost:3000/api/cp/bootstrap  (GET, from your browser, once)
 * Optional query params: ?login=admin&password=password123&email=admin@example.com
 *
 * DELETE THIS FILE (or at least this route) once you've confirmed CP login works — it has no
 * auth of its own and will happily (re-)promote whatever account you point it at to Super
 * Admin. Fine for local dev, not something to ship to production.
 */

const ALL_PERMISSIONS = Object.values(CP_PERMISSIONS);
const READ_ONLY_PERMISSIONS = [ADMIN_LOGIN_PERMISSION, ...ALL_PERMISSIONS.filter((p) => p.endsWith("_view"))];

const ROLE_PERMISSION_GRANTS: Record<(typeof CP_SEED_ROLES)[number], string[]> = {
  "Super Admin": ALL_PERMISSIONS,
  Admin: ALL_PERMISSIONS,
  "Event Manager": [ADMIN_LOGIN_PERMISSION, CP_PERMISSIONS.EVENTS_VIEW, CP_PERMISSIONS.EVENTS_EDIT, CP_PERMISSIONS.SETTINGS_VIEW],
  "Content Manager": [
    ADMIN_LOGIN_PERMISSION,
    CP_PERMISSIONS.MENU_MANAGER_VIEW,
    CP_PERMISSIONS.MENU_MANAGER_EDIT,
    CP_PERMISSIONS.MEMBER_MENU_VIEW,
    CP_PERMISSIONS.MEMBER_MENU_EDIT,
    CP_PERMISSIONS.EMAIL_TEMPLATES_VIEW,
    CP_PERMISSIONS.EMAIL_TEMPLATES_EDIT,
  ],
  Marketing: [
    ADMIN_LOGIN_PERMISSION,
    CP_PERMISSIONS.MENU_MANAGER_VIEW,
    CP_PERMISSIONS.SETTINGS_VIEW,
    CP_PERMISSIONS.EMAIL_TEMPLATES_VIEW,
    CP_PERMISSIONS.EMAIL_TEMPLATES_EDIT,
  ],
  Sales: [ADMIN_LOGIN_PERMISSION, CP_PERMISSIONS.EVENTS_VIEW],
  "Member Manager": [ADMIN_LOGIN_PERMISSION, CP_PERMISSIONS.USERS_VIEW, CP_PERMISSIONS.USERS_EDIT, CP_PERMISSIONS.USERS_GROUPS_VIEW],
  "Read Only": READ_ONLY_PERMISSIONS,
};

async function ensureGroup(name: string): Promise<number> {
  const existing = await prisma.find_users_groups.findFirst({ where: { name } });
  if (existing) return existing.id;
  const created = await prisma.find_users_groups.create({
    data: { name, description: `Admin Control Panel role: ${name}`, administrator: 1, advertiser: 0, user: 0 },
  });
  return created.id;
}

async function ensurePermission(slug: string): Promise<void> {
  const existing = await prisma.find_users_permissions.findUnique({ where: { id: slug } });
  if (existing) return;
  await prisma.find_users_permissions.create({ data: { id: slug } });
}

async function ensureGrant(groupId: number, permissionId: string): Promise<void> {
  const existing = await prisma.find_users_groups_permissions_lookup.findUnique({
    where: { group_id_permission_id: { group_id: groupId, permission_id: permissionId } },
  });
  if (existing) return;
  await prisma.find_users_groups_permissions_lookup.create({ data: { group_id: groupId, permission_id: permissionId } });
}

async function ensureMenuItem(input: { title: string; icon: string; link: string; orderby: number; permission?: string }): Promise<void> {
  const existing = await prisma.find_dashboard_menu.findFirst({ where: { link: input.link } });
  if (existing) return;
  await prisma.find_dashboard_menu.create({
    data: {
      title: input.title,
      icon: input.icon,
      page_name: input.link,
      color: "primary",
      link: input.link,
      visible: true,
      orderby: input.orderby,
      advertiser: false,
      seller: false,
      franchise: false,
      admin: true,
      check_permission: input.permission ? 1 : 0,
      permission: input.permission ?? null,
      menu_group: "cp",
    },
  });
}

export async function GET(request: Request) {
  /*
   * NON-PRODUCTION ONLY. This route has no auth of its own and, in its full mode, creates or
   * promotes an account to Super Admin from a query string — reachable by anyone who can load
   * the URL. The file's own comment says it must not ship to production; this makes that
   * enforceable rather than a note someone has to remember, so a forgotten file is inert
   * instead of a site takeover.
   */
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available." }, { status: 403 });
  }

  const log: string[] = [];
  const { searchParams } = new URL(request.url);
  /**
   * ?menuOnly=1 seeds only the permission slugs, roles and the CP sidebar rows — no account is
   * created, promoted, or given a password. This is what you want when login already works and
   * the sidebar is simply empty; it keeps a password out of the URL and out of the response.
   */
  const menuOnly = searchParams.get("menuOnly") === "1";
  const login = searchParams.get("login") || "admin";
  const password = searchParams.get("password") || "password123";
  const email = searchParams.get("email") || `${login}@digitalageexpo.local`;

  log.push(`DATABASE_URL is ${process.env.DATABASE_URL ? "set" : "MISSING"} in this process.`);

  let user: { id: number; login: string } | null = null;

  if (menuOnly) {
    log.push("menuOnly=1 — skipping all account work; seeding permissions, roles and the sidebar only.");
  } else {
  user = await prisma.find_users.findFirst({
    // Both values, matching findUserForLogin() and verifyCpCredentials() — the migration left
    // find_users.domain_id at 0 on imported rows, so a strict DOMAIN_ID match finds nothing and
    // this route would create a SECOND account rather than reusing the real one.
    where: { domain_id: { in: [DOMAIN_ID, 0] }, OR: [{ login }, { user_email: email }] },
    select: { id: true, login: true },
  });

  if (user) {
    log.push(`Found existing account "${user.login}" (id=${user.id}) — reusing it, password left unchanged.`);
  } else {
    const salt = generateSalt();
    const hash = hashPassword(password, salt, "sha256");
    const created = await prisma.find_users.create({
      data: {
        domain_id: DOMAIN_ID,
        login,
        user_email: email,
        pass: hash,
        password_salt: salt,
        password_hash: "sha256",
        user_first_name: "Admin",
        user_last_name: "User",
        user_phone: "0000000000",
        user_organization: "",
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
        custom_6: "",
        custom_13: "",
        custom_55: "",
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
      select: { id: true, login: true },
    });
    user = created;
    log.push(`Created find_users row "${login}" (id=${user.id}).`);
  }
  }

  for (const slug of ALL_PERMISSIONS) await ensurePermission(slug);
  log.push(`Ensured ${ALL_PERMISSIONS.length} permission slugs exist in find_users_permissions.`);

  const groupIdByName: Record<string, number> = {};
  for (const roleName of CP_SEED_ROLES) groupIdByName[roleName] = await ensureGroup(roleName);
  log.push(`Ensured ${CP_SEED_ROLES.length} roles exist in find_users_groups.`);

  for (const [roleName, slugs] of Object.entries(ROLE_PERMISSION_GRANTS)) {
    for (const slug of slugs) await ensureGrant(groupIdByName[roleName], slug);
  }
  log.push(`Ensured role -> permission grants in find_users_groups_permissions_lookup.`);

  await ensureMenuItem({ title: "Dashboard", icon: "dashboard", link: "/cp", orderby: 0 });
  await ensureMenuItem({
    title: "General Settings",
    icon: "settings",
    link: "/cp/settings/general",
    orderby: 10,
    permission: CP_PERMISSIONS.SETTINGS_VIEW,
  });
  await ensureMenuItem({
    title: "Company Details",
    icon: "settings",
    link: "/cp/settings/company",
    orderby: 11,
    permission: CP_PERMISSIONS.SETTINGS_VIEW,
  });
  await ensureMenuItem({
    title: "Social Media",
    icon: "settings",
    link: "/cp/settings/social",
    orderby: 12,
    permission: CP_PERMISSIONS.SETTINGS_VIEW,
  });
  await ensureMenuItem({
    title: "Branding",
    icon: "settings",
    link: "/cp/settings/branding",
    orderby: 13,
    permission: CP_PERMISSIONS.SETTINGS_VIEW,
  });
  await ensureMenuItem({
    title: "Theme",
    icon: "settings",
    link: "/cp/settings/theme",
    orderby: 14,
    permission: CP_PERMISSIONS.SETTINGS_VIEW,
  });
  await ensureMenuItem({
    title: "Users",
    icon: "users",
    link: "/cp/users",
    orderby: 20,
    permission: CP_PERMISSIONS.USERS_VIEW,
  });
  await ensureMenuItem({
    title: "Roles & Permissions",
    icon: "users",
    link: "/cp/users/groups",
    orderby: 21,
    permission: CP_PERMISSIONS.USERS_GROUPS_VIEW,
  });
  await ensureMenuItem({
    title: "Events",
    icon: "events",
    link: "/cp/events",
    orderby: 30,
    permission: CP_PERMISSIONS.EVENTS_VIEW,
  });
  await ensureMenuItem({
    title: "Menu Manager",
    icon: "menu",
    link: "/cp/menu-manager",
    orderby: 40,
    permission: CP_PERMISSIONS.MENU_MANAGER_VIEW,
  });
  await ensureMenuItem({
    title: "Member Menu Manager",
    icon: "menu",
    link: "/cp/member-menu",
    orderby: 41,
    permission: CP_PERMISSIONS.MEMBER_MENU_VIEW,
  });
  await ensureMenuItem({
    title: "Email Templates",
    icon: "mail",
    link: "/cp/email-templates",
    orderby: 50,
    permission: CP_PERMISSIONS.EMAIL_TEMPLATES_VIEW,
  });
  log.push(`Ensured CP sidebar entries exist in find_dashboard_menu.`);

  if (user) {
    const superAdminGroupId = groupIdByName["Super Admin"];
    const alreadyMember = await prisma.find_users_groups_lookup.findUnique({
      where: { user_id_group_id: { user_id: user.id, group_id: superAdminGroupId } },
    });
    if (!alreadyMember) {
      await prisma.find_users_groups_lookup.create({ data: { user_id: user.id, group_id: superAdminGroupId } });
      log.push(`Granted find_users.id=${user.id} the Super Admin role.`);
    } else {
      log.push(`find_users.id=${user.id} already has the Super Admin role.`);
    }
  }

  const menuCount = await prisma.find_dashboard_menu.count({
    where: { visible: true, link: { startsWith: "/cp" } },
  });
  log.push(`${menuCount} sidebar row(s) now match the CP shell's query (visible, link starts with /cp).`);

  return NextResponse.json({
    ok: true,
    steps: log,
    sidebarRows: menuCount,
    // Permissions are baked into the CP session cookie at login and not re-queried per request
    // (see lib/cp/rbac.ts), so a session that predates this run still carries the old, smaller
    // permission set and will keep hiding the items it did not have.
    next: "Sign out of /cp and sign back in, so the session picks up the permission slugs this just created.",
    signIn: user ? { url: "/cp/login", login, password } : null,
    reminder: "Delete src/app/api/cp/bootstrap/route.ts once the CP is set up.",
  });
}
