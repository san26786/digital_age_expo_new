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

/*
 * node-postgres's Pool, constructed HERE rather than left to the adapter.
 *
 * `new PrismaPg(config)` builds a pool internally and keeps it private, which is fine until a
 * connection dies: recovering from a dead socket means being able to throw the pool's idle
 * sockets away, and that needs a handle on the pool. The adapter accepts an existing
 * `pg.Pool` as its first argument precisely for this, so we pass one in and keep the reference.
 */
let PgPool: any;
try {
  PgPool = require("pg").Pool;
} catch {
  PgPool = null;
}

const globalForPrisma = globalThis as unknown as {
  prisma: any | undefined;
  // Cached alongside the client: in dev the client survives HMR, and a client paired with a
  // pool this module no longer has a reference to could never be recovered.
  prismaPool: any | undefined;
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
  /*
   * Deliberately short. This is the PREVENTIVE half of the "Server has closed the connection"
   * problem: DATABASE_URL points at Prisma Postgres (db.prisma.io), a proxy that hangs up on idle
   * connections on its own schedule and never tells the client. Every socket sitting idle in this
   * pool past that point is a corpse that still looks healthy, and the next request to check one
   * out fails instantly.
   *
   * Closing our own idle sockets sooner than the server closes them means far fewer corpses ever
   * exist. It cannot close the window completely - hence the eviction + retry below - but it is
   * what keeps the recovery path rare instead of routine.
   */
  const idleTimeoutMillis = Number(process.env.DATABASE_POOL_IDLE_TIMEOUT_MS) || 10000;

  /*
   * Retire a connection after this many queries rather than keeping it forever.
   *
   * Preventive half of the "Server has closed the connection" problem: a pooled Postgres endpoint
   * recycles connections on its own schedule, and a socket the server has quietly dropped stays
   * in this pool looking healthy until something tries to use it. Capping reuse means the pool
   * replaces connections on OUR schedule instead, so far fewer requests ever meet a dead one.
   * The retry above still catches the rest — this just makes it rare.
   */
  const maxUses = Number(process.env.DATABASE_POOL_MAX_USES) || 500;

  return {
    connectionString: normalizeSslMode(connectionString),
    max,
    connectionTimeoutMillis,
    idleTimeoutMillis,
    maxUses,
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

/**
 * How many times a read is attempted in total before the error is allowed through, and how long
 * to wait between attempts.
 *
 * RETRYING ONCE, IMMEDIATELY, WAS NOT ENOUGH. When the server drops connections it usually drops
 * several, so the pool can hold more than one dead socket: the first attempt fails, the retry
 * checks out the *next* stale socket from the same pool and fails identically, and the caller
 * still sees "Server has closed the connection."
 *
 * The delay is what makes the extra attempts worth having. node-postgres removes a client from
 * the pool when it errors, so pausing briefly lets those evictions land and forces the pool to
 * dial a fresh connection rather than handing back another corpse. The waits are deliberately
 * tiny — this is recovering from a dead socket, not waiting out a down database.
 */
const READ_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [50, 250];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * ---------------------------------------------------------------------------
 * Throwing away the pool's idle sockets.
 * ---------------------------------------------------------------------------
 *
 * WHY THE PREVIOUS RETRY STILL FAILED. Retrying alone is not enough, and the reason is worth
 * spelling out: when the server hangs up, it does not hang up on ONE connection. Every socket
 * that happened to be idle dies at the same moment. node-postgres does not test a socket before
 * handing it out, so attempt 1 checks out corpse #1, attempt 2 checks out corpse #2, attempt 3
 * checks out corpse #3 - three failures, three different dead sockets, same error, and a fourth
 * corpse still sitting in the pool. Waiting between attempts does not help either, because
 * nothing in the pool notices these sockets are dead until something tries to use them.
 *
 * So the retry has to change what it is retrying INTO. This checks out every socket the pool
 * currently has idle and destroys each one (`release(true)` removes a client instead of returning
 * it), which leaves the pool empty of idle connections. The next attempt therefore cannot be
 * handed a corpse - the pool has to dial a genuinely new connection.
 *
 * Only IDLE sockets are touched. Connections another request is mid-query on are never taken:
 * `connect()` only ever returns an idle client, and the loop stops as soon as there are none.
 *
 * Never throws. This runs while an error is already being handled, and an eviction that failed
 * must not replace the real database error with a confusing one of its own.
 */
let evictionInFlight: Promise<void> | null = null;

/** Give up on a checkout this quickly. See takeIdleClient. */
const EVICTION_CHECKOUT_TIMEOUT_MS = 250;
/** Total time eviction may spend, however many sockets are left. */
const EVICTION_BUDGET_MS = 1000;
/** Never discard more than this in one pass, whatever idleCount claims. */
const EVICTION_MAX_CLIENTS = 32;

/**
 * Take one already-idle client, or give up almost immediately.
 *
 * NEVER WAITS FOR A CONNECTION, and that is the whole point of this function. `pool.connect()`
 * blocks for the full acquire timeout when the pool is at max with nothing idle — 30 seconds
 * here, per DATABASE_POOL_ACQUIRE_TIMEOUT_MS. Eviction runs while a request is ALREADY failing,
 * with other requests queued behind it, so a blocking checkout would turn one recoverable dead
 * socket into a half-minute stall for everything in flight and surface as
 * "timeout exceeded when trying to connect" — a worse error than the one being recovered from.
 *
 * If nothing comes back within a moment, there is nothing idle left to throw away, which is
 * exactly when eviction should stop.
 */
function takeIdleClient(pool: any): Promise<any | null> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(null);
      }
    }, EVICTION_CHECKOUT_TIMEOUT_MS);

    pool.connect().then(
      (client: any) => {
        clearTimeout(timer);
        if (settled) {
          /*
           * We gave up on this checkout, but it resolved anyway — hand it straight back, or the
           * client stays checked out forever and the pool leaks a slot on every eviction.
           */
          try {
            client.release(true);
          } catch {
            /* already gone */
          }
          return;
        }
        settled = true;
        resolve(client);
      },
      () => {
        clearTimeout(timer);
        if (!settled) {
          settled = true;
          resolve(null);
        }
      }
    );
  });
}

