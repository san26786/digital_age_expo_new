"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * The virtual-event lobby (/virtual-event/[slug]) is a full-bleed, app-like screen with its own
 * top bar (LobbyTopBar) and sticky bottom icon nav (LobbyFooterNav) — mirroring the legacy
 * lobby.tpl, which renders neither the marketing site's header nor its footer (its own bars are
 * the *only* chrome on that screen).
 *
 * Wraps BOTH the site <Header /> (announcement bar + main nav) and the <Footer /> (Quick Links /
 * Newsletter / social) so the lobby fills the viewport exactly as it does on the live site. The
 * header in particular pushed the whole lobby down by its own height, so the immersive scene
 * opened part-scrolled with the site nav sitting above it.
 *
 * Matched by exact "/virtual-event/<slug>" (no further segments) so the visitor login screen one
 * level down (/virtual-event/<slug>/login) keeps the normal site header/footer chrome — it's a
 * regular centered auth form, not the immersive lobby.
 */
const LOBBY_PATH = /^\/virtual-event\/[^/]+\/?$/;

export function ChromeGate({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  if (LOBBY_PATH.test(pathname)) return null;
  return <>{children}</>;
}
