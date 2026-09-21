"use client";

import { useBrand } from "@/components/brand/BrandProvider";

/**
 * The client-side twin of <Brand />: this site's name as a component.
 *
 * Client components cannot await the site's name, so the alternative was to add
 * `const brand = useBrand();` to each one and then reference it — which means finding the right
 * function body in every file and inserting a statement into it. Across two dozen components,
 * with no typecheck available on this machine, that is a lot of chances to put a hook in the
 * wrong scope or inside a conditional and break a page that was previously fine.
 *
 * This needs none of that: the text becomes a component, the hook lives here, and the file it is
 * dropped into is otherwise untouched.
 */
export function BrandText() {
  return <>{useBrand().name}</>;
}

/** This site's contact email, for the places that print one. */
export function BrandEmail() {
  return <>{useBrand().email}</>;
}

/** This site's hostname, without scheme or www. */
export function BrandHost() {
  return <>{useBrand().host}</>;
}