function evictIdleConnections(): Promise<void> {
  const pool = globalForPrisma.prismaPool ?? activePool;
  if (!pool || typeof pool.connect !== "function") return Promise.resolve();

  // One eviction at a time. A page fans out ~9 concurrent reads, so a single dead-connection
  // event produces nine simultaneous failures; without this they would all drain the pool at
  // once and fight each other for the same clients.
  if (evictionInFlight) return evictionInFlight;

  evictionInFlight = (async () => {
    let discarded = 0;
    try {
      const deadline = Date.now() + EVICTION_BUDGET_MS;
      // Snapshot: only throw away what was idle when we started. Without the snapshot a pool
      // being refilled by other requests keeps this loop finding new work to do.
      const target = Math.min(pool.idleCount, EVICTION_MAX_CLIENTS);

      for (let i = 0; i < target && pool.idleCount > 0 && Date.now() < deadline; i += 1) {
        const client = await takeIdleClient(pool);
        if (!client) break;

        /*
         * Destroyed one at a time rather than checked out en masse. Holding several at once
         * starves every other request of the pool for as long as the loop runs — with a pool of
         * 10 that is the whole pool — so at no point does eviction hold more than one.
         */
        try {
          client.release(true); // true = destroy, do not return to the pool
          discarded += 1;
        } catch {
          /* already gone */
        }
      }
    } catch {
      // Eviction is best-effort. It runs while a real error is being handled and must never
      // replace it with one of its own.
    } finally {
      if (discarded > 0) {
        console.warn(`[prisma] discarded ${discarded} idle connection(s) after a dead socket.`);
      }
      evictionInFlight = null;
    }
  })();

  return evictionInFlight;
}

