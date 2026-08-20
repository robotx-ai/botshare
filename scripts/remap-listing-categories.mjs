/* eslint-disable no-console */
/**
 * Moves every Listing row onto one of the 8 canonical service scenarios.
 *
 * Resolution order per listing — first hit wins:
 *   1. Title matches a scenario in data/agibot-scenarios.json -> its category.
 *   2. TITLE_OVERRIDES — catalog listings whose robot metadata maps poorly
 *      (e.g. an education humanoid tagged only "Performance").
 *   3. The linked RobotModel's capability tags (`useCase`).
 *   4. The listing's own legacy category value (the pre-restructure 6 use cases
 *      and 3 service categories).
 *   5. The linked RobotModel's legacy `serviceCategory`, then `capabilityTag`.
 *   6. DEFAULT_CATEGORY.
 *
 * Read-only by default. Pass --apply to write.
 *
 *   node scripts/remap-listing-categories.mjs            # dry run
 *   node scripts/remap-listing-categories.mjs --apply    # writes to the DB
 */
import "dotenv/config";
import { createRequire } from "node:module";
import pkg from "@prisma/client";

const require = createRequire(import.meta.url);
const scenarios = require("../data/agibot-scenarios.json");

const { PrismaClient } = pkg;
const prisma = new PrismaClient();

const APPLY = process.argv.includes("--apply");

const SERVICE_CATEGORIES = [
  "Private Events",
  "Commercial Events",
  "Schools & Universities",
  "Entertainment",
  "Restaurants",
  "Hotels",
  "Shopping Centers",
  "Warehouses",
];

const DEFAULT_CATEGORY = "Commercial Events";

/** Robot capability tags (`RobotModel.useCase`) — see lib/useCases.ts. */
const CAPABILITY_TO_CATEGORY = {
  Cleaning: "Warehouses",
  Delivery: "Restaurants",
  Performance: "Entertainment",
  Guide: "Hotels",
  "Live streaming": "Entertainment",
  Patrol: "Warehouses",
};

/** Pre-restructure taxonomies still stored on older rows. */
const LEGACY_TO_CATEGORY = {
  ...CAPABILITY_TO_CATEGORY,
  "Showcase & Performance": "Entertainment",
  Warehouse: "Warehouses",
  Restaurant: "Restaurants",
};

const CAPABILITY_TAG_TO_CATEGORY = {
  humanoid: "Entertainment",
  quadruped: "Warehouses",
  delivery: "Restaurants",
  cleaning: "Warehouses",
  reception: "Hotels",
  industrial: "Warehouses",
  education: "Schools & Universities",
};

const TITLE_OVERRIDES = {
  "R1 Edu": "Schools & Universities",
  "AgiBot A2 — Humanoid Brand Ambassador": "Commercial Events",
  "AgiBot G2 — Precision Assembly Robot": "Warehouses",
};

function normalizeTitle(value) {
  return String(value)
    .toLowerCase()
    .replace(/^agibot\s+/, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const scenarioByTitle = new Map(
  scenarios.map((scenario) => [normalizeTitle(scenario.title), scenario])
);

function resolveCategory(listing) {
  const scenario = scenarioByTitle.get(normalizeTitle(listing.title));
  if (scenario?.category) {
    return { category: scenario.category, via: "scenario" };
  }

  const override = TITLE_OVERRIDES[listing.title];
  if (override) {
    return { category: override, via: "override" };
  }

  for (const useCase of listing.robotModel?.useCase ?? []) {
    const mapped = CAPABILITY_TO_CATEGORY[useCase];
    if (mapped) {
      return { category: mapped, via: `useCase:${useCase}` };
    }
  }

  const fromLegacy = LEGACY_TO_CATEGORY[listing.category];
  if (fromLegacy) {
    return { category: fromLegacy, via: `legacy:${listing.category}` };
  }

  const fromModelCategory =
    LEGACY_TO_CATEGORY[listing.robotModel?.serviceCategory];
  if (fromModelCategory) {
    return {
      category: fromModelCategory,
      via: `model:${listing.robotModel.serviceCategory}`,
    };
  }

  const fromTag = CAPABILITY_TAG_TO_CATEGORY[listing.robotModel?.capabilityTag];
  if (fromTag) {
    return { category: fromTag, via: `tag:${listing.robotModel.capabilityTag}` };
  }

  return { category: DEFAULT_CATEGORY, via: "default" };
}

async function main() {
  const missing = scenarios.filter(
    (scenario) => !SERVICE_CATEGORIES.includes(scenario.category)
  );
  if (missing.length > 0) {
    throw new Error(
      `Scenarios missing a canonical category: ${missing.map((s) => s.id).join(", ")}`
    );
  }

  const listings = await prisma.listing.findMany({
    select: {
      id: true,
      title: true,
      category: true,
      robotModel: {
        select: { useCase: true, serviceCategory: true, capabilityTag: true },
      },
    },
    orderBy: { title: "asc" },
  });

  const plan = listings.map((listing) => ({
    listing,
    ...resolveCategory(listing),
  }));

  const changed = plan.filter((row) => row.listing.category !== row.category);

  const grouped = new Map();
  for (const row of plan) {
    const key = JSON.stringify([row.category, row.listing.title, row.via]);
    grouped.set(key, (grouped.get(key) ?? 0) + 1);
  }

  console.log(`${APPLY ? "APPLY" : "DRY RUN"} — ${listings.length} listings\n`);
  for (const [key, count] of [...grouped.entries()].sort()) {
    const [category, title, via] = JSON.parse(key);
    console.log(
      `  ${String(count).padStart(2)}x  ${category.padEnd(22)} <- ${title}  (${via})`
    );
  }

  console.log(`\n${changed.length} listing(s) need a category change.`);

  if (!APPLY) {
    console.log("Dry run — nothing written. Re-run with --apply to persist.");
    return;
  }

  let updated = 0;
  for (const row of changed) {
    await prisma.listing.update({
      where: { id: row.listing.id },
      data: { category: row.category },
    });
    updated++;
  }
  console.log(`Updated ${updated} listing(s).`);

  const totals = await prisma.listing.groupBy({
    by: ["category"],
    _count: { _all: true },
  });
  console.log("\nFinal distribution:");
  for (const total of totals.sort((a, b) => a.category.localeCompare(b.category))) {
    console.log(`  ${String(total._count._all).padStart(3)}  ${total.category}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
