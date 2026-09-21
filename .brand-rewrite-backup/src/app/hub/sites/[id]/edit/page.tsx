import { notFound } from "next/navigation";
import { SiteEditForm } from "@/components/hub/SiteEditForm";
import { getSiteSettings } from "@/lib/services/hubSiteSettings";
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

  return <SiteEditForm site={site} isCurrent={siteId === DOMAIN_ID} />;
}
