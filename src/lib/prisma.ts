let PrismaClient: any;
let hasGeneratedClient = false;

try {
  PrismaClient = require("../generated/prisma").PrismaClient;
  hasGeneratedClient = true;
} catch {
  try {
    PrismaClient = require("@prisma/client").PrismaClient;
    hasGeneratedClient = true;
  } catch {
    hasGeneratedClient = false;
  }
}

let PrismaPg: any;
try {
  PrismaPg = require("@prisma/adapter-pg").PrismaPg;
} catch {
  PrismaPg = null;
}

const globalForPrisma = globalThis as unknown as {
  prisma: any | undefined;
};

const createMockPrisma = () => {
  const handler: ProxyHandler<any> = {
    get(target: any, prop: string): any {
      if (prop === "$transaction") {
        return async (arg: any) => {
          if (Array.isArray(arg)) {
            return Promise.all(arg);
          }
          if (typeof arg === "function") {
            return arg(createMockPrisma());
          }
          return [];
        };
      }
      if (prop === "findUniqueOrThrow" || prop === "findUnique" || prop === "findFirst") {
        return async () => {
          if (target._modelName === "find_domains") {
            return {
              id: 150,
              name: "Digital Age Expo",
              brand: "Digital Age Expo",
              event_id: 852,
              linked_profile_listing_id: 810210,
              email: "info@findusonweb.com",
              phone: "0123456789",
              partner_url: "",
              facebook: "",
              instagram: "",
              youtube: "",
              linkedin: "",
              twitter: "",
            };
          }
          if (target._modelName === "find_events") {
            return {
              id: 852,
              listing_id: 810210,
              title: "Digital Age Expo 2026",
              label: "The UK's Premier Tech & Business Event",
              venue: "London Olympia",
              location: "London",
              date_start: new Date(Date.now() + 86400000 * 30),
              date_end: new Date(Date.now() + 86400000 * 32),
              previous_event_id: null,
              hide_speaker: false,
              email: "expo@findusonweb.com",
              phone: "0123456789",
            };
          }
          if (target._modelName === "find_events_dates") {
            return {
              date_start: new Date(Date.now() + 86400000 * 30),
              date_end: new Date(Date.now() + 86400000 * 32),
            };
          }
          return null;
        };
      }
      if (prop === "findMany" || prop === "groupBy") {
        return async () => [];
      }
      if (prop === "count") {
        return async () => 0;
      }
      if (prop === "aggregate") {
        return async () => ({ _count: 0, _sum: {}, _avg: {}, _min: {}, _max: {} });
      }
      if (
        prop === "create" ||
        prop === "update" ||
        prop === "delete" ||
        prop === "upsert" ||
        prop === "updateMany" ||
        prop === "deleteMany"
      ) {
        return async (args: any) => args?.data ?? { count: 1 };
      }
      if (typeof prop === "string" && prop !== "then" && prop !== "catch" && prop !== "finally") {
        return new Proxy({ _modelName: prop }, handler);
      }
      return undefined;
    },
  };
  return new Proxy({}, handler);
};

/**
 * node-postgres (the driver behind @prisma/adapter-pg) defaults its pool to 10 connections when
 * none is set — fine for a single short-lived request, but this app fans a lot of independent
 * findMany/findFirst calls out via Promise.all per page (home page alone kicks off ~9 top-level
 * queries, one of which itself fires 6 more), and Next dev (Turbopack HMR + React double-invoke)
 * piles concurrent renders on top of that. That saturates a 10-connection pool quickly and later
 * requests time out waiting for a free connection. Bump the pool via node-postgres's own Pool
 * options (not query-string params — those are a mariadb-driver-specific convention and are
 * ignored by node-postgres). Tunable via env so prod can size it to its own DB limits.
 *
 * Note: DATABASE_URL is expected to be Neon's pooled (pgbouncer) endpoint (the "-pooler"
 * hostname). Neon's pooler already multiplexes connections server-side, so this app-side pool can
 * usually be kept modest — lower it via DATABASE_POOL_SIZE if you see "too many connections"
 * errors from Neon instead of local pool-timeout errors.
 */
/**
 * pg-connection-string treats sslmode=require/prefer/verify-ca as aliases for verify-full today,
 * but warns on every connection that it will drop that aliasing (and the security guarantee that
 * comes with it) in the next major version — see
 * https://github.com/brianc/node-postgres/issues (pg-connection-string v3 / pg v9 changelog).
 * Neon's connection strings ship with sslmode=require, which is exactly what triggers this. Since
 * Neon terminates TLS with a CA-verifiable cert, verify-full is the actual behavior we want anyway
 * — writing it explicitly here gets the same security guarantee without the per-connection
 * warning spam, and without having to edit .env (which may have several sslmode=require URLs
 * copy-pasted from Neon's dashboard across DATABASE_URL/POSTGRES_URL/etc.).
 */
function normalizeSslMode(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    const mode = url.searchParams.get("sslmode");
    if (mode && ["require", "prefer", "verify-ca"].includes(mode)) {
      url.searchParams.set("sslmode", "verify-full");
    }
    return url.toString();
  } catch {
    // Not a parseable URL (shouldn't happen for a real DATABASE_URL) — fall back to the original.
    return connectionString;
  }
}

