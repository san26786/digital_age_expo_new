import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { getDomain } from "@/lib/services/domain";
import { getEventMemberContext } from "@/lib/services/eventAccess";
import { getTicketBuyers } from "@/lib/services/eventTicketBuyers";
import { Ticket, Users, Receipt } from "lucide-react";
import { MembersBreadcrumb, MembersPageHeader } from "@/components/ui/MembersPageShell";

export const metadata = { title: "Ticket Buyers" };

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export default async function EventTicketBuyersPage() {
  // const session = await getServerSession(authOptions);
  // if (!session) redirect("/login?callbackUrl=/members/event_ticket_buyers");
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
        <MembersBreadcrumb label="Ticket Registry" />

        <div className="glass-panel rounded-2xl p-8 shadow-2xl border border-white/10">
          <MembersPageHeader
            title="Ticket Registry"
            icon={Receipt}
            pill="Restricted Access"
          />
        </div>
        <div className="glass-panel rounded-3xl p-12 text-center border-dashed border-white/10">
          <p className="text-zinc-500 font-medium italic">
            Ticket sales data is sensitive and only available to the event organiser.
          </p>
        </div>
      </div>
    );
  }

  const buyers = await getTicketBuyers(context);

  return (
    <div className="section-transition space-y-8 animate-fade-in text-white">
      <MembersBreadcrumb label="Ticket Registry" />

      <div className="glass-panel rounded-2xl p-8 shadow-2xl border border-white/10">
        <MembersPageHeader
          title="Ticket Registry"
          description="Monitor all ticket acquisitions and buyer distributions for this event."
          icon={Receipt}
          pill="Finance & Sales"
        />
      </div>

      <div className="glass-panel rounded-[2rem] border-white/10 shadow-2xl backdrop-blur-md overflow-hidden">
        <div className="bg-white/5 p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Receipt className="h-5 w-5 text-brand-pink" />
            <h3 className="text-sm font-black uppercase tracking-widest text-white">Sales Log</h3>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{buyers.length} Records found</span>
        </div>

        <div className="overflow-x-auto">
          {buyers.length === 0 ? (
            <div className="p-20 text-center">
              <p className="text-zinc-500 font-medium italic">No tickets have been purchased yet.</p>
            </div>
          ) : (
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-gradient-to-r from-brand-purple to-brand-pink text-white">
                  <th className="px-6 py-4 font-black uppercase tracking-wider">Ticket Type</th>
                  <th className="px-6 py-4 font-black uppercase tracking-wider">Buyer Identity</th>
                  <th className="px-6 py-4 font-black uppercase tracking-wider">Organization</th>
                  <th className="px-6 py-4 font-black uppercase tracking-wider text-center">Revenue</th>
                  <th className="px-6 py-4 font-black uppercase tracking-wider text-center">Transaction Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {buyers.map((b) => (
                  <tr key={b.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-brand-pink/10 flex items-center justify-center text-brand-pink border border-brand-pink/20">
                          <Ticket className="h-4 w-4" />
                        </div>
                        <span className="font-bold text-zinc-200">{b.ticketName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-brand-purple/10 flex items-center justify-center text-brand-purple border border-brand-purple/20">
                          <Users className="h-4 w-4" />
                        </div>
                        <span className="font-medium text-zinc-300">{b.buyerName || "Anonymous"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-zinc-400 font-medium italic">{b.business || "—"}</td>
                    <td className="px-6 py-5 text-center">
                      <span className="inline-flex rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-500 border border-emerald-500/20">
                        {b.paidAmount ? `£${b.paidAmount}` : "Free / Comp"}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center text-[10px] font-black uppercase tracking-widest text-zinc-500">
                      {b.purchasedOn ? DATE_FORMAT.format(new Date(b.purchasedOn)) : "Manual Entry"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
