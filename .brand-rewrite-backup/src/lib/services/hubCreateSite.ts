import { prisma } from "@/lib/prisma";
import { COPY_TOGGLES, withDependencies, type CopyToggleKey } from "@/lib/hub/copyOptions";
import { DOMAIN_ID, ACTIVE_EVENT_SETTING_VARNAME } from "@/lib/site-config";

/**
 * ===========================================================================
 *  CREATING A SITE — THE PART THAT ACTUALLY WRITES
 * ===========================================================================
 *
 *  Phase 2 of docs/multi-site-spec.md: the shell clone, plus the content toggles whose tables
 *  are flat copies keyed only on event_id. The exhibition hall is deliberately NOT here — see
 *  `implemented: false` in copyOptions.ts and the note at the bottom of this file.
 *
 *  ---------------------------------------------------------------------------
 *  THREE DECISIONS THAT ARE NOT OBVIOUS FROM THE CODE
 *  ---------------------------------------------------------------------------
 *
 *  1. NO INTERACTIVE TRANSACTION, ON PURPOSE.
 *
 *     Wrapping this in `prisma.$transaction(async tx => ...)` is the first instinct and it is
 *     the wrong one here, for a reason specific to this app. The client is wrapped in admission
 *     control (see `admit()` in prisma.ts), which queues queries above a concurrency ceiling.
 *     That queue is safe only because — in the words of the comment that guards it — "nothing in
 *     this codebase uses an interactive $transaction, so a query can never be waiting here while
 *     holding a connection something else needs." An interactive transaction breaks exactly that
 *     invariant: it holds a connection for its whole life while its individual statements queue
 *     behind other requests, which under any concurrency is a deadlock.
 *
 *     And even without the queue, copying a thousand exhibitors over this link inside one
 *     transaction would pin a connection for minutes.
 *
 *     So the writes are sequential, and the rollback is a COMPENSATING DELETE: if any step
 *     fails, everything already written is removed by the same code path the Hub's delete button
 *     uses. That is weaker than a transaction — a crash between two steps leaves a partial site —
 *     but a partial site is visible in the Hub, marked as Hub-created, and removable in one
 *     click, which is a recoverable state rather than a corrupt one.
 *
 *  2. PAYMENT CREDENTIALS ARE BLANKED, NEVER COPIED.
 *
 *     `find_domains` carries paypal_live_key, paypal_test_key, paypal_account_id, stripe_pk_key,
 *     stripe_sk_key, razorpay_pk_key and razorpay_sk_key as NON-NULLABLE columns. The natural
 *     implementation — read the source row, spread it, override a few fields — therefore copies
 *     the source site's live payment credentials into the new site by default, silently. A new
 *     London or B2B site would take real money into Digital Age Expo's merchant accounts, and
 *     nothing on screen would say so.
 *
 *     They are blanked to empty strings. The new site cannot take payment until someone enters
 *     its own keys, which is the only correct default.
 *
 *  3. THE SOURCE ROW IS SPREAD, NOT ENUMERATED.
 *
 *     `find_events` has ~40 required columns and `find_domains` has ~19. Listing them by hand
 *     would break the first time either table gains a column. Reading the source row and
 *     overriding the handful that must differ keeps the clone correct by construction — at the
 *     cost of needing an explicit blocklist for fields that must NOT carry over, which is what
 *     the payment keys above are.
 */

/** Never carried from the source site, whatever else is copied. See decision 2 above. */
const DOMAIN_FIELDS_BLANKED: Record<string, string> = {
  paypal_live_key: "",
  paypal_test_key: "",
  paypal_account_id: "",
  stripe_pk_key: "",
  stripe_sk_key: "",
  razorpay_pk_key: "",
  razorpay_sk_key: "",
};

