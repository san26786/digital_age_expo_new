import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { getDomain } from "@/lib/services/domain";
import { getEventMemberContext } from "@/lib/services/eventAccess";
import { getEventNotifications, getNotificationLinkOptions } from "@/lib/services/eventNotifications";
import { NotificationsPanel } from "@/components/dashboard/NotificationsPanel";
import { MembersBreadcrumb, MembersPageHeader } from "@/components/ui/MembersPageShell";
import { Bell } from "lucide-react";

export const metadata = { title: "Event Notifications" };

export default async function EventNotificationsPage() {
  // const session = await getServerSession(authOptions);
  // if (!session) redirect("/login?callbackUrl=/members/event_notifications");
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

  const notifications = await getEventNotifications(context);
  const linkOptions =
    context.role === "organiser" ? await getNotificationLinkOptions(context) : { lobbies: [], exhibitors: [] };

  return (
    <div className="section-transition space-y-8 animate-fade-in text-white">
      <MembersBreadcrumb label="Event Notifications" />

      <div className="glass-panel rounded-2xl p-8 shadow-2xl border border-white/10">
        <MembersPageHeader
          title="Event Notifications"
          description={context.role === "organiser" ? "Broadcast push notifications to everyone visiting this event." : "Notifications sent out to attendees for this event."}
          icon={Bell}
          pill="Communications"
        />
      </div>

      <div>
        <NotificationsPanel notifications={notifications} canManage={context.role === "organiser"} linkOptions={linkOptions} />
      </div>
    </div>
  );
}