function poolConfig(connectionString: string) {
  const max = Number(process.env.DATABASE_POOL_SIZE) || 25;
  // Keep this well under Prisma/Next's own request handling budget, but long enough to survive
  // Neon's serverless compute waking up from auto-suspend after a period of inactivity — that
  // cold start alone can take several seconds and isn't a real problem worth failing fast on,
  // unlike a genuinely stuck/overloaded server. If the underlying Postgres server can't hand out
  // a connection at all (e.g. it's hit its own max_connections, or a stray/zombie dev server
  // process is squatting on connections), we still want a clear error rather than a multi-minute
  // hang — that's a server-side problem to go fix, not something to wait out.
  const connectionTimeoutMillis = Number(process.env.DATABASE_POOL_ACQUIRE_TIMEOUT_MS) || 15000;
  const idleTimeoutMillis = Number(process.env.DATABASE_POOL_IDLE_TIMEOUT_MS) || 30000;
  return {
    connectionString: normalizeSslMode(connectionString),
    max,
    connectionTimeoutMillis,
    idleTimeoutMillis,
  };
}

/**
 * ---------------------------------------------------------------------------
 * Stale-connection retry.
 * ---------------------------------------------------------------------------
 *
 * node-postgres pools sockets, and neither it nor Prisma is told when the SERVER closes one.
 * Prisma Postgres's proxy drops idle connections on its own schedule, so the pool can hand out a
 * socket that is already dead; the query fails immediately with
 *
 *   Raw query failed. Code: `N/A`. Message: `Server has closed the connection.`
 *
 * ...even though the database is perfectly healthy. Lowering idleTimeoutMillis narrows the window
 * but cannot close it — there is always a race between the server closing a connection and this
 * process noticing.
 *
 * The failure happens BEFORE the statement reaches the server, so re-issuing it is safe. One retry
 * gets a fresh connection from the pool and succeeds.
 *
 * DELIBERATELY READS ONLY. A write that fails this way almost certainly did not run, but "almost
 * certainly" is not good enough when the cost of being wrong is a duplicated row or a
 * double-applied update: if the statement did reach the server and only the response was lost, a
 * retry applies it twice. Writes therefore still surface the error to the caller.
 */
const RETRYABLE_READ_OPERATIONS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
  // Raw SELECTs. $executeRaw / $executeRawUnsafe are the write half and are deliberately absent.
  "$queryRaw",
  "$queryRawUnsafe",
]);

function isDeadConnectionError(error: unknown): boolean {
  const err = error as { message?: unknown; code?: unknown; cause?: unknown } | null;
  if (!err) return false;

  const code = typeof err.code === "string" ? err.code : "";
  // P1017 is Prisma's own "server has closed the connection".
  if (code === "P1017" || code === "ECONNRESET" || code === "EPIPE") return true;

  const message = typeof err.message === "string" ? err.message : "";
  if (
    /server has closed the connection|connection terminated|connection reset|socket hang up|ECONNRESET|EPIPE/i.test(
      message
    )
  ) {
    return true;
  }

  // Prisma wraps the driver error a layer down.
  return err.cause ? isDeadConnectionError(err.cause) : false;
}

function withStaleConnectionRetry(client: any): any {
  if (typeof client?.$extends !== "function") return client;
  try {
    return client.$extends({
      query: {
        async $allOperations({ operation, args, query }: any) {
          try {
            return await query(args);
          } catch (error) {
            if (!RETRYABLE_READ_OPERATIONS.has(operation) || !isDeadConnectionError(error)) throw error;
            console.warn(`[prisma] stale connection on ${operation}; retrying once.`);
            return query(args);
          }
        },
      },
    });
  } catch {
    // An extension failing to apply must never take the whole client down.
    return client;
  }
}

let prismaInstance: any;

const dbUrl = process.env.DATABASE_URL;
if (
  hasGeneratedClient &&
  dbUrl &&
  dbUrl.trim() !== "" &&
  !dbUrl.includes("localhost") &&
  !dbUrl.includes("root:password")
) {
  if (globalForPrisma.prisma) {
    prismaInstance = globalForPrisma.prisma;
  } else {
    try {
      if (!PrismaPg) {
        throw new Error(
          "@prisma/adapter-pg is not installed. Prisma 7 requires an explicit driver adapter " +
            "to connect to PostgreSQL — run `npm install @prisma/adapter-pg pg`."
        );
      }
      const adapter = new PrismaPg(poolConfig(dbUrl));
      prismaInstance = withStaleConnectionRetry(new PrismaClient({ adapter }));
      if (process.env.NODE_ENV !== "production") {
        globalForPrisma.prisma = prismaInstance;
      }
    } catch (err) {
      console.error(
        "[prisma] Falling back to mock client — the app will appear to run but ALL database " +
          "reads/writes will silently return empty data. Root cause:",
        err
      );
      prismaInstance = createMockPrisma();
    }
  }
} else {
  prismaInstance = createMockPrisma();
}

export const prisma = prismaInstance;
