import { getBrandName } from "@/lib/brand";

/**
 * This site's name, as a component.
 *
 * ---------------------------------------------------------------------------
 *  WHY A COMPONENT RATHER THAN A VARIABLE
 * ---------------------------------------------------------------------------
 *
 *  The alternative was to add `const brand = await getBrandName();` to each of the forty-odd
 *  server components that print the name, which means editing every component's body and, for
 *  the ones that are not async yet, its signature too. Forty mechanical edits across files with
 *  no typecheck available is how a rename takes a site down.
 *
 *  An async server component needs none of that. `Digital Age Expo` in JSX becomes `<Brand />`
 *  and nothing else about the file changes — no new import inside the function, no signature
 *  change, no risk of inserting a statement into the wrong scope.
 *
 *  It does NOT work inside attributes (alt="…", title="…") or plain strings, which are handled
 *  by getBrandName() at the point they are built. That limit is the reason this is one of two
 *  mechanisms rather than the only one.
 */
export async function Brand() {
  return <>{await getBrandName()}</>;
}
