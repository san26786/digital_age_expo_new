"use client";

import { signOut } from "next-auth/react";
import { Maximize, LogOut } from "lucide-react";
import { PUBLIC_SITE_URL } from "@/lib/site-config";

/**
 * "Visit <Site> Website" + "Logout".
 *
 * Exported because the photo booth is a full-screen overlay that covers the lobby — and with it
 * this bar — so it has to render these controls itself. Sharing the component keeps one
 * definition; a copied block would drift the moment either is restyled.
 */
export function LobbyActions({ eventTitle }: { eventTitle: string }) {
  return (
    <div className="pointer-events-auto flex items-center gap-2">
      <a
        href={PUBLIC_SITE_URL}
        target="_blank"
        rel="noreferrer"
        className="rounded-full border border-white/15 bg-zinc-950/70 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white/80 backdrop-blur-md transition hover:border-brand-pink/50 hover:text-brand-pink"
      >
        Visit {eventTitle.split(" ")[0] || "DAE"} Website
      </a>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/" })}
        className="flex items-center gap-1.5 rounded-full border border-white/15 bg-zinc-950/70 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white/80 backdrop-blur-md transition hover:border-red-400/50 hover:text-red-300"
      >
        <LogOut className="h-3.5 w-3.5" />
        Logout
      </button>
    </div>
  );
}

/** Fullscreen toggle + "Visit Website" + "Logout", matching the reference lobby's top bar. */
export function LobbyTopBar({ eventTitle }: { eventTitle: string }) {
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between px-4 py-3 sm:px-6">
      <button
        type="button"
        onClick={toggleFullscreen}
        title="Toggle fullscreen"
        className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-zinc-950/70 text-white/80 backdrop-blur-md transition hover:border-brand-pink/50 hover:text-brand-pink"
      >
        <Maximize className="h-4 w-4" />
      </button>

      <LobbyActions eventTitle={eventTitle} />
    </div>
  );
}
