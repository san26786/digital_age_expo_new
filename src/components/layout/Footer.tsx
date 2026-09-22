import Link from "next/link";
import { getDomain } from "@/lib/services/domain";
import { getPublicSocialLinks } from "@/lib/services/social";
import { getFooterContent } from "@/lib/services/footer";
import { getBrandAssets } from "@/lib/services/branding";
import { ThemedBrandLogo } from "@/components/layout/ThemedBrandLogo";
import { SocialIcon, hasSocialIcon } from "@/components/common/SocialIcon";
import {
  Mail,
  Phone,
  MapPin,
  ArrowUpRight,
  ExternalLink,
} from "lucide-react";

const QUICK_LINKS = [
  { href: "/free-ticket", label: "Visitor Registration" },
  {
    href: "/exhibitor-registration?action=register",
    label: "Exhibitor Registration",
  },
  { href: "/speaker_registration", label: "Speakers Registration" },
  { href: "/speaker-questionaire", label: "Speaker Questionnaire" },
  { href: "/why-sponsor", label: "Sponsorship Registration" },
  { href: "/why_join_exhibit", label: "Why Join Exhibit" },
  { href: "/articles", label: "Knowledge Center" },
  { href: "/marketing-toolkit", label: "Marketing Toolkit" },
  { href: "/business_club", label: "Business Club Membership" },
  {
    href: "/frequently-asked-questions",
    label: "Frequently Asked Questions",
  },
  { href: "/charity-partnership", label: "Charity Partnership" },
  { href: "/event-services", label: "Addon Services" },
];

