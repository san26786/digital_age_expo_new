import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { getMemberProfile } from "@/lib/services/member";
import { AccountOnboardingManager } from "@/components/dashboard/AccountOnboardingManager";

/**
 * ---------------------------------------------------------------------------
 * /account_onboarding — the member's own profile wizard.
 * ---------------------------------------------------------------------------
 *
 * NO `event_id`, deliberately. This page is about the signed-in person, not about an event, so
 * there is nothing for an event id to select — it only ever produced a URL that looked
 * meaningful and was not. The previous version read `?event_id=` and called
 * getEventMemberContext() with it purely so the wizard "could be extended later"; nothing
 * consumed the result, and a URL parameter nothing reads is an invitation to trust one later.
 *
 * WHO the page is about comes from the session and only the session: getServerSession() gives
 * the user id, and getMemberProfile() reads that user's own row. The identity is never taken
 * from the URL, so there is no id for a visitor to swap in order to read someone else's details.
 */

export const dynamic = "force-dynamic";
export const metadata = { title: "Account Onboarding" };

/** A `Date` (or a legacy string) as the YYYY-MM-DD an <input type="date"> requires. */
function toDateInput(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

export default async function AccountOnboardingPage() {
  const session = await getServerSession(authOptions);

  // Previously this fell back to a fabricated `{ id: "1" }` session, which would have prefilled
  // the form with whoever user 1 happens to be for an anonymous visitor. A wizard about "you"
  // has nothing to show when there is no "you", so ask them to sign in instead.
  if (!session?.user?.id) {
    redirect("/login");
  }

  const profile = await getMemberProfile(Number(session.user.id));

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12 min-h-screen text-white section-transition">
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-black uppercase tracking-tight text-white">Account On Boarding</h1>
          <p className="text-zinc-400 font-medium max-w-2xl">
            Complete your comprehensive profile onboarding wizard to set up your business identity, details, brand kit, and marketing cards.
          </p>
        </div>

        <div className="glass-panel rounded-3xl p-6 sm:p-8">
          <AccountOnboardingManager
            userId={Number(session.user.id)}
            initialProfile={{
              firstName: profile?.user_first_name ?? "",
              lastName: profile?.user_last_name ?? "",
              email: profile?.user_email ?? "",
              phone: profile?.user_phone ?? "",
              jobTitle: profile?.user_position ?? "",
              linkedin: profile?.linkedin_user_profile ?? "",
              businessName: profile?.user_organization ?? "",
              // <input type="date"> only accepts YYYY-MM-DD, and the column is a Date, so it is
              // formatted here rather than shipping a Date across the server/client boundary.
              dateOfBirth: toDateInput(profile?.date_of_birth),
              profileDescription: profile?.profile_description ?? "",
            }}
          />
        </div>
      </div>
    </div>
  );
}
