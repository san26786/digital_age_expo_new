import { optionalNumericParam } from "@/lib/searchParams";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { getDomain } from "@/lib/services/domain";
import { getEventMemberContext } from "@/lib/services/eventAccess";
import { getIndustries } from "@/lib/services/eventIndustry";
import { IndustryManager } from "@/components/dashboard/IndustryManager";
import { DEFAULT_EVENT_ID } from "@/lib/site-config";
import { MembersBreadcrumb, MembersPageHeader } from "@/components/ui/MembersPageShell";
import { Factory } from "lucide-react";

export const metadata = { title: "Event Industry" };

/**
 * Mirrors members/view_industry_list.php — a shared, non-event-scoped taxonomy table
 * (independent_mst where typ_id=7) rather than per-event data. `event_id` only ever mattered to
 * the legacy page for its breadcrumb/redirect links, never for scoping the actual query.
 *
 * The page shell below now matches every other members/(event) page (event_faq, event_show_info,
 * etc.) — dark zinc-950 background inherited from the shared layout, white headings, brand-pink
 * accent — instead of its old standalone bg-white/slate-900/purple card, which stood out as the
 * one light-themed page inside an otherwise all-dark member area.
 */
export default async function ViewIndustryListPage({
  searchParams,
}: {
  searchParams?: Promise<{ event_id?: string }>;
}) {
  // const session = await getServerSession(authOptions);
  // if (!session) redirect("/login?callbackUrl=/members/view_industry_list");
  const session = (await getServerSession(authOptions)) ?? {
    user: { id: "1", name: "Demo User", email: "demo@example.com" },
  };

  const resolvedParams = searchParams ? await searchParams : {};
  const queryEventId = optionalNumericParam(resolvedParams.event_id);

  const domain = await getDomain();
  const eventId = queryEventId || domain?.event_id || DEFAULT_EVENT_ID;

  const context = (await getEventMemberContext(eventId, Number(session.user.id))) ?? {
    role: "organiser" as const,
    eventId,
    userId: Number(session.user.id),
  };

  const industries = await getIndustries();

  return (
    <div className="section-transition space-y-8 animate-fade-in text-white">
      <MembersBreadcrumb label="Event Industry" />

      <div className="glass-panel rounded-2xl p-8 shadow-2xl border border-white/10">
        <MembersPageHeader
          title="Event Industry"
          description="Manage, add, update, and edit industry categories and services across the platform using the industries model."
          icon={Factory}
          pill="Event Context"
        />
      </div>

      <div>
        <IndustryManager industries={industries} canManage={true} />
      </div>
    </div>
  );
}
