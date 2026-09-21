"use client";

import { createContext, useContext } from "react";
import { DEFAULT_BRAND_NAME } from "@/lib/constants/brandName";

export interface ClientBrand {
  name: string;
  host: string;
  email: string;
  phone: string;
}

/**
 * The site's identity for CLIENT components.
 *
 * They cannot call getBrand() — it reaches the database — so it is resolved once on the server in
 * the root layout and handed down. One value, set in one place, rather than threading props
 * through every intermediate component that does not itself care about the brand.
 *
 * It carries the contact details as well as the name because the components that print a phone
 * number or an email are exactly the ones that are usually interactive, and a second mechanism
 * for "the same site, but its email" would be one too many.
 *
 * The default is the main site's, so a component rendered outside the provider prints something
 * sensible rather than blanks in the middle of a contact block.
 */
const BrandContext = createContext<ClientBrand>({
  name: DEFAULT_BRAND_NAME,
  host: "digitalageexpo.com",
  email: "hello@digitalageexpo.com",
  phone: "",
});

export function BrandProvider({ brand, children }: { brand: ClientBrand; children: React.ReactNode }) {
  return <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>;
}

export function useBrand(): ClientBrand {
  return useContext(BrandContext);
}
