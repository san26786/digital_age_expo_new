import { notFound } from "next/navigation";
import { SiteEditForm } from "@/components/hub/SiteEditForm";
import { getSiteSettings } from "@/lib/services/hubSiteSettings";
import { resolveSiteId } from "@/lib/tenant";
import { DOMAIN_ID } from "@/lib/site-config";

export const dynamic = "force-dynamic";

/**
 * ===========================================================================
 *  THIS SITE'S OWN SETTINGS
 * ===========================================================================
 *
 *  The same editor the Hub uses, pointed at whichever site is serving the request. An organiser
 *  on B2B Growth Expo opens this and changes B2B Growth Expo's name, colours, logo and contact
 *  address — without going to the parent site, and without a second login.
 *
 *  ---------------------------------------------------------------------------
 *  IT SITS OUTSIDE /hub/sites, AND THAT IS THE WHOLE TRICK
 *  ---------------------------------------------------------------------------
 *
 *  /hub/sites has a layout that refuses anything but the parent site, because managing every site
 *  on the platform is the parent's job. Editing YOUR OWN site is not that, so this route is a
 *  sibling rather than a child: it inherits /hub's person-level gate and nothing else.
 *
 *  ---------------------------------------------------------------------------
 *  THE SITE ID COMES FROM THE HOST, NEVER FROM THE URL
 *  ---------------------------------------------------------------------------
 *
 *  There is no [id] segment here and there is no hidden input carrying one. resolveSiteId() reads
 *  the header the proxy sets from the real Host, so the only site this page can edit is the one
 *  you are looking at. The API it saves through checks the same thing independently
 *  (canEditSite), because a page-level check protects the page and nothing else.
 */
export default async function SiteSettingsPage() {
  const siteId = await resolveSiteId();
  const site = await getSiteSettings(siteId);
  if (!site) notFound();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-pink">Organiser</p>
        <h1 className="mt-2 text-3xl font-bold text-white">Site settings</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/60">
          The name, colours, logos and contact details for{" "}
          <strong className="text-white/80">{site.name || `site #${siteId}`}</strong> — the site
          you are signed in on. Nothing here touches any other site on this platform.
        </p>
      </div>

      {/*
        * No importPanel: that copies a whole event's speakers and exhibitors across and belongs to
        * the Hub, not to a site changing its own colours. Leaving the prop off removes the tab
        * rather than showing a dead one.
        */}
      <SiteEditForm site={site} isCurrent={siteId === DOMAIN_ID} />
    </div>
  );
}
