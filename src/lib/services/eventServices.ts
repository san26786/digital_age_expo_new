import { prisma } from "@/lib/prisma";

export interface EventAddonService {
  code: string;
  title: string;
  description: string | null;
  price: string | null;
}

/**
 * Mirrors event-services.php, which loads its service list via
 * `Common->getMastersByTypCD('DAEES')` — a join of common_type (typ_cd='DAEES') to
 * independent_mst — rather than hardcoded page copy. Not event-scoped: this is shared
 * master data reused across every event on the platform.
 */
export async function getEventAddonServices(): Promise<EventAddonService[]> {
  const type = await prisma.common_type.findUnique({
    where: { typ_cd: "DAEES" },
    select: { id: true },
  });
  if (!type) return [];

  const rows = await prisma.independent_mst.findMany({
    where: { typ_id: type.id, status: "enabled" },
    orderBy: [{ sequence: "asc" }, { id: "asc" }],
    select: {
      mstr_cd: true,
      mstr_nm: true,
      mstr_desc: true,
      business_value: true,
    },
  });

  return rows.map((r: any) => ({
    code: r.mstr_cd ?? "",
    title: r.mstr_nm,
    description: r.mstr_desc,
    price: r.business_value !== null && r.business_value !== undefined ? String(r.business_value) : null,
  }));
}

export interface MasterOption {
  code: string;
  label: string;
}

/**
 * Generic equivalent of the legacy `Common->getAssocMstrCDMstrNmByTypCD($typCd)` — the
 * common_type row named by `typCd`, joined to its independent_mst children.
 *
 * Used by the Lobby Agenda form for "TST" (session/buffer durations) and "AGTYPE" (hall types).
 * Shared platform master data, not event-scoped.
 */
export async function getMasterOptions(typCd: string): Promise<MasterOption[]> {
  const type = await prisma.common_type.findUnique({
    where: { typ_cd: typCd },
    select: { id: true },
  });
  if (!type) return [];

  const rows = await prisma.independent_mst.findMany({
    where: { typ_id: type.id, status: "enabled" },
    orderBy: [{ sequence: "asc" }, { id: "asc" }],
    select: { mstr_cd: true, mstr_nm: true },
  });

  return rows
    .filter((r: any) => r.mstr_cd)
    .map((r: any) => ({ code: String(r.mstr_cd), label: r.mstr_nm ?? String(r.mstr_cd) }));
}
