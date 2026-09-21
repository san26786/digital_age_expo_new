import { assetUrl } from "@/lib/assets";
import { ExternalLink, Mic2 } from "lucide-react";

interface Props {
  name: string;
  positionBusiness: string;
  profilePic: string | null;
  linkedinUrl: string | null;
}

export function SpeakerProfileHeader({
  name,
  positionBusiness,
  profilePic,
  linkedinUrl,
}: Props) {
  const photo = assetUrl(profilePic) ?? "/requestuser.png";

  return (
    <section className="main-glow-bg relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-0 top-0 h-80 w-80 rounded-full bg-brand-pink/20 blur-[120px]" />
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-brand-purple/20 blur-[150px]" />
        <div className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-brand-pink/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 py-20">
        <div className="glass-panel overflow-hidden rounded-[32px] p-8 lg:p-12">
          <div className="flex flex-col items-center gap-10 lg:flex-row">

            {/* Image */}
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 rounded-[30px] bg-gradient-to-br from-brand-purple via-brand-pink to-brand-purple opacity-60 blur-2xl" />

              <div className="relative fancy-image-container rounded-[28px] border border-white/10 bg-zinc-900 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo}
                  alt={name}
                  className="h-72 w-72 rounded-[22px] object-cover lg:h-80 lg:w-80"
                />
              </div>

              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-brand-pink/30 bg-black/80 px-5 py-2 backdrop-blur-xl">
                <div className="flex items-center gap-2">
                  <Mic2 className="h-4 w-4 text-brand-pink" />
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white">
                    Featured Speaker
                  </span>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="flex-1 text-center lg:text-left">

              <span className="inline-flex rounded-full border border-brand-pink/30 bg-brand-pink/10 px-5 py-2 text-xs font-bold uppercase tracking-[0.35em] text-brand-pink">
                Keynote Speaker
              </span>

              <h1 className="sophisticated-gradient-text mt-6 font-display text-5xl font-black leading-tight lg:text-7xl">
                {name}
              </h1>

              {positionBusiness && (
                <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-300">
                  {positionBusiness}
                </p>
              )}

              <div className="mt-10 flex flex-wrap justify-center gap-5 lg:justify-start">

                {linkedinUrl && (
                  <a
                    href={linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-brand-gradient inline-flex items-center gap-3 rounded-full px-8 py-4 font-semibold"
                  >
                    <ExternalLink className="h-5 w-5" />
                    View LinkedIn
                  </a>
                )}

                <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-6 py-4 backdrop-blur-xl">
                  <span className="text-sm font-medium text-zinc-300">
                    Digital Age Expo Speaker
                  </span>
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}