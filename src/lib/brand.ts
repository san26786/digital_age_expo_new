import { getDomain } from "@/lib/services/domain";
import { DEFAULT_BRAND_NAME } from "@/lib/constants/brandName";

/**
 * ===========================================================================
 *  THE SITE'S IDENTITY, RESOLVED PER REQUEST
 * ===========================================================================
 *
 *  Until this existed, "Digital Age Expo" was a literal in 95 source files — page titles, meta
 *  descriptions, alt text, body copy — and "digitalageexpo.com" and "hello@digitalageexpo.com"
 *  were literals in dozens more. That was correct while there was one site and became wrong the
 *  moment there were two, because BOTH SITES RUN FROM THIS ONE CODEBASE.
 *
 *  Which is the thing worth being explicit about, because the instinct is exactly backwards:
 *  find-and-replacing the brand in the source does not create a second brand. It renames the
 *  first one. digitalageexpo.com would start calling itself B2B Growth Expo on every page, and no
 *  amount of per-site data would undo it, because the string never came from data at all.
 *
 *  getDomain() is already memoised per request (React cache()), so calling any of these from
 *  forty components costs one resolution — which matters on a ten-connection pool.
 */

/** Scheme, www. and any trailing slash removed: "digitalageexpo.com", never "https://…/". */
function bareHost(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "")
    .replace(/\.+$/, "");
}

/**
 * Everything a page needs to say who and where this site is.
 *
 * One call rather than three, because a component printing a contact block wants all of it and
 * three awaits would read as three lookups even though getDomain memoises them into one.
 *
 * EVERY FIELD FALLS BACK TO THE MAIN SITE'S. A page that cannot reach the database still has to
 * render a title and a contact line, and the main site's details are this deployment's own
 * fallback identity — far better than an empty string appearing mid-sentence in a meta
 * description, or a contact block with a blank where the address should be.
 */
export async function getBrand(): Promise<{
  name: string;
  host: string;
  email: string;
  phone: string;
}> {
  try {
    const domain = await getDomain();
    return {
      name: domain.name?.trim() || DEFAULT_BRAND_NAME,
      host: bareHost(domain.link) || "digitalageexpo.com",
      email: domain.email?.trim() || "hello@digitalageexpo.com",
      phone: domain.phone?.trim() || "",
    };
  } catch {
    return {
      name: DEFAULT_BRAND_NAME,
      host: "digitalageexpo.com",
      email: "hello@digitalageexpo.com",
      phone: "",
    };
  }
}

/** The site's name on its own — the common case, and what <Brand /> renders. */
export async function getBrandName(): Promise<string> {
  return (await getBrand()).name;
}
