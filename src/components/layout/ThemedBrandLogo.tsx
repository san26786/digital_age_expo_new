import { BrandLogo } from "@/components/layout/BrandLogo";

/**
 * The site wordmark, in the variant that suits the active theme.
 *
 * WHY BOTH ARE RENDERED AND CSS PICKS ONE
 * ---------------------------------------
 * The obvious implementation - read the theme in a hook and return one <BrandLogo> - cannot work
 * here. The server has no idea which theme this visitor chose, so it would always render the dark
 * variant; a visitor on light would then get a different element from the client on hydration,
 * and, worse, would watch the wrong logo for the few hundred milliseconds before React runs. On
 * the site's most prominent image that is very visible.
 *
 * So both are in the markup and `:root[data-theme]` in globals.css decides which is displayed.
 * The correct one is painted in the very first frame, before hydration, exactly like the theme
 * toggle's own icons. It costs one extra image request of about 15KB.
 *
 * `priority` is only ever passed to the dark variant: it is the default theme, so that is the one
 * worth preloading, and marking both would have them compete for the same early bandwidth.
 */
export function ThemedBrandLogo({
  darkSrc,
  lightSrc,
  alt,
  width,
  height,
  className,
  priority = false,
}: {
  /** Shown while the theme is dark — the white-on-transparent wordmark. */
  darkSrc: string;
  /** Shown while the theme is light — the same wordmark in brand purple. */
  lightSrc: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
}) {
  /*
   * When a site has only one logo, both slots resolve to the same file (see the lightLogo
   * fallback in branding.ts). Rendering it twice would download and hide a byte-identical copy,
   * so that case collapses back to a single, always-visible image.
   */
  if (darkSrc === lightSrc) {
    return (
      <BrandLogo
        src={darkSrc}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className={className}
      />
    );
  }

  return (
    <>
      <BrandLogo
        src={darkSrc}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className={`brand-logo-dark ${className ?? ""}`}
      />
      {/* An empty alt makes this one presentational: the dark variant above already carries the
          accessible name, and only one of the two is ever visible, so a screen reader would
          otherwise read the site name twice. */}
      <BrandLogo
        src={lightSrc}
        alt=""
        width={width}
        height={height}
        className={`brand-logo-light ${className ?? ""}`}
      />
    </>
  );
}
