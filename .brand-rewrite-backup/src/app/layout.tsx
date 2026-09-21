import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ChromeGate } from "@/components/layout/ChromeGate";
import { SitePreviewBanner } from "@/components/layout/SitePreviewBanner";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { getDomain } from "@/lib/services/domain";
import { getBrandAssets } from "@/lib/services/branding";
import { getSiteTheme, themeCss } from "@/lib/services/siteTheme";

export async function generateMetadata(): Promise<Metadata> {
  const [domain, brand] = await Promise.all([getDomain(), getBrandAssets()]);
  return {
    title: domain.name,
    description: `${domain.name} — business expo`,
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
  const theme = themeCss(await getSiteTheme());

  return (
    <html
      lang="en"
      className="h-full antialiased dark"
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

        <AuthProvider>
          <ChromeGate>
            <Header />
          </ChromeGate>
          <main className="flex-1">{children}</main>
          <ChromeGate>
            <Footer />
          </ChromeGate>
        </AuthProvider>
      </body>
    </html>
  );
}
