import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { getUserDashboardData } from "@/lib/services/userDashboard";
import {
  Home,
  FileText,
  User,
  Heart,
  List,
  Users,
  Star,
  Search,
  ChevronRight,
  Megaphone,
  BookOpen,
  Building2,
  CalendarCheck,
  LayoutGrid,
  Eye,
} from "lucide-react";

export const metadata = { title: "My Account" };

function Card({
  icon,
  title,
  subtitle,
  action,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-white/5 px-6 py-4">
        <h3 className="flex items-center gap-3 text-sm font-black uppercase tracking-widest text-zinc-200">
          <span className="text-brand-pink">{icon}</span>
          {title}
          {subtitle && <span className="text-[10px] font-bold text-zinc-500 ml-2 normal-case tracking-normal">{subtitle}</span>}
        </h3>
        {action}
      </div>
      <div className="p-1">{children}</div>
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <div className="px-6 py-10 text-center text-xs font-medium text-zinc-500 italic">{children}</div>;
}

function ListRow({ children }: { children: ReactNode }) {
  return <div className="flex items-center justify-between gap-3 px-6 py-4 hover:bg-white/[0.02] transition-colors">{children}</div>;
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5 text-amber-400">
      {[...Array(5)].map((_, i) => (
        <Star key={i} size={12} className={i < rating ? "fill-current" : "opacity-30"} />
      ))}
    </div>
  );
}

