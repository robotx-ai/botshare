// @ts-check
const { PrismaClient } = require("@prisma/client");
const zipToMetro = require("../data/zip-to-metro.json");

const prisma = new PrismaClient();

const CLD =
  "https://res.cloudinary.com/dmrhtzqyx/image/upload/q_auto,f_auto";
const VID =
  "https://res.cloudinary.com/dmrhtzqyx/video/upload/q_auto,f_auto";

const METRO_LABELS = {
  SF: "San Francisco Bay Area",
  LA: "Los Angeles Metro",
  VEGAS: "Las Vegas Metro",
  DALLAS: "Dallas\u2013Fort Worth Metro",
  NYC: "New York Metro",
  MIAMI: "Miami Metro",
};

// Anchor zips (must exist in data/zip-to-metro.json).
const ANCHORS = {
  SF: "94102",
  LA: "90001",
  VEGAS: "89101",
  DALLAS: "75201",
  NYC: "10001",
  MIAMI: "33101",
};

function zipFor(metro) {
  const zip = ANCHORS[metro];
  const data = zipToMetro[zip];
  if (!data) throw new Error(`Anchor zip ${zip} missing from zip-to-metro.json`);
  return { zip, ...data };
}

const TEMPLATES = [
  {
    title: "AgiBot A2 \u2014 Humanoid Brand Ambassador",
    description:
      "1.75m humanoid robot with 40+ degrees of freedom and L4-level autonomous navigation. Delivers guided tours, product demos, and interactive brand experiences in multiple languages. Ideal for exhibitions, product launches, and retail activations.",
    imageSrc: `${CLD}/listing-agibot-a2`,
    videoSrc: `${VID}/party-bg.mp4`,
    category: "Showcase & Performance",
    price: 580,
    roomCount: 1,
    bathroomCount: 1,
    guestCount: 400,
  },
  {
    title: "AgiBot G2 \u2014 Precision Assembly Robot",
    description:
      "1.8m dual-arm humanoid with 7-DOF force-controlled arms and submillimeter positioning accuracy. Automotive-grade components and hot-swappable batteries for continuous 24/7 operation. Handles precision assembly, quality inspection, and high-value logistics tasks.",
    imageSrc: `${CLD}/listing-agibot-g2`,
    videoSrc: null,
    category: "Warehouse",
    price: 450,
    roomCount: 2,
    bathroomCount: 2,
    guestCount: 15,
  },
  {
    title: "PUDU FlashBot \u2014 Multi-Floor Courier",
    description:
      "Autonomous delivery robot engineered for multi-floor logistics in commercial buildings. Integrates with elevators and access control systems for seamless inter-department parcel and document transport.",
    imageSrc: `${CLD}/listing-pudu-flashbot`,
    videoSrc: null,
    category: "Warehouse",
    price: 260,
    roomCount: 1,
    bathroomCount: 1,
    guestCount: 50,
  },
  {
    title: "PUDU BellaBot \u2014 Dining Service Robot",
    description:
      "Premium food and beverage delivery robot for restaurants, hotels, and hospitality venues. Navigates dining rooms autonomously, delivers to tables, and handles plate retrieval.",
    imageSrc: `${CLD}/listing-pudu-bellabot`,
    videoSrc: `${VID}/hero-restaurant.mp4`,
    category: "Restaurant",
    price: 240,
    roomCount: 1,
    bathroomCount: 1,
    guestCount: 80,
  },
  {
    title: "PUDU KettyBot \u2014 Host & Receptionist",
    description:
      "Multi-purpose service robot combining front-desk reception, queue management, and promotional display. Features an integrated screen for menus, wayfinding, and brand content.",
    imageSrc: `${CLD}/listing-pudu-kettybot`,
    videoSrc: null,
    category: "Restaurant",
    price: 190,
    roomCount: 1,
    bathroomCount: 1,
    guestCount: 100,
  },
  {
    title: "PUDU CC1 Pro \u2014 Commercial Cleaning Unit",
    description:
      "4-in-1 autonomous cleaning robot handling sweeping, mopping, scrubbing, and drying in a single pass. Covers large commercial floor areas efficiently.",
    imageSrc: `${CLD}/listing-pudu-cc1`,
    videoSrc: null,
    category: "Restaurant",
    price: 175,
    roomCount: 1,
    bathroomCount: 1,
    guestCount: 30,
  },
];

const METROS = ["SF", "LA", "VEGAS", "DALLAS", "NYC", "MIAMI"];

// Cross every template with every metro -> 6 templates * 6 metros = 36 seed rows.
const SERVICES = [];
for (const metro of METROS) {
  const { zip, lat, lng } = zipFor(metro);
  for (const t of TEMPLATES) {
    SERVICES.push({
      ...t,
      metro,
      zipCode: zip,
      lat,
      lng,
      locationValue: METRO_LABELS[metro],
    });
  }
}

async function main() {
  const adminEmail =
    (process.env.ADMIN_EMAILS ?? "").split(",")[0].trim() ||
    "seed@botsharing.us";

  console.log(`Upserting seed admin user: ${adminEmail}`);
  const seedUser = await prisma.user.upsert({
    where: { email: adminEmail },
    create: { email: adminEmail, name: "BotSharing US Admin" },
    update: {},
  });

  const deleted = await prisma.listing.deleteMany({
    where: { userId: seedUser.id },
  });
  if (deleted.count > 0) {
    console.log(`Removed ${deleted.count} existing listing(s) for ${adminEmail}`);
  }

  console.log(`Creating ${SERVICES.length} service(s) across ${METROS.length} metros...`);
  await prisma.listing.createMany({
    data: SERVICES.map((s) => ({ ...s, userId: seedUser.id })),
  });

  const byMetro = await prisma.listing.groupBy({
    by: ["metro"],
    _count: { id: true },
  });
  console.log("\nSeeded services by metro:");
  byMetro.forEach((c) => console.log(`  ${c.metro}: ${c._count.id}`));
  console.log(`\nTotal: ${SERVICES.length} services seeded successfully.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
