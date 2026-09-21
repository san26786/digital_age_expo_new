import Link from "next/link";
import { staticAssetUrl } from "@/lib/assets";

const INTRO_VIDEO_URL =
  staticAssetUrl("/images/817601-05_INTRO_OK-1.mp4");

export function EventIntroVideo() {
  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* Background Video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src={INTRO_VIDEO_URL} type="video/mp4" />
      </video>

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/55" />

      {/* Center Content */}
      <div className="relative z-10 flex h-full items-center justify-center px-6">
        <div className="text-center">
         


          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/glimpse-of-the-show"
              className="rounded-full bg-gradient-to-r from-pink-600 to-purple-600 px-8 py-4 text-lg font-semibold text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-pink-500/40"
            >
              Explore the Event
            </Link>

            <Link
              href="/enter-the-show"
              className="rounded-full border border-white/40 bg-white/10 px-8 py-4 text-lg font-semibold text-white backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-white/20"
            >
              Enter Digital Age Expo
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Fade */}
      <div className="absolute bottom-0 left-0 h-32 w-full bg-gradient-to-t from-black via-black/40 to-transparent" />
    </section>
  );
}