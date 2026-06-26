# Robot-Driven Listing + Use-Case Taxonomy — Design Spec

**Date:** 2026-06-25
**Status:** Approved design, pending implementation plan
**Project:** A (of A→B). Project B (tier-based booking) is deferred to its own spec.

## Problem

The "list a service" flow (`components/models/RentModal.tsx`) asks the provider for
information that is really a property of the *robot model*, not the individual unit:
the service category, the capacity counters, and a free-typed price. Now that every
listing starts from a catalog robot, those facts can come from the model itself. The
provider should only supply what is unit-specific: location, photos, a SKU, and a SKU
photo (proof they own the unit). Price becomes a fixed, model-defined value.

This project also replaces the platform's 3-value service-category taxonomy with a
6-value **use-case** taxonomy that better describes what the robots do, and curates the
robot picker down to a fixed set of 13 listable models with multi-tier pricing.

## Scope

**In scope (Project A):**
- Schema: multi-tier prices + use cases + `listable` flag on `RobotModel`; `sku` +
  `skuImageSrc` on `Listing`.
- Catalog data: add A3, C5, A2 Edu; consolidate the G1/R1 Edu families; update the 8
  existing rows; mark exactly 13 as `listable`.
- Taxonomy swap: replace the 3 service categories with 6 use cases across the navbar
  filter and browse; migrate existing listings.
- Listing flow: rebuild `RentModal` (drop Category + Capacity steps, add SKU + SKU
  photo, read-only multi-tier price).

**Out of scope (Project B, later):**
- Tier-based booking: tier picker (hour/day/month + start date → computed end), Stripe
  amount math per tier, per-unit availability, and model-level "N available" on browse.
- During Project A, booking stays **day-based**: `Listing.price` mirrors the model's
  daily price; checkout and trip math are untouched. The hourly/monthly prices are
  *displayed* but not yet bookable.

**Deferred (future, not this project):**
- SKU *verification* (admin approval or automated match against the manufacturer SKU).
  For now the SKU + photo are collected and the listing posts immediately, no gate.

## The 13 listable models (final)

| Label | Brand | Catalog action | $/hr | $/day | $/mo | Use case(s) |
|---|---|---|---|---|---|---|
| G1 Edu | Unitree | consolidate 12 `G1edu-*` → 1 canonical | 930 | 1500 | 700 | Performance |
| A2 Edu | Agibot | add new | 690 | 1000 | 3500 | Guide |
| A3 | Agibot | add new | 950 | 1500 | 5000 | Performance |
| A2 Ultra | Agibot | exists (`Agibot A2 Ultra`) | 1250 | 2000 | 3000 | Guide |
| X2 Ultra | Agibot | exists (`Agibot X2 Ultra`) | 625 | 900 | 2000 | Guide |
| Unitree A2 | Unitree | exists (`A2 Standard`) | 800 | 1400 | 3000 | Patrol |
| Go2 Edu U2 | Unitree | exists (`Go2 EDU-U2`) | 340 | 650 | 1500 | Performance |
| D1 Ultra | Agibot | exists (`Agibot D1 Ultra`) | 250 | 460 | 750 | Patrol |
| D1 Edu | Agibot | exists (`Agibot D1 EDU`) | 94 | 160 | 650 | Guide |
| C5 | Agibot | add new | 200 | 400 | 2000 | Cleaning |
| Pudu MT1 | Pudu | exists (`Pudu MT1`) | 475 | 900 | 2000 | Cleaning |
| R1 Edu | Unitree | consolidate 6 `R1 EDU *` → 1 canonical | 390 | 750 | — | Performance, Guide |
| Go2 Pro | Unitree | exists (`Go2 Pro Package`) | 95 | 160 | — | Performance, Patrol |

Notes:
- Prices are USD integers. Monthly is null for R1 Edu and Go2 Pro.
- `msrp` is unknown for the 3 new rows (A3, C5, A2 Edu) → leave null.

## The 6 use cases

`Cleaning`, `Delivery`, `Performance`, `Guide`, `Live streaming`, `Patrol`.

`Delivery` and `Live streaming` have no models in the initial 13 — they exist as valid
filter options for future robots and render as empty result sets for now.

## Architecture

### 1. Schema (`prisma/schema.prisma`)

`RobotModel` — add:
```
priceHourly  Int?
priceDaily   Int?
priceMonthly Int?
useCase      String[]            // values from the 6; multi-valued
listable     Boolean  @default(false)
```
`serviceCategory` stays in place but becomes vestigial (no destructive column drop
during MVP). Nothing reads it after the taxonomy swap.

`Listing` — add:
```
sku         String?              // provider's physical-unit SKU
skuImageSrc String?              // Cloudinary URL of the SKU-label photo
```
Both nullable so existing rows remain valid; the new flow requires them in the UI.

Migration applied with the existing direct-connection migration workflow
(`DIRECT_URL`), respecting `lib/writeGuard.ts`.

### 2. Use-case taxonomy (`lib/useCases.ts`)

New module exporting the 6 canonical values and their display metadata (label + icon),
replacing `lib/serviceCategories.ts` as the active taxonomy. `serviceCategories.ts` is
left untouched for now (vestigial) to keep the diff focused.

- `components/navbar/Categories.tsx` renders 6 use-case chips (was 3 category chips).
- Browse / services filtering queries listings through the model relation:
  `where: { robotModel: { useCase: { has: <selected> } } }`. A listing of a multi-use
  model (e.g. R1 Edu) appears under each of its use cases.
