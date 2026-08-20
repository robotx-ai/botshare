import {
  SERVICE_CATEGORY_META,
  type ServiceCategory,
  type ServiceCategorySlug,
} from "@/lib/serviceCategories";

/**
 * Editorial content for the eight service scenarios: hero art, solution
 * overview, standard service modules, delivery flow, and gallery.
 *
 * Imagery is served straight from the public botshare-deploy asset repo for
 * now (see `SCENARIO_MEDIA_BASE`); the Warehouses scenario reuses the existing
 * Cloudinary AGIBot render. Swap `SCENARIO_MEDIA_BASE` for a Cloudinary /
 * Supabase prefix when the assets are migrated — nothing else has to change.
 */
export const SCENARIO_MEDIA_BASE =
  "https://raw.githubusercontent.com/a607a/botshare-deploy/main/img";

const CLOUDINARY = "https://res.cloudinary.com/dmrhtzqyx/image/upload";

const scene = (file: string) => `${SCENARIO_MEDIA_BASE}/scenarios/${file}`;
const shot = (file: string) => `${SCENARIO_MEDIA_BASE}/scenarios/gallery/${file}`;

export type ScenarioShot = {
  src: string;
  title: string;
  caption: string;
};

export type ServiceScenario = {
  slug: ServiceCategorySlug;
  label: ServiceCategory;
  /** Card + hero one-liner. */
  lede: string;
  /** Square-ish card art for the /services index grid. */
  thumbnail: string;
  /** Wide art for the scenario hero band. */
  hero: string;
  /** Solution-overview body copy. */
  overview: string[];
  /** Venue types this scenario applies to. */
  settings: string[];
  /** What the standard service actually contains. */
  modules: string[];
  /** Ordered delivery steps. */
  flow: string[];
  /** Quoted separately, outside the standard flow. */
  optional: string[];
  /** Heading above the gallery band. */
  galleryTitle: string;
  gallery: ScenarioShot[];
};

