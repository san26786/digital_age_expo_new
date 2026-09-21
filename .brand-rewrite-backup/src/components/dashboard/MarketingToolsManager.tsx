"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Download,
  Copy,
  Check,
  Edit2,
  FileText,
  Share2,
  Mail,
  Newspaper,
  ImageIcon,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Save,
  X,
} from "lucide-react";
import type { MarketingToolsData } from "@/lib/services/eventMarketingTools";
import { assetUrl } from "@/lib/assets";

interface MarketingToolsManagerProps {
  data: MarketingToolsData;
  canManage: boolean;
  eventId: number;
}

export function MarketingToolsManager({ data: initialData, canManage, eventId }: MarketingToolsManagerProps) {
  const [data, setData] = useState<MarketingToolsData>(initialData);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<MarketingToolsData>(initialData);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const defaultImage = "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80";

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/members/marketing-tools", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save marketing tools");

      setData(json.marketingTools || formData);
      setIsEditing(false);
      setMessage({ type: "success", text: "Marketing tools assets updated successfully!" });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "An error occurred" });
    } finally {
      setSaving(false);
    }
  };

  const banners = [
    { title: "Medium Banner (468 x 60 pixels)", key: "medium_banner_1" as const, url: data.medium_banner_1 },
    { title: "Medium Banner - Style 2 (468 x 60 pixels)", key: "medium_banner_2" as const, url: data.medium_banner_2 },
    { title: "Medium Banner - Style 3 (468 x 60 pixels)", key: "medium_banner_3" as const, url: data.medium_banner_3 },
    { title: "Large Banner (728 x 90 pixels)", key: "large_banner_1" as const, url: data.large_banner_1 },
    { title: "Large Banner - Style 2 (728 x 90 pixels)", key: "large_banner_2" as const, url: data.large_banner_2 },
    { title: "Large Banner - Style 3 (728 x 90 pixels)", key: "large_banner_3" as const, url: data.large_banner_3 },
    { title: "Large Square (300 x 250 pixels)", key: "large_square" as const, url: data.large_square },
  ];

  return (
    <div className="space-y-8">
      {/* Top Banner & Header */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-5">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-pink/10 px-3 py-1 text-xs font-bold text-brand-pink ring-1 ring-brand-pink/20">
              <Sparkles className="h-3.5 w-3.5 text-brand-pink" /> Exhibitor Marketing Toolkit
            </span>
            <h1 className="mt-2 text-2xl font-black uppercase text-white">Marketing Tools</h1>
          </div>

          {canManage && (
            <button
              onClick={() => {
                setFormData(data);
                setIsEditing(!isEditing);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-pink px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm shadow-brand-pink/20 hover:opacity-90 transition"
            >
              {isEditing ? <X className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
              {isEditing ? "Close Editor" : "Edit Marketing Assets"}
            </button>
          )}
        </div>

        {message && (
          <div
            className={`mt-4 rounded-xl p-4 text-xs font-bold ${
              message.type === "success"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-red-500/10 text-red-400 border border-red-500/20"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Organiser Editor Modal / Drawer */}
        {isEditing && (
          <form onSubmit={handleSave} className="mt-6 rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
            <h2 className="text-sm font-black uppercase text-white border-b border-white/10 pb-2">
              Organiser Asset Manager (Update URLs)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {Object.keys(formData).map((key) => (
                <div key={key}>
                  <label className="block font-bold text-zinc-300 mb-1 capitalize">
                    {key.replace(/_/g, " ")}
                  </label>
                  <input
                    type="text"
                    value={(formData as any)[key] || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, [key]: e.target.value })
                    }
                    placeholder="https://..."
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-zinc-600 focus:border-brand-pink focus:outline-none"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-lg bg-white/10 px-4 py-2 text-xs font-bold text-zinc-300 hover:bg-white/20 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition disabled:opacity-60"
              >
                <Save className="h-3.5 w-3.5" />
                {saving ? "Saving..." : "Save Assets"}
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-4">
            <img
              src={assetUrl(data.cover_image) || defaultImage}
              alt="Marketing Cover"
              className="h-48 w-full rounded-xl border border-white/10 object-cover shadow-sm"
            />
          </div>
          <div className="md:col-span-8 space-y-3 text-sm text-zinc-400 leading-relaxed">
            <p>
              We have compiled all the materials you require to ensure you can shout as much as you can about your stand and gain the best possible results from exhibiting at the show.
            </p>
            <p>
              It&apos;s essential to utilise the tools available here so you can create your own communication plan to market the show to your customers and prospects.
            </p>
            <div className="inline-flex items-center gap-2 rounded-xl bg-amber-500/10 px-4 py-2.5 border border-amber-500/20 text-xs text-amber-300 font-medium">
              <ShieldCheck className="h-4 w-4 text-amber-400 shrink-0" />
              <span>
                If you don&apos;t know where to start, we have also put together a template communications calendar with all the key dates and deadlines for the show. <b>Following GDPR Regulations we are allowing you to use these tools.</b>
              </span>
            </div>
          </div>
        </div>

        {/* Numbered Stages / Navigation Cards (Matching PHP checklist-stage) */}
        <div className="mt-8 space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-white">Quick Navigation Checklist</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {[
              { num: 1, title: "Web Banners", href: "#banners", desc: "Show banners to upload onto your website" },
              { num: 2, title: "Guest Invitations", href: "#invitation", desc: "E-tickets to invite your customer database" },
              { num: 3, title: "Emails", href: "#email", desc: "Ready-made email broadcast templates" },
              { num: 4, title: "Social Media", href: "#social", desc: "Hashtags and platform handles" },
              { num: 5, title: "Editorial & Press", href: "#press", desc: "100 & 200 word show press releases" },
              { num: 6, title: "Adverts", href: "#advert", desc: "Half & full page exhibitor adverts" },
              { num: 7, title: "Additional Downloads", href: "#additional", desc: "Show logos and branding graphics" },
            ].map((stage) => (
              <a
                key={stage.num}
                href={stage.href}
                className="group flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3 hover:border-brand-pink/40 hover:bg-brand-pink/10 transition-all"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-pink text-xs font-extrabold text-white shadow-xs group-hover:scale-105 transition-transform">
                  {stage.num}
                </div>
                <div>
                  <h4 className="font-bold text-white group-hover:text-brand-pink">{stage.title}</h4>
                  <p className="text-[11px] text-zinc-500 line-clamp-1">{stage.desc}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Section 1: Promotional Banners (#banners) */}
      <div id="banners" className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 shadow-sm space-y-6">
        <div className="border-b border-white/5 pb-3">
          <h2 className="text-lg font-black uppercase text-white flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-brand-pink" /> Promotional Banners
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            We have provided you with a range of web banners to fit your own website&apos;s specifications - please upload a banner onto your website so that customers can register for tickets to see your stand directly.
          </p>
        </div>

        <div className="space-y-6 divide-y divide-white/5">
          {banners.map((item) => {
            const imgSrc = item.url || defaultImage;
            const embedCode = `<img height="200" src="${imgSrc}" class="img img-responsive" alt="${item.title}">`;

            return (
              <div key={item.key} className="pt-6 first:pt-0 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div className="md:col-span-8 space-y-2">
                  <h4 className="text-xs font-black uppercase text-white">{item.title}</h4>
                  <div className="flex items-center justify-center rounded-xl border border-white/10 bg-white/5 p-4 min-h-[160px] max-h-[220px] overflow-hidden">
                    <img
                      src={assetUrl(imgSrc)}
                      alt={item.title}
                      className="max-h-[180px] w-auto object-contain rounded-lg"
                    />
                  </div>
                </div>

                <div className="md:col-span-4 space-y-2">
                  <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">Embed HTML Code</span>
                  <textarea
                    readOnly
                    rows={4}
                    value={embedCode}
                    className="w-full rounded-xl border border-white/10 bg-black/40 p-3 font-mono text-[11px] text-emerald-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(embedCode, item.key)}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-pink px-3 py-2 text-xs font-bold text-white shadow-xs hover:opacity-90 transition"
                  >
                    {copiedKey === item.key ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" /> Copied HTML!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" /> Copy HTML Embed Code
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Guest Invitations (#invitation) */}
      <div id="invitation" className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-black uppercase text-white flex items-center gap-2 border-b border-white/5 pb-3">
          <FileText className="h-5 w-5 text-brand-pink" /> Guest Invitations
        </h2>
        <p className="text-xs text-zinc-400 leading-relaxed">
          E-invites are a great way to invite your customer database without breaking the bank with print costs. Copy and paste into an email or use your own email marketing system.
        </p>

        <div className="pt-2">
          <a
            href={data.guest_invitation || "#"}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-5 py-4 text-xs font-black text-white hover:bg-white/10 hover:border-brand-pink/40 transition"
          >
            <Download className="h-5 w-5 text-brand-pink" />
            <div>
              <span className="block text-sm">Guest Invite E-Ticket</span>
              <span className="text-[11px] font-medium text-zinc-500">Image / PDF Format</span>
            </div>
          </a>
        </div>
      </div>

      {/* Section 3: Email Campaigns (#email) */}
      <div id="email" className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-black uppercase text-white flex items-center gap-2 border-b border-white/5 pb-3">
          <Mail className="h-5 w-5 text-brand-pink" /> Email Campaigns
        </h2>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Please find an e-mail template for you to send out to your audience inviting them to the show. All you have to do is fill in the gaps.
        </p>

        <div className="pt-2">
          <a
            href={data.email_template || "#"}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-5 py-4 text-xs font-black text-white hover:bg-white/10 hover:border-brand-pink/40 transition"
          >
            <Download className="h-5 w-5 text-brand-pink" />
            <div>
              <span className="block text-sm">Marketing Email Template</span>
              <span className="text-[11px] font-medium text-zinc-500">HTML / Text Document</span>
            </div>
          </a>
        </div>
      </div>

      {/* Section 4: Social Media (#social) */}
      <div id="social" className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-black uppercase text-white flex items-center gap-2 border-b border-white/5 pb-3">
          <Share2 className="h-5 w-5 text-brand-pink" /> Social Media
        </h2>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Social Media is a brilliant promotional tool to communicate to your target audiences quickly and widely. We cover all the big social media platforms, including Twitter, Facebook and LinkedIn - please utilise our websites, hashtags and connections so you can keep your customers updated with the progress of the show.
        </p>

        <div className="rounded-xl bg-white/5 p-4 border border-white/10 space-y-2 text-xs font-bold text-zinc-300">
          <p className="flex items-center gap-2">
            <span className="text-brand-pink font-black">Twitter:</span> Official Hashtag <code className="bg-brand-pink/10 text-brand-pink px-2 py-0.5 rounded font-mono">#TBSUK</code> & <code className="bg-brand-pink/10 text-brand-pink px-2 py-0.5 rounded font-mono">#DigitalAgeExpo</code>
          </p>
          <p className="flex items-center gap-2">
            <span className="text-brand-pink font-black">Facebook:</span> Digital Age Expo Official Page
          </p>
          <p className="flex items-center gap-2">
            <span className="text-brand-pink font-black">LinkedIn:</span> Digital Age Expo Network Group
          </p>
          <p className="text-[11px] font-normal text-zinc-500 pt-1">
            For social media queries, contact: <a href="mailto:pearl.pearcesmith@prysmgroup.co.uk" className="text-brand-pink underline font-semibold">pearl.pearcesmith@prysmgroup.co.uk</a>
          </p>
        </div>
      </div>

      {/* Section 5: Editorial And Press Releases (#press) */}
      <div id="press" className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-black uppercase text-white flex items-center gap-2 border-b border-white/5 pb-3">
          <Newspaper className="h-5 w-5 text-brand-pink" /> Editorial And Press Releases
        </h2>
        <p className="text-xs text-zinc-400 leading-relaxed">
          We will be sending out as much press as possible to get a buzz about the show. You can also use the content that we send out for your own website by uploading the content onto your news feed or editorial page.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {[
            { label: "The Business Show Editorial (100 Words)", url: data.editorial_100 },
            { label: "The Business Show Editorial (200 Words)", url: data.editorial_200 },
            { label: "Business Startup Editorial (100 Words)", url: data.startup_editorial_100 },
            { label: "Business Startup Editorial (200 Words)", url: data.startup_editorial_200 },
          ].map((item, idx) => (
            <a
              key={idx}
              href={item.url || "#"}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 text-xs font-bold text-white hover:bg-white/10 hover:border-brand-pink/40 transition"
            >
              <div className="space-y-0.5">
                <span className="block">{item.label}</span>
                <span className="text-[11px] font-normal text-zinc-500">Press Article Download</span>
              </div>
              <Download className="h-4 w-4 text-brand-pink shrink-0" />
            </a>
          ))}
        </div>
      </div>

      {/* Section 6: Adverts (#advert) */}
      <div id="advert" className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 shadow-sm space-y-3">
        <h2 className="text-lg font-black uppercase text-white border-b border-white/5 pb-3">
          Adverts
        </h2>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Half or full page adverts for exhibitors to use across print publications and digital magazines. Contact your account manager for customized hi-res artwork files.
        </p>
      </div>

      {/* Section 7: Additional Downloads (#additional) */}
      <div id="additional" className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-black uppercase text-white flex items-center gap-2 border-b border-white/5 pb-3">
          <Download className="h-5 w-5 text-brand-pink" /> Additional Downloads
        </h2>

        <div className="pt-1">
          <a
            href={data.show_logo || "#"}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-5 py-4 text-xs font-black text-white hover:bg-white/10 hover:border-brand-pink/40 transition"
          >
            <Download className="h-5 w-5 text-brand-pink" />
            <div>
              <span className="block text-sm">Official Show Logo Package</span>
              <span className="text-[11px] font-medium text-zinc-500">Vector PNG / EPS Graphics</span>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
