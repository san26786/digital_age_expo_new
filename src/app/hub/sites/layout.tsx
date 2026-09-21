import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { getSitesHubAccess, hubDenialMessage } from "@/lib/hub/access";

export const dynamic = "force-dynamic";

/**
 * The second lock on site management.
 *
 * /hub/layout.tsx above this one has already established that the PERSON may be here — that is
 * what Email Templates needs and all it needs. This layout adds the other half for the site
 * screens only: they are the parent site's, so on any sub-site they refuse rather than render.
 *
 * A layout rather than a check repeated in three page files, because /hub/sites, /hub/sites/new
 * and /hub/sites/[id]/edit all need it and the fourth page somebody adds next will need it too
 * without anybody remembering. The API routes under /api/hub/sites check independently, since a
 * layout protects pages and nothing else.
 */
export default async function HubSitesLayout({ children }: { children: React.ReactNode }) {
  const access = await getSitesHubAccess();
  if (access.ok) return <>{children}</>;

  const { title, detail } = hubDenialMessage(access.reason);

  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
        <ShieldAlert className="h-7 w-7 text-white" />
      </div>
      <h1 className="text-xl font-bold text-white">{title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-white/70">{detail}</p>
      <Link
        href="/hub/email-templates"
        className="mt-7 inline-flex rounded-full bg-white px-5 py-2.5 text-xs font-black uppercase tracking-widest text-zinc-900 transition hover:bg-white/90"
      >
        Go to email templates
      </Link>
    </div>
  );
}
