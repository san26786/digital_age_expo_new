import { assetUrl } from "@/lib/assets";
import { LogoPlate } from "@/components/common/LogoPlate";

interface Item {
  id: number;
  section_title: string;
  opportunity_images: string;
  additional_info: string;
}

const DEFAULT_ITEMS: Item[] = [
  {
    id: 1,
    section_title: "Lead Sponsor & Tech Partner",
    opportunity_images: "/images/visualytes.png",
    additional_info: "https://www.visualytes.com",
  },
  {
    id: 2,
    section_title: "Powered by",
    opportunity_images: "/images/tillu_white.png",
    additional_info: "https://tillu.co.uk",
  },
  {
    id: 3,
    section_title: "Organised By",
    opportunity_images: "/images/b2bgrowthhub.png",
    additional_info: "https://b2bgrowthhub.com",
  },
];

/** Unchanged from the previous markup — bare hosts get a scheme so the anchor still resolves. */
function href(additionalInfo: string): string {
  return additionalInfo.startsWith("http") ? additionalInfo : `https://${additionalInfo}`;
}

/**
 * UI-ONLY REDESIGN. `items`, the `DEFAULT_ITEMS` fallback, `assetUrl()` resolution and every
 * destination are unchanged. Two presentational decisions are worth recording:
 *
 * 1. THE WHOLE CARD IS NOW THE LINK. It used to be a card with a separate underlined URL printed
 *    under the logo. The reference's cards are clean logo plates, so the anchor was promoted to
 *    wrap the card instead of sitting inside it — the destination is identical, and the click
 *    target got larger rather than smaller. The literal URL text is no longer printed, since a
 *    card that is itself a link does not need to spell out where it goes. Cards with no
 *    `additional_info` render as a plain div, exactly as before.
 *
 * 2. FLEX-WRAP, NOT A THREE-COLUMN GRID. `items` is whatever the event has configured — it is not
 *    guaranteed to be three. A `sm:grid-cols-3` leaves a lone card stranded against the left edge
 *    when there are one, two or four of them; centred flex-wrap keeps any count balanced, which
 *    is what the reference's centred row actually shows.
 */
export function SponsorHostGrid({ items }: { items?: Item[] }) {
  const displayItems = items && items.length > 0 ? items : DEFAULT_ITEMS;

  return (
    <section className="relative overflow-hidden border-y border-white/[0.06] bg-[var(--c-bg-1)] px-5 py-14 text-white sm:px-6 sm:py-16">
      {/* Purple band behind the row, as in the reference. Non-interactive. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(108,43,255,0.28),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--c-accent-violet-soft)]/50 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--c-accent-violet-soft)]/50 to-transparent" />

      <div className="relative z-10 mx-auto max-w-6xl">
        {/* Section label with the reference's flanking rules. */}
        <div data-reveal className="flex items-center justify-center gap-4">
          <span className="h-px w-8 bg-gradient-to-r from-transparent to-[var(--c-accent-pink)] sm:w-12" />
          <h2 className="text-center text-base font-black uppercase tracking-[0.12em] text-white sm:text-xl">
            Our Partners &amp; Sponsors
          </h2>
          <span className="h-px w-8 bg-gradient-to-l from-transparent to-[var(--c-accent-pink)] sm:w-12" />
        </div>

        <div data-reveal style={{ transitionDelay: "120ms" }} className="mt-8 flex flex-wrap items-stretch justify-center gap-4 sm:mt-10 sm:gap-5">
          {displayItems.map((item) => {
            const img = assetUrl(item.opportunity_images);

            const card = (
              <>
                {item.section_title && (
                  <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--c-text-muted)] sm:text-[10px]">
                    {item.section_title}
                  </span>
                )}
                {/*
                  LogoPlate, not a bare <img>: these logos are uploaded by whoever runs the
                  event, and the three bundled defaults are white-on-transparent artwork. On a
                  light page that is an empty card. LogoPlate measures each file and gives only
                  the light ones a dark chip — a dark or white-backed logo is left alone, which a
                  fixed treatment could not do.
                */}
                {img && (
                  <LogoPlate
                    src={img}
                    alt={item.section_title || "Partner logo"}
                    wrapperClassName="mt-2.5 flex h-16 w-full items-center justify-center rounded-xl px-3 transition-colors sm:h-20"
                    className="max-h-14 max-w-full object-contain transition-transform duration-300 group-hover:scale-105 sm:max-h-16"
                  />
                )}
                {!img && <div className="mt-2.5 h-16 w-full sm:h-20" />}
              </>
            );

            const cardClass =
              "group relative flex w-[15rem] flex-col items-center justify-center rounded-2xl border border-white/[0.1] bg-[var(--c-bg-2)]/85 px-6 py-6 text-center backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-[var(--c-accent-violet-soft)]/50 hover:shadow-[0_18px_46px_-16px_rgba(108,43,255,0.75)] sm:w-[17rem]";

            return item.additional_info ? (
              <a
                key={item.id}
                href={href(item.additional_info)}
                target="_blank"
                rel="noreferrer"
                className={cardClass}
              >
                {card}
              </a>
            ) : (
              <div key={item.id} className={cardClass}>
                {card}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