/**
 * Exhibitor columns that describe WHERE a stand sits in the hall.
 *
 * Cleared in "unallocated" mode — but also cleared in "allocated" mode today, because the hall
 * these ids point into is not copied yet. Keeping them would leave every exhibitor pointing at a
 * zone and spot belonging to the SOURCE event: the new site's exhibitor list would look allocated
 * while every booth link led into another show's hall.
 */
const EXHIBITOR_ALLOCATION_FIELDS = [
  "exhibition_zone_id",
  "spot_id",
  "stand_number",
  "ex_stand_layout_id",
  "stand_color_id",
] as const;

/** Rows per insert. Large enough to be few round trips, small enough not to build a giant query. */
const CHUNK = 400;

export interface CreateSiteInput {
  /** Hostname, already normalised (no scheme, no www.). */
  domain: string;
  name: string;
  slug: string;
  year: string;
  email: string;
  company: string;
  sourceDomainId: number;
  sourceEventId: number;
  heroLayout: string;
  colourScheme: string;
  selections: Record<CopyToggleKey, boolean>;
  exhibitorMode: "unallocated" | "allocated";
}

export interface CreateSiteResult {
  domainId: number;
  eventId: number;
  copied: { key: CopyToggleKey; label: string; rows: number; skipped: string[] }[];
}

type Row = Record<string, unknown>;

const client = () =>
  prisma as unknown as Record<
    string,
    | {
        findMany?: (args: unknown) => Promise<Row[]>;
        createMany?: (args: unknown) => Promise<{ count: number }>;
        deleteMany?: (args: unknown) => Promise<{ count: number }>;
      }
    | undefined
  >;

/**
 * Copy every row of one table from one event to another, returning how many landed.
 *
 * `skipDuplicates` is set because these legacy tables carry unique indexes this code has no map
 * of; a collision should cost one row, not the whole site creation.
 */
async function copyTable(model: string, fromEventId: number, toEventId: number, mutate?: (row: Row) => Row): Promise<number> {
  const delegate = client()[model];
  if (!delegate?.findMany || !delegate.createMany) return 0;

  const rows = await delegate.findMany({ where: { event_id: fromEventId } });
  if (rows.length === 0) return 0;

  let written = 0;
  for (let index = 0; index < rows.length; index += CHUNK) {
    const batch = rows.slice(index, index + CHUNK).map((row) => {
      // `id` is dropped so Postgres assigns a new one; keeping it would collide with the source.
      const { id: _ignored, ...rest } = row as Row & { id?: unknown };
      const next: Row = { ...rest, event_id: toEventId };
      return mutate ? mutate(next) : next;
    });

    const result = await delegate.createMany({ data: batch, skipDuplicates: true });
    written += result.count;
  }

  return written;
}

/**
 * Create the site.
 *
 * Throws on failure, having first removed whatever it had already written. The caller gets either
 * a complete site or none at all, outside of a hard crash mid-flight.
 */
