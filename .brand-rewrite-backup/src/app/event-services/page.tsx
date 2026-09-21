import { getDomain } from "@/lib/services/domain";
import { getEventAddonServices } from "@/lib/services/eventServices";
import { UserCheck, FileText, Target, Share2, Palette, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Services | Digital Age Expo",
  description: "Explore professional exhibition services including man-a-stand, leaflet drop, lead generation, social media marketing, and graphic design.",
};

const FALLBACK_ICONS = [UserCheck, FileText, Target, Share2, Palette];

export default async function EventServicesPage() {
  const domain = await getDomain();
  const services = await getEventAddonServices();

  return (
    <div className="w-full bg-slate-950 text-white min-h-screen pb-24">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-b from-purple-950 via-slate-950 to-slate-950 px-6 py-20 text-center border-b border-white/10">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-fuchsia-500/20 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-fuchsia-300 border border-fuchsia-500/30">
            <Sparkles className="w-4 h-4" />
            <span>Digital Age Expo Addons</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tight text-white">
            Exhibition <span className="brand-gradient-text">Services</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto font-medium">
            Boost your ROI, visitor engagement, and brand reach with our professional add-on exhibition services.
          </p>
        </div>
      </div>

      {/* Services List Grid */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 space-y-6">
        {services.length > 0 ? (
          services.map((service, idx) => {
            const Icon = FALLBACK_ICONS[idx % FALLBACK_ICONS.length];
            return (
              <div
                key={service.code || idx}
                className="group rounded-3xl border border-white/15 bg-slate-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-md transition-all duration-300 hover:border-fuchsia-500/50 hover:bg-slate-900"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-fuchsia-500/20 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-300 shrink-0 mt-1 md:mt-0">
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                          {service.title}
                        </h3>
                        {service.price && (
                          <span className="px-3 py-1 rounded-full bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30 text-xs font-extrabold uppercase tracking-wider">
                            £{service.price}
                          </span>
                        )}
                      </div>
                      {service.description && (
                        <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed max-w-3xl">
                          {service.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 pt-2 md:pt-0">
                    <Link
                      href={`/contact?service=${service.code}&title=${encodeURIComponent(service.title)}`}
                      className="btn-brand-gradient inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-xs sm:text-sm font-extrabold uppercase tracking-wider text-white shadow-xl transition-all duration-300 hover:scale-105"
                    >
                      <span>Book Now</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-16 text-slate-400 font-medium">
            Add-on service listings are being updated — please contact us for current options.
          </div>
        )}
      </div>
    </div>
  );
}
