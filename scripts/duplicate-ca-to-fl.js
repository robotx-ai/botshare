// One-off script: duplicate every California listing to Florida locations.
// Usage: node scripts/duplicate-ca-to-fl.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Map California listings to Florida cities spread across the state
const FL_LOCATIONS = [
  { locationValue: "Miami, FL", lat: 25.7617, lng: -80.1918 },
  { locationValue: "Orlando, FL", lat: 28.5383, lng: -81.3792 },
  { locationValue: "Tampa, FL", lat: 27.9506, lng: -82.4572 },
  { locationValue: "Fort Lauderdale, FL", lat: 26.1224, lng: -80.1373 },
  { locationValue: "Jacksonville, FL", lat: 30.3322, lng: -81.6557 },
  { locationValue: "West Palm Beach, FL", lat: 26.7153, lng: -80.0534 },
  { locationValue: "Naples, FL", lat: 26.1420, lng: -81.7948 },
  { locationValue: "Fort Myers, FL", lat: 26.6406, lng: -81.8723 },
  { locationValue: "St. Petersburg, FL", lat: 27.7676, lng: -82.6403 },
  { locationValue: "Tallahassee, FL", lat: 30.4383, lng: -84.2807 },
];

async function main() {
  // Find all California listings (locationValue contains "CA" or "California")
  const caListings = await prisma.listing.findMany({
    where: {
      OR: [
        { locationValue: { endsWith: ", CA" } },
        { locationValue: { contains: "California" } },
      ],
    },
  });

  // Skip listings that already have a Florida duplicate (same title)
  const flListings = await prisma.listing.findMany({
    where: {
      OR: [
        { locationValue: { endsWith: ", FL" } },
        { locationValue: { contains: "Florida" } },
      ],
    },
    select: { title: true },
  });
  const existingFlTitles = new Set(flListings.map((l) => l.title));

  if (caListings.length === 0) {
    console.log("No California listings found. Nothing to duplicate.");
    return;
  }

  console.log(`Found ${caListings.length} California listing(s). Duplicating to Florida...\n`);

  // Filter out listings that already have a FL duplicate
  const newCaListings = caListings.filter((ca) => !existingFlTitles.has(ca.title));

  if (newCaListings.length === 0) {
    console.log("All California listings already have Florida duplicates. Nothing to do.");
    return;
  }

  console.log(`${caListings.length - newCaListings.length} listing(s) already duplicated, skipping.`);
  console.log(`Duplicating ${newCaListings.length} listing(s) to Florida...\n`);

  const toCreate = [];

  for (let i = 0; i < newCaListings.length; i++) {
    const ca = newCaListings[i];
    const fl = FL_LOCATIONS[i % FL_LOCATIONS.length];

    toCreate.push({
      title: ca.title,
      description: ca.description,
      imageSrc: ca.imageSrc,
      videoSrc: ca.videoSrc,
      category: ca.category,
      price: ca.price,
      locationValue: fl.locationValue,
      lat: fl.lat,
      lng: fl.lng,
      zipCode: null,
      roomCount: ca.roomCount,
      bathroomCount: ca.bathroomCount,
      guestCount: ca.guestCount,
      userId: ca.userId,
    });
  }

  const result = await prisma.listing.createMany({ data: toCreate });
  console.log(`Created ${result.count} Florida listing(s):\n`);

  toCreate.forEach((l) => {
    console.log(`  ${l.title}  →  ${l.locationValue}`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
