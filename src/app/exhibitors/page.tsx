import { getDomain } from "@/lib/services/domain";
import { getEventExhibitorsPaged, getExhibitionZoneName } from "@/lib/services/exhibitors";
import { ExhibitorsGrid } from "@/components/exhibitors/ExhibitorsGrid";
import { createOutageCollector } from "@/lib/db-errors";
import { DatabaseOutageNotice } from "@/components/common/DatabaseOutageNotice";

export const metadata = {
  title: "Exhibitors",
  description: "Top exhibitors driving business growth at this event.",
};

const PAGE_SIZE = 20;

export default async function ExhibitorsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; zone?: string; letter?: string }>;
}) {
  const { page: pageParam, zone: zoneParam, letter: letterParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const zoneId = zoneParam ? Number(zoneParam) || undefined : undefined;

  // Only a single A-Z letter or the 0-9 bucket is honoured; anything else is treated as "All"
  // rather than 404ing, because this value arrives straight off the query string.
  const rawLetter = (letterParam ?? "").trim().toUpperCase();
  const letter = rawLetter === "0-9" || /^[A-Z]$/.test(rawLetter) ? rawLetter : "";

  const domain = await getDomain();

  // Guarded so a database that is refusing service (plan quota reached, asleep, pool exhausted)
  // degrades to an explained empty page instead of a 500 — see src/lib/db-errors.ts. Keep the
  // collector object intact: `current` is a getter, so destructuring it here would snapshot the
  // still-null value before either query has had a chance to fail.
  const collector = createOutageCollector();
  const guard = collector.guard;

  const [{ exhibitors, total, initials }, zoneName] = await Promise.all([
    domain.event_id
      ? guard(() => getEventExhibitorsPaged(domain.event_id, page, PAGE_SIZE, zoneId, letter), {
          exhibitors: [] as Awaited<ReturnType<typeof getEventExhibitorsPaged>>["exhibitors"],
          total: 0,
          page,
          pageSize: PAGE_SIZE,
          initials: [] as string[],
        })
      : Promise.resolve({ exhibitors: [], total: 0, page, pageSize: PAGE_SIZE, initials: [] as string[] }),
    zoneId ? guard(() => getExhibitionZoneName(zoneId), null) : Promise.resolve(null),
  ]);

  // Nothing usable came back and the database is the reason — say so, rather than showing an
  // empty directory that reads as "this event has no exhibitors".
  if (exhibitors.length === 0 && collector.current) {
    return <DatabaseOutageNotice outage={collector.current} />;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <ExhibitorsGrid
      exhibitors={exhibitors}
      currentPage={page}
      totalPages={totalPages}
      zoneId={zoneId}
      zoneName={zoneName}
      letter={letter}
      initials={initials}
    />
  );
}
