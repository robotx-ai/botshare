/**
 * seed-robot-catalog.mjs — seed the RobotModel table from the unified catalog.
 *
 * For each row in data/robot-catalog/robot-catalog.json:
 *   1. upload its local image to Cloudinary (public_id robot-catalog/<slug>, overwrite)
 *   2. upsert a RobotModel row by slug (idempotent — re-running updates, never duplicates)
 *
 * Prereqs: run scripts/build-robot-catalog.py first to produce the JSON + images.
 * Cloudinary creds + DATABASE_URL come from .env.
 *
 * Run:  node scripts/seed-robot-catalog.mjs
 */
import "dotenv/config";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG_DIR = path.join(__dirname, "..", "data", "robot-catalog");
const JSON_PATH = path.join(CATALOG_DIR, "robot-catalog.json");

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const KEY = process.env.CLOUDINARY_API_KEY;
const SECRET = process.env.CLOUDINARY_API_SECRET;
const CONCURRENCY = 6;

const prisma = new PrismaClient();

function deliveryUrl(publicId, format) {
  return `https://res.cloudinary.com/${CLOUD}/image/upload/q_auto,f_auto/${publicId}.${format}`;
}

async function uploadImage(localRelPath, slug) {
  const abs = path.join(CATALOG_DIR, localRelPath);
  if (!existsSync(abs)) {
    console.warn(`  ! image missing on disk, skipping upload: ${localRelPath}`);
    return null;
  }
  const buf = readFileSync(abs);
  const form = new FormData();
  form.append("file", new Blob([buf]), path.basename(abs));
  form.append("public_id", `robot-catalog/${slug}`);
  form.append("overwrite", "true");

  const auth = Buffer.from(`${KEY}:${SECRET}`).toString("base64");
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, {
        method: "POST",
        headers: { Authorization: `Basic ${auth}` },
        body: form,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 120)}`);
      const data = await res.json();
      return deliveryUrl(data.public_id, data.format);
    } catch (err) {
      if (attempt === 2) {
        console.warn(`  ! upload failed (${slug}): ${err.message}`);
        return null;
      }
    }
  }
  return null;
}

async function seedRow(row) {
  const imageUrl = row.image ? await uploadImage(row.image, row.slug) : null;
  const data = {
    slug: row.slug,
    brand: row.brand,
    model: row.model,
    productName: row.productName,
    sku: row.sku ?? null,
    description: row.description ?? "",
    msrp: row.msrp ?? null,
    serviceCategory: row.serviceCategory,
    capabilityTag: row.capabilityTag,
    imageUrl,
    needsReview: !!row.needsReview,
  };
  await prisma.robotModel.upsert({
    where: { slug: row.slug },
    create: data,
    update: data,
  });
  return imageUrl;
}

async function main() {
  if (!existsSync(JSON_PATH)) {
    console.error(`Catalog JSON not found: ${JSON_PATH}\nRun scripts/build-robot-catalog.py first.`);
    process.exit(1);
  }
  if (!CLOUD || !KEY || !SECRET) {
    console.error("Missing Cloudinary env vars (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET).");
    process.exit(1);
  }
  const rows = JSON.parse(readFileSync(JSON_PATH, "utf-8"));
  console.log(`Seeding ${rows.length} robots (Cloudinary cloud: ${CLOUD})...`);

  let done = 0, withImage = 0;
  // simple concurrency pool
  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const batch = rows.slice(i, i + CONCURRENCY);
    const urls = await Promise.all(batch.map(seedRow));
    done += batch.length;
    withImage += urls.filter(Boolean).length;
    process.stdout.write(`\r  upserted ${done}/${rows.length}`);
  }
  console.log(`\nDone. Rows: ${done}, with image: ${withImage}`);

  const total = await prisma.robotModel.count();
  console.log(`RobotModel.count() = ${total}`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
