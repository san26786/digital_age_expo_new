"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Sparkles, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import axios, { isAxiosError } from "axios";
import { staticAssetUrl } from "@/lib/assets";

export default function GlimpseOfTheShowPage() {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    company_name: "",
    phone: "",
    email: "",
    terms: false,
  });

  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.first_name || !formData.last_name || !formData.phone || !formData.email) {
      setErrorMessage("Please fill in all required fields (*).");
      setStatus("error");
      return;
    }

    if (!formData.terms) {
      setErrorMessage("Please agree to the Terms and Conditions.");
      setStatus("error");
      return;
    }

    setStatus("submitting");
    setErrorMessage(null);

    try {
      await axios.post("/api/register", {
        first_name: formData.first_name,
        last_name: formData.last_name,
        organization: formData.company_name,
        phone: formData.phone,
        email: formData.email,
        login: formData.email.split("@")[0] + "_" + Math.floor(Math.random() * 1000),
        password: "Pass" + Math.random().toString(36).substring(2, 8) + "!",
      });
      setStatus("success");
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.data?.error) {
        setErrorMessage(
          typeof err.response.data.error === "string" ? err.response.data.error : "Registration failed."
        );
        setStatus("error");
      } else {
        setStatus("success");
      }
    }
  };

  return (
    <div className="w-full bg-slate-950 text-white min-h-screen pb-20">
      {/* Hero Section: Video & Visitor Form Overlay */}
      <section id="hero" className="relative w-full min-h-[85vh] flex items-center justify-center overflow-hidden">
        {/* Background Video */}
        <div className="absolute inset-0">
          <video
            src={staticAssetUrl("https://findusonweb.com/files/listing_pages/817601-05_INTRO_OK-1.mp4")}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-slate-950/80" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-12 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Hero Text */}
          <div className="lg:col-span-7 space-y-4 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full bg-fuchsia-500/20 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-fuchsia-300 backdrop-blur-md border border-fuchsia-500/30">
              <Sparkles className="w-4 h-4" />
              <span>Digital Age Expo Virtual Experience</span>
            </div>
            <h1 className="text-3xl sm:text-6xl font-black uppercase tracking-tight text-white leading-none">
              Glimpse of <span className="brand-gradient-text">The Show</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-200 max-w-xl leading-relaxed font-medium">
              Explore our immersive virtual expo hall, world-class keynote auditoriums, interactive photobooths, and networking lounges. Register now to experience the future of business exhibitions.
            </p>
          </div>

          {/* Right Visitor Registration Form Overlay */}
          <div className="lg:col-span-5 w-full max-w-md mx-auto">
            {status === "success" ? (
              <div className="bg-slate-900/90 backdrop-blur-xl p-8 rounded-3xl border border-emerald-500/40 shadow-2xl text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black uppercase text-white">Registration Complete!</h3>
                <p className="text-xs sm:text-sm text-slate-300 font-medium">
                  Thank you for registering as a visitor. You now have access to enter the show floor and explore all exhibition zones.
                </p>
                <button
                  type="button"
                  onClick={() => setStatus("idle")}
                  className="mt-2 text-xs font-bold text-fuchsia-400 hover:underline uppercase"
                >
                  Register Another Visitor
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="bg-slate-900/90 backdrop-blur-xl p-6 sm:p-8 rounded-3xl border border-white/20 shadow-2xl space-y-4"
              >
                <h2 className="text-lg sm:text-xl font-black uppercase tracking-wider text-center text-white border-b border-white/10 pb-3">
                  Visitor Registration
                </h2>

                {status === "error" && errorMessage && (
                  <div className="flex items-center gap-2 p-3 bg-rose-500/20 border border-rose-500/30 rounded-xl text-xs text-rose-300 font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full bg-slate-800/80 border border-white/20 rounded-xl p-3 text-white placeholder-slate-400 text-xs focus:border-fuchsia-500 focus:outline-none"
                    placeholder="First Name*"
                    required
                  />
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full bg-slate-800/80 border border-white/20 rounded-xl p-3 text-white placeholder-slate-400 text-xs focus:border-fuchsia-500 focus:outline-none"
                    placeholder="Last Name*"
                    required
                  />
                </div>

                <input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  className="w-full bg-slate-800/80 border border-white/20 rounded-xl p-3 text-white placeholder-slate-400 text-xs focus:border-fuchsia-500 focus:outline-none"
                  placeholder="Company Name"
                />

                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-slate-800/80 border border-white/20 rounded-xl p-3 text-white placeholder-slate-400 text-xs focus:border-fuchsia-500 focus:outline-none"
                  placeholder="Mobile Phone*"
                  required
                />

                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-800/80 border border-white/20 rounded-xl p-3 text-white placeholder-slate-400 text-xs focus:border-fuchsia-500 focus:outline-none"
                  placeholder="Email Address*"
                  required
                />

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={formData.terms}
                    onChange={(e) => setFormData({ ...formData, terms: e.target.checked })}
                    className="accent-fuchsia-500 h-4 w-4 rounded"
                  />
                  <label htmlFor="terms" className="text-xs text-slate-300 font-medium cursor-pointer">
                    I agree to the Terms and Conditions*
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="btn-brand-gradient w-full text-white font-extrabold text-xs uppercase tracking-wider py-3.5 rounded-xl shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                >
                  {status === "submitting" ? "Processing..." : "Register and Enter The Show"}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Sponsors & Partners Banner */}
      <section className="bg-slate-900 py-12 border-y border-white/10">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 text-center items-center">
          {[
            {
              title: "Lead Sponsor & Tech Partner",
              img: staticAssetUrl("/images/visualytes.png"),
              link: "www.visualytes.com",
            },
            {
              title: "Powered by",
              img: staticAssetUrl("/images/tillu_white.png"),
              link: "tillu.co.uk",
            },
            {
              title: "Organised By",
              img: staticAssetUrl("/images/b2bgrowthhub.png"),
              link: "b2bgrowthhub.com",
            },
          ].map((s, i) => (
            <div key={i} className="space-y-3 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <h3 className="text-slate-300 text-xs font-bold uppercase tracking-wider">{s.title}</h3>
              <div className="h-16 flex items-center justify-center">
                <img src={s.img} alt={s.title} className="max-h-12 max-w-[200px] object-contain mx-auto" />
              </div>
              <a
                href={`https://${s.link}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-fuchsia-400 hover:underline inline-block"
              >
                {s.link}
              </a>
            </div>
          ))}
        </div>
      </section>
     


      {/* Glimpse of the Show Grid */}
      <section className="max-w-6xl mx-auto px-6 pt-16 space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <h1 className="text-3xl sm:text-5xl font-black text-fuchsia-400 uppercase tracking-tight">
            GLIMPSE OF THE SHOW
          </h1>
          <p className="text-sm sm:text-base text-slate-300 font-medium">
            Take a tour through key areas of Digital Age Expo including our interactive hall, photo booth, lobby, and welcome lounge.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            {
              title: "Exhibition Lobby",
              img: staticAssetUrl("/images/event_lobby.png"),
            },
            {
              title: "Welcome area",
              img: staticAssetUrl("/images/photobooth.png"),
            },
            {
              title: "Photo booth",
              img: staticAssetUrl("/images/photob.jpg"),
            },
            {
              title: "Exhibition Hall",
              img: staticAssetUrl("/images/speaker_hall.png"),
            },
          ].map((item, i) => (
            <div key={i} className="space-y-3 group">
              <h2 className="text-center text-xl sm:text-2xl font-black uppercase text-white tracking-wide group-hover:text-fuchsia-300 transition-colors">
                {item.title}
              </h2>
              <div className="rounded-3xl overflow-hidden border border-white/15 bg-slate-900 shadow-2xl relative group-hover:border-fuchsia-500/50 transition-all">
               
                  <img
                    src={item.img}
                    alt={item.title}
                    className="w-full h-64 sm:h-80 object-cover group-hover:scale-105 transition-transform duration-500"
                  />
              
              </div>
            </div>
          ))}
        </div>

        {/* CTA Banner */}
        <div className="text-center pt-10 pb-6 rounded-3xl border border-white/10 bg-gradient-to-r from-purple-950/80 via-slate-900/90 to-indigo-950/80 p-8 sm:p-12 shadow-2xl backdrop-blur-md space-y-6 max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tight">
            Want to exhibit your business ?
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto font-medium">
            Connect with over 10,000 SME owners and decision-makers. Book your virtual stand today.
          </p>
          <div>
            <Link
              href="/exhibitor-registration"
              className="btn-brand-gradient inline-flex items-center gap-2 text-white font-black text-xs sm:text-sm uppercase tracking-wider px-8 py-4 rounded-xl shadow-xl hover:scale-105 transition-all"
            >
              <span>Book your stand now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
