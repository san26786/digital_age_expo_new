import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Calendar, Tag, User } from "lucide-react";
import { getArticleById } from "@/lib/services/articles";
import { idFromSlug } from "@/lib/slug";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const id = idFromSlug(slug);
  const article = id ? await getArticleById(id) : null;
  if (!article) return { title: "Article | Digital Age Expo" };
  return {
    title: `${article.title} | Digital Age Expo`,
    description: article.shortDescription || undefined,
  };
}

export default async function ArticleDetailPage({ params }: Props) {
  const { slug } = await params;
  const id = idFromSlug(slug);
  if (!id) notFound();

  const article = await getArticleById(id);
  if (!article) notFound();

  if (slug !== article.slug) {
    redirect(`/article/${article.slug}`);
  }

  return (
    <div className="bg-slate-950 text-white min-h-screen pb-24">
      <div className="bg-indigo-950 relative overflow-hidden py-16 px-6 border-b border-indigo-900">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(var(--color-brand-pink-rgb) / 0.15),transparent)] pointer-events-none" />
        <div className="container mx-auto max-w-4xl relative z-10 space-y-4">
          <Link
            href="/articles"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-pink-400 hover:text-pink-300"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Knowledge Center
          </Link>
          <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white leading-tight">
            {article.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 font-medium">
            {article.author && (
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-pink-400" /> {article.author}
              </span>
            )}
            {article.date && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-pink-400" />
                {new Date(article.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-6 py-12 space-y-8">
        {article.image && (
          <div className="rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={article.image} alt={article.title} className="w-full max-h-96 object-cover" referrerPolicy="no-referrer" />
          </div>
        )}

        {article.description ? (
          <div
            className="prose prose-invert prose-sm sm:prose-base max-w-none text-slate-200"
            dangerouslySetInnerHTML={{ __html: article.description }}
          />
        ) : article.shortDescription ? (
          <p className="text-slate-300 leading-relaxed">{article.shortDescription}</p>
        ) : (
          <p className="text-slate-500 italic">This article's content is currently being updated.</p>
        )}

        {article.tags.length > 0 && (
          <div className="pt-6 border-t border-white/10 flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 bg-slate-900 border border-white/10 rounded-lg text-xs text-slate-400 flex items-center gap-1"
              >
                <Tag className="w-3 h-3 text-pink-400" /> {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