export async function Footer() {
  // Which networks appear here, and in what order, is decided by the CP's Settings -> Social
  // Media tab (Enabled + Order), not by this component. The hardcoded five-platform list that
  // used to live here ignored both, and could never show TikTok/WhatsApp/Pinterest at all —
  // see getPublicSocialLinks() for how the two storage locations are resolved.
  // Description, contact block, copyright line and legal links all come from Settings ->
  // Footer, each falling back to the wording this component shipped with when nothing has been
  // saved (see getFooterContent()), so the page looks identical until an admin changes it.
  const [domain, socialLinks, footer, brand] = await Promise.all([
    getDomain(),
    getPublicSocialLinks(),
    getFooterContent(),
    getBrandAssets(),
  ]);

  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer relative overflow-hidden text-white">
      {/* =========================================================
          BACKGROUND
      ========================================================== */}

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-0 h-[420px] w-[420px] rounded-full bg-purple-700/10 blur-[140px]" />

        <div className="absolute -right-40 bottom-0 h-[420px] w-[420px] rounded-full bg-fuchsia-600/10 blur-[140px]" />

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      {/* TOP GRADIENT */}
      <div className="relative h-[2px] w-full bg-gradient-to-r from-purple-700 via-fuchsia-500 to-pink-600" />

      {/* =========================================================
          MAIN FOOTER
      ========================================================== */}

      <div className="relative z-10 mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.25fr_1fr_1fr]">
          {/* =====================================================
              BRAND
          ====================================================== */}

          <div>
            {/* LOGO */}

            <Link
              href="/"
              className="group inline-flex items-center"
              aria-label={domain.name}
            >
              {/*
                No plate. The logo used to sit in a bordered, tinted box; on a light footer that
                box read as a stray panel around the mark, and the mark does not need one on a
                dark footer either.

                width/height were 220x55 (4:1) but digitalageexpo_logo.png is 2172x724 (3:1), so
                Next reserved a box of the wrong shape. 576x192 is the same 3:1 ratio at ~3x the
                largest rendered width.
              */}
              <ThemedBrandLogo
                darkSrc={brand.footerLogo}
                lightSrc={brand.lightLogo}
                alt={domain.name}
                width={576}
                height={192}
                priority
                className="h-auto max-h-16 w-auto object-contain transition-transform duration-300 group-hover:scale-[1.03] sm:max-h-20"
              />
            </Link>

            {/* DESCRIPTION */}

            <p className="mt-6 max-w-md text-sm leading-7 text-zinc-400">
              {footer.description}
            </p>

            {/* CONTACT */}

            <div className="mt-7 space-y-3">
              {footer.email && (
                <a
                  href={`mailto:${footer.email}`}
                  className="group flex items-center gap-3 text-sm text-zinc-400 transition hover:text-white"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] transition group-hover:border-fuchsia-500/40 group-hover:bg-fuchsia-500/10">
                    <Mail
                      size={16}
                      className="text-fuchsia-400"
                    />
                  </span>

                  <span className="break-all">
                    {footer.email}
                  </span>
                </a>
              )}

              {footer.phone && (
                <a
                  href={`tel:${footer.phone}`}
                  className="group flex items-center gap-3 text-sm text-zinc-400 transition hover:text-white"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] transition group-hover:border-purple-500/40 group-hover:bg-purple-500/10">
                    <Phone
                      size={16}
                      className="text-purple-400"
                    />
                  </span>

                  <span>{footer.phone}</span>
                </a>
              )}

              {footer.address && (
                <div className="flex items-start gap-3 text-sm text-zinc-400">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
                    <MapPin size={16} className="text-sky-400" />
                  </span>

                  <span className="whitespace-pre-line leading-7">{footer.address}</span>
                </div>
              )}
            </div>

            {/* SOCIAL */}

            {socialLinks.length > 0 && (
              <div className="mt-7">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                  Follow Us
                </p>

                {/*
                  Icon only. The platform name is carried by aria-label and title, so a screen
                  reader and a hover tooltip both still say "Instagram" — the text was removed
                  from the visual layer, not from the accessible one.

                  Square 44px targets: the WCAG 2.2 minimum for a touch target, which the old
                  40px-tall pills only met because their labels made them wide.
                */}
                <div className="flex flex-wrap gap-2.5">
                  {socialLinks.map((social) => (
                    <a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={social.label}
                      title={social.label}
                      className="group flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-400 transition-all duration-300 hover:-translate-y-1 hover:border-fuchsia-500/50 hover:bg-gradient-to-br hover:from-purple-600/20 hover:to-fuchsia-500/20 hover:text-white hover:shadow-lg hover:shadow-fuchsia-900/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/70"
                    >
                      {hasSocialIcon(social.key) ? (
                        <SocialIcon
                          platform={social.key}
                          className="h-[18px] w-[18px] transition-transform duration-300 group-hover:scale-110"
                        />
                      ) : (
                        /* No mark drawn for this platform yet — the two-letter label it used to
                           show, rather than an empty square. */
                        <span className="text-[10px] font-black">{social.short}</span>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* =====================================================
              QUICK LINKS
          ====================================================== */}

          <div>
            <div className="mb-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-fuchsia-400">
                Explore
              </p>

              <h3 className="mt-2 text-xl font-bold text-white">
                Quick Links
              </h3>

              <div className="mt-3 h-[2px] w-12 rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500" />
            </div>

            <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {QUICK_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group flex items-center gap-2 text-sm text-zinc-400 transition-all duration-200 hover:translate-x-1 hover:text-white"
                >
                  <ArrowUpRight
                    size={14}
                    className="shrink-0 text-fuchsia-500 opacity-0 transition-all duration-200 group-hover:opacity-100"
                  />

                  <span>{link.label}</span>
                </Link>
              ))}

              {domain.partner_url && (
                <a
                  href={domain.partner_url}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center gap-2 text-sm text-zinc-400 transition-all duration-200 hover:translate-x-1 hover:text-white"
                >
                  <ExternalLink
                    size={14}
                    className="shrink-0 text-fuchsia-500 opacity-0 transition-all duration-200 group-hover:opacity-100"
                  />

                  <span>Franchise Opportunity</span>
                </a>
              )}
            </div>
          </div>

          {/* =====================================================
              GET IN TOUCH
              Was a newsletter signup (form removed — see below); now a single CTA button
              straight to the contact page instead of collecting an email here.
          ====================================================== */}

          <div>
            <div className="mb-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-purple-400">
                Stay Connected
              </p>

              <h3 className="mt-2 text-xl font-bold text-white">
                Get In Touch
              </h3>

              <div className="mt-3 h-[2px] w-12 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-500" />
            </div>

            <p className="text-sm leading-7 text-zinc-400">
              Have a question about {domain.name}, exhibiting, or
              sponsorship? Reach out and our team will get back to you.
            </p>

            {/*
              NOTE: assuming the contact route is "/contact" — this wasn't in QUICK_LINKS above,
              so update the href if the project names it something else (e.g. "/contact-us").
            */}
            <Link
              href="/contact"
              className="group mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-fuchsia-900/30 transition-all duration-300 hover:scale-105 hover:shadow-fuchsia-900/50 active:scale-95"
            >
              Contact Us
              <ArrowUpRight
                size={16}
                className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </Link>
          </div>
        </div>
      </div>

      {/* =========================================================
          BOTTOM BAR
      ========================================================== */}

      <div className="relative z-10 border-t border-white/10 bg-black/30">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 py-5 text-center sm:px-6 md:flex-row md:text-left lg:px-8">
          <p className="text-xs text-zinc-500">
            © {currentYear}{" "}
            <span className="font-semibold text-zinc-400">
              {footer.copyrightText}
            </span>
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-zinc-500">
            {footer.legalLinks.map((link, index) => (
              <span key={link.href} className="flex items-center gap-4">
                {index > 0 && <span className="h-1 w-1 rounded-full bg-zinc-700" />}
                <Link href={link.href} className="transition hover:text-white">
                  {link.label}
                </Link>
              </span>
            ))}

            {footer.legalLinks.length > 0 && <span className="h-1 w-1 rounded-full bg-zinc-700" />}

            <span className="text-zinc-600">{domain.name}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}