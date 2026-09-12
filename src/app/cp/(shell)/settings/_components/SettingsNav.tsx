"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/cp/settings/general", label: "General" },
  { href: "/cp/settings/contact", label: "Contact" },
  { href: "/cp/settings/company", label: "Company" },
  { href: "/cp/settings/branding", label: "Branding" },
  { href: "/cp/settings/theme", label: "Theme" },
  { href: "/cp/settings/typography", label: "Typography" },
  { href: "/cp/settings/social", label: "Social Media" },
  { href: "/cp/settings/seo", label: "SEO" },
  { href: "/cp/settings/website", label: "Website" },
  { href: "/cp/settings/footer", label: "Footer" },
] as const;

/**
 * Tab bar tying together every Settings sub-page — none of the original 5 pages (general/
 * company/branding/social/theme) had any shared navigation between them; each was only
 * reachable if you already knew its URL.
 *
 * Wraps onto additional rows rather than scrolling horizontally — an earlier version used
 * overflow-x-auto with the scrollbar hidden for a cleaner look, but with 10 tabs that meant
 * Website and Footer were scrolled off-screen with no visual cue that more tabs existed at
 * all (they just looked missing). Wrapping guarantees every tab is always visible and needs
 * no scroll affordance, on any viewport width.
 */
export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Settings sections" className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            /* See CpShellNav: never prefetch a session-gated route, or a redirect captured
               while signed out gets replayed from the router cache on a later click. */
            prefetch={false}
            aria-current={active ? "page" : undefined}
            className={
              "shrink-0 rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors " +
              (active
                ? "bg-brand-pink text-white shadow-lg shadow-brand-pink/20"
                : "text-zinc-500 hover:bg-white/5 hover:text-white")
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