export async function createSite(input: CreateSiteInput, actor: string | null): Promise<CreateSiteResult> {
  const anyPrisma = prisma as unknown as {
    find_events: { findUnique: (a: unknown) => Promise<Row | null>; create: (a: unknown) => Promise<{ id: number }> };
    find_domains: {
      findUnique: (a: unknown) => Promise<Row | null>;
      findFirst: (a: unknown) => Promise<Row | null>;
      create: (a: unknown) => Promise<{ id: number }>;
    };
    $executeRaw: (strings: TemplateStringsArray, ...values: unknown[]) => Promise<number>;
  };

  // ---- Guards, before anything is written ------------------------------------------------
  const clash = await anyPrisma.find_domains.findFirst({
    where: { link: { contains: input.domain, mode: "insensitive" } },
    select: { id: true, link: true },
  });
  if (clash) {
    throw new Error(`${input.domain} is already used by site #${(clash as { id: number }).id}.`);
  }

  const sourceEvent = await anyPrisma.find_events.findUnique({ where: { id: input.sourceEventId } });
  if (!sourceEvent) throw new Error(`Source event ${input.sourceEventId} not found.`);

  const sourceDomain = await anyPrisma.find_domains.findUnique({ where: { id: input.sourceDomainId } });
  if (!sourceDomain) throw new Error(`Source site ${input.sourceDomainId} not found.`);

  const resolved = withDependencies(input.selections);
  const now = new Date();

  let newEventId: number | null = null;
  let newDomainId: number | null = null;

  try {
    // ---- 1. The event ----------------------------------------------------------------------
    const { id: _eventId, ...eventRest } = sourceEvent as Row & { id?: unknown };
    const createdEvent = await anyPrisma.find_events.create({
      data: {
        ...eventRest,
        title: input.name,
        friendly_url: input.slug,
        // Never "active": a site nobody has checked yet must not present itself as a live show.
        status: "pending",
        email: input.email.trim() || (eventRest.email as string) || "",
        created_at: now,
        updated_at: now,
      },
    });
    newEventId = createdEvent.id;

    // ---- 2. The site row -------------------------------------------------------------------
    const { id: _domainId, ...domainRest } = sourceDomain as Row & { id?: unknown };
    const createdDomain = await anyPrisma.find_domains.create({
      data: {
        ...domainRest,
        ...DOMAIN_FIELDS_BLANKED,
        name: input.name,
        brand: input.name,
        link: input.domain,
        email: input.email.trim() || null,
        event_id: newEventId,
        virtual_event_id: newEventId,
        // Inactive until someone has looked at it. Host routing is not live yet either, so this
        // is belt and braces rather than the only thing keeping it off the internet.
        status: false,
      },
    });
    newDomainId = createdDomain.id;

    // ---- 3. Settings -----------------------------------------------------------------------
    /*
     * The source site's settings, copied wholesale for the new DOMAIN — branding, labels, feature
     * switches, the lot. Without this a new site has no settings rows at all and every read falls
     * through to a hardcoded default, which is why it would look like Digital Age Expo with a
     * different name rather than like its own site.
     *
     * INSERT ... SELECT rather than read-then-write: find_settings is @@ignore'd (no primary key,
     * so Prisma generates no delegate for it), and a few hundred rows should not become a few
     * hundred round trips over this link.
     *
     * THE ACTIVE-EVENT SETTING IS DELIBERATELY EXCLUDED, and getting this wrong would break the
     * site quietly. getDomain() prefers that setting over the site's own find_domains.event_id —
     * so copying the source's value would point the new site straight back at the source's show,
     * and the new site would serve Digital Age Expo's content under its own name while every row
     * in the database said otherwise. It is written separately below, pointing at the new event.
     */
    await anyPrisma.$executeRaw`
      INSERT INTO find_settings
        (varname, grouptitle, value, optioncode, optioncode_type, optioncode_parse_type, validationcode, "DOMAIN")
      SELECT varname, grouptitle, value, optioncode, optioncode_type, optioncode_parse_type, validationcode, ${newDomainId}
      FROM find_settings
      WHERE "DOMAIN" = ${input.sourceDomainId}
        AND varname <> ${ACTIVE_EVENT_SETTING_VARNAME}
    `;

    await anyPrisma.$executeRaw`
      INSERT INTO find_settings
        (varname, grouptitle, value, optioncode_type, optioncode_parse_type, "DOMAIN")
      VALUES (
        ${ACTIVE_EVENT_SETTING_VARNAME}, 'events', ${String(newEventId)},
        'text'::find_settings_optioncode_type, 'static'::find_settings_optioncode_parse_type,
        ${newDomainId}
      )
    `;

    // ---- 4. Provenance ---------------------------------------------------------------------
    /*
     * Written through raw SQL because find_settings is @@ignore'd in the schema — it has no
     * primary key, so Prisma generates no delegate for it.
     *
     * This row is what makes deletion safe. The delete path removes a site ONLY if this marker
     * is present, so it can never be pointed at Digital Age Expo or at any row that predates the
     * Hub. "DOMAIN" is quoted because the column is uppercase in the legacy schema.
     */
    const provenance = JSON.stringify({
      sourceDomainId: input.sourceDomainId,
      sourceEventId: input.sourceEventId,
      eventId: newEventId,
      heroLayout: input.heroLayout,
      colourScheme: input.colourScheme,
      company: input.company,
      year: input.year,
      createdAt: now.toISOString(),
      createdBy: actor,
    });

    await anyPrisma.$executeRaw`
      INSERT INTO find_settings (varname, grouptitle, value, optioncode_type, optioncode_parse_type, "DOMAIN")
      VALUES ('hub_site_origin', 'hub', ${provenance}, 'text'::find_settings_optioncode_type, 'static'::find_settings_optioncode_parse_type, ${newDomainId})
    `;

    // ---- 5. Content ------------------------------------------------------------------------
    const copied: CreateSiteResult["copied"] = [];

    for (const toggle of COPY_TOGGLES) {
      if (!resolved[toggle.key] || !toggle.implemented) continue;

      let rows = 0;
      const skipped: string[] = [];

      for (const model of toggle.models) {
        const delegate = client()[model];
        if (!delegate?.findMany || !delegate.createMany) {
          skipped.push(model);
          continue;
        }

        try {
          rows += await copyTable(
            model,
            input.sourceEventId,
            newEventId,
            toggle.key === "exhibitors"
              ? (row) => {
                  const next = { ...row };
                  for (const field of EXHIBITOR_ALLOCATION_FIELDS) next[field] = null;
                  return next;
                }
              : undefined
          );
        } catch {
          /*
           * One table failing does not abandon the site. find_event_registration_fields, for
           * one, is in the schema but was never migrated into Neon, so it throws 42P01 on every
           * read — and losing a whole site creation to a table that has not existed for months
           * would be absurd. It is recorded and reported instead.
           */
          skipped.push(model);
        }
      }

      copied.push({ key: toggle.key, label: toggle.label, rows, skipped });
    }

    return { domainId: newDomainId, eventId: newEventId, copied };
  } catch (error) {
    /*
     * Compensating rollback — see decision 1 at the top of this file.
     *
     * NOT via removeHubSite(). That was the first version and it was wrong in the one case that
     * matters most: removeHubSite refuses any site without a `hub_site_origin` marker, and the
     * marker is written AFTER the domain row — so a failure at or before the marker (the enum
     * mismatch that this code was first tested with, for instance) left the rollback refusing to
     * clean up its own half-built site, and the orphan rows behind. The guard was right; calling
     * it from here was not.
     *
     * So the rollback deletes by the ids it is holding. It does not look anything up, cannot be
     * pointed at another site, and does not depend on any row it may have failed to write.
     */
    await hardRemove(newDomainId, newEventId);
    throw error;
  }
}

