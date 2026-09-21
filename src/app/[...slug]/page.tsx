import { Brand } from "@/components/brand/Brand";
import { getPageByUrl } from "@/lib/services/pages";
import { notFound, redirect } from "next/navigation";

/**
 * Path prefixes this catch-all must never answer for.
 *
 * A root [...slug] matches anything no other route claimed — including /api/auth/session when,
 * for whatever reason, its route handler is not registered. This page then returns a friendly
 * HTML page with status 200, and the caller, which asked for JSON, reports
 * `Unexpected token '<', "<!DOCTYPE"... is not valid JSON`. That is next-auth's
 * CLIENT_FETCH_ERROR, and it names neither the path nor the real problem.
 *
 * A missing API route has to fail as a missing API route. notFound() gives a real 404, which is
 * both the honest status and an error a developer can act on.
 */
const NEVER_A_PAGE = ["api", "_next"];

function isReserved(slug: string[] | undefined): boolean {
  return NEVER_A_PAGE.includes(slug?.[0] ?? "");
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }) {
  const resolvedParams = await params;
  // No database hop for a path that is about to 404 anyway.
  if (isReserved(resolvedParams.slug)) return {};

  const slugPath = resolvedParams.slug ? resolvedParams.slug.join("/") : "";
  const cmsPage = await getPageByUrl(slugPath);

  if (cmsPage) {
    return {
      title: cmsPage.meta_title || cmsPage.title,
      description: cmsPage.meta_description || "",
    };
  }

  return {
    title: slugPath.replace(/[-_]/g, " ").toUpperCase(),
  };
}

export default async function CatchAllSlugPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const resolvedParams = await params;
  if (isReserved(resolvedParams.slug)) notFound();

  const slugPath = resolvedParams.slug ? resolvedParams.slug.join("/") : "";

  // Special handle redirects for legacy PHP files if applicable
  if (slugPath === "contact.php") {
    redirect("/contact");
  }

  const cmsPage = await getPageByUrl(slugPath);

  if (!cmsPage) {
    return (
      <div className="bg-slate-50 min-h-screen py-20 px-6">
        <div className="max-w-3xl mx-auto bg-white rounded-2xl p-10 border border-slate-100 shadow-xl text-center">
          <h1 className="text-3xl font-black text-indigo-950 uppercase tracking-tight mb-4">
            {slugPath.replace(/[-_]/g, " ")}
          </h1>
          <p className="text-slate-600 text-sm mb-6">
            Welcome to <Brand />. Explore our schedules, virtual exhibition halls, keynotes, and registration passes.
          </p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-pink-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-pink-700 transition"
          >
            Return To Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      <div className="bg-indigo-950 text-white py-16 px-6 text-center">
        <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight">{cmsPage.title}</h1>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm prose prose-indigo max-w-none">
          {cmsPage.content ? (
            <div dangerouslySetInnerHTML={{ __html: cmsPage.content }} />
          ) : (
            <p className="text-slate-500 text-sm text-center">Page content is currently being updated.</p>
          )}
        </div>
      </div>
    </div>
  );
}