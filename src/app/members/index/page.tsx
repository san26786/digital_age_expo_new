"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { Eye, EyeOff, Home, ChevronRight, Lock, User, Sparkles } from "lucide-react";
import { ModalPortal } from "@/components/ui/ModalPortal";

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
        <div className="glass-panel border-white/10 rounded-[2.5rem] p-12 max-w-lg w-full text-center space-y-8 shadow-2xl backdrop-blur-2xl">
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2">
              <div className="h-px w-8 bg-brand-pink" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-pink">Active Session</p>
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tight">Already Authorized</h2>
            <p className="text-zinc-400 font-medium">
              You are currently signed in as <span className="text-white">{session.user?.name || session.user?.email}</span>.
            </p>
          </div>
          
          <div className="flex flex-col gap-4">
            <Link 
              href={targetUrl}
              className="w-full bg-brand-pink py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-white shadow-2xl shadow-brand-pink/20 transition hover:scale-[1.02]"
            >
              Enter Dashboard
            </Link>
            <button
              onClick={handleSignOut}
              className="w-full bg-white/5 border border-white/10 py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
            >
              Sign Out / Switch Role
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
    <div className="min-h-screen bg-surface-4 text-white selection:bg-brand-pink/30">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-purple/20 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-brand-pink/10 blur-[120px] animate-pulse delay-700" />
      </div>

      {/* Modal Popup */}
      {showModal && (
        <ModalPortal>
        <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="glass-panel border-white/20 rounded-[2rem] max-w-md w-full p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-6">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-brand-pink animate-ping" />
                <h4 className="text-xl font-black uppercase tracking-widest text-white">System Notice</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="h-10 w-10 flex items-center justify-center rounded-full bg-white/5 text-zinc-400 hover:text-white transition-all"
              >
                ✕
              </button>
            </div>
            <p className="text-zinc-400 font-medium leading-relaxed">{modalText}</p>
            <div className="text-center pt-4">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-full bg-brand-pink py-4 rounded-2xl font-black uppercase tracking-widest text-white shadow-xl shadow-brand-pink/20 transition hover:scale-[1.02] active:scale-95"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Navigation */}
      <nav className="relative z-10 border-b border-white/5 bg-black/20 backdrop-blur-xl">
        <div className="container mx-auto max-w-7xl px-6 py-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-xl bg-brand-gradient flex items-center justify-center shadow-lg shadow-brand-pink/20 transition group-hover:scale-110">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-black uppercase tracking-tighter text-white">Portal</span>
          </Link>
          <ul className="hidden md:flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
            <li className="flex items-center gap-2 hover:text-white transition">
              <Home className="w-3.5 h-3.5" />
              <Link href="/">Home</Link>
            </li>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-800" />
            <li className="text-brand-pink">Authentication</li>
          </ul>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-6 py-12 sm:py-24 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Context */}
          <div className="lg:col-span-5 space-y-8 text-center lg:text-left">
            <div className="space-y-4">
              <div className="flex items-center justify-center lg:justify-start gap-2">
                <div className="h-px w-8 bg-brand-pink" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-pink">Member Access</p>
              </div>
              <h1 className="text-5xl sm:text-7xl font-black uppercase tracking-tighter text-white leading-[0.9]">
                Manage Your <span className="text-brand-gradient bg-clip-text text-transparent">Event Presence</span>
              </h1>
              <p className="text-zinc-400 font-medium max-w-lg mx-auto lg:mx-0 leading-relaxed">
                Sign in to your dashboard to update your profile, manage exhibitors, speakers, and coordinate your event logistics in real-time.
              </p>
            </div>

            <div className="pt-8 grid grid-cols-2 gap-4">
              <Link href="/exhibitors" className="glass-panel p-6 rounded-3xl text-center group transition-all hover:border-brand-pink/50">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">For Exhibitors</p>
                <p className="text-sm font-black text-white group-hover:text-brand-pink transition-colors">Join the Show &rarr;</p>
              </Link>
              <Link href="/speaker_registration" className="glass-panel p-6 rounded-3xl text-center group transition-all hover:border-brand-purple/50">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">For Speakers</p>
                <p className="text-sm font-black text-white group-hover:text-brand-purple transition-colors">Apply to Speak &rarr;</p>
              </Link>
            </div>

            <div className="pt-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                New here?{" "}
                <Link href="/members/register" className="text-brand-pink hover:text-white transition-colors">
                  Create a free account &rarr;
                </Link>
              </p>
            </div>
          </div>

          {/* Right Column: Login Card */}
          <div className="lg:col-span-7">
            <div className="glass-panel border-white/10 rounded-[2.5rem] p-8 sm:p-12 shadow-2xl backdrop-blur-2xl relative overflow-hidden">
              {/* Subtle Decorative Element */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gradient opacity-5 blur-[60px]" />
              
              <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black uppercase tracking-widest text-white">Sign In</h2>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Secure Member Authentication</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1" htmlFor="identifier">
                      Email or Username
                    </label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 group-focus-within:text-brand-pink transition-colors" />
                      <input
                        type="text"
                        required
                        className="w-full rounded-2xl border border-white/10 bg-white/5 pl-12 pr-4 py-4 text-white placeholder:text-zinc-700 focus:border-brand-pink focus:outline-none transition-all"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        id="identifier"
                        placeholder="Enter your credentials"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500" htmlFor="password">
                        Password
                      </label>
                      <Link
                        href="/members/user_password_remind"
                        className="text-[10px] font-black text-brand-pink hover:text-white uppercase tracking-widest transition-colors"
                      >
                        Forgot?
                      </Link>
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 group-focus-within:text-brand-pink transition-colors" />
                      <input
                        className="w-full rounded-2xl border border-white/10 bg-white/5 pl-12 pr-12 py-4 text-white placeholder:text-zinc-700 focus:border-brand-pink focus:outline-none transition-all"
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        id="password"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative flex items-center justify-center">
                        <input
                          type="checkbox"
                          id="remember"
                          checked={remember}
                          onChange={(e) => setRemember(e.target.checked)}
                          className="peer h-5 w-5 rounded-lg border-2 border-white/20 bg-transparent checked:bg-brand-pink checked:border-brand-pink transition-all appearance-none cursor-pointer"
                        />
                        <Sparkles className="absolute h-3 w-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-white transition-colors">
                        Remember Session
                      </span>
                    </label>
                  </div>
                </div>

                {errorMessage && (
                  <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-top-2">
                    {errorMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-brand-pink py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-white shadow-2xl shadow-brand-pink/20 transition hover:scale-[1.02] hover:shadow-brand-pink/40 active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? "Authorizing..." : "Initialize Session"}
                </button>

                <p className="text-center text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  Don&apos;t have an account?{" "}
                  <Link href="/members/register" className="text-brand-pink hover:text-white transition-colors">
                    Register here &rarr;
                  </Link>
                </p>

                {/* Quick Demo Credentials Assistant */}
                <div className="pt-8 border-t border-white/5 space-y-6">
                  <div className="text-center space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-pink">
                      Testing Sandbox
                    </p>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Select a role to bypass manual entry</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { role: "Organiser", id: "organiser", color: "indigo" },
                      { role: "Exhibitor", id: "exhibitor", color: "fuchsia" },
                      { role: "Speaker", id: "speaker", color: "pink" },
                      { role: "Visitor", id: "visitor", color: "emerald" },
                    ].map((item) => (
                      <button
                        key={item.role}
                        type="button"
                        onClick={() => {
                          setIdentifier(item.id);
                          setPassword("password123");
                          setErrorMessage(null);
                        }}
                        className="glass-panel p-4 rounded-2xl text-center group transition-all hover:bg-white/5 border-white/5 hover:border-brand-pink/30"
                      >
                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-white transition-colors">{item.role}</p>
                        <p className="text-[7px] font-bold text-zinc-600 mt-1 uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">Load Demo</p>
                      </button>
                    ))}
                  </div>

                  <div className="rounded-2xl bg-white/[0.02] p-4 border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-brand-pink animate-pulse" />
                      <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                        Universal Pass: <span className="text-zinc-300">password123</span>
                      </p>
                    </div>
                    <Link href="/members/user_event_summary" className="text-[9px] font-black uppercase tracking-widest text-brand-pink hover:text-white transition-colors">
                      Bypass to Dashboard &rarr;
                    </Link>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="relative z-10 container mx-auto px-6 py-12 border-t border-white/5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
            &copy; 2024 Event Management Systems. All Rights Reserved.
          </p>
          <div className="flex items-center gap-8">
            <Link href="#" className="text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="#" className="text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-white transition-colors">Terms of Service</Link>
            <Link href="#" className="text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-white transition-colors">Contact Engineering</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function MembersLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface-4 text-white flex items-center justify-center font-black uppercase tracking-widest text-[10px]">Initializing Portal...</div>}>
      <MembersLoginContent />
    </Suspense>
  );
}
