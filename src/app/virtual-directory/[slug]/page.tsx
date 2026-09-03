import { findSlotByKey } from "@/lib/standTemplateSlots";
import Link from "next/link";
import { Store, Globe, Phone, Video, CalendarClock, Share2 } from "lucide-react";
import { getPublicExhibitorStand } from "@/lib/services/exhibitorStand";
import { standTemplateUrl, exhibitorAssetUrl } from "@/lib/assets";
import { StandCanvas } from "@/components/virtual-directory/StandCanvas";
import { StandFooterNav } from "@/components/virtual-directory/StandFooterNav";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const stand = await getPublicExhibitorStand(slug);
  return {
    title: stand?.exhibitor?.business ? `${stand.exhibitor.business} | Virtual Stand` : "Virtual Stand",
  };
}

function socialUrl(raw: string | null | undefined, kind: "facebook" | "twitter" | "instagram" | "youtube" | "whatsapp"): string | undefined {
  if (!raw) return undefined;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (kind === "whatsapp") return `https://wa.me/${raw.replace(/[^0-9]/g, "")}`;
  const hosts: Record<typeof kind, string> = {
    facebook: "https://facebook.com/",
    twitter: "https://twitter.com/",
    instagram: "https://instagram.com/",
    youtube: "https://youtube.com/",
    whatsapp: "",
  };
  return `${hosts[kind]}${raw.replace(/^@/, "")}`;
}

/**
 * Public, read-only mirror of the stand editor's canvas (see StandAssetsManager.tsx /
 * /api/members/stand-assets) — this is the page "View My Booth" / "Share My Booth Link" point
 * visitors at, so it needs no auth and shows no edit affordances. Visually it mirrors the legacy
 * findusonweb/lobby exhibitor stand: a light corporate frame with a business banner and
 * zone/stand-number badge over the canvas, a left-edge social rail, and an action strip below.
 */
