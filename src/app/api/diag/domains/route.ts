/**
 * DEV-ONLY domain roster — what `find_domains` actually holds, for the multi-site work.
 *
 *   GET /api/diag/domains
 *
 * The legacy PHP site resolved tenants by host against this table; this endpoint exists to
 * confirm WHICH column carries the hostname before the tenant resolver is written against it.
 * Returns 404 in production.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const rows = await prisma.find_domains.findMany({
    orderBy: { id: "asc" },
    select: {
      id: true,
      name: true,
      brand: true,
      link: true,
      extension: true,
      status: true,
      parent_domain: true,
      domain_code: true,
      domain_group_cd: true,
      is_cms_domain: true,
      event_id: true,
      system_use_flag: true,
    },
  });

  return NextResponse.json(
    { count: rows.length, domains: rows },
    { headers: { "cache-control": "no-store" } }
  );
}
