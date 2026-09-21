import Link from "next/link";
import { getBrand } from "@/lib/brand";
import { assetUrl, staticAssetUrl } from "@/lib/assets";
import { formatDayRange, formatMonthDayYear } from "@/lib/format";

interface Props {
  sectionTitle?: string | null;
  sectionDescription?: string | null;
  additionalInfo?: string | null;
  backgroundImage?: string | null;
  dateStart?: Date | null;
  dateEnd?: Date | null;
}

export async function AboutEvent({
  sectionTitle,
  sectionDescription,
  additionalInfo,
  backgroundImage,
  dateStart,
  dateEnd,
}: Props) {
  const bgImage =
    assetUrl(backgroundImage) || staticAssetUrl("https://digitalageexpo.com/files/listing_pages/817601-banner1.jpg");

  const title = sectionTitle || "About The Event";
  const defaultDesc =
    "For over 3 years our events have connected thousands of savvy business owners and budding entrepreneurs, sharing a wealth of knowledge, skills and advice in the United Kingdom and British Isles. B2B Growth Hub Limited holds a portfolio of some of the biggest events in Isle of Man and some counties of the United Kingdom. We are business connectors and act as a catalyst within the industry. Our ambition is to bring UK and British Isles businesses back on track after the covid pandemic, therefore B2B Growth Hub is bringing this virtual exhibition to provide an opportunity for businesses to increase their visibility, generate new leads and connect with like-minded business owners. Being held on a virtual platform, our shows couldn’t be better connected to all the businesses in the UK and British Isles. We are thankful to our technology partner Visualytes Limited to offer us a powerful virtual exhibition platform powered by Tillu.";
  
  const desc = sectionDescription || defaultDesc;
  /*
   * The site's own address, not a hardcoded one.
   *
   * This line is the "WHERE" of the About block, and it was the literal string
   * "digitalageexpo.com" — so every site served by this deployment told visitors to go to
   * Digital Age Expo. `additionalInfo` still wins when the event has its own text; this is only
   * what shows when it does not, which for a newly created site is always.
   */
  const brand = await getBrand();
  const whereText = additionalInfo || `${brand.host}\nPowered by TILLU-Virtual Exhibition`;

  return (
    <section
      className="relative overflow-hidden bg-cover bg-center bg-no-repeat px-6 py-20 text-white"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgb(var(--color-slate-900-rgb) / 0.8), rgb(var(--color-indigo-950-rgb) / 0.82)), url('${bgImage}')`,
      }}
    >
      <div className="relative z-10 mx-auto max-w-5xl">
        <h2 className="text-center text-3xl font-black uppercase tracking-tight text-white sm:text-5xl drop-shadow">
          {title}
        </h2>

        <div
          className="mt-6 text-center text-slate-100 text-sm sm:text-base leading-relaxed max-w-4xl mx-auto font-medium drop-shadow-sm [&_a]:underline"
          dangerouslySetInnerHTML={{ __html: desc }}
        />

        <div className="mt-14 grid gap-8 sm:grid-cols-3 items-center text-center sm:text-left bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/15 shadow-xl">
          <div>
            <h4 className="font-bold uppercase tracking-wider text-fuchsia-300 text-sm">WHERE</h4>
            <p className="mt-2 whitespace-pre-line text-white font-medium text-sm leading-snug">
              {whereText}
            </p>
          </div>

          <div>
            <h4 className="font-bold uppercase tracking-wider text-fuchsia-300 text-sm">WHEN</h4>
            {dateStart ? (
              <>
                <p className="mt-2 text-white font-medium text-sm">{formatDayRange(dateStart, dateEnd)}</p>
                <p className="text-slate-200 text-sm">{formatMonthDayYear(dateStart, dateEnd)}</p>
              </>
            ) : (
              <>
                <p className="mt-2 text-white font-medium text-sm">Wednesday to Friday</p>
                <p className="text-slate-200 text-sm">Aug 26 to Aug 28, 2026</p>
              </>
            )}
          </div>

          <div className="flex justify-center sm:justify-end">
            <Link
              href="/view_speaker"
              className="btn-brand-gradient rounded-full px-8 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg"
            >
              View All Speakers
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

