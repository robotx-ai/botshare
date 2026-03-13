/* eslint-disable no-console */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const scenarios = require("../data/agibot-scenarios.json");

const LOCATION_VALUE = "Southern California";

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
  // Look up admin user
  const adminEmails = (process.env.ROBOTX_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  if (adminEmails.length === 0) {
    throw new Error(
      "ROBOTX_ADMIN_EMAILS env var is not set. Cannot determine admin user."
    );
  }

  const adminUser = await prisma.user.findFirst({
    where: { email: { in: adminEmails } },
  });

  if (!adminUser) {
    throw new Error(
      `No user found matching ROBOTX_ADMIN_EMAILS: ${adminEmails.join(", ")}`
    );
  }

  console.log(`Using admin user: ${adminUser.email} (${adminUser.id})`);

  let created = 0;
  let skipped = 0;

  for (const scenario of scenarios) {
    const title = `AGIBot ${scenario.title}`;

    const existing = await prisma.listing.findFirst({ where: { title } });
    if (existing) {
      console.log(`  SKIP (exists): ${title}`);
      skipped++;
      continue;
    }

    await prisma.listing.create({
      data: {
        title,
        description: buildDescription(scenario),
        imageSrc: resolveScenarioImageSrc(scenario.imageSrc),
        category: "Showcase & Performance",
        price: scenario.pricing.silver,
        locationValue: LOCATION_VALUE,
        roomCount: 1,
        bathroomCount: 1,
        guestCount: 500,
        userId: adminUser.id,
      },
    });

    console.log(`  CREATED: ${title}`);
    created++;
  }

  console.log(`\nDone. Created: ${created}, Skipped (already exist): ${skipped}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
