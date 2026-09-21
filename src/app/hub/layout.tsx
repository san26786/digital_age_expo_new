import Link from "next/link";
import { Globe2, ShieldAlert, TriangleAlert } from "lucide-react";
import { getHubAccess, getSitesHubAccess, hubDenialMessage } from "@/lib/hub/access";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Site Hub",
  robots: { index: false, follow: false },
};

/**
 * ===========================================================================
 *  THE HUB SHELL — AND THE ONE GATE EVERY HUB PAGE PASSES THROUGH
 * ===========================================================================
 *
 *  The guard lives in the LAYOUT rather than in each page, because a layout is the only place in
 *  the App Router that a new page cannot be added without. Put the check in the pages and the
 *  day someone adds `/hub/sites/[id]/danger` is the day an ungated route exists; put it here and
 *  that route is gated before it is written.
 *
 *  A denial renders in place instead of redirecting. Redirecting to /login is the right answer
 *  for a member who is simply signed out, but it is a confusing one for the far more likely case
 *  here — a real, signed-in admin who is not a superadmin, who would otherwise be bounced to a
 *  login page they are already past and left thinking the site is broken.
 */
export default async function HubLayout({ children }: { children: React.ReactNode }) {
  /*
   * The person-level gate only. Site management has its own, one level down in
   * src/app/hub/sites/layout.tsx, because it is the one part of the Hub that belongs to the
   * parent site alone — email templates are reachable from every site.
   */
  const [access, sitesAccess] = await Promise.all([getHubAccess(), getSitesHubAccess()]);

  if (!access.ok) {
    const { title, detail } = hubDenialMessage(access.reason);

    return (
      <div className="min-h-screen bg-zinc-950 px-5 py-20">
        <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
            <ShieldAlert className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">{title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-white/70">{detail}</p>
          <Link
            href="/"
            className="mt-7 inline-flex rounded-full bg-white px-5 py-2.5 text-xs font-black uppercase tracking-widest text-zinc-900 transition hover:bg-white/90"
          >
            Back to the site
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="border-b border-white/10 bg-white/[0.03]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-5 py-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-purple to-brand-pink">
            <Globe2 className="h-6 w-6 text-white" />
          </div>
          <div className="mr-auto">
            <h1 className="text-lg font-bold text-white">Site Hub</h1>
            <p className="text-xs text-white/60">
              {sitesAccess.ok
                ? "Create and manage the location sites that run on this platform"
                : "Email templates for this platform"}
            </p>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            {sitesAccess.ok && (
              <Link
                href="/hub/sites"
                className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white/80 transition hover:border-white/40 hover:text-white"
              >
                All sites
              </Link>
            )}
            <Link
              href="/hub/email-templates"
              className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white/80 transition hover:border-white/40 hover:text-white"
            >
              Email templates
            </Link>
            <Link
              href="/hub/site-settings"
              className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white/80 transition hover:border-white/40 hover:text-white"
            >
              Site settings
            </Link>
            <Link
              href="/hub/send-queue"
              className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white/80 transition hover:border-white/40 hover:text-white"
            >
              Send queue
            </Link>
          </nav>
        </div>
      </div>

      {/*
        * Say out loud when the gate did not actually check anything.
        *
        * In development getHubAccess() lets everyone through so the feature can be worked on
        * without a configured session. That is a reasonable default and a dangerous silent one:
        * without this strip it is genuinely easy to demo the Hub, see it open, and conclude the
        * permissions work. They have not been exercised at all.
        */}
      {access.reason === "dev" && (
        <div className="border-b border-amber-400/25 bg-amber-400/10">
          <div className="mx-auto flex max-w-6xl items-start gap-3 px-5 py-3">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <p className="text-xs leading-relaxed text-amber-100/90">
              <span className="font-bold">Development mode — no permission check ran.</span>{" "}
              Everyone reaching this URL locally is let through. In production the Hub is closed
              until <code className="rounded bg-black/30 px-1 py-0.5">HUB_SUPERADMIN_EMAILS</code>{" "}
              names at least one address.
            </p>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl px-5 py-10">{children}</div>
    </div>
  );
}
