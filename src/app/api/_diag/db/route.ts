/**
 * DEV-ONLY database connectivity probe.
 *
 * GET /api/_diag/db          -> 15s per-stage budget
 * GET /api/_diag/db?timeout=45000
 *
 * Runs the same layered check as `scripts/db-ping.ts` (DNS -> TCP -> TLS/auth ->
 * query) but from inside the running Next.js server process, so it sees exactly
 * the environment, env vars and network stack that the failing page sees.
 *
 * Returns 404 in production. Never echoes the password.
 */
import { NextResponse } from "next/server";
import * as dns from "node:dns/promises";
import * as net from "node:net";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const mask = (u: string) => u.replace(/(:\/\/[^:]+:)[^@]+@/, "$1********@");

function verifyFull(url: string): string {
  try {
    const u = new URL(url);
    const mode = u.searchParams.get("sslmode");
    if (mode && ["require", "prefer", "verify-ca"].includes(mode)) u.searchParams.set("sslmode", "verify-full");
    return u.toString();
  } catch {
    return url;
  }
}

function tcp(host: string, port: number, timeout: number) {
  return new Promise<{ ok: boolean; ms: number; detail: string }>((resolve) => {
    const t = Date.now();
    const sock = new net.Socket();
    const done = (ok: boolean, detail: string) => {
      sock.destroy();
      resolve({ ok, ms: Date.now() - t, detail });
    };
    sock.setTimeout(timeout);
    sock.once("connect", () => done(true, "socket open"));
    sock.once("timeout", () => done(false, `no response within ${timeout}ms`));
    sock.once("error", (e: NodeJS.ErrnoException) => done(false, `${e.code ?? ""} ${e.message}`.trim()));
    sock.connect(port, host);
  });
}

async function pgCheck(url: string, timeout: number, ssl: "verify-full" | "no-verify") {
  const { Client } = await import("pg");
  const opts: Record<string, unknown> =
    ssl === "no-verify"
      ? { connectionString: url.replace(/([?&])sslmode=[^&]*/, "$1sslmode=disable"), ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: timeout }
      : { connectionString: verifyFull(url), connectionTimeoutMillis: timeout };

  const client = new Client(opts as never);
  const t = Date.now();
  try {
    await client.connect();
    const connMs = Date.now() - t;
    const q = Date.now();
    const r = await client.query("select current_database() as db, current_user as usr, version() as v");
    const out = {
      ok: true as const,
      connMs,
      queryMs: Date.now() - q,
      db: r.rows[0].db,
      user: r.rows[0].usr,
      version: String(r.rows[0].v).split(",")[0],
    };
    await client.end();
    return out;
  } catch (e) {
    const err = e as NodeJS.ErrnoException & { severity?: string; routine?: string };
    try {
      await client.end();
    } catch {
      /* already closed */
    }
    return {
      ok: false as const,
      connMs: Date.now() - t,
      code: err.code ?? null,
      name: err.name ?? null,
      message: err.message ?? String(e),
      severity: err.severity ?? null,
      routine: err.routine ?? null,
    };
  }
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const timeout = Number(new URL(request.url).searchParams.get("timeout")) || 15000;

  const targets = [
    { label: "pooled (DATABASE_URL — what the app uses)", envVar: "DATABASE_URL", url: process.env.DATABASE_URL ?? "" },
    { label: "direct (DATABASE_URL_UNPOOLED)", envVar: "DATABASE_URL_UNPOOLED", url: process.env.DATABASE_URL_UNPOOLED ?? "" },
  ].filter((t) => t.url);

  const results = [];
  for (const t of targets) {
    let host = "";
    let port = 5432;
    try {
      const u = new URL(t.url);
      host = u.hostname;
      port = Number(u.port || 5432);
    } catch {
      results.push({ ...t, url: mask(t.url), error: "unparseable URL" });
      continue;
    }

    const tDns = Date.now();
    let dnsResult: { ok: boolean; ms: number; detail: string };
    try {
      const addrs = await dns.lookup(host, { all: true });
      dnsResult = { ok: true, ms: Date.now() - tDns, detail: addrs.map((a) => a.address).join(", ") };
    } catch (e) {
      const err = e as NodeJS.ErrnoException;
      dnsResult = { ok: false, ms: Date.now() - tDns, detail: `${err.code ?? ""} ${err.message}`.trim() };
    }

    const tcpResult = dnsResult.ok ? await tcp(host, port, timeout) : null;
    const pgVerify = tcpResult?.ok ? await pgCheck(t.url, timeout, "verify-full") : null;
    const pgNoVerify = pgVerify && !pgVerify.ok ? await pgCheck(t.url, timeout, "no-verify") : null;

    results.push({
      label: t.label,
      envVar: t.envVar,
      url: mask(t.url),
      host,
      port,
      dns: dnsResult,
      tcp: tcpResult,
      postgres_sslVerifyFull: pgVerify,
      postgres_sslNoVerify: pgNoVerify,
    });
  }

  return NextResponse.json(
    {
      checkedAt: new Date().toISOString(),
      timeoutMs: timeout,
      node: process.version,
      env: {
        NODE_ENV: process.env.NODE_ENV,
        DATABASE_URL_present: Boolean(process.env.DATABASE_URL),
        DATABASE_URL_UNPOOLED_present: Boolean(process.env.DATABASE_URL_UNPOOLED),
        DATABASE_POOL_SIZE: process.env.DATABASE_POOL_SIZE ?? "(default 25)",
        DATABASE_POOL_ACQUIRE_TIMEOUT_MS: process.env.DATABASE_POOL_ACQUIRE_TIMEOUT_MS ?? "(default 15000)",
        HTTP_PROXY: process.env.HTTP_PROXY ?? process.env.http_proxy ?? null,
      },
      results,
    },
    { headers: { "cache-control": "no-store" } }
  );
}
