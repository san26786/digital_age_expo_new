import { getDomain } from "@/lib/services/domain";
import { getEventGallery } from "@/lib/services/gallery";
import { Image as ImageIcon, PlayCircle } from "lucide-react";

export const metadata = {
  title: "Event Gallery | Digital Age Expo",
  description: "Browse photo galleries, floorplans, and visual highlights from Digital Age Expo.",
};

export default async function ViewGalleryPage() {
  const domain = await getDomain();
  const photos = domain.event_id ? await getEventGallery(domain.event_id) : [];

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      <div className="bg-indigo-950 text-white py-16 px-6 text-center">
        <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight">
          Event <span className="text-pink-500">Gallery</span>
        </h1>
        <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto">
          Photo highlights and visual showcases from our exhibition halls and keynote stages.
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {photos.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center border border-slate-100 shadow-sm space-y-3">
            <ImageIcon className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-lg font-bold text-indigo-950 uppercase">Gallery Coming Soon</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Photos from this event haven&apos;t been published yet. Check back closer to the show.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {photos.map((photo) => (
              <div key={photo.id} className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                <div className="h-52 bg-slate-800 flex items-center justify-center text-slate-400 font-bold relative overflow-hidden">
                  {photo.isVideo && photo.youtubeLink ? (
                    <a
                      href={photo.youtubeLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-2 text-white/90 hover:text-white"
                    >
                      <PlayCircle className="w-10 h-10" />
                      <span className="text-xs uppercase tracking-wider">Watch Video</span>
                    </a>
                  ) : photo.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo.imageUrl} alt={photo.title || "Event gallery photo"} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-slate-500" />
                  )}
                </div>
                <div className="p-4">
                  <h4 className="font-bold text-indigo-950 text-sm">{photo.title || "Event Highlight"}</h4>
                  {photo.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{photo.description}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
