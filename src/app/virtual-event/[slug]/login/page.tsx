import { getEventByFriendlyUrl } from "@/lib/services/events";
import { VisitorLoginForm } from "@/components/virtual-event/VisitorLoginForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEventByFriendlyUrl(slug);
  return { title: event ? `Visitor Login | ${event.title}` : "Visitor Login" };
}

export default async function VirtualEventLoginPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventByFriendlyUrl(slug);

  if (!event) {
    return (
      <div data-theme-scope="dark" className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-center text-white">
        <div>
          <h1 className="text-2xl font-bold">Event Not Found</h1>
          <p className="mt-3 text-zinc-400">This virtual event link is no longer valid.</p>
        </div>
      </div>
    );
  }

  return <VisitorLoginForm eventSlug={event.friendly_url} eventTitle={event.title} />;
}
