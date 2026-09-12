/**
 * Signed session cookie for the CP — intentionally independent from the member portal's
 * NextAuth session (lib/auth/options.ts). NextAuth v4's App Router setup expects one
 * `[...nextauth]` route/session shape; running a second, admin-only *session* alongside
 * it cleanly means rolling a small dedicated cookie rather than contorting NextAuth into
 * serving two very different audiences (event members vs. site admins) at once. This is
 * only a second session mechanism, not a second identity system — the CP authenticates
 * against the exact same find_users row a member login would (see authRepository.ts).
 *
 * Uses the Web Crypto API (`crypto.subtle`) rather than Node's `crypto` module so the
 * exact same verify() runs in both the Node.js runtime (Server Actions, Route Handlers)
 * and the Edge runtime (middleware.ts) — Node's `createHmac` isn't available on Edge.
 *
 * Token shape: `${base64url(payloadJson)}.${base64url(hmacSignature)}`. Not a JWT library
 * dependency on purpose — this is the same idea as a JWS, hand-rolled small enough to
 * read in one sitting.
 */
import { cpSessionSecret } from "@/lib/auth/secret";


const COOKIE_NAME = "cp_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

export interface CpSessionPayload {
  /** find_users.id — the CP has no separate admin-identity table; see lib/cp/auth/authRepository.ts. */
  sub: number;
  name: string;
  email: string;
  /** find_users_groups.id the user was in at login time (their "role" — a group IS a role here). */
  groupId: number;
  groupName: string;
  /**
   * True when at least one group the user belongs to is flagged `administrator` in
   * find_users_groups. Recorded at login because it is the one authorisation fact that does
   * NOT depend on the legacy find_users_permissions catalog being complete — see
   * hasPermission() in lib/cp/rbac.ts. Optional so tokens minted before this field existed
   * still verify and simply fall back to the `perms` list.
   */
  admin?: boolean;
  /** Permission slugs granted at login time — see lib/cp/rbac.ts for why this isn't re-queried on every request. */
  perms: string[];
  iat: number;
  exp: number;
}

function getSecret(): string {
  // See src/lib/auth/secret.ts: the previous hardcoded fallback was the live signing key in
  // production, and this repository is public, so it was a published key.
  return cpSessionSecret();
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function importHmacKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function createSessionToken(
  payload: Omit<CpSessionPayload, "iat" | "exp">
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: CpSessionPayload = { ...payload, iat: now, exp: now + SESSION_TTL_SECONDS };

  const encoder = new TextEncoder();
  const payloadBytes = encoder.encode(JSON.stringify(fullPayload));
  const payloadPart = base64UrlEncode(payloadBytes);

  const key = await importHmacKey();
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadPart));
  const signaturePart = base64UrlEncode(new Uint8Array(signature));

  return `${payloadPart}.${signaturePart}`;
}

/** Returns the verified payload, or null if the token is missing, malformed, tampered with, or expired. */
export async function verifySessionToken(token: string | undefined | null): Promise<CpSessionPayload | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadPart, signaturePart] = parts;

  try {
    const key = await importHmacKey();
    const encoder = new TextEncoder();
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlDecode(signaturePart),
      encoder.encode(payloadPart)
    );
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadPart))) as CpSessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

export const CP_SESSION_COOKIE_NAME = COOKIE_NAME;
export const CP_SESSION_MAX_AGE_SECONDS = SESSION_TTL_SECONDS;
