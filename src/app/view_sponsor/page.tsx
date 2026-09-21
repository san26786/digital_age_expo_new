import type { Metadata } from "next";
import { getBrandName } from "@/lib/brand";
import SponsorsPage from "@/app/sponsors/page";

export async function generateMetadata(): Promise<Metadata> {
  // The site's own name, so this page titles itself correctly on every site this
  // deployment serves rather than hardcoding the one it was first written for.
  const brand = await getBrandName();
  return {
  title: `View All Sponsors | ${brand}`,
  description: `Explore all official sponsors and brand partners at ${brand}.`,
};
}

export default SponsorsPage;
