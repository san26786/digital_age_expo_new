'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * UI-ONLY REDESIGN. Every question, every answer, the open-by-default first item and the
 * single-open accordion behaviour are unchanged.
 *
 * Three presentational fixes:
 *
 * 1. TWO COLUMNS. The heading was centred above a full-width stack, so on a wide screen the
 *    questions ran to ~900px and the section was extremely tall. Heading and intro now sit in
 *    their own column beside the list, which shortens the rows and halves the height.
 *
 * 2. CHEVRON, NOT A QUESTION MARK. The toggle was a `HelpCircle` rotated 180°. A rotating question
 *    mark communicates nothing — it looks identical at 0° and 180° — so there was no visual
 *    indication of which row was open beyond its colour. A chevron that flips is the affordance
 *    people already read.
 *
 * 3. `aria-expanded` / `aria-controls` on the trigger and a matching `id` on the panel, so screen
 *    readers announce the state the chevron now shows. The previous markup exposed none of it.
 */
export function FaqsAccordionSection() {
  const [activeFaqId, setActiveFaqId] = useState<string | null>('faq-1');

  const faqs = [
    {
      id: 'faq-1',
      question: "How do I claim my Free Access Badge?",
      answer: "You can click on the 'Get Free Ticket' button on any page and complete the short registration form. You will receive a PDF badge and access credentials directly in your email inbox."
    },
    {
      id: 'faq-2',
      question: "What technical requirements are there for the Virtual Platform?",
      answer: "The platform is fully browser-based and optimized for Google Chrome, Safari, and Microsoft Edge on desktops, laptops, and tablets. No plugins or downloads are required."
    },
    {
      id: 'faq-3',
      question: "Are the live session recordings available after the show?",
      answer: "Yes, Delegate and VIP Pass holders receive complete post-event access to all HD recordings of keynote lectures, panel discussions, and technical workshops on demand."
    },
    {
      id: 'faq-4',
      question: "How do virtual exhibitor stands work?",
      answer: "Exhibitor stands work similarly to in-person shows but online. Visitors can read brochures, watch introduction videos, browse websites, and click 'Call Now' to enter a direct live video call with your booth team."
    }
  ];

  return (
    <section className="relative overflow-hidden border-y border-white/[0.06] bg-[#0B0C20] px-5 py-16 text-white sm:px-6 sm:py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_10%_20%,rgba(108,43,255,0.18),transparent_60%)]" />

      <div className="relative z-10 mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
        {/* ---------------- Left: heading ---------------- */}
        <div className="lg:pt-2">
          <span className="block h-1 w-12 rounded-full bg-gradient-to-r from-[#F020A8] to-[#8B3DFF]" />
          <span className="mt-5 block text-[11px] font-black uppercase tracking-[0.3em] text-[#F020A8] sm:text-xs">
            Expo Inquiries
          </span>
          <h2 className="mt-3 text-2xl font-black uppercase leading-[1.12] tracking-tight text-white sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-[#A5A6C5]">
            Find answers to common questions about the event, registration, exhibitors and more.
          </p>
        </div>

        {/* ---------------- Right: accordion ---------------- */}
        <div className="space-y-3">
          {faqs.map((faq) => {
            const isOpen = activeFaqId === faq.id;
            return (
              <div
                key={faq.id}
                id={`faq-accordion-${faq.id}`}
                className={`overflow-hidden rounded-2xl border bg-[#10112A]/85 backdrop-blur-sm transition-colors duration-300 ${
                  isOpen ? 'border-[#8B3DFF]/55' : 'border-white/[0.09] hover:border-white/20'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveFaqId(isOpen ? null : faq.id)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${faq.id}`}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-white/[0.03] sm:px-6"
                >
                  <span className="text-sm font-bold text-white sm:text-[0.95rem]">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 transition-transform duration-300 ${
                      isOpen ? 'rotate-180 text-[#F020A8]' : 'text-[#A5A6C5]'
                    }`}
                    aria-hidden="true"
                  />
                </button>

                <div
                  id={`faq-panel-${faq.id}`}
                  className={`transition-all duration-300 ease-in-out ${
                    isOpen
                      ? 'max-h-96 border-t border-white/[0.07] px-5 py-4 opacity-100 sm:px-6'
                      : 'max-h-0 overflow-hidden opacity-0'
                  }`}
                >
                  <p className="text-sm leading-relaxed text-[#A5A6C5]">{faq.answer}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
