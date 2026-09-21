'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

/** Static table — see `formatPublished`. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Formats `YYYY-MM-DD` without touching `Date` or `toLocaleDateString`.
 *
 * The previous version called `new Date(publishedAt).toLocaleDateString([], …)`. The empty-array
 * locale means "whatever locale this runtime is set to" — and this is a client component that
 * Next also renders on the server, so the server's locale and the visitor's browser locale format
 * the same date differently ("20 Jul 2026" vs "Jul 20, 2026"). React then sees server HTML that
 * does not match the client render and throws a hydration error. It is invisible in dev on a
 * machine whose locale happens to match, which is exactly how this kind of bug survives.
 */
function formatPublished(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const monthIndex = Number(m[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return iso;
  return `${MONTHS[monthIndex]} ${Number(m[3])}, ${m[1]}`;
}

/**
 * UI-ONLY REDESIGN. Article titles, excerpts, categories, authors, dates and image URLs are
 * untouched — this component has always been hardcoded, and none of it is database-driven.
 *
 * Two things were wrong rather than merely plain:
 *
 * 1. `toLocaleDateString([], …)` on a server-rendered client component (see `formatPublished`).
 * 2. `h-[430px]` forced every card to the same fixed height regardless of how long its title and
 *    excerpt ran, which is why the cards had uneven dead space above the footer rule. Cards now
 *    size to their content and the grid stretches them to match each other.
 *
 * The images are remote Unsplash URLs, which is why these stay plain <img> rather than
 * next/image — the latter would need `images.unsplash.com` added to next.config.
 */
export function BlogsAndNews() {
  const defaultBlogs = [
    {
      id: "blog-1",
      title: "The Zero-Trust Operational Roadmap for Enterprise Scale",
      excerpt: "Unpacking zero-trust schemas, cryptographic policy layers, and deep API resource isolation strategies that are defining corporate standard roadmaps for 2026.",
      category: "CYBER SECURITY",
      imageUrl: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=400",
      author: "DANIEL CROFT",
      publishedAt: "2026-07-20",
    },
    {
      id: "blog-2",
      title: "Pioneering the Post-Quantum Cryptographic Compliance Era",
      excerpt: "NIST's upcoming quantum-resistant algorithm deadlines demand proactive infrastructure updates. Learn how to audit, swap, and verify legacy key structures safely.",
      category: "COMPLIANCE",
      imageUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=400",
      author: "DR. ARIA CHEN",
      publishedAt: "2026-07-18",
    },
    {
      id: "blog-3",
      title: "Architecting Generative AI Agents for Secure Workflows",
      excerpt: "How leading technical firms are establishing local inference pipelines and secure sandboxed environments to leverage large models without leaking proprietary IP.",
      category: "ARTIFICIAL INTELLIGENCE",
      imageUrl: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=400",
      author: "MARCUS VANCE",
      publishedAt: "2026-07-15",
    }
  ];

  return (
    <section className="relative overflow-hidden bg-[#0B0C20] px-5 py-16 text-white sm:px-6 sm:py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_0%,rgba(36,107,253,0.16),transparent_60%)]" />

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* Heading left, CTA right — the reference's arrangement, and it stops the CTA from
            floating alone under the grid. Stacks on small screens. */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-[#F020A8] sm:text-xs">
              Expo Research
            </span>
            <h2 className="mt-3 text-2xl font-black uppercase tracking-tight text-white sm:text-4xl">
              Latest Technical Insights
            </h2>
          </div>

          <Link
            href="/articles"
            className="group inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-[#8B3DFF]/50 bg-white/[0.04] px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-white backdrop-blur-md transition-all duration-300 hover:border-[#8B3DFF] hover:shadow-[0_0_24px_-6px_#8B3DFF] sm:self-auto"
          >
            View All Articles
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
          {defaultBlogs.map((blog) => (
            <Link
              key={blog.id}
              id={`blog-card-${blog.id}`}
              href="/articles"
              className="group flex flex-col overflow-hidden rounded-2xl border border-white/[0.09] bg-[#10112A] transition-all duration-300 hover:-translate-y-1.5 hover:border-[#8B3DFF]/55 hover:shadow-[0_22px_55px_-22px_rgba(108,43,255,0.9)]"
            >
              {/* Full-bleed image across the top of the card, not inset inside padding — the inset
                  version read as a thumbnail pasted onto a panel rather than a cover image. */}
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#14152F]">
                {/* eslint-disable-next-line @next/next/no-img-element -- remote Unsplash host */}
                <img
                  src={blog.imageUrl}
                  alt={blog.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#10112A] via-transparent to-transparent" />
                <span className="absolute bottom-3 left-3 rounded-full border border-[#F020A8]/40 bg-[#08091A]/85 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#FF7ACF] backdrop-blur-sm">
                  {blog.category}
                </span>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <h4 className="line-clamp-2 text-sm font-bold leading-snug text-white transition-colors group-hover:text-[#F020A8] sm:text-[0.95rem]">
                  {blog.title}
                </h4>
                <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-[#A5A6C5]">
                  {blog.excerpt}
                </p>

                <div className="mt-auto flex items-center justify-between gap-3 border-t border-white/[0.07] pt-4 text-[10px] uppercase tracking-wider text-[#A5A6C5]">
                  <span className="truncate">
                    By <span className="font-bold text-[#EDEDF8]">{blog.author}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {formatPublished(blog.publishedAt)}
                    <ArrowRight
                      className="h-3.5 w-3.5 text-[#8B3DFF] transition-transform duration-300 group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
