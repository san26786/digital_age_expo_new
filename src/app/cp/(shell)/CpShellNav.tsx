import Link from "next/link";
import * as Icons from "lucide-react";
import type { find_dashboard_menu } from "@/generated/prisma";

/**
 * find_dashboard_menu.icon stores plain names (legacy admin CP used a different icon font,
 * but this column's values are simple words like "settings", "users", "menu" — mapped
 * loosely onto lucide-react equivalents; falls back to a generic square icon for anything
 * unmapped rather than failing to render).
 */
function resolveIcon(name: string) {
  const key = name.trim().toLowerCase();
  const map: Record<string, keyof typeof Icons> = {
    settings: "Settings",
    users: "Users",
    user: "Users",
    events: "Calendar",
    event: "Calendar",
    menu: "Menu",
    email: "Mail",
    mail: "Mail",
    media: "Image",
    pages: "FileText",
    cms: "FileText",
    dashboard: "LayoutDashboard",
    home: "LayoutDashboard",
  };
  const iconName = map[key];
  const Icon = (iconName && Icons[iconName]) || Icons.SquareDashed;
  return Icon as React.ComponentType<{ className?: string }>;
}

export function CpShellNav({ items }: { items: find_dashboard_menu[] }) {
  return (
    <aside className="flex h-full w-64 flex-shrink-0 flex-col border-r border-white/10 bg-zinc-900/60">
      <div className="flex h-16 items-center gap-2 border-b border-white/10 px-6">
        <span className="text-sm font-black uppercase tracking-wider text-white">Admin CP</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.length === 0 && (
          /* The old text here pointed at src/app/cp/_scripts/seed.ts, which does not exist —
             that script was replaced by the bootstrap route below, so the instruction sent you
             looking for a missing file. */
          <div className="px-3 py-2 text-xs leading-relaxed text-zinc-500">
            <p className="font-semibold text-zinc-400">Sidebar not seeded yet</p>
            <p className="mt-2">
              The menu is read from <code className="text-zinc-400">find_dashboard_menu</code>, and
              no row there points at <code className="text-zinc-400">/cp</code> yet.
            </p>
            <p className="mt-2">
              Open{" "}
              <a
                href="/api/cp/bootstrap?menuOnly=1"
                className="text-brand-pink underline decoration-brand-pink/40 hover:decoration-brand-pink"
              >
                /api/cp/bootstrap?menuOnly=1
              </a>{" "}
              once, then sign out and back in.
            </p>
          </div>
        )}
        {items.map((item) => {
          const Icon = resolveIcon(item.icon);
          return (
            <Link
              key={item.id}
              href={item.link.startsWith("/") ? item.link : `/cp/${item.link}`}
              target={item.target || undefined}
              /* Every /cp route is session-gated, and a prefetch is a real request that goes
                 through those guards. Prefetching one while the session is expired (or before
                 sign-in finishes) caches that route's redirect-to-login in the client router
                 cache, and the cached result is what a later click replays — the link then
                 "goes to the login page" even though the session is now perfectly valid. There
                 is nothing worth prefetching in an admin panel; each page is a live DB read. */
              prefetch={false}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.title}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