- `Listing.category` is repurposed to hold a single **primary use case** string
  (the model's first use case), written at creation time and during migration, as a
  denormalized fallback for display and for legacy listings without a model link.

### 3. Catalog data (`scripts/`)

A single idempotent script (keyed by `slug`) that:
- Adds A3 (`agibot-a3`), C5 (`agibot-c5`), A2 Edu (`agibot-a2-edu`).
- Creates one canonical `listable` row for G1 Edu (`unitree-g1-edu`) and R1 Edu
  (`unitree-r1-edu`); sets the 12/6 underlying variant rows to `listable=false`.
  Canonical row `msrp`/`description`: **decide during implementation** — default to the
  standard variant's values (G1 Edu Standard `43900`; R1 Edu standard `15950`).
- Updates the 8 existing rows with prices, `useCase`, and display label.
- Sets `listable=true` on exactly the 13; everything else `false`.
- Sets `priceHourly`/`priceDaily`/`priceMonthly` per the table.

Display label: stored as `productName` (the picker's display name) per the table's
"Label" column.

### 4. Robot picker + `/api/robot-models`

- `app/api/robot-models/route.ts` adds `where: { listable: true }` and selects the new
  price/useCase fields.
- `hook/useRobotModels.ts` `RobotModelOption` type gains `priceHourly`, `priceDaily`,
  `priceMonthly`, `useCase`.
- `components/inputs/RobotPicker.tsx` shows only the 13; brand/category chips switch to
  use-case chips (or are removed if redundant — decide during implementation).

### 5. Listing flow (`components/models/RentModal.tsx`)

New step enum (5 steps):
```
ROBOT = 0     // pick from the 13 listable models
LOCATION = 1  // zip (unchanged)
IMAGES = 2    // unit photo + SKU photo (+ optional video)
DETAILS = 3   // title (prefilled) + description (prefilled) + SKU text field
PRICE = 4     // read-only; shows model's available tiers
```
- `onSelectRobot` continues to prefill title/description/image; it no longer needs to
  prefill category (derived server-side from the model).
- IMAGES step adds a second `ImageUpload` bound to `skuImageSrc`.
- DETAILS step adds an `Input` bound to `sku`.
- PRICE step renders the model's tiers read-only (e.g. "$1,250/hr · $2,000/day ·
  $3,000/mo"), no editable price input.
- Submit payload: `{ robotModelId, zipCode, imageSrc, videoSrc?, skuImageSrc, sku,
  title, description }`.

### 6. API (`app/api/listings/route.ts`)

- `robotModelId` is **required**; reject if missing or the model is not `listable`.
- Server reads the model and sets: `category` = model's primary use case, `price` =
  model's `priceDaily`. Any client-sent `price`/`category` is ignored.
- Stores `sku` + `skuImageSrc`.
- `guestCount`/`roomCount`/`bathroomCount` default to 1.
- Replace the `isServiceCategory()` check with the `listable` model check.
- Unchanged: auth, `canManageServices`, provider-profile gate, zip validation,
  `writeGuard`.

## Data flow (create a listing)

1. Provider opens RentModal → `/api/robot-models` returns the 13 listable models.
2. Provider picks a model → title/description/image prefill; tiers shown read-only later.
3. Provider enters zip, uploads unit photo + SKU photo, edits title/description, types SKU.
4. Submit → `POST /api/listings` with `robotModelId` + unit fields.
5. Server validates the model is listable, derives `category` (primary use case) and
   `price` (daily) from the model, defaults capacity to 1, stores `sku`/`skuImageSrc`,
   creates the `Listing`.
6. Browse filters by use case through the model relation; the listing appears under each
   of its model's use cases.

## Migration of existing listings

Existing listings filter through their linked model, so the goal is that each kept
listing's model has `useCase` set. Steps:
- Ensure existing AGIBOT/seeded listings are linked to a `RobotModel` (most match by
  title); set `useCase` on the rows they link to.
- For any listing without a model link, write a single fallback use case to
  `Listing.category` using this old→new mapping (**confirm during spec review**):
  - Showcase & Performance → Performance
  - Restaurant → Delivery
  - Warehouse → Patrol

## Error handling

- Missing `robotModelId` or non-`listable` model → 400.
- Missing `sku` / `skuImageSrc` → blocked in the UI (schema stays nullable for legacy).
- Zip / provider-profile / write-guard failures → unchanged behavior.
- A `listable` model with a null required tier (e.g. no daily price) cannot be listed;
  the seed script guarantees every listable model has at least a daily price.

## Verification

- `npm run lint` and `npm run build` pass.
- Manual: create a listing via the new 5-step flow → it appears on browse under the
  correct use-case filter(s); price tiers render; `sku` + `skuImageSrc` persist.
- Picker shows exactly the 13 listable models with their new labels.
- Migration: existing listings still appear under their mapped use cases.
- Multi-use model (R1 Edu) listing appears under both Performance and Guide.

## Open decisions (resolve during spec review / implementation)

1. Old→new category mapping for legacy listings (Migration section) — confirm.
2. Canonical `msrp`/`description` for the consolidated G1 Edu and R1 Edu rows.
3. Whether `RobotPicker`'s secondary filter chips switch to use cases or are dropped.
