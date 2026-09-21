import { Sparkles, ArrowRight, Layout, Info } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Stand Artwork Templates | Digital Age Expo",
  description:
    "Comprehensive collection of stand artwork templates, booth specifications, and requirements for virtual exhibition stands at Digital Age Expo.",
};

export default function StandArtworkTemplatesPage() {
  const boothArtworkSpecs = [
    { item: "Stand Header Image", spec: "678px * 188px" },
    { item: "Top Left & Right Banner Image", spec: "325px * 395px" },
    { item: "Bottom Left & Right Banner Image", spec: "335px * 727px" },
    { item: "Tabletop Image", spec: "232px * 94px" },
    { item: "Brochures", spec: "PDF Format (Brochures & Catalogs)" },
    {
      item: "Video Link (Brief information about your business with call to action)",
      spec: "YouTube Link preferred (or MP4 video link)",
    },
    {
      item: "Schedule Meeting Link",
      spec: "Calendly Link preferred (or other scheduling link)",
    },
  ];

  const exhibitorDetailsSpecs = [
    { item: "Name (Contact Personnel)", spec: "Required" },
    { item: "Preferred Email Address", spec: "Required" },
    { item: "Phone Number", spec: "Required" },
    { item: "Profile Image (Contact Personnel)", spec: "500px * 500px" },
    { item: "Stand Logo", spec: "640px * 210px" },
    { item: "Website Link", spec: "Full URL starting with https://" },
    { item: "LinkedIn User Profile Link", spec: "Full URL starting with https://" },
    { item: "Facebook Profile Link", spec: "Full URL starting with https://" },
    { item: "Twitter Profile Link", spec: "Full URL starting with https://" },
    { item: "Instagram Profile Link", spec: "Full URL starting with https://" },
    { item: "WhatsApp Number", spec: "Don't include any symbols or spaces" },
    { item: "About Us Description", spec: "< 1,000 characters" },
  ];

  return (
    <div className="bg-slate-950 text-white min-h-screen">
    

      {/* Main Content & Description */}
      <section className="py-16 px-6 max-w-5xl mx-auto space-y-12">
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-8 sm:p-12 shadow-2xl backdrop-blur-md space-y-6">
          <h2 className="text-2xl sm:text-3xl font-black uppercase text-fuchsia-300 tracking-tight">
            Streamline Your Virtual Booth Setup
          </h2>

          <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-medium">
            Welcome to our comprehensive collection of standard work templates designed to streamline your processes and boost efficiency. Whether you&apos;re managing Virtual Meetings, Offline Events, or improving workflows, our templates provide a solid foundation to ensure consistency and quality across your operations.
          </p>

          <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-medium">
            Stand Artwork Templates are meticulously crafted to align with industry best practices and can be easily customized to fit your specific needs. From Stand Management and checklists to Virtual Events, our templates are versatile tools that save time and enhance productivity.
          </p>

          {/* Featured Stand Banner Image */}
          <div className="pt-6">
            <div className="overflow-hidden rounded-2xl border border-white/15 bg-slate-950 p-2 shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/helping-stands.png"
                alt="Stand Artwork Specification Banner"
                className="w-full h-auto rounded-xl object-contain"
              />
            </div>
          </div>
        </div>

        {/* Booth Requirements Table */}
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 sm:p-10 shadow-2xl backdrop-blur-md space-y-8">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-fuchsia-600 to-purple-600 text-white shadow-md">
              <Layout className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-black uppercase text-white">
                Booth Dimension Requirements &amp; Details
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 font-medium">
                Ensure all graphics meet these exact pixel dimensions for crystal clear presentation
              </p>
            </div>
          </div>

          {/* Specs Table 1: Artwork Graphics */}
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/60">
            <table className="w-full text-left text-sm text-slate-200">
              <thead className="bg-slate-900 text-xs uppercase tracking-wider text-fuchsia-300 border-b border-white/10">
                <tr>
                  <th scope="col" className="px-6 py-4 font-bold">
                    Booth Item
                  </th>
                  <th scope="col" className="px-6 py-4 font-bold">
                    Requirements / Dimensions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {boothArtworkSpecs.map((spec, index) => (
                  <tr
                    key={index}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4 font-semibold text-white">
                      {spec.item}
                    </td>
                    <td className="px-6 py-4 font-bold text-fuchsia-400">
                      {spec.spec}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Specs Table 2: Exhibitor Profile Details */}
          <div className="pt-4 space-y-4">
            <h4 className="text-lg font-bold uppercase tracking-tight text-fuchsia-200 flex items-center gap-2">
              <Info className="w-5 h-5 text-fuchsia-400" />
              Exhibitor Full Details &amp; Profile Specs
            </h4>

            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/60">
              <table className="w-full text-left text-sm text-slate-200">
                <thead className="bg-slate-900 text-xs uppercase tracking-wider text-fuchsia-300 border-b border-white/10">
                  <tr>
                    <th scope="col" className="px-6 py-4 font-bold">
                      Field / Detail
                    </th>
                    <th scope="col" className="px-6 py-4 font-bold">
                      Requirements
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {exhibitorDetailsSpecs.map((spec, index) => (
                    <tr
                      key={index}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="px-6 py-4 font-semibold text-white">
                        {spec.item}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-300">
                        {spec.spec || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* CTA Footer Card */}
        <div className="text-center bg-gradient-to-r from-purple-950 via-slate-900 to-fuchsia-950 border border-white/10 rounded-3xl p-10 shadow-2xl">
          <Sparkles className="w-10 h-10 text-fuchsia-400 mx-auto mb-3" />
          <h3 className="text-2xl sm:text-3xl font-black uppercase text-white mb-2">
            Need Custom Stand Artwork Assistance?
          </h3>
          <p className="text-sm sm:text-base text-slate-300 mb-8 max-w-xl mx-auto font-medium">
            Our graphic design team can help you prepare your stand artwork and banner graphics to look outstanding on live show day.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/exhibitor-registration"
              className="btn-brand-gradient rounded-full px-8 py-3.5 font-bold text-white shadow-xl transition-all duration-300 hover:scale-105 text-sm uppercase tracking-wider inline-flex items-center gap-2"
            >
              <span>Book Your Stand Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
