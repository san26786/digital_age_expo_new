import { redirect } from "next/navigation";
import { getDomain } from "@/lib/services/domain";
import { getEventById } from "@/lib/services/events";

export const dynamic = "force-dynamic";

/**
 * Single, event-independent "Enter The Show" destination. Every entry point across the site
 * (HeroSection's CTA, the nav's "Visitor Login" links in lib/services/menu.ts, the Event
 * Experience page) points here instead of hardcoding a friendly_url, so none of them go stale
 * when the CP's General Settings "Event" dropdown / Events Management "Mark Active" changes
 * which event is live (see lib/services/domain.ts) — this always resolves to whichever event
 * is active right now, exactly like the rest of the site already does.
 */
export default async function EnterTheShowPage() {
  const domain = await getDomain();
  const event = domain.event_id ? await getEventById(domain.event_id) : null;

  if (event?.friendly_url) {
    redirect(`/virtual-event/${event.friendly_url}/login`);
  }

  return (
    <div data-theme-scope="dark" className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-center text-white">
      <div>
        <h1 className="text-2xl font-bold">Show Not Available</h1>
        <p className="mt-3 text-zinc-400">There&apos;s no active event configured for the virtual show right now.</p>
      </div>
    </div>
  );
}
