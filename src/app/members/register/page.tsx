"use client";

import { useState, Suspense } from "react";
import type { FormEvent, ChangeEvent, ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, Home, ChevronRight, Lock, User, Mail, Phone, Building2, Sparkles } from "lucide-react";
import { ModalPortal } from "@/components/ui/ModalPortal";

type FieldErrors = Partial<Record<
  "login" | "first_name" | "last_name" | "email" | "phone" | "organization" | "password" | "confirm_password" | "terms_accepted",
  string[]
>>;

const initialForm = {
  login: "",
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  organization: "",
  password: "",
  confirm_password: "",
};

function MembersRegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get("callbackUrl");
  const targetUrl = callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/members/user_event_summary";

  const [form, setForm] = useState(initialForm);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalText, setModalText] = useState("");

  const updateField = (key: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    if (!termsAccepted) {
      setFieldErrors({ terms_accepted: ["You must accept the terms to register"] });
      return;
    }
    if (form.password !== form.confirm_password) {
      setFieldErrors({ confirm_password: ["Passwords do not match"] });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login: form.login.trim(),
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          organization: form.organization.trim(),
          password: form.password,
          confirm_password: form.confirm_password,
          terms_accepted: termsAccepted,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 400 && data?.error && typeof data.error === "object") {
          setFieldErrors(data.error as FieldErrors);
          setFormError("Please fix the highlighted fields and try again.");
        } else {
          setFormError(typeof data?.error === "string" ? data.error : "Registration failed. Please try again.");
        }
        setIsSubmitting(false);
        return;
      }

      setModalText("Your account has been created. Signing you in and preparing your dashboard...");
      setShowModal(true);

      const signInResult = await signIn("credentials", {
        identifier: form.login.trim().toLowerCase(),
        password: form.password,
        redirect: false,
      });

      if (signInResult?.ok) {
        setTimeout(() => {
          window.location.replace(targetUrl);
        }, 1200);
      } else {
        // Account was created successfully even if auto sign-in didn't fire; send them to log in manually.
        setTimeout(() => {
          router.push("/members/index");
        }, 1200);
      }
    } catch (err) {
      setFormError("System error while creating your account. Please try again later.");
      setIsSubmitting(false);
    }
  };

  const errorFor = (key: keyof FieldErrors) => fieldErrors[key]?.[0];

  return (
    <div className="min-h-screen bg-surface-4 text-white selection:bg-brand-pink/30">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-purple/20 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-brand-pink/10 blur-[120px] animate-pulse delay-700" />
      </div>

      {showModal && (
        <ModalPortal>
        <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto overscroll-contain bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="glass-panel border-white/20 rounded-[2rem] max-w-md w-full p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-6">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-brand-pink animate-ping" />
                <h4 className="text-xl font-black uppercase tracking-widest text-white">Account Created</h4>
              </div>
            </div>
            <p className="text-zinc-400 font-medium leading-relaxed">{modalText}</p>
          </div>
        </div>
        </ModalPortal>
      )}

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
            <li className="text-brand-pink">Registration</li>
          </ul>
        </div>
      </nav>

      <main className="relative z-10 container mx-auto px-6 py-12 sm:py-24 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-5 space-y-8 text-center lg:text-left">
            <div className="space-y-4">
              <div className="flex items-center justify-center lg:justify-start gap-2">
                <div className="h-px w-8 bg-brand-pink" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-pink">New Member</p>
              </div>
              <h1 className="text-5xl sm:text-7xl font-black uppercase tracking-tighter text-white leading-[0.9]">
                Create Your <span className="text-brand-gradient bg-clip-text text-transparent">Free Account</span>
              </h1>
              <p className="text-zinc-400 font-medium max-w-lg mx-auto lg:mx-0 leading-relaxed">
                Register to manage your event presence, exhibitor profile, and dashboard in one place.
              </p>
            </div>

            <div className="pt-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                Already have an account?{" "}
                <Link href="/members/index" className="text-brand-pink hover:text-white transition-colors">
                  Sign in here &rarr;
                </Link>
              </p>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="glass-panel border-white/10 rounded-[2.5rem] p-8 sm:p-12 shadow-2xl backdrop-blur-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gradient opacity-5 blur-[60px]" />

              <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black uppercase tracking-widest text-white">Register</h2>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Secure Member Registration</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Field label="First Name" error={errorFor("first_name")}>
                    <input
                      required
                      className={inputClass}
                      value={form.first_name}
                      onChange={updateField("first_name")}
                      placeholder="Jane"
                    />
                  </Field>
                  <Field label="Last Name" error={errorFor("last_name")}>
                    <input
                      required
                      className={inputClass}
                      value={form.last_name}
                      onChange={updateField("last_name")}
                      placeholder="Doe"
                    />
                  </Field>
                </div>

                <Field label="Username" error={errorFor("login")}>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 group-focus-within:text-brand-pink transition-colors" />
                    <input
                      required
                      className={`${inputClass} pl-12`}
                      value={form.login}
                      onChange={updateField("login")}
                      placeholder="janedoe"
                      autoComplete="username"
                    />
                  </div>
                </Field>

                <Field label="Email Address" error={errorFor("email")}>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 group-focus-within:text-brand-pink transition-colors" />
                    <input
                      type="email"
                      required
                      className={`${inputClass} pl-12`}
                      value={form.email}
                      onChange={updateField("email")}
                      placeholder="jane@company.com"
                      autoComplete="email"
                    />
                  </div>
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Field label="Mobile Number" error={errorFor("phone")}>
                    <div className="relative group">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 group-focus-within:text-brand-pink transition-colors" />
                      <input
                        required
                        className={`${inputClass} pl-12`}
                        value={form.phone}
                        onChange={updateField("phone")}
                        placeholder="+44 7000 000000"
                        autoComplete="tel"
                      />
                    </div>
                  </Field>
                  <Field label="Organization (optional)" error={errorFor("organization")}>
                    <div className="relative group">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 group-focus-within:text-brand-pink transition-colors" />
                      <input
                        className={`${inputClass} pl-12`}
                        value={form.organization}
                        onChange={updateField("organization")}
                        placeholder="Company Ltd."
                        autoComplete="organization"
                      />
                    </div>
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Field label="Password" error={errorFor("password")}>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 group-focus-within:text-brand-pink transition-colors" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        className={`${inputClass} pl-12 pr-12`}
                        value={form.password}
                        onChange={updateField("password")}
                        placeholder="••••••••"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </Field>
                  <Field label="Confirm Password" error={errorFor("confirm_password")}>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 group-focus-within:text-brand-pink transition-colors" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        className={`${inputClass} pl-12 pr-12`}
                        value={form.confirm_password}
                        onChange={updateField("confirm_password")}
                        placeholder="••••••••"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </Field>
                </div>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 peer h-5 w-5 flex-shrink-0 rounded-lg border-2 border-white/20 bg-transparent checked:bg-brand-pink checked:border-brand-pink transition-all appearance-none cursor-pointer"
                  />
                  <span className="text-[11px] font-bold text-zinc-500 group-hover:text-white transition-colors leading-relaxed">
                    I agree to the Terms of Service and Privacy Policy
                  </span>
                </label>
                {errorFor("terms_accepted") && (
                  <p className="text-[10px] font-black uppercase tracking-widest text-red-500 -mt-6">
                    {errorFor("terms_accepted")}
                  </p>
                )}

                {formError && (
                  <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-top-2">
                    {formError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-brand-pink py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-white shadow-2xl shadow-brand-pink/20 transition hover:scale-[1.02] hover:shadow-brand-pink/40 active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? "Creating Account..." : "Create My Free Account"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 container mx-auto px-6 py-12 border-t border-white/5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
            &copy; 2024 Event Management Systems. All Rights Reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

const inputClass =
  "w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-white placeholder:text-zinc-700 focus:border-brand-pink focus:outline-none transition-all";

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">{label}</label>
      {children}
      {error && <p className="text-[10px] font-bold text-red-500 ml-1">{error}</p>}
    </div>
  );
}

export default function MembersRegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface-4 text-white flex items-center justify-center font-black uppercase tracking-widest text-[10px]">Initializing Portal...</div>}>
      <MembersRegisterContent />
    </Suspense>
  );
}