export const SERVICE_SCENARIOS: Record<ServiceCategorySlug, ServiceScenario> = {
  "private-events": {
    slug: "private-events",
    label: "Private Events",
    lede: "Robot interaction, dance and photo services for privately hosted gatherings.",
    thumbnail: scene("private-events-1200.jpg"),
    hero: scene("private-events-1800.jpg"),
    overview: [
      "Private events are hosted by individuals, families or friends for invited guests. They are built around familiar people, time shared together and participation in the moment. A robot is not presented as an isolated display; it joins the existing event plan as a scheduled feature.",
      "At the agreed time, the robot can greet guests, use preset gestures, perform one existing dance and hold poses for photos. Children can observe it up close, while family and friends can gather around to watch, respond to its movements or take photos together. It does not replace the host or change the original program; it gives guests of different ages a shared moment to experience and remember.",
      "Standard service includes interaction, one existing X2 dance and photos. Multi-robot programs, new choreography, themed appearances and other custom content are confirmed and quoted separately.",
    ],
    settings: [
      "Private residences",
      "Private event venues",
      "Private dining & banquet spaces",
      "Clubhouses & booked venues",
      "Gardens & outdoor gathering areas",
    ],
    modules: [
      "Interaction — greetings, preset gestures and one short approved message",
      "Dance — one existing X2 dance selected for the event",
      "Photos — preset poses for individual or group photos",
    ],
    flow: [
      "Interaction — guest greeting and preset gestures",
      "Dance — one existing X2 dance",
      "Photos — individual or group photo session",
    ],
    optional: [
      "Multi-robot entrance, formation or synchronized dance",
      "New choreography or a specially arranged shared-dance program",
      "Custom costumes, appearance materials and themed production",
      "Additional voice scripts or additional revision rounds",
    ],
    galleryTitle: "Shared moments at a private event",
    gallery: [
      {
        src: shot("private-events-01-1200.jpg"),
        title: "Multi-robot dance with invited guests",
        caption:
          "Project example: several robots perform together inside an agreed activity area while family and friends gather around.",
      },
      {
        src: shot("private-events-02-1200.jpg"),
        title: "A group photo with family and friends",
        caption:
          "Standard photo example: the robot holds a preset pose while guests gather close for a relaxed group photo.",
      },
      {
        src: shot("private-events-03-1200.jpg"),
        title: "X2 with a themed robot dog",
        caption:
          "Project example: a themed robot dog can join X2 as a second character within the gathering.",
      },
      {
        src: shot("private-events-04-1200.jpg"),
        title: "A shared family moment",
        caption:
          "Standard interaction example: children, parents and older family members gather around the robot and take a photo together.",
      },
      {
        src: shot("private-events-05-1200.jpg"),
        title: "Interaction within a private dinner",
        caption:
          "Standard interaction example: one X2 joins the gathering at an agreed time with a short approved greeting and preset gestures.",
      },
      {
        src: shot("private-events-06-1200.jpg"),
        title: "One dance, surrounded by guests",
        caption:
          "Standard dance example: one existing X2 dance is scheduled as a distinct moment guests can watch together.",
      },
    ],
  },

  "commercial-events": {
    slug: "commercial-events",
    label: "Commercial Events",
    lede: "Robot performance and interaction services for trade shows, product launches, annual meetings and brand events.",
    thumbnail: scene("commercial-events-1200.jpg"),
    hero: scene("commercial-events-1800.jpg"),
    overview: [
      "The standard service for trade shows, launches, annual meetings, award ceremonies and brand events includes guest interaction, an existing X2 dance and a photo session.",
      "Multi-robot shows, human–robot stage programs, branded production and information content are handled as separately quoted project work.",
    ],
    settings: [
      "Trade shows & exhibitions",
      "Product launches",
      "Brand pop-ups",
      "Annual meetings & award nights",
      "Conferences & summits",
    ],
    modules: [
      "Interaction — guest greeting, preset gestures and one short approved event message",
      "Dance — one existing single-X2 dance at a fixed stage position",
      "Photos — check-in, guest or closing photos using preset poses",
    ],
    flow: [
      "Interaction — guest greeting and preset gestures",
      "Dance — one existing single-X2 dance",
      "Photos — check-in, guest or closing photo session",
    ],
    optional: [
      "Multi-robot stage programs and synchronized dance",
      "Human–robot stage programs and additional technical rehearsal",
      "Brand costumes, visual materials and themed production",
      "Extended welcome, award or event scripts",
      "Product presentations, company speeches and fixed Q&A",
    ],
    galleryTitle: "Commercial event service formats",
    gallery: [
      {
        src: shot("commercial-events-01-1200.jpg"),
        title: "Stage segment at a brand event",
        caption:
          "Standard dance example: one existing single-X2 dance runs from a fixed stage position inside the agreed program slot.",
      },
      {
        src: shot("commercial-events-02-1200.jpg"),
        title: "Booth interaction at a trade show",
        caption:
          "Standard interaction example: preset gestures and one short approved message greet visitors at the booth.",
      },
      {
        src: shot("commercial-events-03-1200.jpg"),
        title: "Check-in and closing photos",
        caption:
          "Standard photo example: preset poses are used for guest photos at check-in and at the close of the program.",
      },
    ],
  },

  "schools-universities": {
    slug: "schools-universities",
    label: "Schools & Universities",
    lede: "Robot demonstrations and themed programs for schools, universities, science centers and museums.",
    thumbnail: scene("schools-universities-1200.jpg"),
    hero: scene("schools-universities-1800.jpg"),
    overview: [
      "The standard service for schools, universities, science centers, museums and educational exhibitions includes interaction, an existing X2 dance and photos. Preset gestures can be selected for the audience and setting.",
      "Exhibit presentations, fixed Q&A, bilingual information and newly produced programs are quoted separately.",
    ],
    settings: [
      "Science centers",
      "Museums & natural history",
      "Campus open days",
      "STEM classrooms & labs",
      "Planetariums & astronomy programs",
      "Education expos",
    ],
    modules: [
      "Interaction — fixed-point greetings, preset gestures and children's interaction",
      "Dance — one existing X2 dance selected for the audience and setting",
      "Photos — preset poses for student, family or group photos",
    ],
    flow: [
      "Interaction — fixed-point greeting and preset gestures",
      "Dance — one existing X2 dance",
      "Photos — student, family or group photo session",
    ],
    optional: [
      "Multi-robot programs at designated activity points",
      "New theme programs, choreography or movement design",
      "Additional scheduled sessions beyond the booked service window",
      "Exhibit presentations, fixed Q&A and bilingual information",
    ],
    galleryTitle: "Education and exhibition service formats",
    gallery: [
      {
        src: shot("schools-universities-01-1200.jpg"),
        title: "Fixed-point demonstration",
        caption:
          "Standard interaction example: the robot works from a marked activity point while students observe from outside it.",
      },
      {
        src: shot("schools-universities-02-1200.jpg"),
        title: "Campus open-day session",
        caption:
          "Standard dance example: one existing X2 dance is scheduled into the open-day program as a distinct segment.",
      },
      {
        src: shot("schools-universities-03-1200.jpg"),
        title: "Student and family photos",
        caption:
          "Standard photo example: preset poses are used for student, family or class group photos.",
      },
    ],
  },

  entertainment: {
    slug: "entertainment",
    label: "Entertainment",
    lede: "Robot interaction, dance and photo services for stages, nightlife venues and live shows.",
    thumbnail: scene("entertainment-1200.jpg"),
    hero: scene("entertainment-1800.jpg"),
    overview: [
      "The standard service for stages, nightlife venues, festivals and live shows includes audience interaction, an existing single-X2 dance and photos.",
      "Multi-robot shows, human–robot performance, DJ-themed production, new choreography and additional rehearsal are quoted separately.",
    ],
    settings: [
      "Concerts & festivals",
      "Nightclubs & DJ sets",
      "Theatres & variety programs",
      "Ticketed live shows",
      "Sports & halftime segments",
    ],
    modules: [
      "Interaction — preset audience gestures and simple dance participation",
      "Dance — one existing single-X2 dance at a fixed show position",
      "Photos — preset poses before or after the dance segment",
    ],
    flow: [
      "Interaction — preset audience gestures",
      "Dance — one existing single-X2 dance",
      "Photos — guest or performer photo session",
    ],
    optional: [
      "Multi-robot synchronized shows",
      "Human–robot performance and additional technical rehearsal",
      "DJ-themed production using a venue-operated booth, music and lighting",
      "New choreography or complex music-cue sequences",
    ],
    galleryTitle: "Stage and entertainment service formats",
    gallery: [
      {
        src: shot("entertainment-01-1200.jpg"),
        title: "Fixed show position on stage",
        caption:
          "Standard dance example: one existing single-X2 dance runs from a fixed position within the show rundown.",
      },
      {
        src: shot("entertainment-02-1200.jpg"),
        title: "Audience interaction segment",
        caption:
          "Standard interaction example: preset audience gestures and simple dance participation open the segment.",
      },
      {
        src: shot("entertainment-03-1200.jpg"),
        title: "Photos around the set",
        caption:
          "Standard photo example: preset poses are held before or after the dance segment for guest photos.",
      },
    ],
  },

  restaurants: {
    slug: "restaurants",
    label: "Restaurants",
    lede: "Robot greeting, scheduled performance and photo services for restaurant entrances, waiting areas and celebration programs.",
    thumbnail: scene("restaurants-1200.jpg"),
    hero: scene("restaurants-1800.jpg"),
    overview: [
      "The standard service at restaurant entrances, waiting areas and fixed activity points includes guest interaction, an existing X2 dance and photos. One short approved welcome or celebration message can be included in the interaction module.",
      "Food handling, table service and cleaning are outside this X2 service.",
    ],
    settings: [
      "Restaurant entrances",
      "Waiting and queue areas",
      "Fixed dining-floor activity points",
      "Restaurant openings and celebrations",
    ],
    modules: [
      "Interaction — door greeting, preset gestures and one short approved message",
      "Dance — one existing X2 dance at a fixed activity point",
      "Photos — fixed-point guest or celebration photos",
    ],
    flow: [
      "Interaction — guest greeting and preset gestures",
      "Dance — one existing X2 dance",
      "Photos — guest or celebration photo session",
    ],
    optional: [
      "Additional or extended welcome and celebration scripts",
      "Multi-robot programs",
      "New choreography, themed costumes or appearance materials",
    ],
    galleryTitle: "Restaurant service formats",
    gallery: [
      {
        src: shot("restaurants-01-1200.jpg"),
        title: "Entrance greeting",
        caption:
          "Standard interaction example: X2 greets arriving guests from a fixed point without blocking the service route.",
      },
      {
        src: shot("restaurants-02-1200.jpg"),
        title: "Scheduled short routine",
        caption:
          "Standard dance example: one existing X2 dance is placed at an agreed time outside staff service activity.",
      },
      {
        src: shot("restaurants-03-1200.jpg"),
        title: "Celebration photo session",
        caption:
          "Standard photo example: one short approved celebration message and a preset pose are used for the photo session.",
      },
    ],
  },

  hotels: {
    slug: "hotels",
    label: "Hotels",
    lede: "Robot greeting, scheduled performance and themed interaction services for hotel lobbies and public areas.",
    thumbnail: scene("hotels-1200.jpg"),
    hero: scene("hotels-1800.jpg"),
    overview: [
      "The standard service in hotel lobbies, event foyers and public areas includes guest interaction, an existing X2 dance and photos.",
      "Weddings, annual meetings and product launches held at the property use the corresponding event solution. Seasonal production and hotel information content are quoted separately.",
    ],
    settings: [
      "Lobbies & reception areas",
      "Event foyers",
      "Themed & seasonal displays",
      "Resort public areas",
    ],
    modules: [
      "Interaction — fixed-point greetings, preset gestures and one short approved message",
      "Dance — one existing X2 dance at a scheduled time",
      "Photos — preset poses in the lobby, foyer or themed area",
    ],
    flow: [
      "Interaction — fixed-point greeting and preset gestures",
      "Dance — one existing X2 dance",
      "Photos — lobby, foyer or themed-area photo session",
    ],
    optional: [
      "Multi-robot event programs",
      "Seasonal costumes, appearance materials and themed production",
      "Additional or extended welcome and event scripts",
      "Facility information, hotel service content and fixed Q&A",
    ],
    galleryTitle: "Hotel public-area service formats",
    gallery: [
      {
        src: shot("hotels-01-1200.jpg"),
        title: "Lobby greeting point",
        caption:
          "Standard interaction example: the robot greets arriving guests from a fixed lobby position.",
      },
      {
        src: shot("hotels-02-1200.jpg"),
        title: "Scheduled foyer routine",
        caption:
          "Standard dance example: one existing X2 dance runs at a scheduled time in the event foyer.",
      },
      {
        src: shot("hotels-03-1200.jpg"),
        title: "Themed display photos",
        caption:
          "Standard photo example: preset poses are held beside a seasonal or themed display for guest photos.",
      },
    ],
  },

  "shopping-centers": {
    slug: "shopping-centers",
    label: "Shopping Centers",
    lede: "Robot performance, greeting and photo services for shopping-center atriums, entrances and retail activity areas.",
    thumbnail: scene("shopping-centers-1200.jpg"),
    hero: scene("shopping-centers-1800.jpg"),
    overview: [
      "The standard service for shopping-center atriums, entrances, store openings, retail floors and showrooms includes shopper interaction, an existing X2 dance and photos.",
      "Multi-robot shows, campaign-specific production and product information content are quoted separately.",
    ],
    settings: [
      "Mall atriums & entrances",
      "Store openings",
      "Retail floors & flagship stores",
      "Showrooms & 4S dealerships",
      "Seasonal & holiday campaigns",
    ],
    modules: [
      "Interaction — fixed-point greetings, preset gestures and one short approved message",
      "Dance — one existing single-X2 dance at a scheduled time",
      "Photos — preset poses at an agreed storefront or activity point",
    ],
    flow: [
      "Interaction — fixed-point greeting and preset gestures",
      "Dance — one existing single-X2 dance",
      "Photos — storefront or activity-point photo session",
    ],
    optional: [
      "Multi-robot atrium or store-opening shows",
      "New product- or campaign-specific gestures and choreography",
      "Holiday costumes, brand materials and themed production",
      "Product presentations and fixed Q&A",
    ],
    galleryTitle: "Shopping-center and retail service formats",
    gallery: [
      {
        src: shot("shopping-centers-01-1200.jpg"),
        title: "Atrium activity point",
        caption:
          "Standard dance example: one existing single-X2 dance runs at a scheduled time inside a marked atrium area.",
      },
      {
        src: shot("shopping-centers-02-1200.jpg"),
        title: "Storefront greeting",
        caption:
          "Standard interaction example: preset gestures and one short approved message greet shoppers at the entrance.",
      },
      {
        src: shot("shopping-centers-03-1200.jpg"),
        title: "Store-opening segment",
        caption:
          "Standard service example: the robot joins a store opening as one scheduled segment of the campaign.",
      },
      {
        src: shot("shopping-centers-04-1200.jpg"),
        title: "Shopper photos",
        caption:
          "Standard photo example: preset poses are held at the agreed activity point for shopper photos.",
      },
    ],
  },

  warehouses: {
    slug: "warehouses",
    label: "Warehouses",
    lede: "Site assessment and supervised robot pilots for clearly defined warehouse and production tasks.",
    thumbnail: `${CLOUDINARY}/w_640,h_480,c_fill,g_auto/q_auto,f_auto/agibot/scenarios/security`,
    hero: `${CLOUDINARY}/w_1800,c_fill,g_auto/q_auto,f_auto/agibot/scenarios/security`,
    overview: [
      "Warehouse and production requirements are handled as operational pilots. The task, route, floor, access, power, network, safety boundary and reporting requirements are evaluated before the pilot is defined.",
      "Only the confirmed task and operating area are included in the supervised test.",
    ],
    settings: [
      "Distribution centers",
      "Production lines",
      "Cold chain & bonded storage",
      "Facility perimeters",
      "Quality inspection stations",
    ],
    modules: [
      "One defined route or work area",
      "A documented task and handoff point",
      "Supervised operation during the pilot",
    ],
    flow: [
      "Site survey & route mapping",
      "Joint pilot deployment with the site team",
      "Supervised operation & tuning",
      "Reporting & scale decision",
    ],
    optional: [
      "Site, floor, access and power review",
      "Required observations and records",
      "A review before any expansion decision",
    ],
    galleryTitle: "Pilot scope",
    gallery: [],
  },
};

export const SCENARIO_LIST: ServiceScenario[] = SERVICE_CATEGORY_META.map(
  (meta) => SERVICE_SCENARIOS[meta.slug]
);

export function getScenario(slug: string): ServiceScenario | undefined {
  return SERVICE_SCENARIOS[slug as ServiceCategorySlug];
}

/** Every other scenario, for the "related solutions" pills. */
export function relatedScenarios(slug: string): ServiceScenario[] {
  return SCENARIO_LIST.filter((scenario) => scenario.slug !== slug);
}
