import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ChromeGate } from "@/components/layout/ChromeGate";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { getDomain } from "@/lib/services/domain";

export async function generateMetadata(): Promise<Metadata> {
  const domain = await getDomain();
  return {
    title: domain.name,
    description: `${domain.name} — business expo`,
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
