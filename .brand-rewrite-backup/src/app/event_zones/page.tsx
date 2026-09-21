import { getDomain } from "@/lib/services/domain";
import { getEventById } from "@/lib/services/events";
import { getEventZones, type EventZoneItem } from "@/lib/services/eventZones";
import { EventZonesGrid } from "@/components/eventZones/EventZonesGrid";
import Link from "next/link";

export const metadata = {
  title: "Event Zones | Digital Age Expo",
  description: "Navigate the specialized sector zones at Digital Age Expo including AI & Tech, Digital Marketing, Finance & Fintech, E-Commerce, and Cybersecurity.",
};

/** Shown only if this event has no find_event_lobby_child_layout_manager rows configured yet. */
const FALLBACK_ZONES: EventZoneItem[] = [
  {
    id: -1,
    title: "AI & Innovation Zone",
    description: "Artificial intelligence, machine learning, robotics, and automation solutions driving the next tech frontier.",
  },
  {
    id: -2,
    title: "Digital Marketing & Sales Zone",
    description: "SEO, PPC, social media automation, content strategies, and CRM technologies for rapid growth.",
  },
  {
    id: -3,
    title: "Fintech & Finance Zone",
    description: "Payment processing, digital banking, accounting software, venture capital, and financial tech tools.",
  },
  {
    id: -4,
    title: "E-Commerce & Retail Zone",
    description: "Online store platforms, logistics, omnichannel marketing, and conversion optimization software.",
  },
  {
    id: -5,
    title: "Cloud & Cybersecurity Zone",
    description: "Data protection, cloud architecture, zero-trust security, and risk compliance tools for enterprise.",
  },
];

const DEFAULT_ACCENT = "linear-gradient(135deg, var(--color-brand-purple), var(--color-brand-pink))";

export default async function EventZonesPage() {
  const domain = await getDomain();
  const event = domain.event_id ? await getEventById(domain.event_id) : null;
  const dbZones = domain.event_id ? await getEventZones(domain.event_id) : [];

  const zones = dbZones.length > 0 ? dbZones : FALLBACK_ZONES;
  const accent = event?.color ? `linear-gradient(135deg, ${event.color}, var(--color-brand-pink))` : DEFAULT_ACCENT;

  return (
    <div className="bg-zinc-950 min-h-screen pb-24 text-white">
      <div className="main-glow-bg px-6 py-20 text-center border-b border-white/5">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-pink">Explore The Show Floor</p>
        <h1 className="mt-3 text-3xl sm:text-5xl font-black uppercase tracking-tight">
          Event <span className="brand-gradient-text">Zones</span>
        </h1>
        <p className="mt-4 text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto">
          Explore dedicated industry sectors tailored to your business needs — click any zone to flip it and see what&apos;s inside.
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-16">
        <EventZonesGrid zones={zones} accent={accent} />

        <div className="mt-16 glass-panel rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight text-white">Want to host a stand in a specific zone?</h3>
            <p className="text-sm text-zinc-400 mt-1">
              Select your sector zone during stand registration for targeted visitor traffic.
            </p>
          </div>
          <Link
            href="/exhibitor-registration"
            className="btn-brand-gradient shrink-0 rounded-xl px-6 py-3 text-sm font-black uppercase tracking-widest text-white transition hover:scale-105"
          >
            Register Exhibitor Stand
          </Link>
        </div>
      </div>
    </div>
  );
}
