/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { getDomain } from "@/lib/services/domain";
import { getMenu } from "@/lib/services/menu";
import { getBrandAssets } from "@/lib/services/branding";
import { getEventById, getEventDateRange } from "@/lib/services/events";
import { safeQuery } from "@/lib/db-errors";
import { formatMonthDayYear } from "@/lib/format";
import { Navbar } from "@/components/layout/Navbar";

export async function Header() {
  const [domain, menu, session, brand] = await Promise.all([
    getDomain(),
    getMenu(),
    getServerSession(authOptions),
    // Settings -> Branding decides these; each falls back to the file Navbar used to hardcode.
    getBrandAssets(),
  ]);

  /*
   * The announcement bar's event line used to be two hardcoded strings in Navbar.tsx —
   * "DAE 2026" and "London Grand Center • October 12-14, 2026" — while the hero, the countdown
   * and every date on the site came from find_events, which says 26 to 28 August 2026, Online
   * Virtual Event. The two disagreed on the month, the year's dates and the venue, in the same
   * viewport. It now comes from the same event row as everything else, so it cannot drift again.
   *
   * Guarded with safeQuery: this renders in the root layout, on EVERY page, so an infrastructure
   * failure here would take down the entire site rather than one route. Falling back to no event
   * line is the right degradation — the bar is decoration, not content.
   */
  const eventId = domain.event_id;
  const [event, eventDates] = await Promise.all([
    eventId ? safeQuery(() => getEventById(eventId), null) : null,
    eventId ? safeQuery(() => getEventDateRange(eventId), null) : null,
  ]);

  const dateStart = eventDates?.date_start ?? event?.date_start ?? null;
  const dateEnd = eventDates?.date_end ?? event?.date_end ?? null;

  const eventBar =
    event && dateStart
      ? {
          // The event's own short label when the CP has set one (find_events.label), otherwise a
          // derived "DAE <year>" — never a hardcoded year.
          badge: event.label?.trim() || `DAE ${dateStart.getFullYear()}`,
          detail: [event.venue?.trim(), formatMonthDayYear(dateStart, dateEnd)]
            .filter(Boolean)
            .join(" • "),
        }
      : null;

  return (
    <Navbar
      menu={menu}
      domainName={domain.name}
      session={session}
      eventBar={eventBar}
      primaryLogo={brand.primaryLogo}
      mobileLogo={brand.mobileLogo}
      lightLogo={brand.lightLogo}
    />
  );
}
