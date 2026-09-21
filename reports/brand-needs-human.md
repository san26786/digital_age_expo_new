# Passages still naming Digital Age Expo — need a human

40 occurrences. Comments and the Hub/CP admin screens are excluded: those name the
main site deliberately and are correct as they stand.

Each of these is a STRING rather than page text, so the site name could not simply be
substituted — the wording itself decides what is right. Three kinds appear below:

  A. Fallbacks — `event?.title || "Digital Age Expo"`. Correct on the main site, wrong as a
     default for any other. Should fall back to the resolved site name.
  B. Asset and media labels — alt text, an embedded video title. These describe a specific
     file that IS Digital Age Expo's; renaming the label without replacing the asset would
     make the alt text lie.
  C. Positioning copy — sentences about the digital economy, tech and cultural giants, a
     venture of B2B Growth Hub Limited. Substituting the name leaves a B2B Growth Expo page
     describing a digital-economy show. These need writing, not renaming.

## src/app/api/faqs/route.ts:51
    …orking events" }, { id: "collapse220", question: "What is DAE?", answer: "Digital Age Expo (DAE) is a venture of B2B Growth Hub Limited and is one of the Uk's Biggest Digital Economy Virtual Conferences and Busines…

## src/app/article/[slug]/page.tsx:16
    …lug(slug); const article = id ? await getArticleById(id) : null; if (!article) return { title: "Article | Digital Age Expo" }; return { title: `${article.title} | Digital Age Expo`, description: article.shortDescription || undefined,…

## src/app/article/[slug]/page.tsx:18
    …ll; if (!article) return { title: "Article | Digital Age Expo" }; return { title: `${article.title} | Digital Age Expo`, description: article.shortDescription || undefined, }; } export default async function ArticleDetailPage({ params…

## src/app/event_features/page.tsx:160
    …className="w-full h-full" src="https://www.youtube.com/embed/TX17TH2HGqw" title="Digital Age Expo Intro Video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"…

## src/app/event_schedule/page.tsx:39
    …eOutageNotice outage={collector.current} />; } const defaultEvent = event || { id: 1474, title: "Digital Age Expo 2026", venue: "Exhibition Hall & Virtual Auditoriums", date_start: new Date("2026-08-26"), date_end: new Date("…

## src/app/magazine/page.tsx:138
    …<img src={publication.thumbnailUrl} alt="Digital Age Expo Magazine cover" className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.…

## src/app/sponsors/page.tsx:115
    …ext-base text-slate-300 max-w-xl mx-auto font-medium"> Interested in sponsoring {event?.title || "Digital Age Expo"}? Partner with us to reach thousands of business decision-makers. </p> <div className="pt-2">…

## src/app/why-exhibit/page.tsx:56
    …nefits = [ { icon: Target, title: "Target High-Intent Buyers", desc: "Every attendee at Digital Age Expo registers with specific tech and service needs. Interact directly via video calls, scheduled 1-on-1 meetings, and live chat…

## src/app/why_join_exhibit/page.tsx:106
    …nal Keynote Speakers", image: staticAssetUrl("/images/event_feature3.jpg"), description: "Digital Age Expo proudly welcomes industry experts from around the world to share their newest findings, strategies, and business practices…

## src/components/schedule/EventScheduleClient.tsx:91
    …xt-3xl sm:text-6xl font-black uppercase tracking-tight text-white leading-none"> {event.title || "Digital Age Expo 2026"} <span className="brand-gradient-text">Schedule</span> </h1> <div className="flex flex-wrap item…

## src/components/virtual-event/PhotoBoothModal.tsx:196
    …. if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: "Digital Age Expo" }); return; } } catch { /* user dismissed the share sheet, or it is unavailable — fall through */…

## src/lib/asset-overrides.generated.ts:38
    …al/listing_pages/817601-banner1.jpg", "/images/external/listing_pages/Digital Age Expo Intro.mp4": "/images/Digital Age Expo Intro.mp4", "/images/external/listing_pages/charity_1634042913-wessex.PNG": "/images/charity.png", "/images/external/li…

## src/lib/asset-overrides.generated.ts:38
    …deshow_banner_bg.jpg": "/images/external/listing_pages/817601-banner1.jpg", "/images/external/listing_pages/Digital Age Expo Intro.mp4": "/images/Digital Age Expo Intro.mp4", "/images/external/listing_pages/charity_1634042913-wessex.PNG": "/image…

## src/lib/constants/brandName.ts:12
    …* degrades to the main brand rather than to a blank or a placeholder. */ export const DEFAULT_BRAND_NAME = "Digital Age Expo";…

## src/lib/cp/email/emailTemplatesRepository.ts:102
    …ing }> > = { user_registration: { subject: "Welcome to {{site_name}}, {{first_name}}!", from_name: "Digital Age Expo", body_html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: ${EMAIL_INK};"…

## src/lib/cp/settings/domainRepository.ts:85
    …mber; hide_pricing: boolean | null; }; const FALLBACK_ROW: DomainSettingsRow = { id: DOMAIN_ID, name: "Digital Age Expo", brand: null, link: "", short_description: "", email: null, phone: null, address: null, index_page: null,…

## src/lib/prisma.ts:64
    …if (target._modelName === "find_domains") { return { id: 150, name: "Digital Age Expo", brand: "Digital Age Expo", event_id: 852, linked_profile_listing_id: 810210,…

## src/lib/prisma.ts:65
    …) { return { id: 150, name: "Digital Age Expo", brand: "Digital Age Expo", event_id: 852, linked_profile_listing_id: 810210, email: "info@findusonweb.com"…

## src/lib/prisma.ts:82
    …vents") { return { id: 852, listing_id: 810210, title: "Digital Age Expo 2026", label: "The UK's Premier Tech & Business Event", venue: "London Olympia",…

## src/lib/services/domain.ts:155
    …sole.warn("Failed to fetch domain from DB, using fallback", e); } return { id: DOMAIN_ID, name: "Digital Age Expo", brand: "Digital Age Expo", event_id: activeEventId ?? DEFAULT_EVENT_ID, linked_profile_listing_id: DEFAULT_LI…

## src/lib/services/domain.ts:156
    …in from DB, using fallback", e); } return { id: DOMAIN_ID, name: "Digital Age Expo", brand: "Digital Age Expo", event_id: activeEventId ?? DEFAULT_EVENT_ID, linked_profile_listing_id: DEFAULT_LISTING_ID, faq_listing_id: n…

## src/lib/services/eventLetterLogs.ts:52
    …lease find enclosed your official tax invoice and printed event badge clearance certificate for Stand B-04 at Digital Age Expo 2026.</p><p>Kindly present this letter at the registration desk upon setup day.</p><p>Sincerely,<br>Accounts Department</p>…

## src/lib/services/eventLetterLogs.ts:53
    …lease find enclosed your official tax invoice and printed event badge clearance certificate for Stand B-04 at Digital Age Expo 2026. Kindly present this letter at the registration desk upon setup day.", }, { id: 502, toName: "Apex Marketi…

## src/lib/services/eventLetterLogs.ts:70
    …("2026-07-22T08:30:00Z"), bodyHtml: `<p>Dear Vendor,</p><p>Your on-site catering authorization letter for Digital Age Expo has been approved. Please maintain a printed copy in your booth stall during the show dates.</p>`, bodyPlain: "Dear Ven…

## src/lib/services/eventLetterLogs.ts:71
    …tall during the show dates.</p>`, bodyPlain: "Dear Vendor, Your on-site catering authorization letter for Digital Age Expo has been approved. Please maintain a printed copy in your booth stall during the show dates.", }, ]; /** Mirrors members…

## src/lib/services/eventMailLogs.ts:63
    …Row[] = [ { id: 101, toName: "Alex Vance", toEmail: "alex.vance@techcorp.co.uk", fromName: "Digital Age Expo Organiser", fromEmail: "events@digitalageexpo.com", subject: "Exhibitor Confirmation & Stand Allocation - Digital A…

## src/lib/services/eventMailLogs.ts:65
    …niser", fromEmail: "events@digitalageexpo.com", subject: "Exhibitor Confirmation & Stand Allocation - Digital Age Expo 2026", date: new Date("2026-07-27T10:15:00Z"), emailTemplateId: "exhibitor_confirm", emailTemplateName: "Exhibi…

## src/lib/services/eventMailLogs.ts:69
    …"Exhibitor Confirmation", bodyHtml: `<p>Dear Alex,</p><p>Thank you for confirming your stand (#A-12) for Digital Age Expo 2026.</p><p>Please log in to your exhibitor portal to update your stand assets and team member badges.</p><p>Best regards,<…

## src/lib/services/eventMailLogs.ts:70
    …regards,<br>The Events Team</p>`, bodyPlain: "Dear Alex, Thank you for confirming your stand (#A-12) for Digital Age Expo 2026. Please log in to your exhibitor portal to update your stand assets and team member badges.", }, { id: 102,…

## src/lib/services/eventMailLogs.ts:76
    …s.", }, { id: 102, toName: "Sarah Jenkins", toEmail: "sarah.j@innovateuk.org", fromName: "Digital Age Expo Organiser", fromEmail: "events@digitalageexpo.com", subject: "Visitor Ticket Confirmation & E-Badge", date: new…

## src/lib/services/eventMailLogs.ts:82
    …, emailTemplateName: "Visitor Ticket Confirmation", bodyHtml: `<p>Dear Sarah,</p><p>Your VIP Pass for Digital Age Expo 2026 has been issued successfully.</p><p>Download your ticket badge and present it at the main entrance scanner.</p><p>Rega…

## src/lib/services/eventMailLogs.ts:83
    …main entrance scanner.</p><p>Regards,<br>Ticketing Office</p>`, bodyPlain: "Dear Sarah, Your VIP Pass for Digital Age Expo 2026 has been issued successfully. Download your ticket badge and present it at the main entrance scanner.", }, { i…

## src/lib/services/eventMailLogs.ts:89
    …nner.", }, { id: 103, toName: "David Miller", toEmail: "d.miller@futureai.io", fromName: "Digital Age Expo Speaker Ops", fromEmail: "speakers@digitalageexpo.com", subject: "Keynote Speaker Session Briefing - Main Stage",…

## src/lib/services/eventSummary.ts:85
    …e, lock_event_schedule: true, listing_id: true, }, }); const title = eventRow?.title || "Digital Age Expo 2026"; const status = eventRow?.status || "Active"; const formatDate = (d: any) => (d ? new Date(d).toLocaleDateString(…

## src/lib/services/eventSummary.ts:199
    …teEnd: formatDate(eventRow?.date_end), descriptionShort: eventRow?.description_short || "Welcome to the Digital Age Expo. Manage your event activities, stand assets, speakers, team members and schedule from this summary dashboard.", conta…

## src/lib/services/footer.ts:59
    …faults(input: FooterDefaultsInput): Record<string, string> { const siteName = plainText(input.siteName) || "Digital Age Expo"; return { cp_footer_description: plainText(input.shortDescription) || defaultFooterDescription(siteName), cp_fo…

## src/lib/services/member.ts:236
    …: "Oliver", user_last_name: "Organiser", user_phone: "+44 7111 222333", user_organization: "Digital Age Expo Management", user_position: "", linkedin_user_profile: "", date_of_birth: null, profile_description…

## src/lib/services/member.ts:304
    …_name: "Demo", user_last_name: "Member", user_phone: "+44 7000 000000", user_organization: "Digital Age Expo", user_position: "", linkedin_user_profile: "", date_of_birth: null, profile_description: "",…

## src/lib/services/menu.ts:141
    …d: 11, title: "Past Events", link: "#", target: "_self", children: [ { id: 111, title: "Digital Age Expo July 2021", link: "https://july.digitalageexpo.com/", target: "_blank", children: [] }, { id: 112, title: "Digital Ag…

## src/lib/services/menu.ts:142
    …y 2021", link: "https://july.digitalageexpo.com/", target: "_blank", children: [] }, { id: 112, title: "Digital Age Expo Nov 2021", link: "https://november.digitalageexpo.com/", target: "_blank", children: [] }, ], }, { id: 12,…