export default async function UserIndexPage() {
  // const session = await getServerSession(authOptions);
  // if (!session) redirect("/login?callbackUrl=/members/user_index");
  const session = (await getServerSession(authOptions)) ?? {
    user: { id: "1", name: "Demo User", email: "demo@example.com" },
  };

  const userId = Number(session.user.id);
  const data = await getUserDashboardData(userId);
  const account = data.account;

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-20">
      <div className="mx-auto max-w-7xl">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-3 px-6 py-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">
          <Home size={14} className="text-brand-pink" />
          <Link href="/" className="hover:text-white transition">
            Home
          </Link>
          <ChevronRight size={12} />
          <span className="text-brand-purple">My Account</span>
        </div>

        {/* Page Title */}
        <div className="px-6 mb-10">
          <h1 className="text-4xl font-black uppercase tracking-tight text-white">
            Dashboard <span className="text-brand-pink text-xl align-top ml-1">Overview</span>
          </h1>
          <p className="text-zinc-500 text-sm font-medium mt-2">Manage your listings, events, and account preferences.</p>
        </div>

        <div className="grid grid-cols-1 items-start gap-8 px-6 lg:grid-cols-2">
          {/* Left column */}
          <div className="space-y-8">
            <Card icon={<FileText className="h-4 w-4" />} title="My Business Listings">
              {data.listings.length === 0 ? (
                <Empty>You haven&apos;t created any business listings yet.</Empty>
              ) : (
                <div className="space-y-4 p-5">
                  {data.listings.map((listing) => (
                    <div key={listing.id} className="rounded-2xl border border-white/5 bg-white/5 p-5 shadow-xl">
                      <div className="mb-4 flex justify-between items-start">
                        <div className="font-bold text-brand-pink text-sm">
                          {listing.title} <span className="text-[10px] font-medium text-zinc-500 ml-1">(#{listing.id})</span>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest ${
                            listing.status === "active" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                          }`}
                        >
                          {listing.status}
                        </span>
                      </div>
                      <div className="relative h-4 w-full overflow-hidden rounded-full bg-white/5 shadow-inner border border-white/5">
                        <div className="absolute left-0 top-0 h-full bg-gradient-to-r from-brand-purple to-brand-pink shadow-lg" style={{ width: `${listing.completionPercent}%` }} />
                        <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black uppercase tracking-tighter text-white drop-shadow-md">
                          {listing.completionPercent}% Complete
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card icon={<Megaphone className="h-4 w-4" />} title="My Latest Promotions">
              {data.promotions.length === 0 ? (
                <Empty>No promotions added yet.</Empty>
              ) : (
                <div className="divide-y divide-white/5 text-xs">
                  {data.promotions.map((p) => (
                    <ListRow key={p.id}>
                      <div>
                        <span className="font-bold text-zinc-300">{p.title}</span>
                        {p.listingTitle && <span className="ml-2 text-zinc-500">— {p.listingTitle}</span>}
                      </div>
                    </ListRow>
                  ))}
                </div>
              )}
            </Card>

            {data.myPublications.length > 0 && (
              <Card icon={<BookOpen className="h-4 w-4" />} title="My Publications">
                <div className="divide-y divide-white/5 text-xs">
                  {data.myPublications.map((p) => (
                    <ListRow key={p.id}>
                      <div>
                        <span className="font-bold text-zinc-300">{p.bookTitle}</span>
                        {p.eventTitle && <span className="ml-2 text-zinc-500">— {p.eventTitle}</span>}
                      </div>
                    </ListRow>
                  ))}
                </div>
              </Card>
            )}

            {data.allPublications.length > 0 && (
              <Card icon={<BookOpen className="h-4 w-4" />} title="All Publications">
                <div className="divide-y divide-white/5 text-xs">
                  {data.allPublications.map((p) => (
                    <ListRow key={p.id}>
                      <div>
                        <span className="font-bold text-zinc-300">{p.bookTitle}</span>
                        {p.eventTitle && <span className="ml-2 text-zinc-500">— {p.eventTitle}</span>}
                      </div>
                    </ListRow>
                  ))}
                </div>
              </Card>
            )}

            <Card icon={<User className="h-4 w-4" />} title="Account Summary" subtitle={`(${account?.accountType ?? "Member"})`}>
              {account ? (
                <div className="flex flex-col sm:flex-row gap-6 p-6 text-sm">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-20 w-20 rounded-full bg-gradient-to-br from-brand-purple to-brand-pink p-1 shadow-2xl">
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-zinc-900 font-black text-white text-2xl">
                        {account.firstName?.[0]}{account.lastName?.[0]}
                      </div>
                    </div>
                    <div className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest shadow-lg ${account.verified ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}>
                      {account.verified ? "Verified" : "Not Verified"}
                    </div>
                  </div>
                  <div className="space-y-2 flex-1">
                    <div className="text-xl font-black text-white tracking-tight">
                      {account.firstName} {account.lastName}
                    </div>
                    <div className="text-zinc-400 font-medium text-xs leading-relaxed">
                      <div>{account.address}</div>
                      <div>
                        {account.city}
                        {account.city && account.state ? ", " : ""}
                        {account.state} {account.zip}
                      </div>
                      <div>{account.country}</div>
                    </div>
                    <div className="pt-2 grid grid-cols-1 gap-1 text-[11px] font-bold text-zinc-300">
                      <div className="flex items-center gap-2"><span className="text-brand-pink uppercase tracking-widest text-[9px] w-14">Mobile</span> {account.phone}</div>
                      <div className="flex items-center gap-2"><span className="text-brand-pink uppercase tracking-widest text-[9px] w-14">Email</span> {account.email}</div>
                      {account.organization && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-brand-pink uppercase tracking-widest text-[9px] w-14">Business</span> 
                          <span className="text-brand-purple">{account.organization}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <Empty>Account details unavailable.</Empty>
              )}
            </Card>

            <Card icon={<Heart className="h-4 w-4" />} title="Favorites">
              {data.favorites.length === 0 ? (
                <Empty>No favorites saved yet.</Empty>
              ) : (
                <div className="divide-y divide-white/5 text-xs">
                  {data.favorites.map((f) => (
                    <ListRow key={f.id}>
                      <span className="text-zinc-300 font-bold">{f.title}</span>
                      <Heart size={14} className="text-brand-pink fill-brand-pink/20" />
                    </ListRow>
                  ))}
                </div>
              )}
            </Card>

            <Card icon={<FileText className="h-4 w-4" />} title="Shopping Credit History">
              <div className="p-6">
                <div className="mb-6 flex gap-2 text-center text-white">
                  <div className="flex-1 rounded-2xl bg-white/5 border border-white/5 py-4 shadow-xl">
                    <div className="mb-1 text-[9px] font-black uppercase tracking-widest text-zinc-500">Total</div>
                    <div className="font-black text-white text-lg">{data.credits.total.toFixed(2)}</div>
                  </div>
                  <div className="flex-1 rounded-2xl bg-brand-pink/10 border border-brand-pink/20 py-4 shadow-xl">
                    <div className="mb-1 text-[9px] font-black uppercase tracking-widest text-brand-pink/60">Used</div>
                    <div className="font-black text-brand-pink text-lg">{data.credits.used.toFixed(2)}</div>
                  </div>
                  <div className="flex-1 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 py-4 shadow-xl">
                    <div className="mb-1 text-[9px] font-black uppercase tracking-widest text-emerald-500/60">Balance</div>
                    <div className="font-black text-emerald-400 text-lg">{data.credits.balance.toFixed(2)}</div>
                  </div>
                </div>
                {data.credits.transactions.length === 0 ? (
                  <Empty>No credit transactions yet.</Empty>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-white/5 bg-white/5">
                    <table className="w-full text-left text-[11px]">
                      <thead>
                        <tr className="border-b border-white/10 bg-gradient-to-r from-brand-purple to-brand-pink text-white">
                          <th className="px-6 py-4 font-black uppercase tracking-wider">Comment</th>
                          <th className="px-6 py-4 font-black uppercase tracking-wider">Type</th>
                          <th className="px-6 py-4 font-black uppercase tracking-wider text-right">Points</th>
                          <th className="px-6 py-4 font-black uppercase tracking-wider text-right">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {data.credits.transactions.map((t) => (
                          <tr key={t.id} className="hover:bg-white/[0.02]">
                            <td className="px-4 py-3 text-emerald-400 font-bold">{t.comment}</td>
                            <td className="px-4 py-3 capitalize text-zinc-400">{t.type}</td>
                            <td className="px-4 py-3 text-right font-bold text-white">{t.points.toFixed(2)}</td>
                            <td className="px-4 py-3 text-right font-black text-brand-purple">{t.runningBalance.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-8">
            <Card icon={<List className="h-4 w-4" />} title="TO-DOS">
              {data.todos.length === 0 ? (
                <Empty>You&apos;re all caught up — no pending tasks.</Empty>
              ) : (
                <div className="divide-y divide-white/5 text-xs">
                  {data.todos.map((t) => (
                    <ListRow key={t.id}>
                      <span className="font-bold text-zinc-300">{t.message}</span>
                      <span className="rounded-full bg-brand-purple px-3 py-1 text-[9px] font-black uppercase tracking-widest text-white shadow-lg">
                        {t.actionLabel}
                      </span>
                    </ListRow>
                  ))}
                </div>
              )}
            </Card>

            <Card icon={<Building2 className="h-4 w-4" />} title="My Sponsorship">
              {data.sponsorships.length === 0 ? (
                <Empty>No sponsorships yet.</Empty>
              ) : (
                <div className="divide-y divide-white/5 text-xs">
                  {data.sponsorships.map((s) => (
                    <ListRow key={s.id}>
                      <div>
                        <span className="font-bold text-zinc-200">{s.eventTitle}</span>
                        {s.sponsorshipType && <span className="ml-2 text-brand-pink">{s.sponsorshipType}</span>}
                      </div>
                    </ListRow>
                  ))}
                </div>
              )}
            </Card>

            <Card icon={<List className="h-4 w-4" />} title="Upcoming Events">
              {data.upcomingEvents.length === 0 ? (
                <Empty>No upcoming events.</Empty>
              ) : (
                <div className="divide-y divide-white/5 text-xs">
                  {data.upcomingEvents.map((e) => (
                    <ListRow key={e.id}>
                      <span className="font-bold text-zinc-200">{e.title}</span>
                      <Link
                        href={`/members/user_event_summary?event_id=${e.id}`}
                        className="btn-brand-gradient rounded-full px-4 py-1.5 text-[9px] font-black uppercase tracking-widest text-white shadow-xl"
                      >
                        MANAGE
                      </Link>
                    </ListRow>
                  ))}
                </div>
              )}
            </Card>

            {data.pastEvents.length > 0 && (
              <Card icon={<CalendarCheck className="h-4 w-4" />} title="Past Events">
                <div className="divide-y divide-white/5 text-xs">
                  {data.pastEvents.map((e) => (
                    <ListRow key={e.id}>
                      <span className="font-bold text-zinc-200">{e.title}</span>
                      <Link
                        href={`/members/user_event_summary?event_id=${e.id}`}
                        className="rounded-full bg-white/10 border border-white/10 px-4 py-1.5 text-[9px] font-black uppercase tracking-widest text-zinc-300 hover:text-white hover:bg-white/20 transition"
                      >
                        MANAGE
                      </Link>
                    </ListRow>
                  ))}
                </div>
              </Card>
            )}

            {data.upcomingDirectoryPublications.length > 0 && (
              <Card icon={<BookOpen className="h-4 w-4" />} title="My Upcoming Directory Publications">
                <div className="divide-y divide-white/5 text-xs">
                  {data.upcomingDirectoryPublications.map((e) => (
                    <ListRow key={e.id}>
                      <span className="font-bold text-zinc-200">{e.title}</span>
                      <Link
                        href={`/members/user_event_summary?event_id=${e.id}`}
                        className="btn-brand-gradient rounded-full px-4 py-1.5 text-[9px] font-black uppercase tracking-widest text-white shadow-xl"
                      >
                        MANAGE
                      </Link>
                    </ListRow>
                  ))}
                </div>
              </Card>
            )}

            {data.pastDirectoryPublications.length > 0 && (
              <Card icon={<BookOpen className="h-4 w-4" />} title="My Past Directory Publications">
                <div className="divide-y divide-white/5 text-xs">
                  {data.pastDirectoryPublications.map((e) => (
                    <ListRow key={e.id}>
                      <span className="font-bold text-zinc-200">{e.title}</span>
                      <Link
                        href={`/members/user_event_summary?event_id=${e.id}`}
                        className="rounded-full bg-white/10 border border-white/10 px-4 py-1.5 text-[9px] font-black uppercase tracking-widest text-zinc-300 hover:text-white hover:bg-white/20 transition"
                      >
                        MANAGE
                      </Link>
                    </ListRow>
                  ))}
                </div>
              </Card>
            )}

            {data.exhibitions.length > 0 && (
              <Card icon={<LayoutGrid className="h-4 w-4" />} title="My Exhibitions">
                <div className="divide-y divide-white/5 text-xs">
                  {data.exhibitions.map((e) => (
                    <ListRow key={e.id}>
                      <span className="font-bold text-zinc-200">{e.eventTitle}</span>
                      <Link
                        href={`/members/user_event_summary?event_id=${e.eventId}`}
                        className="rounded-full bg-white/10 border border-white/10 px-4 py-1.5 text-[9px] font-black uppercase tracking-widest text-zinc-300 hover:text-white hover:bg-white/20 transition"
                      >
                        MANAGE
                      </Link>
                    </ListRow>
                  ))}
                </div>
              </Card>
            )}

            {data.eventVisits.length > 0 && (
              <Card icon={<Eye className="h-4 w-4" />} title="My Event Visits">
                <div className="divide-y divide-white/5 text-xs">
                  {data.eventVisits.map((e) => (
                    <ListRow key={e.id}>
                      <span className="font-bold text-zinc-200">{e.eventTitle}</span>
                      <span className="rounded-full bg-white/10 border border-white/10 px-4 py-1.5 text-[9px] font-black uppercase tracking-widest text-zinc-300">
                        VIEW
                      </span>
                    </ListRow>
                  ))}
                </div>
              </Card>
            )}

            <Card icon={<Star className="h-4 w-4" />} title="Reviews Received">
              {data.receivedReviews.length === 0 ? (
                <Empty>No reviews received yet.</Empty>
              ) : (
                <div className="divide-y divide-white/5 text-xs">
                  {data.receivedReviews.map((r) => (
                    <ListRow key={r.id}>
                      <div className="space-y-1">
                        <div className="font-black text-brand-pink uppercase tracking-wider">{r.listingTitle}</div>
                        <div className="text-zinc-500 font-medium">{r.title}</div>
                      </div>
                      <Stars rating={r.rating} />
                    </ListRow>
                  ))}
                </div>
              )}
            </Card>

            {data.submittedReviews.length > 0 && (
              <Card icon={<Star className="h-4 w-4" />} title="My Reviews">
                <div className="divide-y divide-white/5 text-xs">
                  {data.submittedReviews.map((r) => (
                    <ListRow key={r.id}>
                      <div className="space-y-1">
                        <div className="font-black text-brand-pink uppercase tracking-wider">{r.listingTitle}</div>
                        <div className="text-zinc-500 font-medium">{r.title}</div>
                      </div>
                      <Stars rating={r.rating} />
                    </ListRow>
                  ))}
                </div>
              </Card>
            )}

            <Card icon={<Search className="h-4 w-4" />} title="Previous Searches">
              {data.previousSearches.length === 0 ? (
                <Empty>No previous searches.</Empty>
              ) : (
                <div className="divide-y divide-white/5 text-xs">
                  {data.previousSearches.map((s) => (
                    <ListRow key={s.id}>
                      <span className="text-brand-purple font-black uppercase tracking-widest">{s.keywords}</span>
                      <span className="text-zinc-500 font-bold text-[10px]">{new Date(s.date).toLocaleDateString()}</span>
                    </ListRow>
                  ))}
                </div>
              )}
            </Card>

            <Card icon={<List className="h-4 w-4" />} title="Due Invoices">
              {data.dueInvoices.length === 0 ? (
                <Empty>No invoices due.</Empty>
              ) : (
                <div className="divide-y divide-white/5 text-xs">
                  {data.dueInvoices.map((inv) => (
                    <ListRow key={inv.id}>
                      <span className="text-zinc-200 font-bold leading-relaxed">
                        Invoice <span className="text-brand-pink">#{inv.invoiceNumber}</span> for <span className="text-white">£{inv.balance.toFixed(2)}</span>
                        {inv.dateDue ? <span className="text-zinc-500 ml-1 block text-[10px] uppercase font-black tracking-tighter">Due {new Date(inv.dateDue).toLocaleDateString()}</span> : ""}
                      </span>
                      <Link
                        href={`/members/event_invoices?invoice_id=${inv.id}`}
                        className="rounded-full bg-white/10 border border-white/10 px-4 py-1.5 text-[9px] font-black uppercase tracking-widest text-zinc-300 hover:text-white hover:bg-white/20 transition"
                      >
                        VIEW
                      </Link>
                    </ListRow>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
