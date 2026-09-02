import { getDomain } from "@/lib/services/domain";
import { getHomePageData } from "@/lib/services/home";

import { HeroSection } from "@/components/home/HeroSection";
import { AboutEvent } from "@/components/home/AboutEvent";
import { EventIntroVideo } from "@/components/home/EventIntroVideo";
import { DataCounters } from "@/components/home/DataCounters";
import { SpeakersGrid } from "@/components/home/SpeakersGrid";
import { FeaturedExhibitors } from "@/components/home/FeaturedExhibitors";
import { HomeSchedulePreview } from "@/components/home/HomeSchedulePreview";
import { SponsorHostGrid } from "@/components/home/SponsorHostGrid";
import { BookYourStand } from "@/components/home/BookYourStand";
import { GetFreeTicket } from "@/components/home/GetFreeTicket";
import { FaqsAccordionSection } from "@/components/home/FaqsAccordionSection";

// Additional homepage sections
import { EventZones } from "@/components/home/EventZones";
import { BlogsAndNews } from "@/components/home/BlogsAndNews";
import { CharityPartners } from "@/components/home/CharityPartners";
import { B2BGrowthFlywheel } from "@/components/home/B2BGrowthFlywheel";

import { DatabaseOutageNotice } from "@/components/common/DatabaseOutageNotice";

export default async function HomePage() {
  const domain = await getDomain();

  const {
    event,
    eventDates,
    speakers,
    opportunityContent,
    phrases,
    exhibitors,
    scheduleDays,
    counters,
    dbOutage,
  } = await getHomePageData(domain);

  // The database itself refused the queries (plan quota reached, server asleep/unreachable,
  // connection pool exhausted) and we got nothing usable back. Say that specifically instead of
  // claiming no event is configured — the event almost certainly exists, we just can't read it.
  if (!event && dbOutage) {
    return <DatabaseOutageNotice outage={dbOutage} />;
  }

  // No event configured
  if (!event) {
    return (
      <main className="min-h-screen bg-surface-1">
        <div className="mx-auto max-w-2xl px-6 py-32 text-center text-white">
          <h1 className="text-2xl font-bold">
            No event configured
          </h1>

          <p className="mt-4 text-white/70">
            This site doesn&apos;t have an active event set up yet.
          </p>
        </div>
      </main>
    );
  }

  const dateStart =
    eventDates?.date_start ?? event.date_start;

  const dateEnd =
    eventDates?.date_end ?? event.date_end;

  return (
    <main className="min-h-screen bg-surface-1 text-white">
      {/* Partial outage: the event loaded but one or more sections came back empty because the
          database rejected their queries. Render the page anyway, flagged. */}
      {dbOutage && <DatabaseOutageNotice outage={dbOutage} variant="banner" />}

      {/* =========================================
          1. HERO SECTION
      ========================================= */}
      <HeroSection
        title={event.title}
        label={event.label}
        dateStart={dateStart}
        dateEnd={dateEnd}
        venue={event.venue}
      />


      {/* =========================================
          2. EVENT STATISTICS
      ========================================= */}
      <DataCounters
        counts={counters}
        visitors={phrases.counter_visitors}
        exhibitors={phrases.counter_exhibitors}
        speakers={phrases.counter_speakers}
        workshops={phrases.counter_workshop}
      />


      {/* =========================================
          3. ABOUT THE EVENT
      ========================================= */}
      {opportunityContent.aboutEvent && (
        <AboutEvent
          sectionTitle={
            opportunityContent.aboutEvent.section_title
          }
          sectionDescription={
            opportunityContent.aboutEvent.section_description
          }
          additionalInfo={
            opportunityContent.aboutEvent.additional_info
          }
          backgroundImage={
            opportunityContent.aboutEvent.opportunity_images
          }
          dateStart={dateStart}
          dateEnd={dateEnd}
        />
      )}

     {/* =========================================
          10. SPONSORS & HOSTS
      ========================================= */}
      <SponsorHostGrid
        items={opportunityContent.sponsorHostData}
      />


      {/* =========================================
          3B. EVENT INTRO VIDEO
      ========================================= */}
      <EventIntroVideo />


      {/* =========================================
          4. B2B GROWTH FLYWHEEL
      ========================================= */}
      <B2BGrowthFlywheel />


      {/* =========================================
          5. SPEAKERS
      ========================================= */}
      {!event.hide_speaker && (
        <SpeakersGrid speakers={speakers} />
      )}


      {/* =========================================
          6. FEATURED EXHIBITORS
      ========================================= */}
      <FeaturedExhibitors
        exhibitors={exhibitors}
      />


      {/* =========================================
          7. EVENT ZONES
      ========================================= */}
      <EventZones />




      {/* =========================================
          9. EVENT SCHEDULE
      ========================================= */}
      <HomeSchedulePreview
        scheduleDays={scheduleDays}
      />


 

      {/* =========================================
          11. BOOK YOUR STAND
      ========================================= */}
      <BookYourStand
        sectionTitle={
          opportunityContent.bookYourStand?.section_title
        }
        sectionDescription={
          opportunityContent.bookYourStand?.section_description
        }
        image={
          opportunityContent.bookYourStand?.opportunity_images
        }
      />


      {/* =========================================
          12. GET FREE TICKET
      ========================================= */}
      <GetFreeTicket
        title={phrases.get_free_ticket_now}
        description={
          phrases.get_free_ticket_now_desc
        }
      />


      {/* =========================================
          13. BLOGS & NEWS
      ========================================= */}
      <BlogsAndNews />


      {/* =========================================
          14. CHARITY PARTNERS
      ========================================= */}
      <CharityPartners />


      {/* =========================================
          15. FAQ
      ========================================= */}
      <FaqsAccordionSection />

    </main>
  );
}