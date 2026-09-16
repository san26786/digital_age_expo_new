import Link from "next/link";
import { exhibitorLogoUrl } from "@/lib/assets";
import { ExhibitorLogo } from "@/components/exhibitors/ExhibitorLogo";
import { Pagination } from "@/components/ui/Pagination";
import { ExhibitorAlphabetBar } from "@/components/exhibitors/ExhibitorAlphabetBar";

interface Exhibitor {
  id: number;
  business: string;
  website: string | null;
  logo: string | null;
  listingId: number | null;
  logoExtension: string | null;
  standNumber: string | null;
}

export function ExhibitorsGrid({
  exhibitors,
  currentPage = 1,
  totalPages = 1,
  zoneId,
  zoneName,
  letter = "",
  initials = [],
}: {
  exhibitors: Exhibitor[];
  currentPage?: number;
  totalPages?: number;
  /** Set when arriving via a lobby hotspot's zone dropdown (/exhibitors?zone=<id>) — narrows the
   *  heading + pagination links to that one exhibition zone instead of the full directory. */
  zoneId?: number;
  zoneName?: string | null;
  /** The A-Z bar's current selection ("" for All). */
  letter?: string;
  /** Buckets with exhibitors behind them; the rest render dimmed. */
  initials?: string[];
}) {
  /*
   * One builder for every link on the page, so the A-Z bar and the pagination can never disagree
   * about the query string. Zone survives both, because a visitor who arrived from a lobby
   * hotspot is still inside that zone while they page or filter. `page` is dropped whenever the
   * letter changes — page 9 of "All" is not page 9 of "Q", and keeping it lands them on nothing.
   */
  const hrefFor = ({ page, nextLetter }: { page?: number; nextLetter?: string }) => {
    const params = new URLSearchParams();
    const chosen = nextLetter !== undefined ? nextLetter : letter;
    if (page && page !== 1) params.set("page", String(page));
    if (zoneId) params.set("zone", String(zoneId));
    if (chosen) params.set("letter", chosen);
    const query = params.toString();
    return query ? `/exhibitors?${query}` : "/exhibitors";
  };

  return (
    <section className="bg-zinc-950 px-6 py-20 text-white border-t border-white/5">
      <div className="mx-auto max-w-6xl text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-pink">Event Showcase</p>
        <h1 className="mt-2 text-3xl font-black uppercase tracking-tight text-white sm:text-5xl">
          {zoneName ? zoneName : "Our Exhibitors"}
        </h1>
        {zoneId && (
          <p className="mt-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
            Filtered to this exhibition zone —{" "}
            <Link href="/exhibitors" className="text-brand-pink hover:underline">
              view all exhibitors
            </Link>
          </p>
        )}

        <ExhibitorAlphabetBar
          available={initials}
          active={letter}
          buildHref={(next) => hrefFor({ nextLetter: next })}
        />

        {exhibitors.length > 0 ? (
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {exhibitors.map((exhibitor) => {
              const logo = exhibitorLogoUrl(exhibitor.logo, exhibitor.listingId, exhibitor.logoExtension);
              const nameNode = (
                <h5 className="font-black uppercase tracking-tight text-white group-hover:text-brand-pink transition-colors">{exhibitor.business}</h5>
              );

              return (
                <div key={exhibitor.id} className="glass-panel group flex flex-col items-center justify-between rounded-3xl p-8 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2">
                  <div className="flex h-32 w-full items-center justify-center rounded-2xl bg-white/5 p-4 border border-white/10 shadow-inner mb-6">
                    {/* Imported logos arrive as a square canvas with their own solid
                        background, so the corners are rounded to sit inside the plate
                        rather than as a hard-edged block on it. */}
                    <ExhibitorLogo
                      src={logo}
                      business={exhibitor.business}
                      className="max-h-full max-w-full rounded-xl object-contain"
                    />
                  </div>
                  <div className="space-y-2">
                    {exhibitor.website ? (
                      <a href={exhibitor.website} target="_blank" rel="noreferrer" className="block">
                        {nameNode}
                      </a>
                    ) : (
                      nameNode
                    )}
                    {exhibitor.standNumber && (
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Stand: <span className="text-brand-pink">{exhibitor.standNumber}</span></p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {exhibitors.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            buildHref={(p) => hrefFor({ page: p })}
            theme="dark"
          />
        )}

        {exhibitors.length === 0 && (
          <div className="mt-12 space-y-4">
            {letter && (
              <p className="text-sm text-zinc-400">
                No exhibitors starting with {letter}.{" "}
                <Link href={hrefFor({ nextLetter: "" })} className="text-brand-pink hover:underline">
                  Show all
                </Link>
              </p>
            )}
            {zoneId && !letter && (
              <p className="text-sm text-zinc-400">No exhibitors are in this zone yet.</p>
            )}
            <Link
              href="/exhibitor-registration"
              className="btn-brand-gradient inline-block rounded-full px-10 py-4 text-[10px] font-black uppercase tracking-widest text-white shadow-2xl transition hover:scale-105"
            >
              Apply for Stand
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
