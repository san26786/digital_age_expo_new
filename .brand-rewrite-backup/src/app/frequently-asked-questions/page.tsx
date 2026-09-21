import { getDomain } from "@/lib/services/domain";
import { createOutageCollector } from "@/lib/db-errors";
import { DatabaseOutageNotice } from "@/components/common/DatabaseOutageNotice";
import { getListingFaqs } from "@/lib/services/faq";
import { FaqPageContent, type FAQQuestion } from "./FaqPageContent";

/**
 * SERVER COMPONENT — do not add "use client" to this file.
 *
 * `metadata`, `getDomain()` and `getListingFaqs()` are all server-only: the
 * first is resolved before the page renders, the other two run Prisma queries
 * that must never reach the browser bundle. All the interactive accordion
 * state lives in ./FaqPageContent.tsx, which is the "use client" half.
 */

export const metadata = {
  title: "Frequently Asked Questions | Digital Age Expo",
  description:
    "Answers to common questions about exhibiting, sponsoring, speaking, and attending Digital Age Expo.",
};

// Legacy frequently-asked-questions.php falls back to this listing id
// when the domain row has no faq_listing_id set.
const FALLBACK_FAQ_LISTING_ID = 866435;

export default async function FrequentlyAskedQuestionsPage() {
  const domain = await getDomain();

  const listingId =
    domain.faq_listing_id ?? FALLBACK_FAQ_LISTING_ID;

  // Guarded so a database refusing service (plan quota, asleep, pool exhausted) degrades
  // instead of 500-ing this route — see src/lib/db-errors.ts. Keep the collector object intact:
  // `current` is a getter, so destructuring would snapshot the still-null value.
  const collector = createOutageCollector();
  const guard = collector.guard;

  const faqGroups = await guard(() => getListingFaqs(listingId), []);

  // The FAQs ARE this page.
  if (faqGroups.length === 0 && collector.current) {
    return <DatabaseOutageNotice outage={collector.current} />;
  }

  /*
   * Flatten all FAQ groups into one list.
   *
   * This allows us to show exactly 10 questions initially,
   * regardless of how many questions exist in each group.
   */
  /*
   * NB: the field names here must match getListingFaqs()'s FaqGroup — `group.faqs` and
   * `group.area`, and `response` for the answer body. This previously read `group.items`,
   * `group.title` and `group.name`, none of which exist on FaqGroup, so `allQuestions` was always
   * empty and the page rendered "No Questions Available" even with 196 FAQ rows in the database.
   * Both sides were annotated `any`, which is why the compiler never flagged it — hence the real
   * types below.
   */
  const allQuestions: FAQQuestion[] = faqGroups.flatMap((group, groupIndex) =>
    group.faqs.map((faq, faqIndex) => ({
      uniqueId: faq.id ?? `${groupIndex}-${faqIndex}`,
      groupTitle: group.area || "Frequently Asked Questions",
      question: faq.question,
      answer: faq.response,
    }))
  );

  return (
    <FaqPageContent
      domainName={domain.name}
      allQuestions={allQuestions}
    />
  );
}
