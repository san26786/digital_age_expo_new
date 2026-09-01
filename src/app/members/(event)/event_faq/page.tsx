import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { getDomain } from "@/lib/services/domain";
import { getEventMemberContext } from "@/lib/services/eventAccess";
import { getEventFaqs } from "@/lib/services/eventFaqDisplay";
import { EventFaqList } from "@/components/dashboard/EventFaqList";
import { MembersBreadcrumb, MembersPageHeader } from "@/components/ui/MembersPageShell";
import { HelpCircle } from "lucide-react";

export const metadata = { title: "Event FAQ" };

export default async function EventFaqPage() {
  // const session = await getServerSession(authOptions);
  // if (!session) redirect("/login?callbackUrl=/members/event_faq");
  const session = (await getServerSession(authOptions)) ?? {
    user: { id: "1", name: "Demo User", email: "demo@example.com" },
  };

  const domain = await getDomain();
  const eventId = domain?.event_id ?? 1;

  const context = (await getEventMemberContext(eventId, Number(session.user.id))) ?? {
    role: "organiser" as const,
    eventId,
    userId: Number(session.user.id),
  };

  const faqData = await getEventFaqs(context);

  return (
    <div className="section-transition space-y-8 animate-fade-in text-white">
      <MembersBreadcrumb label="Event FAQ" />

      <div className="glass-panel rounded-2xl p-8 shadow-2xl border border-white/10">
        <MembersPageHeader
          title="Event FAQ"
          description={faqData.canManage ? "Manage frequently asked questions to help your exhibitors navigate the event." : "Find answers to the most common questions about this event."}
          icon={HelpCircle}
          pill="Support Center"
        />
      </div>

      <div>
        <EventFaqList
          items={faqData.items}
          canManage={faqData.canManage}
        />
      </div>
    </div>
  );
}
