import { NewSiteForm } from "@/components/hub/NewSiteForm";
import { listCopyableEvents, listHubSites } from "@/lib/services/hubSites";

export const dynamic = "force-dynamic";

/**
 * The server half of the New Site screen: it fetches the two lists the form chooses between and
 * hands them over. The form itself is a client component because every interesting thing on it —
 * the slug following the name, the counts reloading when the source event changes, a toggle
 * pulling in the toggle it depends on — is state that only exists while someone is filling it in.
 */
export default async function NewSitePage() {
  const [events, sites] = await Promise.all([listCopyableEvents(), listHubSites()]);

  return <NewSiteForm events={events} sites={sites} />;
}