/**
 * "timeout exceeded when trying to connect" — node-postgres could not hand out a connection
 * within DATABASE_POOL_ACQUIRE_TIMEOUT_MS.
 *
 * DELIBERATELY NOT RETRYED. Nothing is wrong with the connection; the pool is empty because every
 * connection is busy or the server is not answering. Retrying adds another waiter to the same
 * queue and makes the jam worse. It is called out separately only because the raw message says
 * nothing about which knob is involved, and this app has hit it before for two very different
 * reasons (a slow pooled endpoint, and too many client connections).
 */
function isPoolAcquireTimeout(error: unknown): boolean {
  const message = (error as { message?: unknown } | null)?.message;
  return typeof message === "string" && /timeout exceeded when trying to connect/i.test(message);
}

/**
 * ===========================================================================
 *  ADMISSION CONTROL — queue queries in here, not in the pool
 * ===========================================================================
 *
 *  What "Database is out of connections" actually means in this app: a single
 *  page asks for more connections AT ONCE than the pool owns. getHomePageData()
 *  fires ten service calls through Promise.all and several of those fan out
 *  again (getHomeCounters alone runs four counts), while the Header and Footer
 *  are running their own queries for the same request — comfortably past
 *  DATABASE_POOL_SIZE. Whoever loses that race waits the full acquire timeout
 *  and is thrown as an outage, which is what the home page reported.
 *
 *  Raising the pool is not always available: this is a pooled Postgres endpoint
 *  with its own per-plan ceiling, and asking for more connections than the
 *  server allows trades this error for "too many connections".
 *
 *  So queries queue HERE instead. At most MAX_IN_FLIGHT_QUERIES are handed to
 *  the pool at a time and the rest wait in a FIFO in this process. The total
 *  work is identical and the wait is the same wait — the difference is that a
 *  waiter in this queue is not also burning the pool's acquire timeout, so a
 *  burst comes out slightly slower instead of failing outright.
 *
 *  Safe to serialise: nothing in this codebase uses an interactive
 *  $transaction (the only reference is the mock client above), so a query can
 *  never be waiting here while holding a connection something else needs.
 */
const MAX_IN_FLIGHT_QUERIES = Math.max(
  1,
  Number(process.env.DATABASE_MAX_CONCURRENT_QUERIES) || Number(process.env.DATABASE_POOL_SIZE) || 25
);

let inFlightQueries = 0;
const queryWaiters: (() => void)[] = [];
let queueWarnedAt = 0;

async function admit<T>(run: () => Promise<T>): Promise<T> {
  if (inFlightQueries >= MAX_IN_FLIGHT_QUERIES) {
    // Only worth saying when the queue is genuinely deep, and at most once every 10s — this runs
    // on every query and a log line per wait would be its own performance problem.
    if (queryWaiters.length >= MAX_IN_FLIGHT_QUERIES && Date.now() - queueWarnedAt > 10_000) {
      queueWarnedAt = Date.now();
      console.warn(
        `[prisma] ${queryWaiters.length} queries are queued behind ${MAX_IN_FLIGHT_QUERIES} ` +
          `connection(s). Pages will be slow but will not fail. Raise DATABASE_POOL_SIZE if the ` +
          `database allows more connections, or reduce how many queries a page runs in parallel.`
      );
    }
    await new Promise<void>((resolve) => queryWaiters.push(resolve));
  }

  inFlightQueries += 1;
  try {
    return await run();
  } finally {
    inFlightQueries -= 1;
    const next = queryWaiters.shift();
    if (next) next();
  }
}

