import { getHubAccess } from "@/lib/hub/access";
import { getCpSession, hasPermission, CP_PERMISSIONS } from "@/lib/cp/rbac";

/**
 * May this request edit email templates?
 *
 * The builder is rendered behind two different gates — the Hub's superadmin check and the CP's
 * RBAC — but it talks to ONE pair of API routes, because two copies of "load a template" and
 * "send a test" is two places for a permission check to drift apart. So the question is asked
 * once, here, and answered yes if EITHER door would have let this person in.
 *
 * Returns a boolean rather than throwing: these are API routes, and the caller wants to send a
 * 403 with a message a person can read, not a stack trace.
 */
export async function canEditEmailTemplates(): Promise<boolean> {
  const hub = await getHubAccess();
  if (hub.ok) return true;

  const session = await getCpSession();
  return hasPermission(session, CP_PERMISSIONS.EMAIL_TEMPLATES_EDIT);
}
