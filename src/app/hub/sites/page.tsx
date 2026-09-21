import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  CircleDashed,
  ExternalLink,
  Globe,
  Mail,
  Pencil,
  Plus,
  Sparkles,
} from "lucide-react";
import { listHubSites, listHubSiteVisuals, type HubSiteRow, type HubSiteVisuals } from "@/lib/services/hubSites";
import { hubCreatedDomainIds } from "@/lib/services/hubCreateSite";
import { DeleteSiteButton } from "@/components/hub/DeleteSiteButton";
import { DEFAULT_BRAND_ASSETS } from "@/lib/constants/brandAssets";

export const dynamic = "force-dynamic";

/**
 * ===========================================================================
 *  /hub/sites — THE SITES, AS CARDS
 * ===========================================================================
 *
 *  This is the list half of §6 of the spec. The New Site button beside it is the entry point
 *  Angad asked for: "when click on that add button on member menu Hub-sites then i will open
 *  new page hub/sites/ when click on new sites then form will open".
 *
 *  ---------------------------------------------------------------------------
 *  WHY CARDS RATHER THAN THE TABLE THAT WAS HERE
 *  ---------------------------------------------------------------------------
 *
 *  A table is the right shape for rows you scan down one column of — sort by date, find the
 *  outlier. This screen is not that. What you come here to do is recognise a site and go to it,
 *  and the thing that makes a site recognisable is what it LOOKS like: its logo, its two brand
 *  colours, its name. None of that survives a table cell. A card can carry all three at a glance
 *  and still have room for the host, the event and the actions.
 *
 *  ---------------------------------------------------------------------------
 *  EVERY FIELD ON THESE CARDS IS A FIELD THIS SYSTEM ACTUALLY HAS
 *  ---------------------------------------------------------------------------
 *
 *  The reference design that prompted this carries participant counts, launch phases, a progress
 *  bar, a ceremony countdown, an organiser console link and a "Create Login" button. Not one of
 *  those has anything behind it here, and a card that shows "Phase 2 of 4" computed from nothing
 *  is worse than a card that does not mention phases: it reads as information, and it is
 *  decoration. So the layout is borrowed and the content is this app's own — name, brand, host,
 *  event, contact, status, provenance, and the three actions that exist.
 *
 *  EDIT IS OFFERED FOR EVERY SITE; DELETE IS NOT. The asymmetry is the point. Editing a site's
 *  logo or phone number is reversible by editing it again, so it is available even for the site
 *  this deployment serves — with a warning on the edit screen itself, since that one is live.
 *  Deleting removes rows with no undo, so it is offered only for sites the Hub created and can
 *  prove it created.
 */
