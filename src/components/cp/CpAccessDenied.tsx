import Link from "next/link";

/**
 * Shown IN PLACE of a CP module when the signed-in admin lacks its view permission.
 *
 * The alternative — redirect()ing back to the dashboard — is what a broken link looks like
 * from the outside: the URL flips back, nothing is explained, and there is no way to tell a
 * missing grant apart from a routing bug or an expired session. Rendering the refusal keeps
 * the URL where the admin put it and names the exact slug to grant.
 */
export function CpAccessDenied({ permission, module }: { permission: string; module: string }) {
  return (
    <div className="max-w-2xl rounded-2xl border border-amber-400/20 bg-amber-400/5 p-8">
      <h1 className="text-xl font-black uppercase tracking-wider text-white">{module}</h1>
      <p className="mt-3 text-sm leading-relaxed text-zinc-400">
        Your role doesn&apos;t include permission to view this section. Nothing is broken — the
        page is here, your account just isn&apos;t granted it yet.
      </p>
      <p className="mt-4 text-xs text-zinc-500">
        An administrator can grant{" "}
        <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[11px] text-amber-300">
          {permission}
        </code>{" "}
        to your role under{" "}
        <Link href="/cp/users/groups" className="text-brand-pink underline decoration-brand-pink/40">
          Roles &amp; Permissions
        </Link>
        .
      </p>
    </div>
  );
}
