import Link from "next/link";
import { headers } from "next/headers";
import { Eye, X } from "lucide-react";
import { SITE_ID_HEADER } from "@/lib/tenant";
import { getDomain } from "@/lib/services/domain";
import { DOMAIN_ID } from "@/lib/site-config";

/**
 * "You are looking at a preview, not the real site."
 *
 * ---------------------------------------------------------------------------
 *  WHY A PREVIEW NEEDS TO ANNOUNCE ITSELF
 * ---------------------------------------------------------------------------
 *
 *  The preview is deliberately indistinguishable from the site it previews — that is the point of
 *  it. Which makes it genuinely easy to forget you are in one: the preview is sticky across
 *  navigation (see the cookie in src/proxy.ts), so the only remaining signal after the first page
 *  is the branding itself, and a half-configured sub-site looks a great deal like the main site.
 *
 *  Someone who forgets will at best be confused about why their change "did not appear", and at
 *  worst will edit or publish against the wrong site believing it is the right one. A strip at
 *  the top of every page costs a few pixels and removes the whole class of mistake.
 *
 *  It renders nothing at all when no preview is active, so the live site never sees it — and it
 *  cannot appear in production regardless, because the proxy refuses to set the header there.
 */
export async function SitePreviewBanner() {
  if (process.env.NODE_ENV === "production") return null;

  let previewId = 0;
  let rawHost = "";
  try {
    const bag = await headers();
    previewId = Number(bag.get(SITE_ID_HEADER) ?? 0);
    rawHost = bag.get("host") ?? "";
  } catch {
    return null;
  }

  if (!Number.isInteger(previewId) || previewId <= 0) return null;

  /*
   * Leaving a preview means going back to the ordinary hostname, because that is where the
   * preview lives now — `site-151.localhost:3000` out, `localhost:3000` back. An in-app href
   * would not do it: a relative link keeps the hostname, which is the very thing being left.
   */
  const exitHref = /^site-\d+\./.test(rawHost)
    ? `http://${rawHost.replace(/^site-\d+\./, "")}/`
    : "/";

  /*
   * getDomain() is already memoised for this request by the layout below, so naming the site
   * costs nothing extra — which matters on a ten-connection pool where an unguarded extra read in
   * the root layout is what took the site down once already.
   */
  const domain = await getDomain();

  return (
    <div className="relative z-50 border-b border-amber-400/30 bg-amber-400/10">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2">
        <Eye className="h-3.5 w-3.5 shrink-0 text-amber-300" />
        <p className="text-[11px] leading-relaxed text-amber-100/90">
          <span className="font-bold">Preview — {domain.name}</span>
          <span className="text-amber-100/60">
            {" "}
            (site #{previewId}
            {previewId === DOMAIN_ID ? ", the site this deployment serves" : ""}). Local only; the
            real address is not serving this yet. Digital Age Expo is still at the plain address.
          </span>
        </p>

        <Link
          href={exitHref}
          className="ml-auto inline-flex items-center gap-1 rounded-full border border-amber-400/40 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-100 transition hover:bg-amber-400/20"
        >
          <X className="h-3 w-3" />
          Exit preview
        </Link>
      </div>
    </div>
  );
}
