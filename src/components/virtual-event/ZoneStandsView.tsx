import Link from "next/link";
import { ArrowLeft, Store } from "lucide-react";
import type { ExhibitorDirectoryEntry } from "@/lib/services/exhibitors";

/**
 * Every stand inside one exhibition zone.
 *
 * The lobby's zone menus link to `?zone=<id>`, but that parameter was only ever handled by
 * getAuditoriumScene(), which explicitly EXCLUDES layout_type "exhibition" — so picking
 * "Business Services Zone 1" resolved to nothing and the page quietly re-rendered the lobby.
 * From the visitor's side that is a dead link. This is the missing half: the zone's own stands,
 * each opening the booth view the lobby already owns (`?mybooth=1&ex_id=`).
 *
 * No hooks, so it renders on the server inside the lobby route.
 */
export function ZoneStandsView({
  zoneName,
  exhibitors,
  eventSlug,
}: {
  zoneName: string;
  exhibitors: ExhibitorDirectoryEntry[];
  eventSlug: string;
}) {
  const lobbyHref = `/virtual-event/${eventSlug}`;

  return (
    <div className="min-h-screen w-full overflow-y-auto pb-28">
      <div className="mx-auto max-w-7xl px-5 pt-8 sm:px-8">
        <Link
          href={lobbyHref}
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-400 transition hover:text-brand-pink"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to the lobby
        </Link>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-brand-pink">Exhibition Zone</p>
            <h1 className="mt-2 text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">{zoneName}</h1>
          </div>
          <p className="text-sm text-zinc-400">
            {exhibitors.length} {exhibitors.length === 1 ? "stand" : "stands"} in this zone
          </p>
        </div>

        {exhibitors.length === 0 ? (
          <div className="mt-12 rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center">
            <p className="text-zinc-300">No stands have been allocated to this zone yet.</p>
            <p className="mt-2 text-sm text-zinc-500">
              An organiser allocates stands to a zone from Exhibitors &rarr; Edit Trade Stand.
            </p>
            <Link
              href={lobbyHref}
              className="mt-8 inline-block rounded-full bg-brand-pink px-8 py-3 text-xs font-black uppercase tracking-widest text-white"
            >
              Back to the lobby
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {exhibitors.map((exhibitor) => (
              <Link
                key={exhibitor.id}
                href={`${lobbyHref}?mybooth=1&ex_id=${exhibitor.id}`}
                className="group flex flex-col rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand-pink/50 hover:shadow-2xl hover:shadow-brand-pink/10"
              >
                <div className="flex h-28 w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner">
                  {exhibitor.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- admin-supplied logo of
                    // arbitrary origin; the directory modal renders it the same way.
                    <img
                      src={exhibitor.logoUrl}
                      alt={exhibitor.business}
                      className="max-h-full max-w-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-3xl font-black uppercase tracking-tighter text-white/30">
                      {exhibitor.business.trim().slice(0, 2).toUpperCase() || "?"}
                    </span>
                  )}
                </div>

                <h2 className="mt-5 text-sm font-black uppercase tracking-wide text-white transition-colors group-hover:text-brand-pink">
                  {exhibitor.business}
                </h2>

                {exhibitor.standNumber && (
                  <p className="mt-1 font-mono text-[11px] font-bold uppercase tracking-widest text-zinc-500">
                    Stand <span className="text-brand-pink">{exhibitor.standNumber}</span>
                  </p>
                )}

                {exhibitor.about && (
                  <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-zinc-400">{exhibitor.about}</p>
                )}

                <span className="mt-auto inline-flex items-center gap-2 pt-5 text-[11px] font-black uppercase tracking-widest text-zinc-500 transition-colors group-hover:text-brand-pink">
                  <Store className="h-3.5 w-3.5" />
                  Visit stand
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
