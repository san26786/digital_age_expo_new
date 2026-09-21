import type { Metadata } from "next";
import { getBrandName } from "@/lib/brand";
import MembersLoginPage from "@/app/members/index/page";

export async function generateMetadata(): Promise<Metadata> {
  // The site's own name, so this page titles itself correctly on every site this
  // deployment serves rather than hardcoding the one it was first written for.
  const brand = await getBrandName();
  return {
  title: `Member Login | ${brand}`,
  description: "Sign in to manage your schedule, exhibition stands, and account details.",
};
}

export default function LoginPage() {
  return <MembersLoginPage />;
}