export default async function HubSitesPage() {
  /*
   * Three reads, in parallel, and the third is a single query for the whole grid rather than one
   * per card. Fanning out per card is what took this app's ten-connection pool down before.
   */
  const [sites, hubCreated, visuals] = await Promise.all([
    listHubSites(),
    hubCreatedDomainIds(),
    listHubSiteVisuals(),
  ]);

  /*
   * Where "open this site" actually goes, and why it differs by environment.
   *
   * In development every hostname is "localhost", so a site's real address resolves to nothing.
   * The preview therefore lives in a hostname of its own — browsers route any *.localhost name to
   * the loopback address with no hosts-file entry (RFC 6761) — which keeps the site in the URL
   * where it belongs. localhost:3000 stays the main site no matter what has been previewed, the
   * preview survives clicking around because the hostname does, and nothing is stored anywhere to
   * be left switched on.
   *
   * In production the override is refused outright and the honest link is the site's real
   * address, which works exactly when DNS has been pointed at it and not before.
   */
  const isDev = process.env.NODE_ENV !== "production";
  const devPort = process.env.PORT ?? "3000";
  const openHref = (site: HubSiteRow) => {
    if (!isDev) return site.link.startsWith("http") ? site.link : `https://${site.link}`;
    return site.isCurrent ? "/" : `http://site-${site.id}.localhost:${devPort}/`;
  };

  /*
   * TWO GROUPS, AND THE SPLIT IS THE ONE THAT DECIDES WHAT YOU MAY DO.
   *
   * Not cosmetic grouping. "Created in the Hub" is precisely the set this screen can delete, so
   * putting it first and labelling it means the absent Delete button on the sites below has a
   * visible reason rather than looking like a bug.
   */
  const created = sites.filter((site) => hubCreated.has(site.id));
  const existing = sites.filter((site) => !hubCreated.has(site.id));

  const groups: { key: string; title: string; blurb: string; sites: HubSiteRow[] }[] = [
    {
      key: "created",
      title: "Created in the Hub",
      blurb:
        "Cloned from an existing event by this screen. These can be edited and deleted from here.",
      sites: created,
    },
    {
      key: "existing",
      title: "Existing platform sites",
      blurb:
        "Rows that predate the Hub, including the site this deployment serves. Editable here, never deletable here.",
      sites: existing,
    },
  ].filter((group) => group.sites.length > 0);

  return (
    <div>
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-pink">
            Hub admin
          </p>
          <h2 className="mt-2 text-3xl font-bold text-white">Manage sites</h2>
          <p className="mt-2 max-w-xl text-sm text-white/60">
            {sites.length === 0
              ? "No site rows found."
              : `${sites.length} site ${sites.length === 1 ? "row" : "rows"} on this platform. Open one to see it as a visitor would, or edit its branding, colours and details.`}
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
        <div className="space-y-12">
          {groups.map((group) => (
            <section key={group.key}>
              <div className="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-white/10 pb-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-white">
                  {group.title}
                </h3>
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-bold text-white/70">
                  {group.sites.length}
                </span>
                <p className="w-full text-xs text-white/45 sm:w-auto sm:flex-1">{group.blurb}</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.sites.map((site) => (
                  <SiteCard
                    key={site.id}
                    site={site}
                    visuals={visuals.get(site.id)}
                    href={openHref(site)}
                    isDev={isDev}
                    deletable={hubCreated.has(site.id) && !site.isCurrent}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/*
        * The honest footnote. Host routing now resolves a request to a site, but nothing here is
        * reachable from the internet until this app is deployed somewhere public and DNS points
        * at it — so a site created here is still a correct set of rows first and a website second.
        */}
      <p className="mt-10 text-xs leading-relaxed text-white/40">
        Click a site&apos;s name to open it. In development a sub-site opens on its own local
        hostname — <code>site-&lt;id&gt;.localhost:{devPort}</code> — so the preview survives
        clicking around while the plain address stays the site this deployment serves. Reaching a
        site at its real address still needs this app deployed publicly and DNS pointed at it.
      </p>
    </div>
  );
}

/**
 * ---------------------------------------------------------------------------
 *  ONE CARD
 * ---------------------------------------------------------------------------
 *
 *  The whole card is NOT a link, deliberately. It carries four separate destinations — the site,
 *  the edit screen, the address field, and Delete — and nesting those inside one big anchor is
 *  invalid HTML that behaves differently in every browser and traps keyboard users. The name is
 *  the primary target, the buttons are the rest, and the card itself just responds to hover so it
 *  still feels like one object.
 */
function SiteCard({
  site,
  visuals,
  href,
  isDev,
  deletable,
}: {
  site: HubSiteRow;
  visuals: HubSiteVisuals | undefined;
  href: string;
  isDev: boolean;
  deletable: boolean;
}) {
  /*
   * A saved logo is shown; an unsaved one is NOT quietly replaced by the bundled default.
   *
   * Technically the default is what that site renders, so showing it would be true — and it would
   * also put the same mark on every unconfigured card, which is precisely the recognition this
   * grid exists to provide, destroyed. The monogram is unique per site and the caption says which
   * situation you are looking at.
   */
  const logo = visuals?.logo ?? (site.isCurrent ? DEFAULT_BRAND_ASSETS.primaryLogo : null);

  const initials =
    site.name
      .replace(/[^a-z0-9 ]/gi, " ")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? "")
      .join("") || "?";

  return (
    <article
      className={`group flex flex-col rounded-3xl border bg-white/5 p-5 transition hover:-translate-y-0.5 hover:border-brand-pink/40 hover:bg-white/[0.07] ${
        site.isCurrent ? "border-brand-pink/40 ring-1 ring-brand-pink/20" : "border-white/10"
      }`}
    >
      {/* Swatches and status — the two things you read before anything else. */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <Swatch colour={visuals?.primaryColour} label="Primary" />
          <Swatch colour={visuals?.secondaryColour} label="Secondary" />
          {!visuals?.primaryColour && !visuals?.secondaryColour && (
            <span className="ml-1 text-[10px] uppercase tracking-wider text-white/30">
              Stock palette
            </span>
          )}
        </div>

        <div className="flex flex-col items-end gap-1">
          {site.live ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-300">
              <CheckCircle2 className="h-3 w-3" />
              Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white/40">
              <CircleDashed className="h-3 w-3" />
              Inactive
            </span>
          )}

          {deletable && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-brand-pink">
              <Sparkles className="h-3 w-3" />
              Created here
            </span>
          )}
        </div>
      </div>

      {/* Logo, or a monogram in the site's own colour. */}
      <div className="mt-5 flex h-16 w-full items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/30 px-4">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- an arbitrary uploaded path,
          // not a file in /public, so next/image's loader has nothing to work with.
          <img src={logo} alt="" className="max-h-10 max-w-full object-contain" />
        ) : (
          <span
            className="text-xl font-black tracking-tight text-white/80"
            style={
              visuals?.primaryColour ? { color: visuals.primaryColour } : undefined
            }
            title="No logo saved — this site renders the bundled default"
          >
            {initials}
          </span>
        )}
      </div>

      <p className="mt-4 text-[10px] font-black uppercase tracking-[0.18em] text-white/40">
        {site.brand?.trim() || "Platform site"} · #{site.id}
      </p>

      <h4 className="mt-1 text-lg font-bold leading-snug text-white">
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-start gap-1.5 transition hover:text-brand-pink"
        >
          {site.name}
          <ExternalLink className="mt-1.5 h-3 w-3 shrink-0 opacity-0 transition group-hover:opacity-60" />
        </a>
      </h4>

      {site.isCurrent && (
        <p className="mt-1 text-[11px] font-bold text-brand-pink/80">
          Served by this deployment
        </p>
      )}

      <div className="mt-4 mb-5 space-y-2 text-xs text-white/60">
        <div className="flex items-start gap-2">
          <Globe className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/30" />
          <span className="min-w-0 break-all">
            {site.link || <span className="text-white/30">no address set</span>}{" "}
            <Link
              href={`/hub/sites/${site.id}/edit`}
              className="whitespace-nowrap text-white/0 underline transition group-hover:text-white/40 hover:!text-brand-pink"
            >
              (edit)
            </Link>
          </span>
        </div>

        <div className="flex items-start gap-2">
          <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/30" />
          <span className="min-w-0">
            {site.eventId ? (
              <>
                {site.eventTitle ?? "(event not found)"}
                <span className="text-white/30"> · event_id {site.eventId}</span>
              </>
            ) : (
              <span className="text-white/30">no event linked</span>
            )}
          </span>
        </div>

        <div className="flex items-start gap-2">
          <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/30" />
          <span className="min-w-0 break-all">
            {site.email || <span className="text-white/30">no contact email</span>}
          </span>
        </div>
      </div>

      {/* Actions sit at the foot of every card, at the same height, whatever is above them. */}
      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
        <a
          href={href}
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
          Edit settings
        </Link>

        {/*
          * Delete is offered ONLY for sites the Hub itself created. Anything predating this
          * feature has no button at all — not a disabled one, which still invites a click and a
          * "why not?". The API refuses them independently, so this is the second of two locks.
          */}
        {deletable && <DeleteSiteButton siteId={site.id} siteName={site.name} />}
      </div>
    </article>
  );
}

/**
 * One brand colour, or the absence of one.
 *
 * An unset swatch is drawn as a dashed empty square rather than filled with the stock default,
 * because "this site has chosen a colour" and "this site is using the shipped one" are different
 * facts and the grid is only useful if you can tell them apart at a glance.
 */
function Swatch({ colour, label }: { colour: string | null | undefined; label: string }) {
  if (!colour) {
    return (
      <span
        className="h-5 w-5 rounded-md border border-dashed border-white/20"
        title={`${label}: not set — using the stock palette`}
      />
    );
  }

  return (
    <span
      className="h-5 w-5 rounded-md border border-white/20"
      style={{ backgroundColor: colour }}
      title={`${label}: ${colour}`}
    />
  );
}
