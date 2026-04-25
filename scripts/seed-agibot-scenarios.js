/* eslint-disable no-console */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const scenarios = require("../data/agibot-scenarios.json");
const zipToMetro = require("../data/zip-to-metro.json");

const METRO_ANCHORS = {
  SF: { zip: "94102", label: "San Francisco Bay Area" },
  LA: { zip: "90001", label: "Los Angeles Metro" },
  VEGAS: { zip: "89101", label: "Las Vegas Metro" },
  DALLAS: { zip: "75201", label: "Dallas\u2013Fort Worth Metro" },
  NYC: { zip: "10001", label: "New York Metro" },
  MIAMI: { zip: "33101", label: "Miami Metro" },
};

for (const [metro, anchor] of Object.entries(METRO_ANCHORS)) {
  if (!zipToMetro[anchor.zip]) {
    throw new Error(`Anchor zip ${anchor.zip} for ${metro} missing from zip-to-metro.json`);
  }
}

const CLD =
  "https://res.cloudinary.com/dmrhtzqyx/image/upload/q_auto,f_auto";

function resolveScenarioImageSrc(imageSrc) {
  if (!imageSrc) {
    return imageSrc;
  }

  if (/^https?:\/\//i.test(imageSrc) || imageSrc.startsWith("/")) {
    return imageSrc;
  }

  return `${CLD}/${imageSrc}`;
}

function buildDescription(scenario) {
  const lines = [scenario.description, ""];
  for (const [tierKey, tier] of Object.entries(scenario.tiers)) {
    const label =
      tierKey === "silver"
        ? "Silver"
        : tierKey === "gold"
        ? "Gold"
        : "Platinum";
    lines.push(`${label} (${tier.robot} · ${tier.hours}h):`);
    for (const f of tier.features) {
      lines.push(`  • ${f}`);
    }
    lines.push("");
  }
  return lines.join("\n").trim();
}

async function main() {
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  if (adminEmails.length === 0) {
    throw new Error(
      "ADMIN_EMAILS env var is not set. Cannot determine admin user."
    );
  }

  const adminUser = await prisma.user.findFirst({
    where: { email: { in: adminEmails } },
  });

  if (!adminUser) {
    throw new Error(
      `No user found matching ADMIN_EMAILS: ${adminEmails.join(", ")}`
    );
  }

  console.log(`Using admin user: ${adminUser.email} (${adminUser.id})`);

  let created = 0;
  let skipped = 0;

  for (const scenario of scenarios) {
    const title = `AGIBot ${scenario.title}`;
    for (const [metro, anchor] of Object.entries(METRO_ANCHORS)) {
      const existing = await prisma.listing.findFirst({
        where: { title, metro },
      });
      if (existing) {
        console.log(`  SKIP (${metro}): ${title}`);
        skipped++;
        continue;
      }

      const zipData = zipToMetro[anchor.zip];
      await prisma.listing.create({
        data: {
          title,
          description: buildDescription(scenario),
          imageSrc: resolveScenarioImageSrc(scenario.imageSrc),
          category: "Showcase & Performance",
          price: scenario.pricing.silver,
          metro,
          zipCode: anchor.zip,
          lat: zipData.lat,
          lng: zipData.lng,
          locationValue: anchor.label,
          roomCount: 1,
          bathroomCount: 1,
          guestCount: 500,
          userId: adminUser.id,
        },
      });

      console.log(`  CREATED (${metro}): ${title}`);
      created++;
    }
  }

  console.log(`\nDone. Created: ${created}, Skipped (already exist): ${skipped}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
