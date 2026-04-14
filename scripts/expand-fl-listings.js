// One-off script: ensure every California listing exists in every Florida city.
// Usage: node scripts/expand-fl-listings.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const FL_LOCATIONS = [
  { locationValue: "Miami, FL", lat: 25.7617, lng: -80.1918 },
  { locationValue: "Fort Lauderdale, FL", lat: 26.1224, lng: -80.1373 },
  { locationValue: "West Palm Beach, FL", lat: 26.7153, lng: -80.0534 },
  { locationValue: "Orlando, FL", lat: 28.5383, lng: -81.3792 },
  { locationValue: "Tampa, FL", lat: 27.9506, lng: -82.4572 },
  { locationValue: "Jacksonville, FL", lat: 30.3322, lng: -81.6557 },
  { locationValue: "Naples, FL", lat: 26.1420, lng: -81.7948 },
  { locationValue: "Fort Myers, FL", lat: 26.6406, lng: -81.8723 },
  { locationValue: "St. Petersburg, FL", lat: 27.7676, lng: -82.6403 },
  { locationValue: "Tallahassee, FL", lat: 30.4383, lng: -84.2807 },
];

async function main() {
  // 1. Get all California listings (source of truth)
  const caListings = await prisma.listing.findMany({
    where: {
      OR: [
        { locationValue: { endsWith: ", CA" } },
        { locationValue: { contains: "California" } },
      ],
    },
  });

  if (caListings.length === 0) {
    console.log("No California listings found.");
    return;
  }

  console.log(`Found ${caListings.length} California service(s).`);
  console.log(`Target: ${caListings.length} × ${FL_LOCATIONS.length} = ${caListings.length * FL_LOCATIONS.length} Florida listings.\n`);

  // 2. Get existing Florida listings to avoid duplicates
  const existingFL = await prisma.listing.findMany({
    where: {
      OR: [
        { locationValue: { endsWith: ", FL" } },
        { locationValue: { contains: "Florida" } },
      ],
    },
    select: { title: true, locationValue: true },
  });

  const existingKeys = new Set(
    existingFL.map((l) => `${l.title}||${l.locationValue}`)
  );

  console.log(`Already exist: ${existingFL.length} Florida listing(s).`);

  // 3. Build missing combinations
  const toCreate = [];

  for (const ca of caListings) {
    for (const fl of FL_LOCATIONS) {
      const key = `${ca.title}||${fl.locationValue}`;
      if (existingKeys.has(key)) continue;

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
  }

  if (toCreate.length === 0) {
    console.log("All combinations already exist. Nothing to create.");
    return;
  }

  console.log(`Creating ${toCreate.length} new Florida listing(s)...\n`);

  const result = await prisma.listing.createMany({ data: toCreate });
  console.log(`Done! Created ${result.count} listing(s).`);

  // Summary by city
  const byCityCount = {};
  toCreate.forEach((l) => {
    byCityCount[l.locationValue] = (byCityCount[l.locationValue] || 0) + 1;
  });
  console.log("\nNew listings per city:");
  Object.entries(byCityCount).forEach(([city, count]) => {
    console.log(`  ${city}: +${count}`);
  });

  // Final total
  const totalFL = await prisma.listing.count({
    where: {
      OR: [
        { locationValue: { endsWith: ", FL" } },
        { locationValue: { contains: "Florida" } },
      ],
    },
  });
  console.log(`\nTotal Florida listings now: ${totalFL}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
