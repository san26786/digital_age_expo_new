"use client";

import { useState } from "react";

/** Generic booth frame shown whenever an exhibitor hasn't uploaded their own stand template —
 * mirrors the shared "event_206.png" layout background used across the legacy lobby. */
const DEFAULT_STAND_TEMPLATE = "/images/stand_img.png";

interface SpotAsset {
  id: number;
  title: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  src: string;
}

interface SocialLink {
  abbr: string;
  href: string;
  label: string;
}

export function StandCanvas({
  standImageUrl,
  business,
  logoUrl,
  zoneName,
  standNumber,
  socialLinks = [],
  spots,
  templateSpots = [],
  fullBleed = false,
}: {
  standImageUrl?: string;
  business: string;
  logoUrl?: string;
  zoneName?: string;
  standNumber?: string | null;
  socialLinks?: SocialLink[];
  spots: SpotAsset[];
  /**
   * Artwork for the FIXED template slots (src/lib/standTemplateSlots.ts).
   *
   * Kept separate from `spots` because these six boxes are a fixed, template-independent set —
   * header banner, two hanging banners, two pull-up banners, tabletop — rather than rows out of
   * find_event_lobby_spots. Their percentage coordinates line up with the seeded stand templates
   * as well as DEFAULT_STAND_TEMPLATE, so they are drawn on whichever background wins.
   */
  templateSpots?: SpotAsset[];
  /** Fill the size of its parent edge-to-edge instead of rendering as a rounded, bordered card —
   * use this for an immersive full-viewport booth view like the legacy lobby's stand display. */
  fullBleed?: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogo = logoUrl && !logoFailed;
  // Fall back to the generic booth frame the moment the exhibitor's own template is missing or
  // fails to load, so the canvas never renders blank.
  const effectiveStandImage = standImageUrl && !imageFailed ? standImageUrl : DEFAULT_STAND_TEMPLATE;

  return (
    <div
      className={
        fullBleed
          ? "relative h-full w-full overflow-hidden bg-gradient-to-br from-slate-50 via-white to-sky-50"
          : "relative w-full overflow-hidden rounded-[2rem] border-2 border-sky-100 bg-gradient-to-br from-slate-50 via-white to-sky-50 shadow-2xl shadow-slate-300/40"
      }
      style={fullBleed ? undefined : { aspectRatio: "16/9" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={effectiveStandImage}
        alt={`${business} stand`}
        className="absolute inset-0 h-full w-full object-cover"
        onError={() => setImageFailed(true)}
      />

      {/* Business banner — mirrors the white logo strip at the top of the legacy stand */}
      <div className="absolute left-1/2 top-4 z-10 flex max-w-[78%] -translate-x-1/2 items-center gap-3 rounded-xl border border-slate-100 bg-white/95 px-5 py-2.5 shadow-lg backdrop-blur">
        {showLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={`${business} logo`}
            className="h-8 w-auto max-w-[120px] object-contain"
            onError={() => setLogoFailed(true)}
          />
        ) : null}
        <span className="truncate text-sm font-black uppercase tracking-tight text-slate-800">
          {business}
        </span>
      </div>

      {/* Zone / stand number badge — top right, like the legacy "VIP Lounge / Booth no." tag */}
      {(zoneName || standNumber) && (
        <div className="absolute right-4 top-4 z-10 rounded-xl border border-sky-100 bg-white/95 px-4 py-2 text-right shadow-lg backdrop-blur">
          {zoneName && (
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-700">{zoneName}</p>
          )}
          {standNumber && (
            <p className="text-[10px] font-bold uppercase tracking-widest text-sky-500">
              Booth No. {standNumber}
            </p>
          )}
        </div>
      )}

      {/* Social rail — vertical strip along the left edge, like the legacy sidebar icons */}
      {socialLinks.length > 0 && (
        <div className="absolute left-3 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-2">
          {socialLinks.map((social) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noreferrer"
              title={social.label}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-sky-100 bg-white text-[10px] font-black text-sky-500 shadow-md transition hover:scale-110 hover:bg-sky-500 hover:text-white"
            >
              {social.abbr}
            </a>
          ))}
        </div>
      )}

      {/* Template-slot coordinates line up with the seeded stand templates as well as the default
          frame, and the editor offers those six slots on EVERY background — gating them on the
          fallback made artwork an exhibitor had just uploaded invisible to visitors. */}
      {templateSpots.map((spot) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`tpl-${spot.id}`}
            src={spot.src}
            alt={spot.title || "Stand asset"}
            className="absolute object-contain drop-shadow-xl"
            style={{ left: `${spot.x}%`, top: `${spot.y}%`, width: `${spot.width}%`, height: `${spot.height}%` }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ))}

      {spots.map((spot) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={spot.id}
          src={spot.src}
          alt={spot.title || "Stand asset"}
          className="absolute object-contain drop-shadow-xl"
          style={{ left: `${spot.x}%`, top: `${spot.y}%`, width: `${spot.width}%`, height: `${spot.height}%` }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ))}
    </div>
  );
}
