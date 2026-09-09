import { prisma } from "@/lib/prisma";
import { appliesToDomain } from "@/lib/services/menu";
import { getSiteId } from "@/lib/services/domain";

const PAGE_SIZE = 20;

/**
 * Backs the general site Menu Manager module (find_menu_links) — top-level nav, footer links,
 * etc. find_menu_links is shared across every domain the legacy install ever hosted (this table
 * had 727 rows from other sites mixed in), so every read here is scoped through the exact same
 * appliesToDomain() check the live public navbar's getMenu() uses (src/lib/services/menu.ts) —
 * otherwise this page would show (and let an admin edit) other sites' menu links, none of which
 * affect this site at all.
 *
 * domain_id is a free-form comma-separated VarChar column, not something Prisma/Postgres can
 * filter on directly for "is 150 one of these comma-separated values" — so this fetches the
 * (title/link search-narrowed) candidate rows and applies appliesToDomain() in JS, then paginates
 * the already-filtered array. At this table's real size (a few hundred rows even before
 * scoping down to one domain) that's negligible compared to a round trip to Neon.
 */
export async function listMenuLinks(params: { page?: number; search?: string } = {}) {
  const page = Math.max(1, params.page ?? 1);
  const search = params.search?.trim();

  const where = search
    ? { OR: [{ title: { contains: search } }, { link: { contains: search } }] }
    : {};

  const allMatching = await prisma.find_menu_links.findMany({
    where,
    orderBy: [{ parent_id: "asc" }, { ordering: "asc" }],
    select: {
      id: true,
      title: true,
      link: true,
      target: true,
      parent_id: true,
      ordering: true,
      active: true,
      domain_id: true,
    },
  });
  const siteId = await getSiteId();
  const scoped = allMatching.filter((row) => appliesToDomain(row.domain_id, siteId));

  const total = scoped.length;
  const links = scoped.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return { links, total, page, pageSize: PAGE_SIZE };
}

export async function getMenuLinkForEdit(id: number) {
  return prisma.find_menu_links.findUnique({ where: { id } });
}

export async function listTopLevelLinks() {
  const rows = await prisma.find_menu_links.findMany({
    where: { parent_id: null },
    orderBy: { ordering: "asc" },
    select: { id: true, title: true, domain_id: true },
  });
  const siteId = await getSiteId();
  return rows.filter((row) => appliesToDomain(row.domain_id, siteId));
}

export interface MenuLinkInput {
  title: string;
  link: string;
  parent_id: number | null;
  target: string;
  ordering: number;
  active: boolean;
  logged_in: boolean;
  logged_out: boolean;
  icon: string;
  color: string;
}

function toDb(input: MenuLinkInput) {
  return {
    title: input.title,
    link: input.link,
    parent_id: input.parent_id,
    target: input.target,
    ordering: input.ordering,
    active: input.active ? 1 : 0,
    logged_in: input.logged_in ? 1 : 0,
    logged_out: input.logged_out ? 1 : 0,
    icon: input.icon || null,
    color: input.color || null,
  };
}

export async function createMenuLink(input: MenuLinkInput): Promise<number> {
  const created = await prisma.find_menu_links.create({
    data: {
      ...toDb(input),
      nofollow: 0,
      sitemap: 1,
      sitemap_xml: 1,
      base_url: false,
      // New links created from this CP belong to this site specifically — never left blank
      // (which the legacy "applies everywhere" convention would treat as global/shared across
      // every domain in the install).
      domain_id: String(await getSiteId()),
    },
    select: { id: true },
  });
  return created.id;
}

export async function updateMenuLink(id: number, input: MenuLinkInput): Promise<void> {
  await prisma.find_menu_links.update({ where: { id }, data: toDb(input) });
}

export async function deleteMenuLink(id: number): Promise<void> {
  // Re-parent any children up to the deleted item's own parent, rather than orphaning them
  // under a parent_id that no longer exists.
  const link = await prisma.find_menu_links.findUnique({ where: { id }, select: { parent_id: true } });
  await prisma.find_menu_links.updateMany({ where: { parent_id: id }, data: { parent_id: link?.parent_id ?? null } });
  await prisma.find_menu_links.delete({ where: { id } });
}