/**
 * Delete exactly these ids. Internal to creation's failure path — never exported, never reached
 * from a request, and deliberately not guarded, because its caller created these ids moments ago
 * and holds them directly. Best-effort throughout: it runs while a real error is on its way up
 * and must never replace it with one of its own.
 */
async function hardRemove(domainId: number | null, eventId: number | null): Promise<void> {
  const anyPrisma = prisma as unknown as {
    find_domains: { deleteMany: (a: unknown) => Promise<{ count: number }> };
    find_events: { deleteMany: (a: unknown) => Promise<{ count: number }> };
    $executeRaw: (s: TemplateStringsArray, ...v: unknown[]) => Promise<number>;
  };

  if (eventId !== null) {
    for (const toggle of COPY_TOGGLES) {
      if (!toggle.implemented) continue;
      for (const model of toggle.models) {
        const delegate = client()[model];
        if (!delegate?.deleteMany) continue;
        await delegate.deleteMany({ where: { event_id: eventId } }).catch(() => undefined);
      }
    }
    await anyPrisma.find_events.deleteMany({ where: { id: eventId } }).catch(() => undefined);
  }

  if (domainId !== null) {
    await anyPrisma.$executeRaw`DELETE FROM find_settings WHERE "DOMAIN" = ${domainId}`.catch(
      () => undefined
    );
    await anyPrisma.find_domains.deleteMany({ where: { id: domainId } }).catch(() => undefined);
  }
}

