"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import ExhibitorStandSection from "@/components/exhibitors/ExhibitorStandSection";
import { 
  Calendar, MapPin, Phone, Mail, Users, Video, CheckCircle, 
  ArrowRight, ExternalLink, ShieldCheck, Sparkles, Clock, 
  Building, Award, HelpCircle, Ticket, Globe, Layers, MessageSquare, Briefcase, Play 
} from "lucide-react";
import { staticAssetUrl } from "@/lib/assets";

const hubMenus = [
  { 
    id: "LTGVISTA", 
    title: "Visitor Hub", 
    actions: [
      { label: "Register Here", href: "/free-ticket", primary: true },
      { label: "Enter The Show", href: "/enter-the-show" },
      { label: "Send Invitation", href: "/contact" },
      { label: "Download Invitation", href: "/magazine" },
      { label: "Promote New Business", href: "/exhibitors" },
      { label: "Manage My Business", href: "/dashboard" },
      { label: "Buy Conference Pass", href: "/buy_tickets" },
      { label: "FAQs", href: "/frequently-asked-questions" }
    ]
  },
  { 
    id: "LTGEA", 
    title: "Exhibitor Hub", 
    actions: [
      { label: "Enroll as Exhibitor", href: "/exhibitor-registration", primary: true },
      { label: "Book a Stand", href: "/exhibitor-registration" },
      { label: "Our Exhibitors", href: "/exhibitors" },
      { label: "Why Exhibit", href: "/why-exhibit" },
      { label: "Stand and Packages", href: "/membership_packages" },
      { label: "Exhibitor Guide", href: "/magazine" },
      { label: "Glimpse of the Show", href: "/glimpse-of-the-show" },
      { label: "Exhibitor Login", href: "/members/index" }
    ]
  },
  { 
    id: "LTGSPKA", 
    title: "Speaker Hub", 
    actions: [
      { label: "Enroll As Speaker", href: "/speaker_registration", primary: true },
      { label: "Our Speakers", href: "/view_speaker" },
      { label: "Speaker Schedule", href: "/event_schedule" },
      { label: "Speaker Questionnaire", href: "/speaker-questionaire" }
    ]
  },
  { 
    id: "LTGSPNA", 
    title: "Sponsor Hub", 
    actions: [
      { label: "Enroll As Sponsor", href: "/sponsor_registration", primary: true },
      { label: "Our Sponsors", href: "/our_sponsor" },
      { label: "Request for Sponsorship", href: "/sponsor_registration" },
      { label: "Why Sponsor", href: "/why-sponsor" },
      { label: "Sponsorship Options", href: "/sponsor_opportunity" }
    ]
  },
  { 
    id: "LTGADVTA", 
    title: "Advertiser Hub", 
    actions: [
      { label: "Enroll As Advertiser", href: "/sponsor_registration", primary: true },
      { label: "Buy Advertisement", href: "/magazine" },
      { label: "Request Artwork", href: "/Standartworktemplates" },
      { label: "Request Content Writing", href: "/event-services" }
    ]
  },
  { 
    id: "LTGSPA", 
    title: "Supporter Hub", 
    actions: [
      { label: "Enroll As Supporter", href: "/sponsor_registration", primary: true },
      { label: "Enroll Banners Stands", href: "/exhibitor-registration" }
    ]
  },
  { 
    id: "LTGPTA", 
    title: "Partner Hub", 
    actions: [
      { label: "Enroll As Partner", href: "/sponsor_registration", primary: true },
      { label: "Become A Partner", href: "/sponsor_registration" }
    ]
  }
];

