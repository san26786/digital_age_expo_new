"use client";

import { useCallback, useRef, useState } from "react";

/**
 * A logo image plus, when the artwork needs one, a ground to sit on.
 *
 * THE PROBLEM
 * -----------
 * Partner and sponsor logos are supplied by whoever uploaded them, and they come in two
 * incompatible kinds: artwork drawn LIGHT for dark backgrounds (a white wordmark on
 * transparency), and artwork drawn DARK, or flattened onto its own white rectangle.
 *
 * On this site's dark theme the light kind looks right and nobody notices. In light mode the
 * white wordmarks vanish — which is exactly what happened to visualytes / tillu / b2bgrowthhub
 * on the partners row: three cards containing, visibly, nothing.
 *
 * No fixed treatment fixes both kinds. A dark chip rescues white logos and hides dark ones; a
 * white plate does the reverse. And the polarity is a property of each uploaded FILE, which
 * nothing in the database records.
 *
 * THE APPROACH
 * ------------
 * Measure it. Once the image has loaded, it is drawn to a small offscreen canvas and the mean
 * luminance of its non-transparent pixels is taken. Artwork that is mostly light gets
 * `data-logo="light"`, and globals.css gives that a dark chip in light mode only. Everything
 * else renders exactly as it does today.
 *
 * WHY THE GUARDS MATTER
 * ---------------------
 * `getImageData` throws a SecurityError on a canvas tainted by a cross-origin image, and
 * `assetUrl()` can return an absolute URL on a legacy asset host. Rather than add
 * `crossOrigin="anonymous"` — which would make those images fail to load outright on any host
 * that does not send CORS headers — measurement is simply skipped for anything that is not
 * same-origin, and the whole thing is wrapped in try/catch. Every failure path renders the
 * logo exactly as before: the worst case is the behaviour we already have.
 *
 * The canvas is 40px wide. This is a yes/no question about the whole image, and a thumbnail
 * answers it as well as the full-size bitmap for a fraction of the work.
 */
export function LogoPlate({
  src,
  alt,
  className,
  wrapperClassName,
}: {
  src: string;
  alt: string;
  /** Classes for the <img> itself. */
  className?: string;
  /** Classes for the element that becomes the chip. */
  wrapperClassName?: string;
}) {
  const [polarity, setPolarity] = useState<"light" | "dark" | null>(null);
  const measured = useRef(false);

  const measure = useCallback((img: HTMLImageElement | null) => {
    if (!img || measured.current) return;

    // Same-origin only: see the note above about tainted canvases.
    if (!src.startsWith("/")) return;

    const run = () => {
      if (measured.current) return;
      measured.current = true;
      try {
        const w = 40;
        const h = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * w)) || 1;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, w, h);

        const { data } = ctx.getImageData(0, 0, w, h);
        let sum = 0;
        let count = 0;
        for (let i = 0; i < data.length; i += 4) {
          // Transparent pixels are the logo's background, not its ink.
          if (data[i + 3] < 160) continue;
          // Rec. 709 luma is close enough for a light/dark decision and avoids three pow() calls
          // per pixel.
          sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
          count++;
        }
        if (count === 0) return;

        // 150/255. Comfortably above mid-grey, so only genuinely light artwork is plated and a
        // mid-tone logo — which reads on either ground — is left alone.
        setPolarity(sum / count > 150 ? "light" : "dark");
      } catch {
        /* Tainted canvas, or no 2d context. Render as before. */
      }
    };

    if (img.complete && img.naturalWidth > 0) run();
    else img.addEventListener("load", run, { once: true });
  }, [src]);

  return (
    <div className={wrapperClassName} data-logo={polarity ?? undefined}>
      {/* eslint-disable-next-line @next/next/no-img-element -- legacy asset hosts resolved
          through assetUrl(); next/image would need each one configured. */}
      <img ref={measure} src={src} alt={alt} loading="lazy" className={className} />
    </div>
  );
}
