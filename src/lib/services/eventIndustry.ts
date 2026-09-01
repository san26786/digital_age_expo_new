import { prisma } from "@/lib/prisma";
import { industrySchema, type IndustryInput } from "@/lib/validations/eventIndustry";

/** independent_mst is a shared, non-event-scoped reference table keyed by typ_id — 7 is the
 * "Industry" record type (mirrors members/view_industry_list.php's `where typ_id=7`). */
const INDUSTRY_TYP_ID = 7;

export interface IndustryRow {
  id: number;
  name: string;
  code: string;
  service?: string;
  description: string;
  numberOfCategory: null;
}

function toRow(row: { id: number; mstr_nm: string; mstr_cd: string | null; mstr_desc: string | null }): IndustryRow {
  return {
    id: row.id,
    name: row.mstr_nm,
    code: row.mstr_cd ?? "",
    service: "",
    description: row.mstr_desc ?? "",
    numberOfCategory: null,
  };
}

const DEFAULT_INDUSTRIES: IndustryRow[] = [
  {
    id: 1,
    name: "Information Technology & Software",
    code: "IT-01",
    service: "Cloud & AI",
    description: "Enterprise software, cloud computing, cybersecurity, AI solutions, SaaS platforms, and digital infrastructure.",
    numberOfCategory: null,
  },
  {
    id: 2,
    name: "Healthcare, Biotech & Life Sciences",
    code: "HC-02",
    service: "Medical Tech",
    description: "Medical devices, digital health technologies, clinical research, genetics, and pharmaceutical innovations.",
    numberOfCategory: null,
  },
  {
    id: 3,
    name: "Manufacturing & Industrial Automation",
    code: "MFG-03",
    service: "Robotics & IoT",
    description: "Industry 4.0, robotics, smart factory solutions, supply chain systems, and advanced additive manufacturing.",
    numberOfCategory: null,
  },
  {
    id: 4,
    name: "Financial Technology & Banking",
    code: "FIN-04",
    service: "FinTech & Banking",
    description: "Payment processing, digital banking, blockchain, InsurTech, RegTech, and wealth management platforms.",
    numberOfCategory: null,
  },
  {
    id: 5,
    name: "Renewable Energy & Cleantech",
    code: "ENG-05",
    service: "Clean Energy",
    description: "Solar and wind energy, clean technology, ESG compliance, smart grid systems, and carbon management.",
    numberOfCategory: null,
  },
  {
    id: 6,
    name: "Automotive & Smart Mobility",
    code: "AUTO-06",
    service: "Electric Mobility",
    description: "Electric vehicles, autonomous drive systems, connected fleet technology, and next-gen transit infrastructure.",
    numberOfCategory: null,
  },
  {
    id: 7,
    name: "Retail, E-Commerce & Consumer Tech",
    code: "RET-07",
    service: "E-Commerce",
    description: "Omnichannel retail systems, e-commerce platforms, automated fulfillment, and personalized customer experience.",
    numberOfCategory: null,
  },
  {
    id: 8,
    name: "Education Technology & EdTech",
    code: "ED-08",
    service: "Learning Platforms",
    description: "Learning management systems, corporate training platforms, AI tutoring, and interactive distance learning.",
    numberOfCategory: null,
  },
  {
    id: 9,
    name: "Real Estate & PropTech",
    code: "PROP-09",
    service: "PropTech & Building",
    description: "Property management automation, smart building sensors, HVAC control systems, and urban development tech.",
    numberOfCategory: null,
  },
  {
    id: 10,
    name: "Media, Entertainment & Gaming",
    code: "MED-10",
    service: "Digital Media",
    description: "Digital content broadcasting, interactive gaming, immersive AR/VR platforms, and web3 media production.",
    numberOfCategory: null,
  },
];

export async function getIndustries(search?: string): Promise<IndustryRow[]> {
  const keyword = search?.trim();
  try {
    const rows = await prisma.independent_mst.findMany({
      where: {
        typ_id: INDUSTRY_TYP_ID,
        ...(keyword
          ? {
              OR: [{ mstr_nm: { contains: keyword } }, { mstr_cd: { contains: keyword } }, { mstr_desc: { contains: keyword } }],
            }
          : {}),
      },
      select: { id: true, mstr_nm: true, mstr_cd: true, mstr_desc: true },
      orderBy: { id: "desc" },
      take: 100,
    });
    // Return the real DB result as-is, including a genuinely empty list — an empty table is a
    // valid state and must not be masked by the sample fallback below (that fallback is only for
    // when the database itself can't be reached).
    return rows.map(toRow);
  } catch (err) {
    console.warn("[eventIndustry] DB query failed, showing sample industries instead", err);
  }

  if (keyword) {
    const q = keyword.toLowerCase();
    return DEFAULT_INDUSTRIES.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.code.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q)
    );
  }
  return DEFAULT_INDUSTRIES;
}

