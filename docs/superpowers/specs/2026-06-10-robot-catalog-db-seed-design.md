# Robot Catalog → Database — Design Spec (Sub-project 1 of 3)

**Date:** 2026-06-10
**Status:** Approved design → ready for implementation plan
**Depends on:** `RobotCatalog.xlsx` + `robot-images/` produced by
`scripts/build-robot-catalog.py` (see 2026-06-10-robot-catalog-unify-design.md).

## Context: the 3 sub-projects

The goal is to let a signed-in provider pick a robot from a curated catalog when
listing a service, instead of typing every field by hand. That breaks into three
connected pieces, each with its own spec → plan → build cycle:

1. **Catalog → database (THIS SPEC)** — make the catalog queryable by the app:
   a `RobotModel` table seeded from the catalog, images on Cloudinary. *Prerequisite.*
2. **Robot picker in the listing flow** — a search/select step in `RentModal` that
   auto-fills brand/model/description/image/category from the chosen `RobotModel`,
   keeping a manual fallback. *Depends on #1.*
3. **Provider profile + listing gate** — a provider self-profile page; block listing
   until name/phone/company are filled; a `verified` badge an admin grants later
   (non-blocking). *Independent.*

This spec covers only #1.

## Guiding decisions (locked)

- Catalog lives in a **Prisma `RobotModel` table** (not static JSON).
- Images hosted on **Cloudinary** under a `robot-catalog/` folder.
- `MSRP` is the robot **purchase price — reference only**. It must NEVER be used to
  default a listing's per-day rental `price`. (Relevant to #2; recorded here so the
  field's meaning is unambiguous.)
- Listing ↔ catalog will be a **hybrid** in #2: a `robotModelId` reference plus a
  snapshot of display fields at creation time. (No `Listing` change in #1.)

## Data Model

New model in `prisma/schema.prisma`:

```prisma
model RobotModel {
  id              String   @id @default(cuid())
  slug            String   @unique          // "<brand>-<model>", stable upsert key + Cloudinary public_id
  brand           String
  model           String
  productName     String
  sku             String?
  description     String                     // spec text (may be empty, e.g. Agibot)
  msrp            Int?                        // USD purchase price, reference only
  serviceCategory String                     // one of the 3 canonical categories
  capabilityTag   String                     // humanoid | quadruped | delivery | cleaning | reception | industrial | education
  imageUrl        String?                     // Cloudinary delivery URL, null if no source image
  needsReview     Boolean  @default(false)    // carries the catalog flag (currently the 7 Booster rows)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([brand])
  @@index([serviceCategory])
  @@index([model])
}
```

Notes:
- No relation to `Listing` in this sub-project; that link (`Listing.robotModelId`) is
  added in #2.
- `serviceCategory` is named explicitly (not reused as `category`) to keep the catalog
  field distinct from `Listing.category` even though their value sets match.
- ~98 rows expected. Search in #2 is fuzzy in-memory; the indexes are cheap and
  future-proofing only.

## Components / Units of Work

### 1. Emit machine-readable JSON (small change to the Python builder)
`scripts/build-robot-catalog.py` additionally writes
`data/robot-catalog/robot-catalog.json` — an array of row objects mirroring the xlsx
columns, plus a computed `slug` (`slug(brand, model)`, already implemented) and the
local image path. This JSON is the seed's input (avoids a Node xlsx parser).

### 2. Prisma migration
Add the `RobotModel` model and run a migration against Supabase using `DIRECT_URL`.
Respect `lib/writeGuard.ts` (migration read-only lock) — ensure the guard is not
engaged during the migration, per existing repo practice.

### 3. Seed script — `scripts/seed-robot-catalog.mjs`
Idempotent, re-runnable. For each row in `robot-catalog.json`:
1. If the row has a local image, upload it to Cloudinary with
   `public_id = robot-catalog/<slug>`, `overwrite=true`, `resource_type=image`.
   Build the delivery URL `https://res.cloudinary.com/<cloud>/image/upload/q_auto,f_auto/robot-catalog/<slug>.<ext>`.
   On upload failure: log and continue with `imageUrl = null` (don't abort the run).
2. `prisma.robotModel.upsert({ where: { slug }, create, update })` with all fields.

Uses Cloudinary credentials from `.env` (`CLOUDINARY_API_KEY/SECRET`,
`NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`) and the Prisma singleton.

## Error Handling

- Cloudinary upload error for one image → log, set `imageUrl = null`, continue.
- Missing local image (row had no picture) → `imageUrl = null`, no upload attempted.
- Re-running the seed → upsert by `slug` updates in place; `overwrite=true` keeps
  Cloudinary public_ids stable. No duplicates.
- Empty/short-circuit: if `robot-catalog.json` is missing, the seed exits with a clear
  message telling the user to run `build-robot-catalog.py` first.

## Verification / Success Criteria

- Migration applies cleanly; `RobotModel` table exists in Supabase.
- After seeding: `prisma.robotModel.count()` == number of rows in the JSON (~98).
- Every row with a source image has a non-null `imageUrl` that returns HTTP 200.
- Re-running the seed leaves the row count unchanged (idempotency proven).
- Spot-check: query 2-3 known models (e.g. `Unitree G1 Basic`, `Pudu BellaBot`) and
  confirm fields + image render.

## Out of Scope (later sub-projects)

- The `RentModal` robot picker, search UX, and auto-fill (#2).
- `Listing.robotModelId` and listing↔catalog snapshotting (#2).
- Provider profile page, listing gate, `verified` flag (#3).
- An admin UI to edit `RobotModel` rows (future; for now edits = re-run the pipeline).
