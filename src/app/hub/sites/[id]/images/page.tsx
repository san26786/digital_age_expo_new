import { notFound } from "next/navigation";
import { canEditSite } from "@/lib/hub/access";
import { getSiteSettings } from "@/lib/services/hubSiteSettings";
import { listSiteImages } from "@/lib/services/siteImages";
import { SiteImageManager } from "@/components/hub/SiteImageManager";

export const dynamic = "force-dynamic";

/**
 * Manage Images & Banners, for one site.
 *
 * A route of its own rather than an eighth tab on the site editor: this lists every image on the
 * whole website, each card saves on its own, and none of it belongs to the single form-wide Save
 * that the edit screen's tabs share. Folding it in there would have meant one Save button meaning
 * two different things.
 *
 * Reads by the id in the URL, like the edit page beside it, because this page is served by the
 * parent site while managing some other site's images — host resolution must not decide what it
 * shows.
 */
export default async function SiteImagesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const siteId = Number(id);
  if (!Number.isInteger(siteId) || siteId <= 0) notFound();

  // Same gate as the editor and its API routes. Checked here too so the page cannot be read by
  // someone who would be refused by every button on it.
  if (!(await canEditSite(siteId))) notFound();

  const [site, slots] = await Promise.all([getSiteSettings(siteId), listSiteImages(siteId)]);
  if (!site || !slots) notFound();

  return (
    <SiteImageManager
      siteId={siteId}
      siteName={site.name || `Site #${siteId}`}
      initialSlots={slots}
    />
  );
}