/**
 * Remove a site the Hub created, and everything it created with it.
 *
 * ---------------------------------------------------------------------------
 *  THE GUARDS ARE THE FEATURE
 * ---------------------------------------------------------------------------
 *
 *  This function deletes rows for a living business. Three separate things have to be true
 *  before it touches anything, and each one independently would have prevented the accident it
 *  is named for:
 *
 *    - The site is not DOMAIN_ID. The row this deployment serves is never deletable, by id,
 *      first, before any lookup.
 *    - A `hub_site_origin` setting exists for it. Only the Hub writes that, so a site created by
 *      hand, imported, or predating this feature cannot be removed here however it is reached.
 *    - The event to clear is read from that marker, not from a parameter. A caller cannot ask
 *      this to delete one site's row and another site's content.
 */
export async function removeHubSite(domainId: number): Promise<{ deletedRows: number }> {
  if (domainId === DOMAIN_ID) {
    throw new Error("That is the site this deployment serves. It cannot be deleted from here.");
  }

  const anyPrisma = prisma as unknown as {
    find_domains: { deleteMany: (a: unknown) => Promise<{ count: number }> };
    find_events: { deleteMany: (a: unknown) => Promise<{ count: number }> };
    $queryRaw: (s: TemplateStringsArray, ...v: unknown[]) => Promise<{ value: string | null }[]>;
    $executeRaw: (s: TemplateStringsArray, ...v: unknown[]) => Promise<number>;
  };

  const marker = await anyPrisma.$queryRaw<{ value: string | null }[]>`
    SELECT value FROM find_settings
    WHERE varname = 'hub_site_origin' AND "DOMAIN" = ${domainId}
    LIMIT 1
  `;

  if (marker.length === 0) {
    throw new Error("That site was not created by the Hub, so the Hub will not delete it.");
  }

  let eventId: number | null = null;
  try {
    eventId = JSON.parse(marker[0].value ?? "{}").eventId ?? null;
  } catch {
    eventId = null;
  }

  let deletedRows = 0;

  if (typeof eventId === "number" && eventId > 0) {
    for (const toggle of COPY_TOGGLES) {
      if (!toggle.implemented) continue;
      for (const model of toggle.models) {
        const delegate = client()[model];
        if (!delegate?.deleteMany) continue;
        try {
          const result = await delegate.deleteMany({ where: { event_id: eventId } });
          deletedRows += result.count;
        } catch {
          /* A table that cannot be read cannot have been written either. */
        }
      }
    }

    const events = await anyPrisma.find_events.deleteMany({ where: { id: eventId } });
    deletedRows += events.count;
  }

  await anyPrisma.$executeRaw`DELETE FROM find_settings WHERE "DOMAIN" = ${domainId}`;
  const domains = await anyPrisma.find_domains.deleteMany({ where: { id: domainId } });
  deletedRows += domains.count;

  return { deletedRows };
}

/**
 * The ids of every site the Hub created, so the list can offer delete on those and only those.
 */
export async function hubCreatedDomainIds(): Promise<Set<number>> {
  try {
    const rows = await (
      prisma as unknown as {
        $queryRaw: (s: TemplateStringsArray, ...v: unknown[]) => Promise<{ DOMAIN: number | null }[]>;
      }
    ).$queryRaw<{ DOMAIN: number | null }[]>`
      SELECT "DOMAIN" FROM find_settings WHERE varname = 'hub_site_origin'
    `;
    return new Set(
      rows.map((row) => row.DOMAIN).filter((id): id is number => typeof id === "number")
    );
  } catch {
    // No marker readable means no delete offered — the safe direction.
    return new Set<number>();
  }
}
