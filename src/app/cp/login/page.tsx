import { safeCpReturnPath } from "@/lib/cp/rbac";
import { CpLoginForm } from "./CpLoginForm";

/**
 * Sign-in screen for the CP. A Server Component purely so it can read the query string the
 * auth guards attach (?next= where you were going, ?reason=session when a session ran out or
 * failed to verify) and hand it to the client form — useSearchParams() would have forced a
 * Suspense boundary around the whole form for no benefit.
 *
 * This route sits OUTSIDE the (shell) group and is excluded from src/proxy.ts's matcher, so it
 * is the one /cp page reachable without a session — otherwise signing in would redirect-loop.
 */
export default async function CpLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; reason?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawNext = Array.isArray(params.next) ? params.next[0] : params.next;
  const rawReason = Array.isArray(params.reason) ? params.reason[0] : params.reason;

  return (
    <CpLoginForm next={safeCpReturnPath(rawNext)} sessionExpired={rawReason === "session"} />
  );
}
