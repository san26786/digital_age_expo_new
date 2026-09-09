import { prisma } from "@/lib/prisma";
import { getSiteId } from "@/lib/services/domain";
import { verifyPassword } from "@/lib/auth/password";

/**
 * CP admin authentication — deliberately NOT a separate identity system. Ground-truthed
 * against the legacy admin CP's own source (cp/admin_users.php, cp/admin_users_groups.php,
 * cp/admin_permissions.php): the legacy panel authenticates admins against the exact same
 * `find_users` table (and `pass`/`password_salt`/`password_hash` columns) the member portal
 * uses, and authorizes via a "groups" system — a find_users_groups row IS a role, granted
 * permissions through find_users_groups_permissions_lookup, with `admin_login` acting as the
 * master permission slug that gates CP access at all (see admin_users.php:735, which excludes
 * any group lacking `admin_login` from the group picker when the current admin can't grant
 * admin-editing rights themselves).
 *
 * This file mirrors that exactly, reusing the already-correct password verification at
 * src/lib/auth/password.ts (the same code verifyMemberCredentials() in
 * src/lib/services/member.ts uses) rather than inventing a parallel hash scheme.
 */

export const ADMIN_LOGIN_PERMISSION = "admin_login";

/**
 * TEMPORARY dev-only bypass — added while the real find_users/groups/permissions chain for CP
 * login is still being debugged after the MySQL -> Postgres migration (see debug-cp-login.js).
 * Lets you into /cp with a static login instead of a real account, without touching the database
 * or any of the real auth logic below.
 *
 * Hard-gated to non-production: `process.env.NODE_ENV === "production"` short-circuits this to
 * `false` before either string is even compared, so it can never authenticate a real deployment
 * even if this block is accidentally left in. Remove this whole block once real CP accounts are
 * confirmed working (debug-cp-login.js reporting "ALL STEPS PASSED").
 */
const TEMP_ADMIN_IDENTIFIER = "tempadmin";
const TEMP_ADMIN_PASSWORD = "TempAdmin@2026";

async function verifyTempAdminBypass(
  identifier: string,
  plainPassword: string
): Promise<CpAuthenticatedUser | null> {
  if (process.env.NODE_ENV === "production") return null;
  if (identifier !== TEMP_ADMIN_IDENTIFIER || plainPassword !== TEMP_ADMIN_PASSWORD) return null;

  // Grant every permission slug that exists, so nothing inside /cp is blocked mid-testing —
  // pulled from the real table rather than hardcoded, so it stays complete as permissions are added.
  const allPermissions = await prisma.find_users_permissions.findMany({ select: { id: true } });

  return {
    id: 0,
    name: "Temporary Admin (dev bypass)",
    email: "tempadmin@local.dev",
    groups: [{ id: 0, name: "Temporary Admin", administrator: true }],
    primaryGroup: { id: 0, name: "Temporary Admin" },
    permissions: allPermissions.map((p) => p.id),
  };
}

export interface CpAuthenticatedUser {
  id: number;
  name: string;
  email: string;
  /** Every group (role) this user belongs to. */
  groups: { id: number; name: string; administrator: boolean }[];
  /** The group shown as "your role" — the first admin-flagged group, or the first group. */
  primaryGroup: { id: number; name: string };
  /** Union of every permission slug granted by ANY group this user belongs to. */
  permissions: string[];
}

/**
 * Verifies an email/login + password against find_users, exactly like the member portal's
 * verifyMemberCredentials(), then checks the user has the `admin_login` permission through
 * at least one of their groups. Returns null on any failure — every failure reason (wrong
 * password, inactive account, no admin_login permission) is deliberately indistinguishable
 * to the caller, same as the member login, so a login form can't be used to enumerate valid
 * CP accounts.
 */
export async function verifyCpCredentials(
  identifier: string,
  plainPassword: string
): Promise<CpAuthenticatedUser | null> {
  const tempAdmin = await verifyTempAdminBypass(identifier, plainPassword);
  if (tempAdmin) return tempAdmin;

  const user = await prisma.find_users.findFirst({
    where: {
      domain_id: await getSiteId(),
      OR: [{ login: identifier }, { user_email: identifier }],
    },
    select: {
      id: true,
      login: true,
      pass: true,
      password_salt: true,
      password_hash: true,
      user_email: true,
      user_first_name: true,
      user_last_name: true,
      user_status: true,
    },
  });

  if (!user || user.user_status !== "active") return null;
  if (!verifyPassword(plainPassword, user.password_salt, user.password_hash, user.pass)) {
    return null;
  }

  const authenticated = await loadCpAuthorization(user.id);
  if (!authenticated) return null;
  if (!authenticated.permissions.includes(ADMIN_LOGIN_PERMISSION)) return null;

  return {
    ...authenticated,
    name: `${user.user_first_name} ${user.user_last_name}`.trim() || user.login,
    email: user.user_email,
  };
}

/**
 * Loads a find_users.id's group memberships and the union of permissions those groups
 * grant. Split out from verifyCpCredentials() so middleware/session-refresh code can
 * re-check current permissions without re-verifying a password.
 */
export async function loadCpAuthorization(
  findUserId: number
): Promise<Omit<CpAuthenticatedUser, "name" | "email"> | null> {
  const groupLookups = await prisma.find_users_groups_lookup.findMany({
    where: { user_id: findUserId },
    select: { group_id: true },
  });
  if (groupLookups.length === 0) return null;

  const groupIds = groupLookups.map((g) => g.group_id);

  const groups = await prisma.find_users_groups.findMany({
    where: { id: { in: groupIds } },
    select: { id: true, name: true, administrator: true },
  });
  if (groups.length === 0) return null;

  const permissionLookups = await prisma.find_users_groups_permissions_lookup.findMany({
    where: { group_id: { in: groupIds } },
    select: { permission_id: true },
  });
  const permissions = Array.from(new Set(permissionLookups.map((p) => p.permission_id)));

  const primaryGroup =
    groups.find((g) => g.administrator === 1) ?? groups[0];

  return {
    id: findUserId,
    groups: groups.map((g) => ({ id: g.id, name: g.name, administrator: g.administrator === 1 })),
    primaryGroup: { id: primaryGroup.id, name: primaryGroup.name },
    permissions,
  };
}
