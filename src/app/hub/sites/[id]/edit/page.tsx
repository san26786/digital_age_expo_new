import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { safeQuery } from "@/lib/db-errors";
import { SiteEditForm } from "@/components/hub/SiteEditForm";
import { ImportContentPanel } from "@/components/hub/ImportContentPanel";
import { getSiteSettings } from "@/lib/services/hubSiteSettings";
import { listCopyableEvents } from "@/lib/services/hubSites";
import { DOMAIN_ID } from "@/lib/site-config";

export const dynamic = "force-dynamic";

/**
 * Edit one site's look and details.
 *
 * Reads by the id in the URL rather than from the request's host — this page is served by
 * Digital Age Expo while editing some other site, so host resolution is the one thing that must
 * not decide what it shows.
 */
export default async function EditSitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const siteId = Number(id);
  if (!Number.isInteger(siteId) || siteId <= 0) notFound();

  const site = await getSiteSettings(siteId);
  if (!site) notFound();

  /*
   * The site's own event, and the events it could import from.
   *
   * Read here rather than inside the panel because the panel is a client component and this is
   * the only place with database access — and fetched alongside the settings rather than after
   * them, since three sequential awaits on a ten-connection pool is how this app's pages have
   * gone from slow to failing before.
   */
  const [row, events] = await Promise.all([
    safeQuery(
      () => prisma.find_domains.findUnique({ where: { id: siteId }, select: { event_id: true } }),
      null
    ),
    listCopyableEvents(),
  ]);

  // The import panel is handed to the form as a slot so it can live inside the tab strip rather
  // than below it — the form owns which tab is showing, and this page owns the data it needs.
  return (
    <SiteEditForm
      site={site}
      isCurrent={siteId === DOMAIN_ID}
      importPanel={
        <ImportContentPanel
          siteId={siteId}
          siteName={site.name || `Site #${siteId}`}
          targetEventId={row?.event_id ?? null}
          events={events}
        />
      }
    />
  );
}
