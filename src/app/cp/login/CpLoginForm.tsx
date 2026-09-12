"use client";

import { useActionState } from "react";
import { loginAction, type CpLoginState } from "./actions";

const FIELD_CLASS =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-brand-pink focus:outline-none transition-colors";

const initialState: CpLoginState = { error: null };

/* ==========================================================================
 * TEMPORARY DEMO LOGIN — remove this block and the <DemoLoginNotice /> usage
 * ==========================================================================
 *
 * Shows the demo credentials under the Sign In button. Kept in step with
 * verifyDemoCpLogin() in src/lib/cp/auth/authRepository.ts, which is what
 * actually accepts them.
 *
 * The values are duplicated here as literals rather than imported: this is a
 * client component, and importing from authRepository would pull `prisma` and
 * the whole server-side auth module into the browser bundle.
 *
 * `process.env.NODE_ENV` is inlined by the bundler at build time, so this
 * whole notice is dead-code-eliminated from a production build — the
 * credentials are never shipped to a real deployment, matching the
 * non-production gate on the login itself.
 */
const DEMO_LOGIN_VISIBLE = process.env.NODE_ENV !== "production";
const DEMO_LOGIN_EMAIL = "organiser@demo.com";
const DEMO_LOGIN_PASSWORD = "password123";

function DemoLoginNotice() {
  if (!DEMO_LOGIN_VISIBLE) return null;
  return (
    <div className="mt-6 rounded-xl border border-brand-pink/25 bg-brand-pink/5 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-pink">
        Demo Login / Reference
      </p>
      <dl className="mt-3 space-y-1.5 text-xs">
        <div className="flex items-baseline gap-2">
          <dt className="w-20 shrink-0 text-zinc-500">Email</dt>
          <dd className="font-mono text-[11px] text-zinc-200 select-all">{DEMO_LOGIN_EMAIL}</dd>
        </div>
        <div className="flex items-baseline gap-2">
          <dt className="w-20 shrink-0 text-zinc-500">Password</dt>
          <dd className="font-mono text-[11px] text-zinc-200 select-all">{DEMO_LOGIN_PASSWORD}</dd>
        </div>
      </dl>
      <p className="mt-3 text-[10px] leading-relaxed text-zinc-500">
        Temporary demo account, available on local/preview builds only. Remove before launch.
      </p>
    </div>
  );
}
/* ===================== END TEMPORARY DEMO LOGIN ========================== */

/**
 * `next` is the CP page the visitor was actually trying to open when a guard sent them here
 * (see cpLoginUrl() in lib/cp/rbac.ts). It rides along as a hidden field so loginAction can
 * finish the journey instead of always dumping everyone on the dashboard — it is re-validated
 * server-side with safeCpReturnPath(), so a hand-edited value can't redirect off-site.
 */
export function CpLoginForm({ next, sessionExpired }: { next: string; sessionExpired: boolean }) {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900/60 p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-lg font-black uppercase tracking-wider text-white">Admin Control Panel</h1>
          <p className="mt-1 text-xs text-zinc-500">Sign in with your admin account</p>
        </div>

        {sessionExpired && (
          <div className="mb-6 rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-xs leading-relaxed text-amber-300">
            <span className="font-bold">Your admin session has ended.</span> Sign in again and
            you&apos;ll be taken straight back to{" "}
            <span className="font-mono text-[11px] text-amber-200">{next}</span>.
          </div>
        )}

        <form action={formAction} className="space-y-5">
          <input type="hidden" name="next" value={next} />

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
              Email or Username
            </label>
            <input name="identifier" type="text" autoComplete="username" required className={FIELD_CLASS} />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Password</label>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className={FIELD_CLASS}
            />
          </div>

          {state.error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs font-bold text-red-500">
              {state.error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-full bg-brand-pink px-10 py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-brand-pink/20 transition hover:scale-[1.02] active:scale-95 disabled:opacity-50"
          >
            {isPending ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* TEMPORARY DEMO LOGIN — remove with the block at the top of this file. */}
        <DemoLoginNotice />

        <p className="mt-8 text-center text-[11px] text-zinc-600">
          Uses your existing site account — the same login as the member portal. Access is granted
          per role by an administrator (User Management &rarr; Groups).
        </p>
      </div>
    </div>
  );
}
