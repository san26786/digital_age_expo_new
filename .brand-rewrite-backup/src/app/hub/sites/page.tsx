import Link from "next/link";
import { CheckCircle2, CircleDashed, ExternalLink, Pencil, Plus } from "lucide-react";
import { listHubSites } from "@/lib/services/hubSites";
import { hubCreatedDomainIds } from "@/lib/services/hubCreateSite";
import { DeleteSiteButton } from "@/components/hub/DeleteSiteButton";

export const dynamic = "force-dynamic";

/**
 * ===========================================================================
 *  /hub/sites — WHAT EXISTS TODAY
 * ===========================================================================
 *
 *  This is the list half of §6 of the spec. The New Site button beside it is the entry point
 *  Angad asked for: "when click on that add button on member menu Hub-sites then i will open
 *  new page hub/sites/ when click on new sites then form will open".
 *
 *  EDIT IS OFFERED FOR EVERY SITE; DELETE IS NOT. The asymmetry is the point. Editing a site's
 *  logo or phone number is reversible by editing it again, so it is available even for Digital
 *  Age Expo — with a warning on the edit screen itself, since that one is live. Deleting removes
 *  rows with no undo, so it is offered only for sites the Hub created and can prove it created.
 */
export default async function HubSitesPage() {
  const [sites, hubCreated] = await Promise.all([listHubSites(), hubCreatedDomainIds()]);

  /*
   * Where "open this site" actually goes, and why it differs by environment.
   *
   * In development every hostname is "localhost", so a site's real address resolves to nothing.
   * The preview therefore lives in a hostname of its own — browsers route any *.localhost name to
   * the loopback address with no hosts-file entry (RFC 6761) — which keeps the site in the URL
   * where it belongs. localhost:3000 stays Digital Age Expo no matter what has been previewed,
   * the preview survives clicking around because the hostname does, and nothing is stored
   * anywhere to be left switched on.
   *
   * In production the override is refused outright and the honest link is the site's real
   * address, which works exactly when DNS has been pointed at it and not before.
   *
   * The main site is linked plainly rather than as site-150.localhost: it is reachable at the
   * ordinary address, and sending someone to a preview of the site they are already on would be
   * an odd thing to do.
   */
  const isDev = process.env.NODE_ENV !== "production";
  const devPort = process.env.PORT ?? "3000";
  const openHref = (site: { id: number; link: string; isCurrent: boolean }) => {
    if (!isDev) return site.link.startsWith("http") ? site.link : `https://${site.link}`;
    return site.isCurrent ? "/" : `http://site-${site.id}.localhost:${devPort}/`;
  };

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Sites</h2>
          <p className="mt-1 text-sm text-white/60">
            {sites.length === 0
              ? "No site rows found."
              : `${sites.length} site ${sites.length === 1 ? "row" : "rows"} on this platform.`}
          </p>
        </div>

        <Link
          href="/hub/sites/new"
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-purple to-brand-pink px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          New site
        </Link>
      </div>

      {sites.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
          <p className="text-sm text-white/70">
            Nothing came back from the domains table. That usually means the database is
            unreachable rather than that there are genuinely no sites — this deployment serves one.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-white/[0.04]">
              <tr className="text-[11px] uppercase tracking-wider text-white/50">
                <th className="px-5 py-4 font-bold">Site</th>
                <th className="px-5 py-4 font-bold">Host</th>
                <th className="px-5 py-4 font-bold">Event</th>
                <th className="px-5 py-4 font-bold">Status</th>
                <th className="px-5 py-4 font-bold" />
              </tr>
            </thead>
            <tbody>
              {sites.map((site) => (
                <tr
                  key={site.id}
                  className={`border-b border-white/5 last:border-0 ${
                    site.isCurrent ? "bg-brand-pink/10" : ""
                  }`}
                >
                  <td className="px-5 py-4">
                    {/*
                      * The name is the way in to the site itself — the first thing anyone tries
                      * to click on a row like this. It opens in a new tab so the Hub stays put:
                      * a preview is something you look at and come back from, and losing the
                      * list every time would make comparing two sites tedious.
                      */}
                    <a
                      href={openHref(site)}
                      target="_blank"
                      rel="noreferrer"
                      className="group inline-flex items-center gap-1.5 font-semibold text-white transition hover:text-brand-pink"
                    >
                      {site.name}
                      <ExternalLink className="h-3 w-3 opacity-0 transition group-hover:opacity-100" />
                    </a>
                    <div className="text-xs text-white/50">
                      #{site.id}
                      {site.brand ? ` · ${site.brand}` : ""}
                      {site.isCurrent ? " · served by this deployment" : ""}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-white/70">{site.link || "—"}</td>
                  <td className="px-5 py-4 text-white/70">
                    {site.eventId ? (
                      <>
                        <div>{site.eventTitle ?? "(event not found)"}</div>
                        <div className="text-xs text-white/40">event_id {site.eventId}</div>
                      </>
                    ) : (
                      <span className="text-white/40">none</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {site.live ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white/40">
                        <CircleDashed className="h-3.5 w-3.5" />
                        Inactive
                      </span>
                    )}
                    {hubCreated.has(site.id) && (
                      <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-brand-pink">
                        Created here
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4 align-top">
                    <div className="flex flex-col items-end gap-2">
                      <a
                        href={openHref(site)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white/70 transition hover:border-brand-pink/50 hover:text-white"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {isDev ? "Preview" : "Visit"}
                      </a>

                      <Link
                        href={`/hub/sites/${site.id}/edit`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white/70 transition hover:border-brand-pink/50 hover:text-white"
                      >
                        <Pencil className="h-3 w-3" />
                        Edit
                      </Link>

                      {/*
                        * Delete is offered ONLY for sites the Hub itself created. Digital Age Expo
                        * and anything predating this feature have no button at all — not a disabled
                        * one, which still invites a click and a "why not?". The API refuses them
                        * independently, so this is the second of two locks, not the only one.
                        */}
                      {hubCreated.has(site.id) && !site.isCurrent && (
                        <DeleteSiteButton siteId={site.id} siteName={site.name} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/*
        * The honest footnote. Host routing now resolves a request to a site, but nothing here is
        * reachable from the internet until this app is deployed somewhere public and DNS points
        * at it — so a site created here is still a correct set of rows first and a website second.
        */}
      <p className="mt-6 text-xs leading-relaxed text-white/40">
        Click a site&apos;s name to open it. In development a sub-site opens on its own local
        hostname — <code>site-&lt;id&gt;.localhost:{devPort}</code> — so the preview survives
        clicking around while the plain address stays Digital Age Expo. Reaching a site at its
        real address still needs this app deployed publicly and DNS pointed at it.
      </p>
    </div>
  );
}
