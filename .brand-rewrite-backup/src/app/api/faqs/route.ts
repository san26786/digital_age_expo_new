import { NextResponse } from "next/server";

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface FaqCategory {
  category: string;
  faqs: FaqItem[];
}

const faqData: FaqCategory[] = [
  {
    category: "General",
    faqs: [
      {
        id: "collapse261",
        question: "How many stands will be exhibiting on the day?",
        answer: "We are anticipating between 500 plus exhibitors, but with our virtual model, there is no maximum. in our last event, we anticipated 200 plus exhibitors but ended up having 464 business exhibitors at the show in Jul 2021. This time even if we are expecting to have 500 plus exhibitors you might be surprised to see approximately 1500 to 2000 exhinitors."
      },
      {
        id: "collapse262",
        question: "How many attendees will be visiting the trade show?",
        answer: "Based on 500 exhibitors we would expect between 5000  to 10000 visitors. But once we reach our target of bringing 1500 exhibitors, the number of expected visitors would be anywhere between 15000 to 30000. In our July 2021 show,  we planned to get 200+ exhibitors and anticipated around 2000 - 4000 visitors.  Based on the number of exhibitors ( 464 exhibitors ) our expectation was to have 4640 visitors. But as per google analytics on day one, we had 2661 visitors, On Day 2 we had 1981 visitors and on Day 3 we had 1437 visitors making total footfalls of 6078 visitors.\n\nIn this event we would be happy to see a total of 5000 visitors but as per our experience last time, we are preparing for a total footfall of approximately 30000+ participants in this event."
      },
      {
        id: "collapse263",
        question: "What type of businesses will be at the trade show?",
        answer: "All members of the B2B Growth Hub community are invited, these range from large corporates to sole traders. The sectors include; Banks, IT, Web & App Development, Graphic Design & Marketing, Herbal & Holistic Businesses, Utility Companies, Telecomms, Property Developers, Accountancy & Solicitors, Business Mentors, Investors, Business & Life Coaches, Recruitment Agencies and PR Companies, through to Cider Manufacturers and Charities"
      },
      {
        id: "collapse264",
        question: "What are the costs of exhibiting at the trade show?",
        answer: "There are several packages outlined on the reverse. There are also earlybird discounts and sponsorship deals, please talk to a member of our team to discuss more in depth"
      },
      {
        id: "collapse265",
        question: "What are the business benefits of exhibiting at a virtual trade show as opposed to a live event?",
        answer: "There are many benefits of attending a virtual show;\n- It will not be cancelled no matter what the pandemic throws at us.\n- It is a lot more cost effective than a live trade show.\n- Visitors will not be reluctant to view your products and services, as there is no fear of being sold to.\n- There are muliple platforms to promote your business, key speaker slots, networking events & numerous sponsorship deals to promote your brand.\n- Details of who has visited your stand and what they have looked at is captured for you to be able to  follow up after the event"
      },
      {
        id: "collapse260",
        question: "Why participate in this event",
        answer: "Our virtual trade shows and exhibitions are events designed to bring together members from a wide range of business sectors to promote their services. Join us to raise your profile, find potential customers and engage with like-minded business leaders.\n\nThere are multiple opportunities for you to showcase your business and services to increase your visibility to a wide audience at a  budget that works for you.\n\nIn addition to having your own stand, you can attend virtual networking sessions, interact with the B2B Growth Hub team, be a keynote speaker, advertise and even sponsor an area.\n\nThe virtual show works much the same as a ‘real’ event. There is a reception desk, where you can register for keynote talks, you can see a list of exhibitors and ‘wander’ around at your pace.\nIf you purchase a stand, you can interact with potential clients, arrange meetings, show company videos, present product demonstrations and at the same time, guests can collect your company literature and store it in their virtual briefcase.\n\nThe great thing about virtual exhibitions is that they are far more cost-effective and can reach larger audiences.\n- Multiple opportunities to promote your business\n- Various options are available to suit any budget\n- Be a key-note speaker\n- Share promotional videos\n- Connect with existing and potential customers\n- Schedule 1-1 meeting\n- Attend virtual networking events"
      },
      {
        id: "collapse220",
        question: "What is DAE?",
        answer: "Digital Age Expo (DAE) is a venture of B2B Growth Hub Limited and is one of the Uk's Biggest Digital Economy Virtual Conferences and Business Show. We bring an Extraordinary business show that acts as a catalyst for inspiration, innovation and Collaboration. Our diverse communities include those working in tech and cultural giants, start up’s and creative individuals. For more information, please visit the DAE website viz. www.digitalageexpo.com"
      },
      {
        id: "collapse221",
        question: "What is B2B Growth Hub?",
        answer: "B2B Growth Hub is a unique corporate and business services provider, offering a one stop solution for all the key business growth needs for businesses in our community.\n\nWe at B2B Growth Hub help businesses with three aspects, Connect. Network and Grow.\n\nWe work with businesses to step up through organic growth as per their goals and aspiration with our range of tactical business tools in line with their day-to-day business needs. We enable and help businesses to achieve their strategic business goals and objectives with our “Business Growth Accelerator” programme.\n\nWe work very closely with our community members and bring three of the most critical pillars of business success for them which are\n- Guaranteed More Savings\n- Guaranteed More Customers and\n- Guaranteed More Sales\n\nOur Growth Strategies are focused around the principle of 12 points of touch for organic growth in alignment with the strategic implementation of 7P of business success elements viz. Products, Promotion, Price, Plan, Process, People and Place.  For More Information please visit www.b2bgrowthhub.com or contact a team member"
      }
    ]
  },
  {
    category: "What we do",
    faqs: [
      {
        id: "collapse140",
        question: "What you have done and what demand/need does it fulfil?",
        answer: "In 2018 B2B Growth Hub created a digital hub which enables businesses and their people to connect through an online directory. B2B Growth Hub also provides our users with access to free online speed networking events, conferences, publications and loyalty schemes. 80% of B2B Growth Hub services are free. In an ever-evolving digital world, we feel our service fulfils a need to support businesses and help them establish long term commercial connections."
      },
      {
        id: "collapse142",
        question: "Who are your internal and external stakeholders (e.g. staff, volunteers, clients, suppliers, government and funding providers), and how did you get their commitment and engagement to your objectives and actions?",
        answer: "B2B Growth Hub is created by business for businesses. Stakeholders both internally and externally actually come together to form new ways to help our local communities. We didn’t even have to ask a few, most wanted to come together to help in anyway they can."
      }
    ]
  },
  {
    category: "Stand Design",
    faqs: [
      {
        id: "collapse239",
        question: "Can I Use My Stand For Exhibitions Abroad?",
        answer: "Absolutely. At Expo we design and build exhibition stands for clients throughout Europe and further afield, in places such as UAE and the US. If you’ve opted for a custom built stand, we’ll organise the transportation and logistics - all you’ll need to do is turn up."
      },
      {
        id: "collapse240",
        question: "What Is The Best Kind Of Exhibition Stand?",
        answer: "When it comes to exhibitions and events, there isn’t one type of stand that is best for everyone. All organisations are individual; the best exhibition stands are those that help people achieve their goals and meet their objectives as well as possible with the budget available."
      },
      {
        id: "collapse246",
        question: "How long does my stand stay live?",
        answer: "All exhibition stands remain live for a full year from their launch. The exhibition is live 24-7 and drives traffic through regular promotional activities and launches."
      }
    ]
  },
  {
    category: "Attract",
    faqs: [
      {
        id: "collapse241",
        question: "How Do I Attract Visitors To My Stand?",
        answer: "There are a number of ways to make your stand work harder to attract visitors. From eye catching graphics to attention grabbing hanging structures and props, the sky’s the limit."
      },
      {
        id: "collapse251",
        question: "What is the Virtual Goody Bag?",
        answer: "Just like any exhibition, visitors to the show are able to fill a Virtual Goodie Bag with their favourite materials. Upon browsing your stand, a site visitor can choose to add product literature, videos or even entire hotspots to their Goodie Bags."
      }
    ]
  },
  {
    category: "ROI",
    faqs: [
      {
        id: "collapse242",
        question: "How Can I Tell If My Stand Is Successful?",
        answer: "It’s important to have a goal or set of objectives behind any event you are exhibiting at. Your goals are fundamental to the design of your exhibition stand, as any good stand will be created to help you achieve what you want to get out of a show."
      },
      {
        id: "collapse252",
        question: "Why should I take part in a business exhibition?",
        answer: "Exhibitions can be a valuable way to meet lots of valuable prospects in one place, and in a short space of time. Providing you choose the right show and plan carefully, you could lay the foundations for profitable growth in contacts and sales."
      }
    ]
  },
  {
    category: "Event Management",
    faqs: [
      {
        id: "collapse243",
        question: "How Can I Get More Information?",
        answer: "If you have a question that we haven’t covered here or would like to discuss anything in more detail, you can reach us by phone on +(44) 02380 970305 / 01624 666105, or email us at hello@digitalageexpo.com."
      },
      {
        id: "collapse244",
        question: "How does a virtual exhibition work?",
        answer: "Exhibitions and trade shows continue to be one of the most effective ways of promoting your latest product and communicating your brand message to a targeted audience."
      }
    ]
  },
  {
    category: "Leads",
    faqs: [
      {
        id: "collapse245",
        question: "How do I generate sales leads from a virtual booth?",
        answer: "Just like a live show, virtual exhibitions are about promoting your brand and generating sales leads that you pass on to your sales team. Unlike a live show, it’s possible to achieve this year-round and back up the leads with detailed traffic histories."
      }
    ]
  },
  {
    category: "Exhibition",
    faqs: [
      {
        id: "collapse254",
        question: "Where and how often should I exhibit?",
        answer: "Where you choose to exhibit will be governed by the industry you are in and the range of events that are available. Look for shows that your target audience are likely to attend."
      }
    ]
  },
  {
    category: "Planning",
    faqs: [
      {
        id: "collapse255",
        question: "How far ahead should I start planning for a major trade show?",
        answer: "Shows are expensive, and success usually only comes from planning well in advance. A good show organiser will produce a guide, giving deadlines for booking items such as show catalogue entries, electrical requirements, and so on."
      }
    ]
  },
  {
    category: "Success",
    faqs: [
      {
        id: "collapse258",
        question: "What is the key to successful exhibiting?",
        answer: "To make business exhibitions work for you: promote your stand in advance, make sure your stand looks professional, rotate your staff, be attentive and friendly, and follow up promptly on enquiries."
      }
    ]
  },
  {
    category: "Price & Payment",
    faqs: [
      {
        id: "collapse217",
        question: "What does the cost of my stand include at a physical event?",
        answer: "This depends on the exhibition category (Shell scheme or Campus) and includes options for nameboard, carpet, lighting, and walls."
      },
      {
        id: "collapse225",
        question: "What payment options are there?",
        answer: "All bookings must be made online. You can pay by invoice, credit/debit card, or cheque."
      }
    ]
  },
  {
    category: "Contact",
    faqs: [
      {
        id: "collapse213",
        question: "Contact Us",
        answer: "Call us on (+44) 02380 970305 / 01624 666105 or email hello@digitalageexpo.com"
      }
    ]
  }
];

export async function GET() {
  return NextResponse.json({ success: true, data: faqData });
}
