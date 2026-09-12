import type { ReactNode } from "react";
import { requireCpSession, hasPermission, CP_PERMISSIONS } from "@/lib/cp/rbac";
import { CpAccessDenied } from "@/components/cp/CpAccessDenied";
import { SettingsNav } from "./_components/SettingsNav";

/**
 * Shared shell for every /cp/settings/* page. This is the single view-permission gate for the
 * whole module (each sub-page no longer repeats its own check — a Next.js layout always runs
 * before its children, so this resolves before any child page starts rendering or querying).
 * Note this only covers *reads*: every Server Action that mutates a setting still calls
 * requireCpPermission(SETTINGS_EDIT) itself, independently — a Server Action is reachable
 * directly (not just via this page tree), so view-only admins can't be relied on to be blocked
 * by a layout they never route through.
 *
 * It deliberately does NOT redirect on a failed permission check any more. This layout used to
 * call requireCpPermission(SETTINGS_VIEW), which bounces the browser somewhere else: clicking
 * "General Settings" in the sidebar then landed you back on another page with no explanation,
 * which is indistinguishable from a broken nav link. The session check still redirects (there
 * is nothing to render for a signed-out visitor), but a *permission* refusal is now rendered
 * in place, on the URL the admin asked for.
 */
export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const session = await requireCpSession();
  const canView = hasPermission(session, CP_PERMISSIONS.SETTINGS_VIEW);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-wider text-white">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage your website information, branding, contact details, theme, SEO and global configuration.
        </p>
      </div>
      {canView ? (
        <>
          <SettingsNav />
          {children}
        </>
      ) : (
        <CpAccessDenied permission={CP_PERMISSIONS.SETTINGS_VIEW} module="Settings" />
      )}
    </div>
  );
}
