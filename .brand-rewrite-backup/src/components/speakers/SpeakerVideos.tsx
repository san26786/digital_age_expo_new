interface Props {
  title: string;
  urls: string | null;
}

function toEmbedUrl(url: string): string {
  const watchMatch = url.match(/[?&]v=([^&]+)/);
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;

  const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;

  return url;
}

/** find_speakers.event_youtube_url / past_event_youtube_urls are ";$"-delimited URL lists. */
export function SpeakerVideos({ title, urls }: Props) {
  if (!urls) return null;

  const videos = urls
    .split(";$")
    .map((url) => url.trim())
    .filter(Boolean);

  if (!videos.length) return null;

  return (
    <section className="main-glow-bg py-24">
      <div className="mx-auto max-w-7xl px-6">

        {/* Heading */}
        <div className="mb-14 text-center">
          <span className="inline-flex rounded-full border border-brand-pink/30 bg-brand-pink/10 px-5 py-2 text-xs font-bold uppercase tracking-[0.35em] text-brand-pink">
            Video Gallery
          </span>

          <h2 className="sophisticated-gradient-text mt-6 font-display text-5xl font-black">
            {title}
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-zinc-400">
            Watch inspiring keynote sessions, expert discussions, and exclusive
            highlights from Digital Age Expo.
          </p>
        </div>

        {/* Videos */}
        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {videos.map((url, index) => (
            <div
              key={url}
              className="glass-panel hover-tilt-3d overflow-hidden rounded-3xl"
            >
              {/* Video */}
              <div className="aspect-video overflow-hidden rounded-t-3xl">
                <iframe
                  src={toEmbedUrl(url)}
                  title={`${title} ${index + 1}`}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              {/* Footer */}
              <div className="border-t border-white/10 p-6">

                <div className="mb-3 flex items-center justify-between">

                  <span className="rounded-full bg-brand-pink/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-pink">
                    Video {index + 1}
                  </span>

                  <span className="text-xs text-zinc-500">
                    Digital Age Expo
                  </span>

                </div>

                <h3 className="font-display text-xl font-bold text-white">
                  {title}
                </h3>

                <p className="mt-2 text-sm leading-7 text-zinc-400">
                  Experience insightful sessions from renowned speakers,
                  innovators, and industry leaders.
                </p>

              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}