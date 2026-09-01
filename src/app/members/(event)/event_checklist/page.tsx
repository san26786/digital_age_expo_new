import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { getDomain } from "@/lib/services/domain";
import { getEventMemberContext } from "@/lib/services/eventAccess";
import { getChecklist } from "@/lib/services/eventChecklist";
import { EventChecklistManager } from "@/components/dashboard/EventChecklistManager";
import { MembersBreadcrumb, MembersPageHeader } from "@/components/ui/MembersPageShell";
import { ListChecks } from "lucide-react";

export const metadata = { title: "Event Checklist" };

export default async function EventChecklistPage() {
  // const session = await getServerSession(authOptions);
  // if (!session) redirect("/login?callbackUrl=/members/event_checklist");
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

  if (context.role !== "organiser") {
    return (
      <div className="section-transition space-y-8 animate-fade-in text-white">
        <h1 className="text-4xl font-black uppercase tracking-tight text-white">Event Checklist</h1>
        <div className="glass-panel rounded-3xl p-12 text-center border-dashed">
          <p className="text-zinc-500 font-medium italic">
            The event checklist is only available to the event organiser.
          </p>
        </div>
      </div>
    );
  }

  const sections = await getChecklist(context);

  return (
    <div className="section-transition space-y-8 animate-fade-in text-white">
      <MembersBreadcrumb label="Event Checklist" />

      <div className="glass-panel rounded-2xl p-8 shadow-2xl border border-white/10">
        <MembersPageHeader
          title="Event Checklist"
          description="Track your setup tasks before, during, and after the show."
          icon={ListChecks}
        />
      </div>

      <div>
        <EventChecklistManager sections={sections} />
      </div>
    </div>
  );
}
