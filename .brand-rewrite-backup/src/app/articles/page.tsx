import Link from "next/link";
import { BookOpen, Search, Tag, ChevronLeft, ChevronRight, Clock, Sparkles, HelpCircle, ArrowRight } from "lucide-react";
import { getArticles } from "@/lib/services/articles";

export const metadata = {
  title: "Knowledge Center | Digital Age Expo",
  description: "Read industry updates, trade show strategies, marketing optimization, and CRM analytics compiled by exhibitors and expert speakers.",
};

interface Props {
  searchParams: Promise<{ page?: string; keywords?: string }>;
}

function pageHref(page: number, keywords: string) {
  const params = new URLSearchParams();
  if (keywords) params.set("keywords", keywords);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/articles?${qs}` : "/articles";
}

export default async function ArticlesPage({ searchParams }: Props) {
  const resolved = await searchParams;
  const keywords = resolved.keywords?.trim() || "";
  const page = Math.max(1, Number(resolved.page) || 1);

  const { articles, total, totalPages } = await getArticles({ page, keywords });

  return (
    <div id="articles_container" className="bg-slate-950 text-white min-h-screen pb-24">
      {/* Decorative Grid Top Header */}
      <div id="articles_header" className="bg-indigo-950 relative overflow-hidden py-16 sm:py-24 px-6 border-b border-indigo-900">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(var(--color-brand-pink-rgb) / 0.15),transparent)] pointer-events-none" />
        <div className="container mx-auto max-w-5xl text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-pink-500/10 border border-pink-500/20 rounded-full text-pink-400 text-xs font-black uppercase tracking-widest">
            <BookOpen className="w-3 h-3" /> Knowledge Center
          </div>
          <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tight text-white leading-none">
            Event <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-fuchsia-400">Insights</span> &amp; Guides
          </h1>
          <p className="text-slate-300 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            Read industry updates, trade show strategies, marketing optimization, and CRM analytics compiled by exhibitors and expert speakers.
          </p>
        </div>
      </div>

      {/* Main Directory Layout */}
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left Side: Search */}
          <div className="lg:col-span-3 space-y-6">
            <form method="GET" className="bg-slate-900 border border-white/10 rounded-2xl p-5 space-y-3 shadow-xl">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block" htmlFor="keywords">
                Search Articles
              </label>
              <div className="relative">
                <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  id="keywords"
                  name="keywords"
                  defaultValue={keywords}
                  placeholder="Type title, keywords..."
                  className="w-full bg-slate-950 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-slate-600 focus:border-pink-500 focus:outline-none text-xs"
                />
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2.5 bg-gradient-to-r from-pink-500 to-fuchsia-500 rounded-xl text-xs font-bold uppercase tracking-wider text-white"
              >
                Search
              </button>
            </form>

            <div className="bg-gradient-to-br from-indigo-950 to-slate-900 border border-indigo-900/40 rounded-2xl p-5 text-xs space-y-2 text-slate-400">
              <h4 className="font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-pink-400" /> Editorial Board
              </h4>
              <p className="leading-relaxed">
                Our educational newsletters are written by industry veterans who have collectively acquired over £150M+ in pipeline ROI.
              </p>
            </div>
          </div>

          {/* Right Side: Articles Grid & Pagination */}
          <div className="lg:col-span-9 space-y-8">
            {articles.length === 0 ? (
              <div className="bg-slate-900 border border-white/5 rounded-3xl p-16 text-center space-y-4">
                <HelpCircle className="w-12 h-12 text-slate-600 mx-auto" />
                <h3 className="text-lg font-bold text-white uppercase tracking-wide">No Articles Found</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                  {keywords
                    ? `We couldn't find any articles matching "${keywords}". Try a different search term.`
                    : "There are no published articles yet. Check back soon."}
                </p>
                {keywords && (
                  <Link
                    href="/articles"
                    className="inline-block px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold uppercase text-white transition"
                  >
                    Clear Search
                  </Link>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {articles.map((art) => (
                    <div
                      key={art.id}
                      className="bg-slate-900 border border-white/10 hover:border-pink-500/20 rounded-2xl p-6 transition flex flex-col justify-between space-y-4 shadow-xl"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3" />{" "}
                            {art.date ? new Date(art.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : ""}
                          </span>
                        </div>

                        {art.image && (
                          <div className="relative w-full h-36 rounded-xl overflow-hidden border border-white/10">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={art.image} alt={art.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                        )}

                        <Link href={`/article/${art.slug}`} className="block font-bold text-white text-md sm:text-lg hover:text-pink-400 transition">
                          {art.title}
                        </Link>
                        {art.shortDescription && (
                          <p className="text-slate-400 text-xs leading-relaxed line-clamp-3">{art.shortDescription}</p>
                        )}
                        {art.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {art.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 bg-slate-950 border border-white/5 rounded-lg text-[10px] text-slate-400 flex items-center gap-1"
                              >
                                <Tag className="w-2.5 h-2.5 text-pink-400" /> {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                        <div className="text-[10px] text-slate-500 font-medium">
                          {art.author ? (
                            <>
                              By <span className="text-slate-300">{art.author}</span>
                            </>
                          ) : (
                            ""
                          )}
                        </div>
                        <Link
                          href={`/article/${art.slug}`}
                          className="px-4 py-2 bg-slate-950 hover:bg-slate-800 border border-white/10 hover:border-pink-500/30 text-[10px] font-black uppercase tracking-wider text-pink-400 hover:text-white rounded-xl transition flex items-center gap-1"
                        >
                          Read Article <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 pt-4">
                    <Link
                      href={pageHref(Math.max(page - 1, 1), keywords)}
                      aria-disabled={page === 1}
                      className={`p-2.5 bg-slate-900 border border-white/10 rounded-xl text-slate-400 transition ${
                        page === 1 ? "opacity-30 pointer-events-none" : "hover:border-pink-500/20 hover:text-white"
                      }`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Link>

                    <div className="flex items-center gap-1.5">
                      {Array.from({ length: totalPages }).map((_, idx) => {
                        const pageNum = idx + 1;
                        return (
                          <Link
                            key={pageNum}
                            href={pageHref(pageNum, keywords)}
                            className={`w-8 h-8 flex items-center justify-center rounded-xl text-xs font-bold transition ${
                              page === pageNum
                                ? "bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white"
                                : "bg-slate-900 text-slate-400 hover:text-white border border-white/5"
                            }`}
                          >
                            {pageNum}
                          </Link>
                        );
                      })}
                    </div>

                    <Link
                      href={pageHref(Math.min(page + 1, totalPages), keywords)}
                      aria-disabled={page === totalPages}
                      className={`p-2.5 bg-slate-900 border border-white/10 rounded-xl text-slate-400 transition ${
                        page === totalPages ? "opacity-30 pointer-events-none" : "hover:border-pink-500/20 hover:text-white"
                      }`}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                )}

                <p className="text-center text-[11px] text-slate-500">
                  Showing {articles.length} of {total} article{total === 1 ? "" : "s"}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
