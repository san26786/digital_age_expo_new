"use client";

import { useState } from "react";
import {
  RefreshCw,
  Cpu,
  Megaphone,
  Landmark,
  ShoppingCart,
  ShieldCheck,
  Briefcase,
  LifeBuoy,
  Globe,
  type LucideIcon,
} from "lucide-react";

export interface EventZoneItem {
  id: number;
  title: string;
  description: string | null;
  image?: string;
}

const KEYWORD_ICONS: Array<[RegExp, LucideIcon]> = [
  [/market/i, Megaphone],
  [/web|tech/i, Cpu],
  [/support/i, LifeBuoy],
  [/service/i, Briefcase],
  [/growth/i, Landmark],
  [/commerce|retail/i, ShoppingCart],
  [/secur|cyber/i, ShieldCheck],
];

function pickIcon(title: string): LucideIcon {
  const match = KEYWORD_ICONS.find(([pattern]) => pattern.test(title));
  return match ? match[1] : Globe;
}

function ZoneCard({ zone, accent, index = 0 }: { zone: EventZoneItem; accent: string; index?: number }) {
  const [flipped, setFlipped] = useState(false);
  const Icon = pickIcon(zone.title);
  const description = zone.description?.trim() || "Details for this zone are coming soon.";

  return (
    /*
     * The reveal lives on a WRAPPER, not on `.perspective-1000`. That element establishes the
     * 3D context the flip depends on, and giving it its own transform would put the card's
     * rotateY into a different containing block — the flip either flattens or jitters. The
     * wrapper moves; the perspective element is left exactly as it was.
     */
    <div data-reveal style={{ transitionDelay: `${(index % 4) * 80}ms` }}>
      <div className="perspective-1000 h-64">
        <div
          className="transform-style-3d relative h-full w-full transition-transform duration-700 ease-out"
          style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
        >
          {/* Front */}
          <div
            className="backface-hidden absolute inset-0 flex flex-col items-center justify-center rounded-3xl p-6 text-center shadow-2xl border border-white/10"
            style={{ backgroundImage: accent }}
          >
            <button
              type="button"
              onClick={() => setFlipped(true)}
              className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-900 transition hover:bg-white"
            >
              <RefreshCw className="h-3 w-3" /> Flip
            </button>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 border border-white/20">
              <Icon className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-black uppercase tracking-tight text-white leading-snug">{zone.title}</h3>
          </div>

          {/* Back */}
          <div
            className="backface-hidden absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-3xl border border-white/10 bg-zinc-900 p-6 text-center shadow-2xl"
            style={{ transform: "rotateY(180deg)" }}
          >
            <button
              type="button"
              onClick={() => setFlipped(false)}
              className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-900 transition hover:bg-white"
            >
              <RefreshCw className="h-3 w-3" /> Flip
            </button>
            {zone.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={zone.image || "/images/event_zone.jpg"}
                alt={zone.title}
                className="max-h-24 max-w-full rounded-lg object-contain"
                onError={(e) => {
                  e.currentTarget.onerror = null; // Prevent infinite loop
                  e.currentTarget.src = "/images/event_zone.jpg";
                }}
              />
            ) : (
              <Icon className="h-10 w-10 text-brand-pink" />
            )}
            <p className="text-xs leading-relaxed text-zinc-300 line-clamp-4">{description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EventZonesGrid({ zones, accent }: { zones: EventZoneItem[]; accent: string }) {
  if (zones.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {zones.map((zone, index) => (
        <ZoneCard key={zone.id} zone={zone} accent={accent} index={index} />
      ))}
    </div>
  );
}
