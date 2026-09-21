import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  /**
   * -----------------------------------------------------------------------
   * Keep `public/` out of the server bundle's file trace.
   * -----------------------------------------------------------------------
   *
   * Several API routes write uploads with `path.join(process.cwd(), "public", …)`. Turbopack
   * analyses filesystem access statically to decide what a server bundle needs, and a path it
   * cannot fold to a constant becomes a glob — the build reported one matching **10,633 files**
   * and traced them all in. That is what exhausted the heap during `next build`
   * ("Zone Allocation failed — process out of memory").
   *
   * The routes themselves have been narrowed (see lobby-spots / lobby-templates upload), but
   * this is the belt-and-braces half: nothing under `public/` is ever *imported* by server code.
   * These are static assets the platform serves directly — currently ~2,100 files including
   * several 15–27 MB videos — so tracing them into a function bundle is pure waste however the
   * path is written.
   */
  outputFileTracingExcludes: {
    "/api/**": ["./public/**"],
    "/**": ["./public/**/*.mp4", "./public/images/lobby_assets/**", "./public/files/**"],
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    /**
     * -----------------------------------------------------------------------
     * INTENTIONALLY EMPTY — do not add the legacy hosts back.
     * -----------------------------------------------------------------------
     *
     * This used to allow-list digitalageexpo.com, apps.digitalageexpo.com,
     * tradeshowslocal.com and findusonweb.com so `next/image` could fetch and
     * optimise images from them at request time. That is exactly what made the
     * deployed site fragile: every render depended on those hosts being up,
     * reachable from Vercel, and serving a valid TLS certificate — and they
     * intermittently were not. Locally it looked fine only because
     * NEXT_PUBLIC_ASSETS_BASE_URL pointed at a XAMPP copy of the legacy site.
     *
     * All of that media now lives in this repo under `public/images/external/**`
     * (mirrored by `scripts/download-external-images.ts`) and is served by
     * Vercel itself, so no remote pattern is required:
     *
     *   public/images/external/apps/speaker_hall.png
     *     -> https://<your-domain>/images/external/apps/speaker_hall.png
     *
     * Only add an entry here for a genuinely external image source that cannot
     * reasonably be mirrored (a live third-party CDN, an avatar service...).
     * Add the specific hostname and pathname — never a wildcard domain.
     */
    remotePatterns: [],
  },
};

export default nextConfig;
