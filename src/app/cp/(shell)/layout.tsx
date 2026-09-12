import type { ReactNode } from "react";
import { requireCpSession, hasPermission } from "@/lib/cp/rbac";
import { prisma } from "@/lib/prisma";
import { CpShellNav } from "./CpShellNav";
import { CpShellTopbar } from "./CpShellTopbar";

/**
 * Wraps every CP page EXCEPT /cp/login (that route lives outside this route group on
 * purpose — see middleware.ts's comment on why the login page can't sit behind its own
 * session check). requireCpSession() is a second, page-level check on top of middleware.ts's
 * cookie check — belt-and-braces, and it's what actually gives us the session object to
 * render "signed in as {name}" and to filter the sidebar by permission.
 */
export default async function CpShellLayout({ children }: { children: ReactNode }) {
  const session = await requireCpSession();

  // find_dashboard_menu is the legacy admin CP's own sidebar table — reused here instead of
  // a hardcoded nav array, so editing a CP menu item is a data change, not a code change.
  // IMPORTANT: this table almost certainly already has ~150+ rows from the live legacy
  // PHP admin panel (one per admin_*.php page) — this sandbox has no network access to the
  // real database to confirm the row count, so rather than assume it's empty, the query is
  // scoped to `link` starting with "/cp" — only rows this CP's own seed script inserts (see
  // _scripts/seed.ts) use that shape; every legacy row points at a bare "admin_*.php"
  // filename and is filtered out here rather than rendered as a broken link.
  const menuItems = await prisma.find_dashboard_menu.findMany({
    where: { visible: true, link: { startsWith: "/cp" } },
    orderBy: { orderby: "asc" },
  });

  const visibleItems = menuItems.filter((item) => {
    if (!item.check_permission) return true;
    if (!item.permission) return true;
    // find_dashboard_menu.permission is a free-form column (legacy data), not the
    // CpPermissionSlug literal union — hasPermission() takes a plain string for exactly this
    // reason. Using it (rather than reading session.perms directly) is what keeps the sidebar
    // and the page guards from disagreeing: an administrator passes both, so the nav can no
    // longer offer a link that the page it points at will refuse.
    return hasPermission(session, item.permission);
  });

  return (
    // h-screen + overflow-hidden pins this row to exactly the viewport height, so it's the
    // <main> below that scrolls — not the page. (min-h-screen previously let the whole
    // document grow past the viewport on any content-heavy page, which dragged the sidebar
    // and topbar up and off-screen along with it instead of leaving them in place.)
    <div className="flex h-screen overflow-hidden bg-zinc-950 text-white">
      <CpShellNav items={visibleItems} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <CpShellTopbar session={session} />
        {/* overflow-x-hidden here is what stops a too-wide table from pushing the whole page
            into a horizontal scrollbar — each table below scrolls itself instead (overflow-x-auto
            on its own wrapper), never the page. */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6">{children}</main>
      </div>
    </div>
  );
}
