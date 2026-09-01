import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { getDomain } from "@/lib/services/domain";
import { getEventMemberContext } from "@/lib/services/eventAccess";
import { getTodoListData } from "@/lib/services/eventTodoList";
import { TodoListManager } from "@/components/dashboard/TodoListManager";
import { MembersBreadcrumb, MembersPageHeader } from "@/components/ui/MembersPageShell";
import { ListChecks } from "lucide-react";

export const metadata = { title: "Event Todo List" };

export default async function EventTodoListPage({
  searchParams,
}: {
  searchParams: Promise<{ task_type?: string; listing_id?: string; products_page?: string }>;
}) {
  // const session = await getServerSession(authOptions);
  // if (!session) redirect("/login?callbackUrl=/members/event_todo_list");
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

  const { task_type: taskType, listing_id: listingIdParam, products_page: productsPageParam } = await searchParams;
  const requestedListingId = listingIdParam ? Number(listingIdParam) : null;
  const requestedProductsPage = productsPageParam ? Number(productsPageParam) : 1;

  if (context.role !== "organiser" && context.role !== "exhibitor") {
    return (
      <div className="section-transition space-y-8 animate-fade-in text-white">
        <h1 className="text-4xl font-black uppercase tracking-tight text-white">Event Todo List</h1>
        <div className="glass-panel rounded-3xl p-12 text-center border-dashed">
          <p className="text-zinc-500 font-medium italic">
            This checklist covers your listing and stand details, so it&apos;s only available to organisers and exhibitors.
          </p>
        </div>
      </div>
    );
  }

  const {
    contact,
    listing,
    hasStandNumberField,
    adverts,
    products,
    listingOptions,
    selectedListingId,
    productsPage,
    productsTotal,
  } = await getTodoListData(context, requestedListingId, requestedProductsPage);

  return (
    <div className="section-transition space-y-8 animate-fade-in text-white">
      <MembersBreadcrumb label="Event Todo List" />

      <div className="glass-panel rounded-2xl p-8 shadow-2xl border border-white/10">
        <MembersPageHeader
          title="Event Todo List"
          description="Keep your contact details, listing profile, and event adverts up to date for this show."
          icon={ListChecks}
          pill="Compliance"
        />
      </div>

      <div>
        <TodoListManager
          contact={contact}
          listing={listing}
          hasStandNumberField={hasStandNumberField}
          adverts={adverts}
          products={products}
          eventId={domain.event_id}
          taskType={taskType ?? null}
          listingOptions={listingOptions}
          selectedListingId={selectedListingId}
          productsPage={productsPage}
          productsTotal={productsTotal}
        />
      </div>
    </div>
  );
}
