"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  Home,
  Lock,
  Mic,
  Shield,
  Sparkles,
  Ticket,
  User,
} from "lucide-react";
import { ModalPortal } from "@/components/ui/ModalPortal";

/**
 * ===========================================================================
 *  MEMBER SIGN-IN
 * ===========================================================================
 *
 *  REDESIGN NOTE — WHAT CHANGED AND WHAT DID NOT.
 *
 *  Every piece of behaviour on this page is unchanged: the same state, the same
 *  next-auth `signIn("credentials")` call, the same callbackUrl handling and
 *  redirect, the same already-signed-in branch, the same modal, the same demo
 *  role buttons and the same destinations on every link. What changed is the
 *  layout, the typography and the information hierarchy.
 *
 *  THE FORM MOVED LEFT. Reading order on a sign-in page should start with the
 *  thing you came to do. The marketing headline previously took the first
 *  screenful and the form sat to its right, so the primary action was the
 *  second thing the eye reached.
 *
 *  THE RIGHT COLUMN NOW ANSWERS "WHICH ONE AM I?". It used to be a headline and
 *  two cards; it is now the four roles this platform actually has, each saying
 *  what that person does here and where they start. Nothing new is linked — the
 *  exhibitor and speaker routes were already on this page, and the visitor and
 *  organiser cards point at the existing /free-ticket and /contact pages.
 *
 *  THE TYPE IS READABLE. Nearly every string was 10px, black weight, uppercase,
 *  with 0.2em of tracking — including field labels and body copy. That styling
 *  is for an eyebrow, not for the label on a password box. Labels and prose are
 *  now sentence case at a normal size; the uppercase micro-type is kept for the
 *  few places it belongs.
 *
 *  THE DEMO PANEL LEFT THE FORM. It sat inside the <form>, below the submit
 *  button, styled like the rest of it — so a real member met a block offering a
 *  "universal pass" as part of signing in. It is now outside the card and
 *  plainly marked as a development aid.
 *
 *  COLOURS STAY TOKENISED. The reference design uses near-white input fields on
 *  a dark card. This page renders in light mode too (bg-surface-4 / text-white
 *  are remapped there), so hard-coding white would invert the contrast. The
 *  fields use the same surface tokens as before.
 */

const ROLE_CARDS = [
  {
    icon: Building2,
    title: "Exhibitor",
    body: "Book a stand, build your virtual booth and manage your team.",
    cta: "Join the show",
    href: "/exhibitors",
  },
  {
    icon: Mic,
    title: "Speaker",
    body: "Apply to the programme. Approved speakers get a dashboard.",
    cta: "Apply to speak",
    href: "/speaker_registration",
  },
  {
    icon: Ticket,
    title: "Visitor",
    body: "Claim a free ticket, plan your sessions and meet exhibitors.",
    cta: "Get a free ticket",
    href: "/free-ticket",
  },
  {
    icon: Shield,
    title: "Organiser",
    body: "Run an event on this platform. Access is set up by our team.",
    cta: "Talk to us",
    href: "/contact",
  },
] as const;

/** Unchanged: the same four identifiers and the same shared demo password as before. */
const DEMO_ROLES = [
  { role: "Organiser", id: "organiser" },
  { role: "Exhibitor", id: "exhibitor" },
  { role: "Speaker", id: "speaker" },
  { role: "Visitor", id: "visitor" },
] as const;

const FIELD =
  "w-full rounded-xl border border-white/10 bg-white/5 py-3.5 text-[15px] text-white placeholder:text-zinc-600 transition-colors focus:border-brand-pink focus:outline-none focus:ring-2 focus:ring-brand-pink/25";

function MembersLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalText, setModalText] = useState("");

  const callbackUrl = searchParams?.get("callbackUrl");
  const targetUrl = callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/members/user_event_summary";

  // Auto-redirect if already logged in, unless we explicitly want to show the switch option
  useEffect(() => {
    if (status === "authenticated" && session && !searchParams?.get("switch")) {
      window.location.replace(targetUrl);
    }
  }, [status, session, targetUrl, searchParams]);

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    window.location.reload();
  };

  if (status === "authenticated" && session) {
    return (
      <div className="min-h-screen bg-surface-4 text-white flex items-center justify-center p-6">
        <div className="glass-panel w-full max-w-md rounded-3xl border-white/10 p-10 text-center shadow-2xl backdrop-blur-2xl">
          <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-brand-pink/15">
            <Check className="h-6 w-6 text-brand-pink" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">You&apos;re already signed in</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-zinc-400">
            Signed in as{" "}
            <span className="font-semibold text-white">{session.user?.name || session.user?.email}</span>.
          </p>

          <div className="mt-8 flex flex-col gap-3">
            <Link
              href={targetUrl}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-pink py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-brand-pink/20 transition hover:opacity-90"
            >
              Go to dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              onClick={handleSignOut}
              className="w-full rounded-xl border border-white/10 bg-white/5 py-3.5 text-[15px] font-semibold text-zinc-300 transition hover:bg-white/10 hover:text-white"
            >
              Sign out / switch account
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent | null, demoId?: string, demoPass?: string) => {
    if (e) e.preventDefault();

    // If demo credentials are provided, we populate the fields first for visual feedback
    if (demoId) setIdentifier(demoId);
    if (demoPass) setPassword(demoPass);

    const identToUse = demoId || identifier;
    const passToUse = demoPass || password;

    if (!identToUse || !passToUse) {
      setErrorMessage("Please enter both email/username and password.");
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const result = await signIn("credentials", {
        identifier: identToUse.toLowerCase().trim(),
        password: passToUse,
        redirect: false,
      });

      if (result?.error || !result?.ok) {
        setErrorMessage("Invalid credentials. Please try again.");
        setModalText("The system could not authorize these credentials. Please ensure you are using the correct email/username and password combination.");
        setShowModal(true);
        setIsSubmitting(false);
      } else {
        setModalText("Authorization successful. Initializing your secure dashboard session...");
        setShowModal(true);
        // Short delay for the user to see the success message before redirect
        setTimeout(() => {
          window.location.replace(targetUrl);
        }, 1200);
      }
    } catch (err) {
      setErrorMessage("System authentication error. Please try again later.");
      setModalText("An unexpected error occurred during the authentication handshake. Please try again.");
      setShowModal(true);
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-surface-4 text-white selection:bg-brand-pink/30"
      /*
       * Opts this page out of ScrollReveal's auto-tagging — see the note in that component.
       *
       * Two reasons. It removes a React hydration mismatch: ScrollReveal runs from the root
       * layout and was adding `data-reveal` / `is-revealed` to this page's nav, main and footer
       * before the <Suspense> boundary below had hydrated, so React found attributes it never
       * rendered. And a single-viewport sign-in form has nothing to reveal on scroll — fading the
       * form in briefly hides the one control the visitor came for.
       */
      data-no-reveal=""
    >
      {/* Ambient glow. Decorative only — calmer than before so it sits behind the card
          rather than competing with it, and no longer animates under the form. */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-15%] top-[-20%] h-[55%] w-[45%] rounded-full bg-brand-purple/15 blur-[140px]" />
        <div className="absolute bottom-[-20%] right-[-10%] h-[50%] w-[40%] rounded-full bg-brand-pink/10 blur-[140px]" />
      </div>

      {/* Modal Popup */}
      {showModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto overscroll-contain bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="login-modal-title"
              className="glass-panel w-full max-w-md rounded-3xl border-white/20 p-8 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
                <h2 id="login-modal-title" className="text-lg font-bold tracking-tight text-white">
                  {isSubmitting ? "Signing you in" : "Sign-in notice"}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  aria-label="Close"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <p className="mt-5 text-[15px] leading-relaxed text-zinc-400">{modalText}</p>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="mt-6 w-full rounded-xl bg-brand-pink py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-brand-pink/20 transition hover:opacity-90 active:scale-[0.99]"
              >
                Got it
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Navigation */}
      <nav className="relative z-10 border-b border-white/5 bg-black/20 backdrop-blur-xl">
        <div className="container mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="group flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient shadow-lg shadow-brand-pink/20 transition group-hover:scale-105">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-base font-bold tracking-tight text-white">Member portal</span>
          </Link>
          <ul className="hidden items-center gap-2 text-xs font-medium text-zinc-500 md:flex">
            <li className="flex items-center gap-1.5 transition hover:text-white">
              <Home className="h-3.5 w-3.5" />
              <Link href="/">Home</Link>
            </li>
            <ChevronRight className="h-3.5 w-3.5 text-zinc-700" />
            <li className="text-zinc-300">Sign in</li>
          </ul>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto max-w-6xl px-6 py-12 sm:py-16">
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-10">
          {/* ---------------------------------------------------------------- SIGN IN */}
          <div className="lg:col-span-5">
            <div className="glass-panel rounded-3xl border-white/10 p-7 shadow-2xl backdrop-blur-2xl sm:p-9">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-pink">Welcome back</p>
              <h1 className="mt-2 text-[26px] font-bold leading-tight tracking-tight text-white sm:text-3xl">
                Sign in to your account
              </h1>
              <p className="mt-2 text-[15px] text-zinc-400">Pick up where you left off.</p>

              <form onSubmit={handleSubmit} className="mt-7 space-y-5">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-zinc-300" htmlFor="identifier">
                    Email or username
                  </label>
                  <div className="group relative">
                    <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 transition-colors group-focus-within:text-brand-pink" />
                    <input
                      type="text"
                      required
                      className={`${FIELD} pl-11 pr-4`}
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      id="identifier"
                      // Added: the field had no autoComplete, so password managers and browser
                      // autofill could not offer the saved username.
                      autoComplete="username"
                      placeholder="you@example.com"
                      aria-invalid={errorMessage ? true : undefined}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <label className="block text-sm font-semibold text-zinc-300" htmlFor="password">
                      Password
                    </label>
                    <Link
                      href="/members/user_password_remind"
                      className="text-sm font-medium text-brand-pink transition-colors hover:text-white"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="group relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 transition-colors group-focus-within:text-brand-pink" />
                    <input
                      className={`${FIELD} pl-11 pr-12`}
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      id="password"
                      placeholder="••••••••"
                      aria-invalid={errorMessage ? true : undefined}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      // Added: the toggle was an unlabelled button, so a screen reader announced
                      // nothing at all for it.
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-zinc-500 transition hover:text-white"
                    >
                      {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                    </button>
                  </div>
                </div>

                <label className="flex w-fit cursor-pointer items-center gap-2.5">
                  <span className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      id="remember"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="peer h-[18px] w-[18px] cursor-pointer appearance-none rounded-md border border-white/20 bg-white/5 transition-all checked:border-brand-pink checked:bg-brand-pink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-pink"
                    />
                    <Check className="pointer-events-none absolute h-3 w-3 text-white opacity-0 transition-opacity peer-checked:opacity-100" />
                  </span>
                  <span className="text-sm text-zinc-400">Keep me signed in</span>
                </label>

                {/* aria-live so the failure is announced, not just shown. */}
                <div aria-live="polite">
                  {errorMessage && (
                    <p
                      role="alert"
                      className="flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm font-medium text-red-300"
                    >
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      {errorMessage}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-pink py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-brand-pink/25 transition hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Signing in…" : "Sign in"}
                  {!isSubmitting && <ArrowRight className="h-4 w-4" />}
                </button>

                <p className="pt-1 text-center text-sm text-zinc-400">
                  Don&apos;t have an account?{" "}
                  <Link href="/members/register" className="font-semibold text-brand-pink transition-colors hover:text-white">
                    Create one
                  </Link>
                </p>
              </form>
            </div>

            {/*
              * DEMO CREDENTIALS — outside the form on purpose.
              *
              * This block used to live inside <form>, directly under the submit button and in the
              * same visual language, so a genuine member reached a "universal pass" as if it were
              * a step in signing in. It still does exactly what it did — fills the two fields with
              * a role id and the shared password — but it now reads as what it is.
              */}
            <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-5">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-amber-300/90">Demo environment</p>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
                Fill the form with a sample account. Password for all of them is{" "}
                <span className="font-semibold text-zinc-300">password123</span>.
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {DEMO_ROLES.map((item) => (
                  <button
                    key={item.role}
                    type="button"
                    onClick={() => {
                      setIdentifier(item.id);
                      setPassword("password123");
                      setErrorMessage(null);
                    }}
                    className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs font-semibold text-zinc-400 transition hover:border-brand-pink/40 hover:bg-white/[0.06] hover:text-white"
                  >
                    {item.role}
                  </button>
                ))}
              </div>

              <Link
                href="/members/user_event_summary"
                className="mt-3 inline-block text-xs font-semibold text-zinc-500 transition-colors hover:text-white"
              >
                Skip to dashboard &rarr;
              </Link>
            </div>
          </div>

          {/* ---------------------------------------------------------------- ROLES */}
          <div className="lg:col-span-7">
            <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-7 sm:p-9">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                One account, every role
              </p>
              <h2 className="mt-2 text-[26px] font-bold leading-tight tracking-tight text-white sm:text-3xl">
                Sign in once. We know who you are.
              </h2>
              <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-zinc-400">
                Exhibitors, speakers, visitors and organisers all use the same sign-in. Your account
                remembers what you registered for and opens the right dashboard. Not registered yet?
                Start below.
              </p>

              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                {ROLE_CARDS.map((card) => {
                  const Icon = card.icon;
                  return (
                    <Link
                      key={card.title}
                      href={card.href}
                      className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-all hover:border-brand-pink/40 hover:bg-white/[0.06]"
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="h-[18px] w-[18px] text-brand-pink" />
                        <h3 className="text-base font-bold tracking-tight text-white">{card.title}</h3>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-zinc-400">{card.body}</p>
                      <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-pink transition-colors group-hover:text-white">
                        {card.cta}
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5">
        <div className="container mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-xs text-zinc-600 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} Event Management Systems. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="#" className="transition-colors hover:text-white">Privacy policy</Link>
            <Link href="#" className="transition-colors hover:text-white">Terms of service</Link>
            <Link href="#" className="transition-colors hover:text-white">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function MembersLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-surface-4 text-sm text-zinc-500">
          Loading…
        </div>
      }
    >
      <MembersLoginContent />
    </Suspense>
  );
}
