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
      <body className="flex min-h-full flex-col font-sans main-glow-bg text-white">
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