/** The stale-connection retry loop, unchanged — just lifted out so admit() can wrap it. */
async function runWithStaleConnectionRetry({ operation, args, query }: any): Promise<any> {
  let lastError: unknown;

  for (let attempt = 0; attempt < READ_ATTEMPTS; attempt += 1) {
  try {
    return await query(args);
  } catch (error) {
    lastError = error;

    /*
     * Only reads, ever. A write that appears to fail may still have committed — the
     * connection can die after the server applied it but before the result came back —
     * so retrying one risks a duplicate order, a double-charged invoice, a second spot.
     * RETRYABLE_READ_OPERATIONS is the guard for exactly that.
     */
    if (isPoolAcquireTimeout(error)) {
      console.warn(
        `[prisma] ${operation} waited the full acquire timeout for a connection and got ` +
          `none. The pool is empty, not broken: either every connection is busy ` +
          `(raise DATABASE_POOL_SIZE, currently ${process.env.DATABASE_POOL_SIZE ?? "25"}) ` +
          `or the server is not answering (check the endpoint in DATABASE_URL). ` +
          `Not retried — another waiter would only lengthen the queue.`
      );
      throw error;
    }

    if (!RETRYABLE_READ_OPERATIONS.has(operation) || !isDeadConnectionError(error)) {
      throw error;
    }
    if (attempt === READ_ATTEMPTS - 1) break;

    const wait = RETRY_DELAYS_MS[attempt] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
    console.warn(
      `[prisma] stale connection on ${operation} (attempt ${attempt + 1}/${READ_ATTEMPTS}); ` +
        `retrying in ${wait}ms.`
    );

    // The point of the retry. Without this the next attempt is handed the next dead
    // socket out of the same pool and fails identically - which is exactly what was
    // happening on $queryRaw.
      await evictIdleConnections();
      await sleep(wait);
    }
  }

  throw lastError;
}

function withStaleConnectionRetry(client: any): any {
  if (typeof client?.$extends !== "function") return client;
  try {
    return client.$extends({
      query: {
        async $allOperations(params: any) {
          // Wait for a slot BEFORE touching the pool — see admit() above.
          return admit(() => runWithStaleConnectionRetry(params));
        },
      },
    });
  } catch {
    // An extension failing to apply must never take the whole client down.
    return client;
  }
}

let prismaInstance: any;
/** The pool handed to the adapter, kept so `evictIdleConnections` can reach it. */
let activePool: any;

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
    activePool = globalForPrisma.prismaPool;
  } else {
    try {
      if (!PrismaPg) {
        throw new Error(
          "@prisma/adapter-pg is not installed. Prisma 7 requires an explicit driver adapter " +
            "to connect to PostgreSQL — run `npm install @prisma/adapter-pg pg`."
        );
      }
      const config = poolConfig(dbUrl);

      /*
       * An error on an IDLE pooled client is emitted on the pool, not on any query - and in Node
       * an 'error' event with no listener is rethrown, which would take the whole server down
       * over a socket nobody was using. The adapter exposes these hooks for exactly that; they
       * are the difference between "a dead connection is logged and evicted" and "the dev server
       * exits". They are also the earliest visible signal of the problem, so they log.
       */
      const adapterOptions = {
        onPoolError: (err: Error) => console.warn("[prisma] idle pool connection errored:", err.message),
        onConnectionError: (err: Error) => console.warn("[prisma] connection errored:", err.message),
      };

      if (PgPool) {
        activePool = new PgPool(config);
        prismaInstance = withStaleConnectionRetry(
          new PrismaClient({ adapter: new PrismaPg(activePool, adapterOptions) })
        );
      } else {
        // pg not resolvable on its own (it is a dependency of the adapter, so this is unexpected).
        // Let the adapter build the pool: the retry still works, it just cannot evict.
        activePool = undefined;
        prismaInstance = withStaleConnectionRetry(
          new PrismaClient({ adapter: new PrismaPg(config, adapterOptions) })
        );
      }

      if (process.env.NODE_ENV !== "production") {
        globalForPrisma.prisma = prismaInstance;
        globalForPrisma.prismaPool = activePool;
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