export default function EventExperiencePage() {
  const [activeHub, setActiveHub] = useState("LTGVISTA");
  const [activeDay, setActiveDay] = useState("date_1");
  const currentHubData = hubMenus.find((h) => h.id === activeHub) || hubMenus[0];

  return (
    <div className="w-full bg-slate-950 text-white min-h-screen">
      {/* Top Hero Banner */}
      <div 
        className="relative w-full bg-cover bg-center py-24 sm:py-36 px-4"
        style={{
          backgroundImage: `url('${staticAssetUrl("https://digitalageexpo.com/files/listing_pages/818073-dae_index_top_banner.jpg")}')`
        }}
      >
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px]" />
        <div className="container mx-auto max-w-5xl relative z-10 text-center space-y-6">
          <h1 className="text-2xl sm:text-5xl font-black uppercase tracking-tight text-white leading-tight">
            DIGITAL AGE EXPO 26TH - 28TH AUGUST 2026 | VIRTUAL EVENT
          </h1>
          <p className="text-base sm:text-lg text-slate-300 font-medium">
            26 to 28 August 2026, Online Virtual Event
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link 
              href="/free-ticket" 
              className="rounded-full bg-pink-600 hover:bg-pink-500 text-white font-extrabold text-sm uppercase tracking-wider py-4 px-8 shadow-2xl transition transform hover:scale-105"
            >
              Get Free Tickets Now!
            </Link>
            <Link 
              href="/enter-the-show" 
              className="rounded-full bg-indigo-900 hover:bg-indigo-800 border border-white/20 text-white font-extrabold text-sm uppercase tracking-wider py-4 px-8 shadow-2xl transition transform hover:scale-105"
            >
              Enter The Show
            </Link>
            <Link 
              href="/exhibitor-registration" 
              className="rounded-full bg-fuchsia-700 hover:bg-fuchsia-600 text-white font-extrabold text-sm uppercase tracking-wider py-4 px-8 shadow-2xl transition transform hover:scale-105"
            >
              Book Your Stand
            </Link>
          </div>
        </div>
      </div>

      {/* What do you want to do today? Hub Selector Section */}
      <section className="bg-indigo-950 py-16 px-4 border-b border-white/10">
        <div className="container mx-auto max-w-6xl text-center space-y-6">
          <p className="text-slate-300 font-semibold text-sm uppercase tracking-widest">What do you want to do today?</p>
          <h2 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tight">Select your choice below</h2>
          
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            {hubMenus.map((hub) => (
              <button
                key={hub.id}
                onClick={() => setActiveHub(hub.id)}
                className={`px-6 py-3 rounded-full text-sm font-bold uppercase tracking-wider transition shadow-lg ${
                  activeHub === hub.id 
                    ? "bg-white text-indigo-950 scale-105 ring-4 ring-pink-500/50" 
                    : "bg-indigo-900/80 text-white hover:bg-indigo-800 border border-white/10"
                }`}
              >
                {hub.title}
              </button>
            ))}
          </div>

          {/* Active Hub Action Buttons Grid */}
          <div className="pt-8 max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {currentHubData.actions.map((act, i) => (
              <Link
                key={i}
                href={act.href}
                className={`p-4 rounded-2xl border text-center font-bold text-sm tracking-wide transition flex items-center justify-center gap-2 ${
                  act.primary 
                    ? "bg-pink-600 border-pink-500 text-white hover:bg-pink-500 shadow-xl" 
                    : "bg-slate-900/90 border-white/15 text-slate-200 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {act.label}
                <ArrowRight className="w-4 h-4" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Schedule Info Header */}
      <section className="py-20 px-4 bg-slate-900">
        <div className="container mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-4">
            <span className="text-pink-500 font-bold uppercase tracking-widest text-xs">Schedule Details</span>
            <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white">
              Information of Event Schedules
            </h2>
            <p className="text-slate-300 leading-relaxed text-sm sm:text-base">
              World is committed to making participation in the event a harassment-free experience for everyone, regardless of level of experience, gender, gender identity, and expression.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-6 rounded-3xl bg-indigo-950 border border-white/10 shadow-xl">
              <h3 className="text-xl sm:text-2xl font-black text-white">26th Aug</h3>
              <span className="text-xs font-bold uppercase tracking-wider text-pink-400 mt-1 block">Wednesday</span>
            </div>
            <div className="p-6 rounded-3xl bg-purple-950 border border-white/10 shadow-xl">
              <h3 className="text-xl sm:text-2xl font-black text-white">27th Aug</h3>
              <span className="text-xs font-bold uppercase tracking-wider text-pink-400 mt-1 block">Thursday</span>
            </div>
            <div className="p-6 rounded-3xl bg-slate-950 border border-white/10 shadow-xl">
              <h3 className="text-xl sm:text-2xl font-black text-white">28th Aug</h3>
              <span className="text-xs font-bold uppercase tracking-wider text-pink-400 mt-1 block">Friday</span>
            </div>
          </div>
        </div>
      </section>

      {/* Why you should Join Event Section */}
      <section className="py-20 px-4 bg-slate-950">
        <div className="container mx-auto max-w-6xl space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white">Why You Should Join Event</h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Exhibiting at this Business Show puts your business face to face with hundreds of SME owners and senior decision makers looking for innovative products and services.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-xl space-y-4">
              <h3 className="text-xl font-black text-pink-400">Networking</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Meet Potential Customers - With the ability to create powerful rapport with face-to-face video calling interactions and live chat conversations you can transform your business.
              </p>
            </div>
            <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-xl space-y-4">
              <h3 className="text-xl font-black text-indigo-400">Great Speakers</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Welcoming some of the UK&apos;s leading speakers and industry experts who will take to the Keynote Stage, Seminar Zones and host Expert Workshops!
              </p>
            </div>
            <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-xl space-y-4">
              <h3 className="text-xl font-black text-pink-400">Lead Generation</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Create powerful rapport with face-to-face video calling interactions and live chat conversations to position your products and services as the ideal solution.
              </p>
            </div>
            <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-xl space-y-4">
              <h3 className="text-xl font-black text-indigo-400">New Opportunities</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Exhibiting or sponsoring at the event also allows ideas to develop, collaborations on projects with new ideas and meeting individuals by chance.
              </p>
            </div>
            <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-xl space-y-4">
              <h3 className="text-xl font-black text-pink-400">Build Database</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Meeting with potential customers at the Show helps you to start building your marketing lists and generate qualified sales leads.
              </p>
            </div>
            <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-xl space-y-4">
              <h3 className="text-xl font-black text-indigo-400">Brand Awareness</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Raising awareness with new people - Exhibiting or sponsoring is a proven way to raise your profile and generate brand awareness.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Get Experience Split Section */}
      <section className="bg-indigo-950">
        <div className="grid grid-cols-1 lg:grid-cols-2 items-stretch min-h-[360px]">
          <div 
            className="bg-cover bg-center min-h-[300px]"
            style={{ backgroundImage: `url('${staticAssetUrl("https://tradeshowslocal.com/files/listing_pages/817601-cta_img.jpg")}')` }}
          />
          <div className="p-8 sm:p-16 flex flex-col justify-center space-y-4 bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950">
            <span className="text-pink-400 font-bold uppercase tracking-widest text-xs">Get Experience</span>
            <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white">Shift your perspective on digital business</h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              How do you transform your business as technology, consumer habits, and industry dynamics change? Find out from those leading the charge.
            </p>
          </div>
        </div>
      </section>

      {/* Exhibitor Stand Section */}
      <ExhibitorStandSection />

      {/* Interactive Schedule Tabs */}
      <section className="py-20 px-4 bg-slate-900">
        <div className="container mx-auto max-w-5xl space-y-8">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-black uppercase tracking-tight text-white">Event Agenda & Schedule</h2>
            <p className="text-slate-400 text-sm">Explore sessions, keynote talks, and live masterclasses across the 3 event days.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => setActiveDay("date_1")}
              className={`p-4 rounded-2xl border text-center font-bold text-sm transition ${
                activeDay === "date_1" 
                  ? "bg-pink-600 border-pink-500 text-white shadow-lg" 
                  : "bg-slate-800 border-white/10 text-slate-300 hover:bg-slate-700"
              }`}
            >
              Day 1 - August 26, 2026<br />
              <span className="text-xs font-normal text-white/80">Event Start Day</span>
            </button>
            <button
              onClick={() => setActiveDay("date_2")}
              className={`p-4 rounded-2xl border text-center font-bold text-sm transition ${
                activeDay === "date_2" 
                  ? "bg-pink-600 border-pink-500 text-white shadow-lg" 
                  : "bg-slate-800 border-white/10 text-slate-300 hover:bg-slate-700"
              }`}
            >
              Day 2 - August 27, 2026<br />
              <span className="text-xs font-normal text-white/80">Mid Event Day</span>
            </button>
            <button
              onClick={() => setActiveDay("date_3")}
              className={`p-4 rounded-2xl border text-center font-bold text-sm transition ${
                activeDay === "date_3" 
                  ? "bg-pink-600 border-pink-500 text-white shadow-lg" 
                  : "bg-slate-800 border-white/10 text-slate-300 hover:bg-slate-700"
              }`}
            >
              Day 3 - August 28, 2026<br />
              <span className="text-xs font-normal text-white/80">Event Closure Day</span>
            </button>
          </div>

          <div className="bg-slate-950 border border-white/10 rounded-3xl p-8 text-center space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white">
                {activeDay === "date_1" && "August 26, 2026 - Opening Keynotes & Exhibitor Showcase"}
                {activeDay === "date_2" && "August 27, 2026 - Masterclasses & Speed Networking"}
                {activeDay === "date_3" && "August 28, 2026 - Awards, Panels & Closing Ceremony"}
              </h3>
              <p className="text-slate-400 text-sm">Join live interactive sessions directly from the virtual auditorium.</p>
            </div>

            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-slate-900 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-pink-400">09:30 AM - 10:45 AM (GMT)</span>
                  <h4 className="text-base font-bold text-white">Digital Economy Transformation Keynote</h4>
                  <p className="text-xs text-slate-400">Auditorium A • Hosted by B2B Growth Hub</p>
                </div>
                <Link href="/event_schedule" className="btn-brand-gradient px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-white whitespace-nowrap">
                  View Schedule
                </Link>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-pink-400">11:15 AM - 12:30 PM (GMT)</span>
                  <h4 className="text-base font-bold text-white">AI & Automation for Modern B2B Growth</h4>
                  <p className="text-xs text-slate-400">Tech Zone Seminar Hall</p>
                </div>
                <Link href="/event_schedule" className="btn-brand-gradient px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-white whitespace-nowrap">
                  View Schedule
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Reach Us & Map Section */}
      <section className="py-20 px-4 bg-slate-950">
        <div className="container mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div>
              <span className="text-pink-500 font-bold uppercase tracking-widest text-xs">Reach Us</span>
              <h2 className="text-3xl font-black uppercase tracking-tight text-white mt-1">Get Information About The Event</h2>
            </div>
            
            <div className="space-y-4 text-sm text-slate-300">
              <div className="p-4 rounded-xl bg-slate-900 border border-white/10 flex items-center gap-3">
                <MapPin className="w-5 h-5 text-pink-500 shrink-0" />
                <span>Online Virtual Event (Global Access)</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-white/10 flex items-center gap-3">
                <Clock className="w-5 h-5 text-pink-500 shrink-0" />
                <span>26 Aug 2026 09:00 AM - 28 Aug 2026 04:30 PM</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-white/10 flex items-center gap-3">
                <Mail className="w-5 h-5 text-pink-500 shrink-0" />
                <span>hello@digitalageexpo.com</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-white/10 flex items-center gap-3">
                <Phone className="w-5 h-5 text-pink-500 shrink-0" />
                <span>02380 970305 / 01624 666105</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 p-4 rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
            <iframe 
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2336.736369923358!2d-4.482576184682348!3d54.1493184219631!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4863857f048b16e5%3A0xe7b8e00c71ae204f!2sFind%20Us%20On%20Web!5e0!3m2!1sen!2sin!4v1621241119871!5m2!1sen!2sin" 
              width="100%" 
              height="380" 
              style={{ border: 0 }} 
              allowFullScreen={true} 
              loading="lazy"
              className="rounded-2xl"
            />
          </div>
        </div>
      </section>

      {/* Book Your Seat Footer CTA */}
      <section 
        className="relative py-28 px-4 text-center bg-cover bg-center"
        style={{ backgroundImage: `url('${staticAssetUrl("https://digitalageexpo.com/files/listing_pages/817601-book_seat_img.jpg")}')` }}
      >
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px]" />
        <div className="container mx-auto max-w-3xl relative z-10 space-y-6">
          <p className="text-pink-400 font-bold uppercase tracking-widest text-sm">Hurry Up!</p>
          <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white">Book Your Seat</h2>
          <div className="w-24 h-1 bg-pink-500 mx-auto rounded-full" />
          <div className="pt-4">
            <Link 
              href="/buy_tickets" 
              className="rounded-full bg-pink-600 hover:bg-pink-500 text-white font-extrabold text-base uppercase tracking-wider py-5 px-12 shadow-2xl transition transform hover:scale-105 inline-block"
            >
              Buy Ticket Now
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
