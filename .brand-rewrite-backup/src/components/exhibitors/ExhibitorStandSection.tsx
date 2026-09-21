"use client";

import { useState } from "react";
import Image from "next/image";
import { staticAssetUrl } from "@/lib/assets";

export default function ExhibitorStandSection() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [position, setPosition] = useState("");
  const [business, setBusiness] = useState("");
  const [phone, setPhone] = useState("");
  const [workPhone, setWorkPhone] = useState("");
  const [email, setEmail] = useState("");
  const [exhibitionZone, setExhibitionZone] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [referral, setReferral] = useState("FRGSE");
  const [referrerFrom, setReferrerFrom] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [keynoteTopic, setKeynoteTopic] = useState("no");
  const [digitalOfferings, setDigitalOfferings] = useState({
    webinars: false,
    workshops: false,
    businessPresentation: false,
    eMagazine: false,
    newsletter: false,
  });
  const [confirmThis, setConfirmThis] = useState(false);
  const [securityCode, setSecurityCode] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!firstName || !lastName || !position || !business || !email || !phone || !exhibitionZone || !confirmThis || !securityCode) {
      setErrorMsg("Please fill in all required fields marked with * and accept terms.");
      return;
    }

    setSubmitted(true);
  };

  return (
    <section className="py-16 bg-slate-950 text-white px-4 sm:px-6">
      <div className="container mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Column: Information & Images */}
          <div className="lg:col-span-6 space-y-8">
            <div className="space-y-3">
              <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
                Book Your Virtual Exhibition Stand – Get In Touch For More Details!
              </h2>
              <p className="text-pink-400 font-bold text-sm">
                Promote your business to a local, national & international audience.
              </p>
            </div>
            <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10">
              <Image
                src={staticAssetUrl("https://digitalageexpo.com/files/listing_pages/817601-exhibitor.jpg")}
                alt="Exhibitor Stand"
                width={800}
                height={500}
                className="w-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="space-y-3 pt-4">
              <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
                This Is How A Virtual Exhibition Stand Works…
              </h3>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Virtual stands work pretty much the same as live in-person events. Without the hassle of you having to stand around all day!
                <br /><br />
                5 ways to make the most of on-stand promotional opportunities:
                <br />
                1. Branding your stand with your company logo<br />
                2. Showcase your website and your social media channels<br />
                3. Promote a short video or PowerPoint presentation<br />
                4. Present your company brochure or information leaflets<br />
                5. Engage in real time option with a &apos;call now&apos; function<br />
                (The red + circles on the virtual stand are the navigation prompts for all of the above)
                <br /><br />
                Branding, Showcase, Promote, Present & Engage…
              </p>
            </div>
            <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10">
              <Image
                src={staticAssetUrl("https://digitalageexpo.com/files/listing_pages/817601-exhibitor_2.jpg")}
                alt="Virtual Stand Works"
                width={800}
                height={500}
                className="w-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="space-y-3 pt-4">
              <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
                By Exhibiting At This Business Show You Will:
              </h3>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed space-y-2">
                • Generate more sales by using our modern edge video calling for face-to-face interactions which is proven to be by far the most effective way of promoting and selling your products and services or chat conversations to hundreds of key decision makers in attendance.<br />
                • You will also Maximise your exposure by exhibiting, gaining unrivalled exposure at the show and benefiting from our extensive pre-show marketing campaign.<br />
                • Network with your industry and meet companies and individuals looking for your products and services.<br />
                • Enjoy proven ROI where more than 70% of visitors purchase from exhibitors at the show or as a direct result.
              </p>
            </div>
            <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10">
              <Image
                src={staticAssetUrl("https://digitalageexpo.com/files/listing_pages/818073-exhibition.png")}
                alt="Exhibition Benefits"
                width={800}
                height={500}
                className="w-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="space-y-3 pt-4">
              <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
                Your Exhibitor Package Includes:
              </h3>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                • An exhibition stand<br />
                • A microsite on the business Show website<br />
                • An exhibitor listing in the hard copy and digital copy of the show guide<br />
                • Social media support<br />
                • Extra marketing promotion via the news section of the website
              </p>
            </div>
          </div>

          {/* Right Column: Registration Form */}
          <div className="lg:col-span-6 bg-slate-900 border border-white/15 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-md">
            {submitted ? (
              <div className="text-center py-16 space-y-6">
                <div className="w-16 h-16 bg-green-500/20 border border-green-500 rounded-full flex items-center justify-center mx-auto text-green-400 text-3xl font-bold">
                  ✓
                </div>
                <h3 className="text-2xl font-black uppercase text-white">Registration Submitted!</h3>
                <p className="text-slate-300 text-sm">
                  Thank you for registering to become an exhibitor at Digital Age Expo 2026. Our team will contact you shortly to set up your virtual stand.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="btn-brand-gradient px-8 py-3 rounded-full text-xs font-bold uppercase tracking-wider text-white"
                >
                  Submit Another Response
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-lg font-black uppercase text-white border-b border-white/10 pb-3">Personal Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase text-slate-300">First Name*</label>
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full bg-slate-950 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:border-fuchsia-500 focus:outline-none text-sm"
                        placeholder="First name"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase text-slate-300">Last Name*</label>
                      <input
                        type="text"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full bg-slate-950 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:border-fuchsia-500 focus:outline-none text-sm"
                        placeholder="Last name"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-slate-300">Position*</label>
                    <input
                      type="text"
                      required
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      className="w-full bg-slate-950 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:border-fuchsia-500 focus:outline-none text-sm"
                      placeholder="e.g. Managing Director"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-slate-300">Business*</label>
                    <input
                      type="text"
                      required
                      value={business}
                      onChange={(e) => setBusiness(e.target.value)}
                      className="w-full bg-slate-950 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:border-fuchsia-500 focus:outline-none text-sm"
                      placeholder="Company name"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase text-slate-300">Mobile*</label>
                      <input
                        type="text"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-slate-950 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:border-fuchsia-500 focus:outline-none text-sm"
                        placeholder="Mobile number"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase text-slate-300">Work Phone</label>
                      <input
                        type="text"
                        value={workPhone}
                        onChange={(e) => setWorkPhone(e.target.value)}
                        className="w-full bg-slate-950 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:border-fuchsia-500 focus:outline-none text-sm"
                        placeholder="Work phone"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <h4 className="text-lg font-black uppercase text-white border-b border-white/10 pb-3">Email Address</h4>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-slate-300">Email*</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:border-fuchsia-500 focus:outline-none text-sm"
                      placeholder="name@company.com"
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <h4 className="text-lg font-black uppercase text-white border-b border-white/10 pb-3">Stand Details</h4>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-slate-300">Exhibition Zone*</label>
                    <select
                      required
                      value={exhibitionZone}
                      onChange={(e) => setExhibitionZone(e.target.value)}
                      className="w-full bg-slate-950 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-fuchsia-500 focus:outline-none text-sm"
                    >
                      <option value="">Select Exhibition Zone</option>
                      <option value="2733">Business Growth Zone 1</option>
                      <option value="2739">Marketing Zone 1</option>
                      <option value="2740">Marketing Zone 2</option>
                      <option value="2741">Web and Technology Zone 1</option>
                      <option value="2742">Business Services Zone 1</option>
                      <option value="2743">Business Services Zone 2</option>
                      <option value="2752">Franchisee Zone 1</option>
                      <option value="2753">Retail Product Zone 1</option>
                      <option value="2756">Micro Business - Zone 1</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <label className="text-xs font-bold uppercase text-slate-300">LinkedIn Profile Link</label>
                    <input
                      type="text"
                      value={linkedin}
                      onChange={(e) => setLinkedin(e.target.value)}
                      className="w-full bg-slate-950 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:border-fuchsia-500 focus:outline-none text-sm"
                      placeholder="https://linkedin.com/in/..."
                    />
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <label className="text-xs font-bold uppercase text-slate-300">Where did you hear about the show?</label>
                    <select
                      value={referral}
                      onChange={(e) => setReferral(e.target.value)}
                      className="w-full bg-slate-950 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-fuchsia-500 focus:outline-none text-sm"
                    >
                      <option value="FRGSE">Google or Search Engine</option>
                      <option value="FRFB">Facebook</option>
                      <option value="FRYT">Youtube</option>
                      <option value="FRTW">Twitter</option>
                      <option value="FRIG">Instagram</option>
                      <option value="FROSM">Other social media</option>
                      <option value="FREM">Email</option>
                      <option value="FRWOM">Word of mouth</option>
                      <option value="FROT">Other</option>
                    </select>
                  </div>

                  {referral === "FROT" && (
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        value={referrerFrom}
                        onChange={(e) => setReferrerFrom(e.target.value)}
                        className="w-full bg-slate-950 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:border-fuchsia-500 focus:outline-none text-sm"
                        placeholder="Please specify"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5 pt-2">
                    <label className="text-xs font-bold uppercase text-slate-300">Referral Code</label>
                    <input
                      type="text"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value)}
                      className="w-full bg-slate-950 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:border-fuchsia-500 focus:outline-none text-sm"
                      placeholder="Partner referral code if any"
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <h4 className="text-lg font-black uppercase text-white border-b border-white/10 pb-3">Keynote Speech?</h4>
                  <p className="text-xs text-slate-300">Would you be interested in Keynote speech or sponsorship opportunities at the show?</p>
                  <div className="flex items-center gap-6">
                    {["yes", "no", "maybe"].map((opt) => (
                      <label key={opt} className="flex items-center gap-2 text-sm font-bold uppercase cursor-pointer text-slate-200">
                        <input
                          type="radio"
                          name="keynote_speech_topic"
                          value={opt}
                          checked={keynoteTopic === opt}
                          onChange={(e) => setKeynoteTopic(e.target.value)}
                          className="text-pink-600 focus:ring-pink-500 w-4 h-4"
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <h4 className="text-lg font-black uppercase text-white border-b border-white/10 pb-3">Digital Offerings</h4>
                  <p className="text-xs text-slate-300">Please tick any of the following free digital products you are interested in:</p>
                  <div className="space-y-2">
                    {[
                      { key: "webinars", label: "Webinars & Seminars" },
                      { key: "workshops", label: "Workshops" },
                      { key: "businessPresentation", label: "Business Presentation" },
                      { key: "eMagazine", label: "E-magazine" },
                      { key: "newsletter", label: "Newsletter" },
                    ].map((item) => (
                      <label key={item.key} className="flex items-center gap-3 text-sm text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={digitalOfferings[item.key as keyof typeof digitalOfferings]}
                          onChange={(e) => setDigitalOfferings({ ...digitalOfferings, [item.key]: e.target.checked })}
                          className="rounded border-white/20 bg-slate-950 text-pink-600 focus:ring-pink-500 w-4 h-4"
                        />
                        {item.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/10">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    By clicking on Register button you submit the registration form for your interest in exhibiting at the Digital Age Expo and you consent to the event organisers sending you emails regarding this event.
                  </p>
                  <label className="flex items-start gap-3 text-xs font-bold text-white cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      checked={confirmThis}
                      onChange={(e) => setConfirmThis(e.target.checked)}
                      className="rounded border-white/20 bg-slate-950 text-pink-600 focus:ring-pink-500 w-4 h-4 mt-0.5 shrink-0"
                    />
                    Please tick here to indicate you have read and understood this*
                  </label>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    By clicking Register button below, you consent to allow Digital Age Expo show to store, share and process the personal information submitted above to provide you the content requested.
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-xs font-bold uppercase text-slate-300">Security Code*</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="text"
                      required
                      value={securityCode}
                      onChange={(e) => setSecurityCode(e.target.value)}
                      className="w-full bg-slate-950 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:border-fuchsia-500 focus:outline-none text-sm"
                      placeholder="Enter security code"
                    />
                    <div className="bg-fuchsia-950 border border-fuchsia-500/40 text-fuchsia-300 px-4 py-2.5 rounded-xl font-mono font-bold tracking-widest text-sm select-none">
                      SG1U{/*fsj*/}
                    </div>
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-semibold">
                    {errorMsg}
                  </div>
                )}

                <div className="pt-4">
                  <button
                    type="submit"
                    className="btn-brand-gradient w-full py-4 rounded-xl font-black uppercase tracking-wider text-white shadow-2xl transition transform hover:scale-[1.01]"
                  >
                    Request to become an Exhibitor and Buy Stand
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
