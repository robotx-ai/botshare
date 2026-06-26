/**
 * migrate-listing-use-cases.mjs — rewrite each existing Listing.category from the
 * legacy 3 service categories to a use case. If the listing links to a RobotModel
 * with use cases, use the model's first use case; otherwise map the old category.
 * Idempotent. Run: node scripts/migrate-listing-use-cases.mjs
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const LEGACY_MAP = {
  "Showcase & Performance": "Performance",
  "Restaurant": "Delivery",
  "Warehouse": "Patrol",
};

async function main() {
  const listings = await prisma.listing.findMany({
    select: { id: true, category: true, robotModel: { select: { useCase: true } } },
  });

  let updated = 0;
  for (const l of listings) {
    const fromModel = l.robotModel?.useCase?.[0];
    const next = fromModel ?? LEGACY_MAP[l.category] ?? l.category;
    if (next !== l.category) {
      await prisma.listing.update({ where: { id: l.id }, data: { category: next } });
      updated++;
    }
  }
  console.log(`Listings scanned: ${listings.length}, updated: ${updated}`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
