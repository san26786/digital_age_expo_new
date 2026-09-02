/**
 * Classification + containment for "the database itself is refusing to serve us" failures.
 *
 * The motivating case: Neon enforces per-plan quotas (data transfer / egress, compute time,
 * storage). Once a project trips one, EVERY query is rejected server-side with SQLSTATE 53000
 * (`insufficient_resources`) and a message like:
 *
 *   Invalid `prisma.find_listing_charity_partners.findMany()` invocation:
 *   Database error. Code: `53000`. Message: `Your project has exceeded the data transfer quota.
 *   Upgrade your plan to increase limits.`
 *
 * That is an account/billing condition, not a bug in a query — no amount of retrying or rewriting
 * the query fixes it. But because every page's data loader ran these queries bare inside
 * `Promise.all(...)`, a single rejection propagated all the way out of the server component and
 * blew up the whole route with a raw Prisma stack trace (the Next.js dev error overlay).
 *
 * These helpers let callers turn that into *data* instead of a throw: the page still renders, the
 * sections that had no data render empty, and the visitor/developer sees one clear explanation of
 * what is actually wrong instead of a Turbopack stack frame pointing at generated client code.
 */

export type DatabaseOutageKind =
  /** Plan/billing limit tripped (Neon data-transfer, compute-time, storage quota). */
  | "quota"
  /** Can't reach or connect to the database at all (down, asleep, DNS, TLS, pool exhausted). */
  | "unreachable"
  /** Server-side refusal we recognise as infrastructural but can't attribute more precisely. */
  | "unknown";

export interface DatabaseOutage {
  kind: DatabaseOutageKind;
  /** Short, human-readable summary safe to render in the UI. */
  title: string;
  /** What the developer/operator should actually do about it. */
  detail: string;
  /** The underlying SQLSTATE / Prisma code, when we could find one. */
  code?: string;
  /** Raw driver message, kept for logs and for dev-only display. */
  raw?: string;
}

/**
 * Postgres SQLSTATEs (and Prisma's own P-codes) that mean "the server/connection is the problem",
 * not "your query is wrong". Anything NOT in here — a bad column, a unique-constraint violation,
 * a type mismatch — is a real bug and must keep throwing so it gets noticed and fixed.
 */
const UNAVAILABLE_SQL_STATES = new Set([
  "53000", // insufficient_resources  <- Neon's quota rejection
  "53100", // disk_full
  "53200", // out_of_memory
  "53300", // too_many_connections
  "53400", // configuration_limit_exceeded
  "57P01", // admin_shutdown
  "57P02", // crash_shutdown
  "57P03", // cannot_connect_now (e.g. server still starting / Neon compute waking)
  "57P05", // idle_session_timeout
  "08000", // connection_exception
  "08001", // sqlclient_unable_to_establish_sqlconnection
  "08003", // connection_does_not_exist
  "08004", // sqlserver_rejected_establishment_of_sqlconnection
  "08006", // connection_failure
  "08007", // transaction_resolution_unknown
  "08P01", // protocol_violation
]);

const UNAVAILABLE_PRISMA_CODES = new Set([
  "P1000", // authentication failed
  "P1001", // can't reach database server
  "P1002", // database server reached but timed out
  "P1008", // operation timed out
  "P1010", // access denied
  "P1011", // TLS connection error
  "P1017", // server has closed the connection
  "P2024", // timed out fetching a connection from the pool
  "P2028", // transaction API error
  // Prisma Postgres / Accelerate proxy codes. The proxy sits between the client and the actual
  // Postgres instance, so when the instance is asleep, over quota or unreachable the client never
  // sees a SQLSTATE at all — only the proxy's own failure.
  "P5000", // (Accelerate) generic request error
  "P5010", // (Accelerate) cannot fetch data from service  <- "Failed to connect to upstream database"
  "P5011", // (Accelerate) too many requests
]);

/** node-postgres / undici / Node net-layer codes that surface instead of a SQLSTATE. */
const UNAVAILABLE_DRIVER_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ETIMEDOUT",
  "EPIPE",
  "CONNECT_TIMEOUT",
  "UND_ERR_CONNECT_TIMEOUT",
]);

