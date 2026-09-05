import { numericParam } from "@/lib/searchParams";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Handshake, Receipt } from "lucide-react";
import { authOptions } from "@/lib/auth/options";
import { getDomain } from "@/lib/services/domain";
import { getEventMemberContext } from "@/lib/services/eventAccess";
import { getSponsorshipFormOptions } from "@/lib/services/eventSponsorshipPurchase";
import { MembersPageShell } from "@/components/ui/MembersPageShell";
import { BuySponsorshipForm } from "@/components/dashboard/BuySponsorshipForm";

/**
 * ---------------------------------------------------------------------------
 * /members/buy_sponsorship — "Choose Sponsorship".
 * ---------------------------------------------------------------------------
 *
 * The Next equivalent of advertise.php?action=add&type=sponsorship_option&event_id=<id>, which
 * is where the "Buy Sponsorship" tile is meant to land. That tile previously pointed at
 * /members/event_ticket — the Event Tickets admin screen — so clicking Buy Sponsorship showed
 * ticket management instead of a purchase form.
 *
 * NOT organiser-gated. This is a member buying sponsorship for their own business, so the
 * legacy only calls authenticate() here; restricting it to organisers would stop the exhibitors
 * and sponsors it exists for.
 */

export const dynamic = "force-dynamic";
export const metadata = { title: "Buy Sponsorship | Event Management" };

export default async function BuySponsorshipPage({
  searchParams,
}: {
  searchParams: Promise<{ event_id?: string; category_id?: string; sponsor_type?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const resolvedParams = searchParams ? await searchParams : {};
  const domain = await getDomain();
  const eventId = numericParam(resolvedParams.event_id, domain?.event_id ?? 852);
  const userId = Number(session.user.id);

  const context = (await getEventMemberContext(eventId, userId)) ?? {
    role: "visitor" as const,
    eventId,
    userId,
  };

  /*
   * category_id and sponsor_type are still honoured on the URL: the legacy cascaded by pushing
   * them there, so any bookmarked or emailed "buy this sponsorship" link keeps working. The form
   * takes over the narrowing from the first change onwards.
   */
  const initial = await getSponsorshipFormOptions(context, {
    categoryId: resolvedParams.category_id ? Number(resolvedParams.category_id) || null : null,
    sponsorType: resolvedParams.sponsor_type || null,
  });

  return (
    <MembersPageShell
      title="Choose Sponsorship"
      breadcrumbLabel="Buy Sponsorship"
      description="Pick a sponsorship package for this event and the business it applies to. An invoice is raised for you to settle."
      icon={Handshake}
      pill={`${initial.options.length} package${initial.options.length === 1 ? "" : "s"}`}
      pillIcon={Receipt}
      eventId={eventId}
      bare
    >
      <BuySponsorshipForm eventId={eventId} initial={initial} />
    </MembersPageShell>
  );
}
