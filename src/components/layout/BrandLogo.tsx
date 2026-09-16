import Image from "next/image";

/**
 * Renders a logo whose source an administrator controls.
 *
 * next/image is used for the normal case (a path under /public or /files, which is everything
 * the CP uploader produces), because these are the site's largest above-the-fold images and
 * the width/height hints stop the header from shifting as they decode.
 *
 * An absolute http(s) URL — which the Branding tab also accepts, for a logo hosted elsewhere —
 * deliberately falls back to a plain <img>. next/image refuses any remote host that isn't in
 * next.config.ts's `remotePatterns`, and that list is intentionally empty (see the long comment
 * there about the outage caused by depending on remote hosts at render time). Without this
 * branch, pasting an external logo URL into the CP would throw on every page of the site.
 *
 * No hooks, so it works unchanged inside both the server-rendered Footer and the client Navbar.
 */
export function BrandLogo({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
}) {
  if (src.startsWith("/")) {
    return (
      <Image src={src} alt={alt} width={width} height={height} priority={priority} className={className} />
    );
  }

  // eslint-disable-next-line @next/next/no-img-element -- remote, admin-supplied host; see above.
  return <img src={src} alt={alt} className={className} />;
}
