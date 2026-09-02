"use client";

import { useEffect, useState } from "react";

/**
 * An exhibitor's logo, with an initials avatar behind it.
 *
 * The public directory is server-rendered, so a `src` that 404s used to leave the browser's
 * broken-image glyph on the card — visibly worse than the initials shown for exhibitors with no
 * logo at all. A tiny client component is the only way to hear `onError`, so this is it: it
 * renders the real image when one loads and swaps to the same initials treatment the no-logo
 * cards already use when it doesn't.
 *
 * Deliberately NOT next/image: these files are served from this app's own `public/` folder (or
 * the local `/images/external` mirror), so there is nothing for the optimiser to fetch remotely
 * and no `images.remotePatterns` entry to maintain. Sizing is left entirely to the caller's
 * wrapper, which is what keeps the same component correct at every breakpoint.
 */
export function ExhibitorLogo({
  src,
  business,
  className = "max-h-full max-w-full object-contain",
  fallbackClassName = "text-2xl font-black uppercase tracking-tighter text-white/30",
}: {
  src?: string | null;
  business: string;
  /** Applied to the <img> itself. */
  className?: string;
  /** Applied to the initials shown when there is no usable image. */
  fallbackClassName?: string;
}) {
  const [failed, setFailed] = useState(false);

  // A different exhibitor (or a freshly uploaded logo) deserves a clean attempt rather than
  // inheriting the previous src's failure.
  useEffect(() => {
    setFailed(false);
  }, [src]);

  const initials = business.trim().slice(0, 2).toUpperCase() || "?";

  if (!src || failed) {
    return (
      <span className={fallbackClassName} aria-label={business} role="img">
        {initials}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={business}
      loading="lazy"
      decoding="async"
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