export async function createIndustry(input: IndustryInput): Promise<IndustryRow> {
  const row = await prisma.independent_mst.create({
    data: {
      mstr_nm: input.mstr_nm,
      mstr_cd: input.mstr_cd || null,
      mstr_desc: input.mstr_desc || null,
      typ_id: INDUSTRY_TYP_ID,
      // NOT NULL with no DB-level default Prisma is aware of — 0 mirrors what every other
      // independent_mst row of this type carries in practice (this column isn't surfaced on
      // the Industry form at all, legacy or here).
      business_value: 0,
    },
    select: { id: true, mstr_nm: true, mstr_cd: true, mstr_desc: true },
  });
  return toRow(row);
}

export async function updateIndustry(id: number, input: IndustryInput): Promise<IndustryRow> {
  const row = await prisma.independent_mst.update({
    where: { id },
    data: {
      mstr_nm: input.mstr_nm,
      mstr_cd: input.mstr_cd || null,
      mstr_desc: input.mstr_desc || null,
    },
    select: { id: true, mstr_nm: true, mstr_cd: true, mstr_desc: true },
  });
  return toRow(row);
}

export async function deleteIndustry(id: number): Promise<void> {
  // Mirrors the legacy action=delete_industry branch's plain `DELETE FROM independent_mst`.
  await prisma.independent_mst.delete({ where: { id } });
}

export interface IndustryImportResult {
  created: number;
  /** Rows whose code (or name, when the code is blank) already exists. */
  skipped: number;
  skippedNames: string[];
  /** Rows rejected by industrySchema — reported rather than silently dropped. */
  invalid: { row: number; name: string; reason: string }[];
}

/**
 * Bulk counterpart of createIndustry(), backing the CSV import on the Event Industry page.
 *
 * Duplicate detection happens HERE rather than in the browser on purpose: getIndustries() caps at
 * 100 rows, so the client cannot see the full set of existing codes and would happily re-create
 * anything past that cap. Matching is on mstr_cd case-insensitively, falling back to mstr_nm when
 * a row carries no code (the legacy form allows blank codes).
 *
 * Rows already present are SKIPPED, never updated — an import must not silently overwrite a
 * description someone edited by hand. Re-importing the same file is therefore a no-op.
 */
export async function importIndustries(rows: IndustryInput[]): Promise<IndustryImportResult> {
  const existing = await prisma.independent_mst.findMany({
    where: { typ_id: INDUSTRY_TYP_ID },
    select: { mstr_cd: true, mstr_nm: true },
  });

  const haveCodes = new Set(
    existing
      .map((r: { mstr_cd: string | null }) => (r.mstr_cd ?? "").trim().toLowerCase())
      .filter((c: string) => c !== ""),
  );
  const haveNames = new Set(
    existing.map((r: { mstr_nm: string }) => r.mstr_nm.trim().toLowerCase()),
  );

  const result: IndustryImportResult = { created: 0, skipped: 0, skippedNames: [], invalid: [] };
  const toCreate: { mstr_nm: string; mstr_cd: string | null; mstr_desc: string | null }[] = [];

  rows.forEach((raw, index) => {
    const parsed = industrySchema.safeParse(raw);
    if (!parsed.success) {
      const fields = parsed.error.flatten().fieldErrors;
      const reason =
        Object.values(fields).find((m) => Array.isArray(m) && m.length > 0)?.[0] ?? "Invalid row";
      result.invalid.push({ row: index + 1, name: String(raw?.mstr_nm ?? "").slice(0, 60), reason });
      return;
    }

    const input = parsed.data;
    const code = (input.mstr_cd ?? "").trim().toLowerCase();
    const name = input.mstr_nm.trim().toLowerCase();

    // A file that repeats a row is deduped too, not just a row that clashes with the database.
    const duplicate = code ? haveCodes.has(code) : haveNames.has(name);
    if (duplicate) {
      result.skipped += 1;
      result.skippedNames.push(input.mstr_nm);
      return;
    }
    if (code) haveCodes.add(code);
    haveNames.add(name);

    toCreate.push({
      mstr_nm: input.mstr_nm,
      mstr_cd: input.mstr_cd || null,
      mstr_desc: input.mstr_desc || null,
    });
  });

  if (toCreate.length > 0) {
    // Same column set createIndustry() writes; business_value is NOT NULL with no default.
    await prisma.independent_mst.createMany({
      data: toCreate.map((r) => ({ ...r, typ_id: INDUSTRY_TYP_ID, business_value: 0 })),
    });
    result.created = toCreate.length;
  }

  return result;
}