export default async function VirtualDirectoryStandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const stand = await getPublicExhibitorStand(slug);

  if (!stand || stand.exhibitor.status !== "active") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-100 flex items-center justify-center px-6 py-20">
        <div className="max-w-md text-center rounded-3xl border border-slate-200 bg-white shadow-2xl p-10">
          <Store className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">
            Booth Not Available
          </h1>
          <p className="text-sm text-slate-500 mb-6">
            This exhibitor stand isn&apos;t published yet. Check back once it goes live.
          </p>
          <Link
            href="/exhibitors"
            className="inline-block px-6 py-3 bg-brand-pink text-white font-black text-xs uppercase tracking-widest rounded-full hover:scale-105 transition shadow-xl shadow-brand-pink/20"
          >
            Browse Exhibitors
          </Link>
        </div>
      </div>
    );
  }

  const { exhibitor, zoneName, standImage, spots, templateSlots } = stand;

  /*
   * The fixed template slots, turned into the same overlay shape as the DB hotspots.
   *
   * A slot's definition carries percentage boxes (left/top/width/height), which is exactly what
   * SpotAsset expects — so no new rendering code is needed, only the coordinate lookup. The slot
   * is looked up by key across every set (default stand, Basic Stand, ...) because the stored row
   * only records the key, not which layout it belonged to.
   */
  const templateSpots = templateSlots
    .map((slot, i) => {
      const def = findSlotByKey(slot.key);
      const src = exhibitorAssetUrl(slot.url) || "";
      if (!def || !src) return null;
      return {
        id: i + 1,
        title: def.label,
        x: def.left,
        y: def.top,
        width: def.width,
        height: def.height,
        src,
        isVideo: def.kind === "video",
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  const resolvedStandImage = standImage
    ? standImage.startsWith("http") || standImage.startsWith("/")
      ? standImage
      : standTemplateUrl(standImage)
    : undefined;
  const logoUrl = exhibitor.logo ? exhibitorAssetUrl(exhibitor.logo) : undefined;

  const spotAssets = spots
    .filter((spot) => spot.gallery && spot.gallery.length > 0)
    .map((spot) => {
      let x = 0, y = 0, width = 12, height = 12;
      try {
        const d = spot.dimension ? JSON.parse(spot.dimension) : null;
        x = parseFloat(d?.x ?? spot.x_coordinates ?? "0");
        y = parseFloat(d?.y ?? spot.y_coordinates ?? "0");
        width = parseFloat(d?.width ?? spot.width ?? "12");
        height = parseFloat(d?.height ?? spot.height ?? "12");
      } catch {
        x = parseFloat(spot.x_coordinates || "0");
        y = parseFloat(spot.y_coordinates || "0");
        width = parseFloat(spot.width || "12");
        height = parseFloat(spot.height || "12");
      }
      return {
        id: spot.id,
        title: spot.title,
        x,
        y,
        width,
        height,
        src: exhibitorAssetUrl(spot.gallery[0].asset_url) || "",
      };
    })
    .filter((s) => s.src);

  // lucide-react no longer ships brand/logo icons (Facebook, Twitter, Instagram, YouTube), so
  // these render as short text badges instead of icon glyphs — same treatment as the legacy
  // sidebar's circular icon rail.
  const socialLinks = [
    { abbr: "FB", href: socialUrl(exhibitor.facebook, "facebook"), label: "Facebook" },
    { abbr: "TW", href: socialUrl(exhibitor.twitter, "twitter"), label: "Twitter" },
    { abbr: "IG", href: socialUrl(exhibitor.instagram, "instagram"), label: "Instagram" },
    { abbr: "YT", href: socialUrl(exhibitor.youtube, "youtube"), label: "YouTube" },
    { abbr: "WA", href: socialUrl(exhibitor.whatsapp_no, "whatsapp"), label: "WhatsApp" },
  ].filter((s): s is { abbr: string; href: string; label: string } => Boolean(s.href));

  const actionLinks = [
    exhibitor.website && {
      icon: Globe,
      label: "Visit Website",
      href: exhibitor.website.startsWith("http") ? exhibitor.website : `https://${exhibitor.website}`,
    },
    exhibitor.zoom && { icon: Video, label: "Join Zoom Meeting", href: exhibitor.zoom },
    exhibitor.calendly && { icon: CalendarClock, label: "Book a Slot", href: exhibitor.calendly },
    exhibitor.phone && { icon: Phone, label: exhibitor.phone, href: `tel:${exhibitor.phone}` },
  ].filter(Boolean) as { icon: typeof Globe; label: string; href: string }[];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-100 pb-20">
      {/* Full-bleed stand hero — fills the viewport below the site header, edge to edge, like the
          legacy lobby's immersive booth display. Logo banner, zone/booth badge, social rail and
          hotspots all render as overlays on top of it. */}
      <div className="relative w-full" style={{ height: "calc(100vh - 6rem)" }}>
        <StandCanvas
          standImageUrl={resolvedStandImage}
          business={exhibitor.business || "Exhibitor"}
          logoUrl={logoUrl}
          zoneName={zoneName || undefined}
          standNumber={exhibitor.stand_number}
          socialLinks={socialLinks}
          spots={spotAssets}
          templateSpots={templateSpots}
          fullBleed
        />
        <Link
          href="/exhibitors"
          className="absolute left-4 top-4 z-20 inline-flex items-center gap-1.5 rounded-full border border-slate-100 bg-white/90 px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-500 shadow-md backdrop-blur transition hover:text-brand-pink"
        >
          ← Back to Exhibitors
        </Link>
        <StandFooterNav eventId={exhibitor.event_id} exId={exhibitor.id} />
      </div>

      <div className="mx-auto max-w-5xl px-6 py-10 space-y-6">
        {/* Action strip — mirrors the legacy "Share Booth / Visit Website / ..." pill buttons
            directly beneath the stand. */}
        <div className="flex flex-wrap items-center gap-2.5">
          {actionLinks.map((action) => (
            <a
              key={action.label}
              href={action.href}
              target={action.href.startsWith("http") ? "_blank" : undefined}
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-700 shadow-sm transition hover:bg-sky-500 hover:text-white hover:border-sky-500"
            >
              <action.icon className="h-3.5 w-3.5" />
              {action.label}
            </a>
          ))}
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-wide text-emerald-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Online
          </span>
        </div>

        {/* About + connect */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
          {exhibitor.about_us && (
            <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-brand-pink mb-4">About Us</h2>
              <p className="text-sm leading-relaxed text-slate-600 font-medium whitespace-pre-line">
                {exhibitor.about_us}
              </p>
              {exhibitor.keynote_speech_topic && (
                <p className="mt-6 text-xs text-slate-400">
                  <span className="font-black uppercase tracking-widest text-slate-500">Keynote Topic: </span>
                  {exhibitor.keynote_speech_topic}
                </p>
              )}
            </div>
          )}

          <div className={`rounded-3xl border border-slate-200 bg-white p-8 shadow-xl space-y-4 ${exhibitor.about_us ? "" : "lg:col-span-3"}`}>
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-brand-pink mb-2">Connect</h2>

            {actionLinks.length > 0 ? (
              <div className="space-y-3">
                {actionLinks.map((action) => (
                  <a
                    key={action.label}
                    href={action.href}
                    target={action.href.startsWith("http") ? "_blank" : undefined}
                    rel="noreferrer"
                    className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-sky-50 hover:text-sky-600 transition"
                  >
                    <action.icon className="h-4 w-4 text-brand-pink flex-shrink-0" />
                    <span className="truncate">{action.label}</span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No contact links have been added for this stand yet.</p>
            )}

            {socialLinks.length > 0 && (
              <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                    title={social.label}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-100 bg-slate-50 text-[10px] font-black text-slate-500 hover:text-white hover:bg-sky-500 hover:border-sky-500 transition"
                  >
                    {social.abbr}
                  </a>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-[11px] font-bold uppercase tracking-widest text-slate-400">
              <Share2 className="h-3.5 w-3.5" />
              Share this booth&apos;s link to invite visitors
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
