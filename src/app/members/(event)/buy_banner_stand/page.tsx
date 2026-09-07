import { numericParam } from "@/lib/searchParams";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Bookmark, Receipt } from "lucide-react";
import { authOptions } from "@/lib/auth/options";
import { getDomain } from "@/lib/services/domain";
import { getEventMemberContext } from "@/lib/services/eventAccess";
import { getBannerStandFormOptions } from "@/lib/services/eventBannerStandPurchase";
import { MembersPageShell } from "@/components/ui/MembersPageShell";
import { BuyBannerStandForm } from "@/components/dashboard/BuyBannerStandForm";

/**
 * ---------------------------------------------------------------------------
 * /members/buy_banner_stand — "Choose Banner Stand Payment".
 * ---------------------------------------------------------------------------
 *
 * The Next equivalent of advertise.php?action=add&type=banner_stand&event_id=<id>. The
 * "Buy Banner Stand" tile previously pointed at /members/manage_banner_stands — the admin screen
 * that LISTS banner stands — so clicking Buy showed a management table instead of a purchase
 * form. Manage Banner Stand is still reachable from its own tile.
 *
 * NOT organiser-gated: a member is buying a banner stand for their own business.
 */

export const dynamic = "force-dynamic";
export const metadata = { title: "Buy Banner Stand | Event Management" };

export default async function BuyBannerStandPage({
  searchParams,
}: {
  searchParams: Promise<{ event_id?: string }>;
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

  const initial = await getBannerStandFormOptions(context);

  return (
    <MembersPageShell
      title="Choose Banner Stand Payment"
      breadcrumbLabel="Buy Banner Stand"
      description="Book a banner stand at this event for one of your businesses. An invoice is raised for you to settle."
      icon={Bookmark}
      pill={`${initial.options.length} option${initial.options.length === 1 ? "" : "s"}`}
      pillIcon={Receipt}
      eventId={eventId}
      bare
    >
      <BuyBannerStandForm eventId={eventId} initial={initial} />
    </MembersPageShell>
  );
}
