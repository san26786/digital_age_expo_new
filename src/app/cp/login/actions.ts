"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyCpCredentials } from "@/lib/cp/auth/authRepository";
import { cpSessionPermissions, safeCpReturnPath } from "@/lib/cp/rbac";
import { createSessionToken, CP_SESSION_COOKIE_NAME, CP_SESSION_MAX_AGE_SECONDS } from "@/lib/cp/auth/session";

export interface CpLoginState {
  error: string | null;
}

export async function loginAction(_prev: CpLoginState, formData: FormData): Promise<CpLoginState> {
  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!identifier || !password) {
    return { error: "Enter your email/username and password." };
  }

  const user = await verifyCpCredentials(identifier, password);
  if (!user) {
    // Deliberately generic — same reasoning as the member login: don't let this form be used
    // to distinguish "wrong password" from "not an admin account" from "account disabled".
    return { error: "Invalid credentials, or this account doesn't have admin access." };
  }

  const token = await createSessionToken({
    sub: user.id,
    name: user.name,
    email: user.email,
    groupId: user.primaryGroup.id,
    groupName: user.primaryGroup.name,
    // An administrator group is allowed everything without consulting the permission catalog
    // (see hasPermission() in lib/cp/rbac.ts), and only the slugs this CP actually checks are
    // stored — the legacy catalog is long enough that the full list can push the cookie past
    // the ~4 KB the browser will keep, which silently drops the session on the next click.
    admin: user.groups.some((group) => group.administrator),
    perms: cpSessionPermissions(user.permissions),
  });

  const store = await cookies();
  store.set(CP_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    // Was "/cp" — that scoped the cookie to only be SENT on requests whose path starts with
    // "/cp", which silently excluded every /api/cp/** Route Handler (e.g.
    // /api/cp/settings/upload): the browser never attached the cookie there at all, so
    // getCpSession() saw no session and those routes reported a misleading "no permission"
    // error even for a Super Admin. The cookie is httpOnly + sameSite=lax already, so scoping
    // by path added no real security benefit — "/" fixes every CP API route in one place.
    path: "/",
    maxAge: CP_SESSION_MAX_AGE_SECONDS,
  });

  // Back to whatever page bounced them here (the guards in lib/cp/rbac.ts put it in ?next=),
  // so an expired session costs one sign-in instead of losing your place.
  redirect(safeCpReturnPath(String(formData.get("next") ?? "")));
}


export async function logoutAction(): Promise<void> {
  const store = await cookies();
  // Clears both the new path ("/") and the old pre-fix path ("/cp") a browser may still be
  // holding from before this change shipped — cookies are keyed by (name, path), so clearing
  // only one of the two would leave the other lingering until it naturally expires.
  store.set(CP_SESSION_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  store.set(CP_SESSION_COOKIE_NAME, "", { path: "/cp", maxAge: 0 });
  redirect("/cp/login");
}
