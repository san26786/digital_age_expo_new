import { getDomain } from "@/lib/services/domain";
import { createOutageCollector } from "@/lib/db-errors";
import { DatabaseOutageNotice } from "@/components/common/DatabaseOutageNotice";
import { getEventById } from "@/lib/services/events";
import { getEventSchedule } from "@/lib/services/schedule";
import { EventScheduleClient } from "@/components/schedule/EventScheduleClient";

export const metadata = {
  title: "Event Schedule - Digital Age Expo",
  description: "Explore the full event schedule, masterclasses, keynotes, webinars, and workshops across all 3 days at Digital Age Expo 2026.",
};

export default async function EventSchedulePage() {
  const domain = await getDomain();
  // Guarded so a database refusing service (plan quota, asleep, pool exhausted) degrades
  // instead of 500-ing this route — see src/lib/db-errors.ts. Keep the collector object intact:
  // `current` is a getter, so destructuring would snapshot the still-null value.
  const collector = createOutageCollector();
  const guard = collector.guard;

  const event = domain.event_id ? await guard(() => getEventById(domain.event_id), null) : null;
  const days = event ? await guard(() => getEventSchedule(event.id), []) : [];

  // The schedule IS this page — an empty agenda caused by the database refusing queries must not
  // masquerade as "no sessions scheduled yet".
  if (days.length === 0 && collector.current) {
    return <DatabaseOutageNotice outage={collector.current} />;
  }

  const defaultEvent = event || {
    id: 1474,
    title: "Digital Age Expo 2026",
    venue: "Exhibition Hall & Virtual Auditoriums",
    date_start: new Date("2026-08-26"),
    date_end: new Date("2026-08-28"),
  };

  return <EventScheduleClient event={defaultEvent} initialDays={days} />;
}