const QUOTA_MESSAGE = /(exceeded[^.]*\bquota\b|\bquota\b[^.]*exceeded|upgrade your plan|exceeded[^.]*\blimit(s)?\b|plan limit)/i;
const UNREACHABLE_MESSAGE =
  // `failed to connect to upstream database` is Prisma Postgres's wording when its proxy cannot
  // reach the instance behind it — the message carries no SQLSTATE, so without this pattern the
  // whole outage was classified as an ordinary bug and thrown at the visitor as a stack trace.
  /(can'?t reach database server|could not connect|failed to connect|upstream database|connection (refused|terminated|reset|closed)|timeout (expired|exceeded)|timed out fetching a connection|getaddrinfo|server has closed the connection)/i;

interface ErrorFacts {
  codes: string[];
  messages: string[];
}

/**
 * Prisma wraps driver failures several layers deep (PrismaClientKnownRequestError -> `meta` ->
 * driver-adapter error -> the original pg error), and the shape differs between the Rust engine
 * and the driver-adapter path. Rather than pattern-match one specific shape and silently stop
 * recognising outages after a Prisma upgrade, walk the whole object graph shallowly and collect
 * every `code`-ish and `message`-ish string we find.
 */
function collectErrorFacts(error: unknown, depth = 0, seen = new Set<unknown>()): ErrorFacts {
  const facts: ErrorFacts = { codes: [], messages: [] };
  if (!error || typeof error !== "object" || depth > 6 || seen.has(error)) return facts;
  seen.add(error);

  const record = error as Record<string, unknown>;

  for (const key of ["code", "sqlState", "sqlstate", "errno"]) {
    const value = record[key];
    if (typeof value === "string" && value) facts.codes.push(value);
    if (typeof value === "number") facts.codes.push(String(value));
  }
  if (typeof record.message === "string" && record.message) {
    facts.messages.push(record.message);
    // The engine folds the driver's own SQLSTATE into the message text as
    // "Database error. Code: `53000`. Message: `...`" — pull it back out.
    for (const match of record.message.matchAll(/Code:\s*`?([0-9A-Za-z]{5})`?/g)) {
      facts.codes.push(match[1]);
    }
  }

  for (const key of ["cause", "meta", "originalError", "driverAdapterError", "error"]) {
    const nested = collectErrorFacts(record[key], depth + 1, seen);
    facts.codes.push(...nested.codes);
    facts.messages.push(...nested.messages);
  }

  return facts;
}

/**
 * Returns a description of the outage if `error` is an infrastructure-level database failure,
 * or `null` if it is an ordinary error that callers should keep treating as a bug.
 */
export function getDatabaseOutage(error: unknown): DatabaseOutage | null {
  const { codes, messages } = collectErrorFacts(error);
  const text = messages.join("\n");

  const sqlState = codes.find((c) => UNAVAILABLE_SQL_STATES.has(c));
  const prismaCode = codes.find((c) => UNAVAILABLE_PRISMA_CODES.has(c));
  const driverCode = codes.find((c) => UNAVAILABLE_DRIVER_CODES.has(c));

  const looksLikeQuota = QUOTA_MESSAGE.test(text);
  const looksUnreachable = UNREACHABLE_MESSAGE.test(text);

  // A quota rejection is the one case where the *message* is more reliable than the code:
  // 53000 on its own only says "insufficient resources".
  if (looksLikeQuota && (sqlState === "53000" || sqlState === "53400" || !sqlState)) {
    if (!sqlState && !prismaCode && !driverCode && !/database|prisma|neon|postgres/i.test(text)) {
      return null; // "quota" in an unrelated error message — not ours.
    }
    return {
      kind: "quota",
      title: "Database quota reached",
      detail:
        "The hosting plan for this database has hit one of its monthly limits (data transfer, " +
        "compute time or storage), so it is rejecting every query. Check the project's usage and " +
        "billing page — the limit resets at the start of the next billing period, or can be " +
        "raised by upgrading the plan.",
      code: sqlState ?? codes[0],
      raw: messages[0],
    };
  }

  if (sqlState || prismaCode || driverCode || looksUnreachable) {
    const code = sqlState ?? prismaCode ?? driverCode;
    if (code === "53300" || code === "P2024") {
      return {
        kind: "unreachable",
        title: "Database is out of connections",
        detail:
          "Every connection in the pool is busy or the server has hit its own connection limit. " +
          "Stop any stray dev servers/scripts still holding connections, or lower DATABASE_POOL_SIZE.",
        code,
        raw: messages[0],
      };
    }
    return {
      kind: "unreachable",
      title: "Database unavailable",
      detail:
        "The application could not get a usable connection to the database. It may be asleep, " +
        "restarting, or unreachable from this network. Check DATABASE_URL and the database's status page.",
      code,
      raw: messages[0],
    };
  }

  return null;
}

export function isDatabaseOutage(error: unknown): boolean {
  return getDatabaseOutage(error) !== null;
}

/**
 * Run a query, returning `fallback` instead of throwing when the database is refusing service.
 *
 * Deliberately narrow: ONLY infrastructure failures are swallowed. A genuine query bug (bad
 * column, constraint violation, type error) still throws, because silently returning empty data
 * for those would hide real regressions behind blank sections.
 *
 * @param onOutage called once per swallowed outage so the caller can surface it in the UI.
 */
export async function safeQuery<T>(
  run: () => Promise<T>,
  fallback: T,
  onOutage?: (outage: DatabaseOutage) => void
): Promise<T> {
  try {
    return await run();
  } catch (error) {
    const outage = getDatabaseOutage(error);
    if (!outage) throw error;
    console.error(`[db] ${outage.title} (${outage.code ?? "no code"}): ${outage.raw ?? ""}`);
    onOutage?.(outage);
    return fallback;
  }
}

/**
 * Collects outages across a batch of independent queries so a page can report "the database is
 * down" once, rather than per failed section.
 */
export function createOutageCollector() {
  let outage: DatabaseOutage | null = null;

  /** Records the first outage seen, but lets a `quota` diagnosis override a vaguer one. */
  const record = (next: DatabaseOutage) => {
    if (!outage || (outage.kind !== "quota" && next.kind === "quota")) outage = next;
  };

  /** Convenience wrapper: `guard(() => prisma.x.findMany(), [])`. Safe to destructure. */
  const guard = <T,>(run: () => Promise<T>, fallback: T): Promise<T> =>
    safeQuery(run, fallback, record);

  return {
    record,
    guard,
    get current(): DatabaseOutage | null {
      return outage;
    },
  };
}
