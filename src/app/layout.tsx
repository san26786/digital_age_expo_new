import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ChromeGate } from "@/components/layout/ChromeGate";
import { ScrollReveal } from "@/components/common/ScrollReveal";
import { SitePreviewBanner } from "@/components/layout/SitePreviewBanner";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/components/providers/ThemeProvider";
import { getDomain } from "@/lib/services/domain";
import { getBrandAssets } from "@/lib/services/branding";
import { getSiteTheme, themeCss } from "@/lib/services/siteTheme";
import { getSiteSeo } from "@/lib/services/siteSeo";
import { getBrand, getBrandName } from "@/lib/brand";
import { BrandProvider } from "@/components/brand/BrandProvider";

export async function generateMetadata(): Promise<Metadata> {
  const [domain, brand, seo] = await Promise.all([getDomain(), getBrandAssets(), getSiteSeo()]);

  /*
   * The site's own SEO, where it has any.
   *
   * `cp_seo_*` has been written by the CP's SEO tab for some time and read by nothing — the third
   * settings page in this codebase wired to the database and not to the site, after the branding
   * logos and the theme colours. This is the reader.
   *
   * Every fallback reproduces exactly what this function returned before, so a site that has set
   * nothing is byte-identical. Open Graph and Twitter fall back to the meta values rather than to
   * nothing: a share card with a blank title is worse than one repeating the page's own.
   */
  const title = seo.metaTitle || domain.name;
  const description = seo.metaDescription || `${domain.name} — business expo`;

  return {
    title,
    description,
    keywords: seo.metaKeywords || undefined,
    alternates: seo.canonicalUrl ? { canonical: seo.canonicalUrl } : undefined,
    openGraph: {
      title: seo.ogTitle || title,
      description: seo.ogDescription || description,
      images: seo.ogImage ? [seo.ogImage] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: seo.twitterTitle || seo.ogTitle || title,
      description: seo.twitterDescription || seo.ogDescription || description,
      images: seo.twitterImage ? [seo.twitterImage] : undefined,
    },
    /*
     * The favicon was whatever happened to sit at /favicon.ico, so every site served by this
     * deployment showed Digital Age Expo's icon in the browser tab no matter what it had
     * uploaded. It comes from the site's own branding now, falling back to that same file when
     * nothing is set — so this site is unchanged and a sub-site gets its own.
     */
    icons: { icon: brand.favicon },
  };
}

/**
 * Async now, which it did not need to be until the palette started depending on which site is
 * being served. Everything else here is untouched.
 */
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Resolved once here and handed to the client tree, because client components cannot reach
  // the database themselves. getDomain() underneath is memoised per request, so this is free.
  const [theme, brand] = await Promise.all([
    getSiteTheme().then(themeCss),
    getBrand(),
  ]);

  return (
    <html
      lang="en"
      /*
       * The blocking script at the top of <body> writes `data-theme` (and toggles `dark`) onto
       * this element before React ever runs, which by definition is an attribute the server did
       * not render. suppressHydrationWarning here silences that ONE expected difference on this
       * ONE element; it does not silence anything inside the app.
       */
      suppressHydrationWarning
      className="h-full antialiased dark"
      data-theme="dark"
    >
      {/*
        suppressHydrationWarning is here for ONE specific, unavoidable case: browser extensions
        that write attributes onto <body> before React hydrates. The reported mismatch was
        `cz-shortcut-listen="true"`, which ColorZilla adds — it exists in the browser's DOM and
        can never exist in the server's HTML, so React reports a mismatch on every page load for
        anyone with that extension installed.

        It is deliberately on <body> and nowhere else, and it is NOT a blanket silencer: React
        only skips the attribute/text diff for THIS element, so a genuine mismatch inside the app
        (a Date.now() in a client component, a locale-formatted date, mis-nested tags) is still
        reported exactly as before.
      */}
      <body
        suppressHydrationWarning
        className="flex min-h-full flex-col font-sans main-glow-bg text-white"
      >
        {/*
          Theme resolution, before first paint. This must stay the FIRST thing in <body>: an
          inline script executes while the browser is still parsing the document, so the theme
          attribute is set before any content is drawn. Moved lower, or run from a React effect,
          the page would paint dark and then repaint — the flash a theme toggle is judged by.

          The content is a module constant with no interpolated data of any kind, so there is
          nothing here for a value to escape from.
        */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {/*
          This site's colours, when it has chosen any.

          It redefines the same CSS custom properties globals.css sets on :root, so retinting the
          whole site needs no component changes and no client JavaScript. It wins on document
          order rather than force: not `!important`, which would make every later override
          impossible, and not an inline style on <html>, which would lose to globals.css's own
          `:root` rule on specificity.

          Rendered inside <body> rather than in a hand-written <head>. The App Router asks you not
          to put a <head> in a root layout, and it does not need one — React hoists <style> into
          the document head on its own, and a <style> that stays where it is still applies.

          A site with no theme saved emits NOTHING — not the defaults, nothing at all — so Digital
          Age Expo renders byte-identically to before this existed.

          The string is built only from values that have been through isHexColour(), which matters
          because this is a <style> tag: an unvalidated value here would be stylesheet injection,
          not merely a wrong colour.
        */}
        {theme && <style dangerouslySetInnerHTML={{ __html: theme }} />}

        {/* Above everything, including the header, so it cannot be mistaken for site chrome. */}
        <SitePreviewBanner />

        <ThemeProvider>
        <BrandProvider brand={brand}>
          <AuthProvider>
            <ChromeGate>
              <Header />
            </ChromeGate>
            {/* Site-wide scroll-reveal driver. Renders nothing; observes [data-reveal]. */}
            <ScrollReveal />
            <main className="flex-1">{children}</main>
            <ChromeGate>
              <Footer />
            </ChromeGate>
          </AuthProvider>
        </BrandProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
