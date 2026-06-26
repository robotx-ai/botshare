# Robot-Driven Listing + Use-Case Taxonomy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the create-service flow robot-model-driven — the chosen catalog robot defines category (use case) and price; the provider supplies only location, photos, and a SKU — and replace the 3 service categories with 6 use cases across a curated 13-model picker.

**Architecture:** Extend `RobotModel` with multi-tier prices, a `useCase String[]`, and a `listable` flag; extend `Listing` with `sku` + `skuImageSrc`. A standalone idempotent script curates the 13 listable models. The navbar/browse taxonomy switches from `serviceCategories` to a new `useCases` module. `RentModal` drops the Category + Capacity steps and adds SKU capture; `POST /api/listings` becomes server-authoritative (derives category/price from the model). Booking stays day-based.

**Tech Stack:** Next.js 13 (App + Pages Router), Prisma + Supabase Postgres, NextAuth, Cloudinary, Tailwind, react-hook-form, Zustand.

## Global Constraints

- **No test framework exists** in this repo. The verification cycle per task is `npm run lint` (the merge gate per CLAUDE.md) + `npm run build` for type/compile safety + the task's explicit runtime/DB check. Do **not** add jest/vitest.
- **Terminology (user-facing copy):** use *service* not listing, *booking* not reservation, *customer* not guest, *per day* not per night. Banned: Airbnb, host, guest, property, per night, AirCover.
- **Theme colors:** user-facing UI uses only white, gray, black Tailwind classes. No rose/coral/indigo/blue accents.
- **6 use cases (exact strings):** `Cleaning`, `Delivery`, `Performance`, `Guide`, `Live streaming`, `Patrol`.
- **Booking stays day-based this project.** `Listing.price` mirrors the model's `priceDaily`. Do not touch checkout/reservation amount math.
- **Schema guardrails:** keep route shapes (`/api/listings`, `/api/robot-models`, `/listings/[listingId]`). Do not drop existing columns. `guestCount`/`roomCount`/`bathroomCount` are legacy compat fields — default to 1, do not repurpose.
- **Access control unchanged:** `canManageServices`, provider-profile gate, `writeGuard`, admin allowlist all stay.
- **Migrations** use the existing Prisma workflow against `DIRECT_URL`.

## The 13 listable models (canonical data)

| slug | Label (`productName`) | brand | $/hr | $/day | $/mo | useCase | new? |
|---|---|---|---|---|---|---|---|
| `unitree-g1-edu` | G1 Edu | Unitree | 930 | 1500 | 700 | `["Performance"]` | create (consolidated) |
| `agibot-a2-edu` | A2 Edu | Agibot | 690 | 1000 | 3500 | `["Guide"]` | create |
| `agibot-a3` | A3 | Agibot | 950 | 1500 | 5000 | `["Performance"]` | create |
| `agibot-a2-ultra` | A2 Ultra | Agibot | 1250 | 2000 | 3000 | `["Guide"]` | update |
| `agibot-x2-ultra` | X2 Ultra | Agibot | 625 | 900 | 2000 | `["Guide"]` | update |
| `unitree-a2-standard` | Unitree A2 | Unitree | 800 | 1400 | 3000 | `["Patrol"]` | update |
| `unitree-go2-edu-u2` | Go2 Edu U2 | Unitree | 340 | 650 | 1500 | `["Performance"]` | update |
| `agibot-d1-ultra` | D1 Ultra | Agibot | 250 | 460 | 750 | `["Patrol"]` | update |
| `agibot-d1-edu` | D1 Edu | Agibot | 94 | 160 | 650 | `["Guide"]` | update |
| `agibot-c5` | C5 | Agibot | 200 | 400 | 2000 | `["Cleaning"]` | create |
| `pudu-mt1` | Pudu MT1 | Pudu | 475 | 900 | 2000 | `["Cleaning"]` | update |
| `unitree-r1-edu` | R1 Edu | Unitree | 390 | 750 | null | `["Performance","Guide"]` | create (consolidated) |
| `unitree-go2-pro` | Go2 Pro | Unitree | 95 | 160 | null | `["Performance","Patrol"]` | update |

New-row defaults (msrp null where unknown): `agibot-a3` capabilityTag `humanoid`; `agibot-c5` capabilityTag `cleaning`; `agibot-a2-edu` capabilityTag `reception`; `unitree-g1-edu` capabilityTag `humanoid`, msrp 43900; `unitree-r1-edu` capabilityTag `humanoid`, msrp 15950. For created rows, copy `imageUrl`/`description` from the matching "standard" variant when present (G1 Edu Standard, R1 Edu standard), else leave `imageUrl` null and write a one-line description. `serviceCategory` (vestigial, non-null) is set to the model's first use case to satisfy the column.

---

## Task 1: Schema — multi-tier prices, use cases, listable, SKU fields

**Files:**
- Modify: `prisma/schema.prisma` (`model RobotModel` ~143-163, `model Listing` ~69-97)
- Create: `prisma/migrations/20260625000000_robot_listing_taxonomy/migration.sql` (generated)

**Interfaces:**
- Produces: `RobotModel.priceHourly: Int?`, `RobotModel.priceDaily: Int?`, `RobotModel.priceMonthly: Int?`, `RobotModel.useCase: String[]`, `RobotModel.listable: Boolean` (default false); `Listing.sku: String?`, `Listing.skuImageSrc: String?`.

- [ ] **Step 1: Add fields to `RobotModel`**

In `prisma/schema.prisma`, inside `model RobotModel`, after the `msrp` line add:

```prisma
  priceHourly     Int? // USD per-hour rental price, null if not offered
  priceDaily      Int? // USD per-day rental price, null if not offered
  priceMonthly    Int? // USD per-month rental price, null if not offered
  useCase         String[] // zero or more of the 6 canonical use cases
  listable        Boolean  @default(false) // shows in the create-service robot picker
```

- [ ] **Step 2: Add fields to `Listing`**

In `model Listing`, after the `robotModelId` line add:

```prisma
  sku           String?        // provider's physical-unit SKU (collected, not yet verified)
  skuImageSrc   String?        // Cloudinary URL of the SKU-label photo
```

- [ ] **Step 3: Validate the schema**

Run: `npx prisma validate`
Expected: `The schema at prisma/schema.prisma is valid 🚀`

- [ ] **Step 4: Create the migration SQL**

Run:
```bash
npx prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --script > /tmp/diff.sql && cat /tmp/diff.sql
```
Expected: `ALTER TABLE` statements adding the six columns. If your environment supports it, instead run `npx prisma migrate dev --name robot_listing_taxonomy --create-only` to generate the migration folder, then inspect the SQL. The columns must be: `priceHourly`, `priceDaily`, `priceMonthly` (integer, nullable), `useCase` (text[] NOT NULL DEFAULT '{}'), `listable` (boolean NOT NULL DEFAULT false), `sku`, `skuImageSrc` (text, nullable).

- [ ] **Step 5: Apply the migration**

Run: `npx prisma migrate deploy`
Expected: migration `20260625000000_robot_listing_taxonomy` applied. Then `npx prisma generate` to refresh the client.

- [ ] **Step 6: Verify columns exist**

Run:
```bash
node -e "const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.robotModel.findFirst({select:{listable:true,useCase:true,priceDaily:true}}).then(r=>{console.log('ok',r);return p.\$disconnect()})"
```
Expected: prints `ok { listable: false, useCase: [], priceDaily: null }` (or similar) with no error.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(schema): add robot price tiers, use cases, listable flag, listing SKU fields"
```

---

## Task 2: Use-case taxonomy module + navbar swap

**Files:**
- Create: `lib/useCases.ts`
- Modify: `components/navbar/Categories.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `USE_CASES: readonly string[]` (the 6), `isUseCase(value: unknown): boolean`, `USE_CASE_META: { label: string; icon: IconType; description: string }[]`.

- [ ] **Step 1: Create the use-case module**

Create `lib/useCases.ts`:

```ts
import type { IconType } from "react-icons";
import {
  FaBroom,
  FaTruck,
  FaTheaterMasks,
  FaUserTie,
  FaVideo,
  FaShieldAlt,
} from "react-icons/fa";

export const USE_CASES = [
  "Cleaning",
  "Delivery",
  "Performance",
  "Guide",
  "Live streaming",
  "Patrol",
] as const;

export type UseCase = (typeof USE_CASES)[number];

export function isUseCase(value: unknown): value is UseCase {
  return typeof value === "string" && (USE_CASES as readonly string[]).includes(value);
}

export const USE_CASE_META: { label: UseCase; icon: IconType; description: string }[] = [
  { label: "Cleaning", icon: FaBroom, description: "Robots for recurring cleaning and facility upkeep." },
  { label: "Delivery", icon: FaTruck, description: "Robots that move goods and orders between points." },
  { label: "Performance", icon: FaTheaterMasks, description: "Robots for demos, events, and live performance." },
  { label: "Guide", icon: FaUserTie, description: "Reception, showroom, and visitor-guidance robots." },
  { label: "Live streaming", icon: FaVideo, description: "Robots for live broadcast and remote presence." },
  { label: "Patrol", icon: FaShieldAlt, description: "Robots for patrol, inspection, and outdoor coverage." },
];
```

- [ ] **Step 2: Swap the navbar Categories to use cases**

Replace the entire contents of `components/navbar/Categories.tsx` with:

```tsx
"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { USE_CASE_META } from "@/lib/useCases";
import CategoryBox from "../CategoryBox";
import Container from "../Container";

// Exported for reuse (e.g. any consumer importing `categories`).
export const categories = USE_CASE_META;

type Props = {};

function Categories({}: Props) {
  const params = useSearchParams();
  const category = params?.get("category");
  const pathname = usePathname();

  if (pathname !== "/services") {
    return null;
  }

  return (
    <Container>
      <div className="pt-3 pb-1 flex flex-row items-center justify-center gap-3 overflow-x-auto">
        {categories.map((item) => (
          <CategoryBox
            key={item.label}
            icon={item.icon}
            label={item.label}
            selected={category === item.label}
          />
        ))}
      </div>
    </Container>
  );
}

export default Categories;
```

- [ ] **Step 3: Find other importers of the old `categories` export**

Run: `grep -rn "from \"@/components/navbar/Categories\"\|navbar/Categories\"" --include=*.tsx --include=*.ts app components | grep -i categor`
Expected: a list (e.g. `RentModal.tsx` imports `{ categories }`). Note them — `RentModal` is rewritten in Task 7, so any reference there is handled later. For any *other* consumer that maps `categories` expecting `{ label, icon, description }`, the new shape is compatible (same keys).

- [ ] **Step 4: Verify lint + build**

Run: `npm run lint && npm run build`
Expected: no errors. (If `build` fails only inside `RentModal.tsx` due to the old `categories` usage, that is expected and resolved in Task 7 — confirm the failure is limited to that file; otherwise fix here.)

- [ ] **Step 5: Commit**

```bash
git add lib/useCases.ts components/navbar/Categories.tsx
git commit -m "feat(taxonomy): add 6-use-case module and switch navbar filter to it"
```

---

## Task 3: Curate the 13 listable models (data script)

**Files:**
- Create: `scripts/curate-listable-models.mjs`

**Interfaces:**
- Consumes: `RobotModel` schema from Task 1.
- Produces: exactly 13 rows with `listable=true`, each with prices + `useCase` + label; all other rows `listable=false`.

- [ ] **Step 1: Write the curation script**

Create `scripts/curate-listable-models.mjs`:

```js
/**
 * curate-listable-models.mjs — set prices, use cases, labels, and the `listable`
 * flag for the 13 robots a provider can list. Idempotent (upsert by slug).
 * Run: node scripts/curate-listable-models.mjs
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// slug, label, brand, model, hr, day, month, useCase[], capabilityTag, msrp, isNew
const MODELS = [
  ["unitree-g1-edu", "G1 Edu", "Unitree", "G1 Edu", 930, 1500, 700, ["Performance"], "humanoid", 43900, true],
  ["agibot-a2-edu", "A2 Edu", "Agibot", "A2 Edu", 690, 1000, 3500, ["Guide"], "reception", null, true],
  ["agibot-a3", "A3", "Agibot", "A3", 950, 1500, 5000, ["Performance"], "humanoid", null, true],
  ["agibot-a2-ultra", "A2 Ultra", "Agibot", "A2 Ultra", 1250, 2000, 3000, ["Guide"], "humanoid", null, false],
  ["agibot-x2-ultra", "X2 Ultra", "Agibot", "X2 Ultra", 625, 900, 2000, ["Guide"], "humanoid", null, false],
  ["unitree-a2-standard", "Unitree A2", "Unitree", "A2 Standard", 800, 1400, 3000, ["Patrol"], "quadruped", null, false],
  ["unitree-go2-edu-u2", "Go2 Edu U2", "Unitree", "Go2 EDU-U2", 340, 650, 1500, ["Performance"], "quadruped", null, false],
  ["agibot-d1-ultra", "D1 Ultra", "Agibot", "D1 Ultra", 250, 460, 750, ["Patrol"], "quadruped", null, false],
  ["agibot-d1-edu", "D1 Edu", "Agibot", "D1 EDU", 94, 160, 650, ["Guide"], "education", null, false],
  ["agibot-c5", "C5", "Agibot", "C5", 200, 400, 2000, ["Cleaning"], "cleaning", null, true],
  ["pudu-mt1", "Pudu MT1", "Pudu", "MT1", 475, 900, 2000, ["Cleaning"], "cleaning", null, false],
  ["unitree-r1-edu", "R1 Edu", "Unitree", "R1 Edu", 390, 750, null, ["Performance", "Guide"], "humanoid", 15950, true],
  ["unitree-go2-pro", "Go2 Pro", "Unitree", "Go2 Pro", 95, 160, null, ["Performance", "Patrol"], "quadruped", null, false],
];

// For consolidated rows, pull image/description from an existing "standard" variant.
const VARIANT_SOURCE = {
  "unitree-g1-edu": "G1 Edu Standard",
  "unitree-r1-edu": "R1 Edu standard",
};

async function main() {
  // 1. Reset: nothing is listable unless in the curated set.
  await prisma.robotModel.updateMany({ data: { listable: false } });

  for (const [slug, label, brand, model, hr, day, month, useCase, tag, msrp, isNew] of MODELS) {
    let imageUrl = null;
    let description = `${label} — available for ${useCase.join(" and ").toLowerCase()} deployments.`;
    if (isNew && VARIANT_SOURCE[slug]) {
      const src = await prisma.robotModel.findFirst({
        where: { productName: VARIANT_SOURCE[slug] },
        select: { imageUrl: true, description: true },
      });
      if (src) {
        imageUrl = src.imageUrl;
        if (src.description) description = src.description;
      }
    }

    const common = {
      brand,
      model,
      productName: label,
      priceHourly: hr,
      priceDaily: day,
      priceMonthly: month,
      useCase,
      listable: true,
      serviceCategory: useCase[0], // vestigial, keep non-null
      capabilityTag: tag,
    };

    await prisma.robotModel.upsert({
      where: { slug },
      update: common,
      create: {
        slug,
        ...common,
        description,
        msrp,
        ...(imageUrl ? { imageUrl } : {}),
      },
    });
    console.log(`  ✓ ${slug} (listable)`);
  }

  const count = await prisma.robotModel.count({ where: { listable: true } });
  console.log(`listable RobotModel count = ${count}`);
  if (count !== 13) throw new Error(`Expected 13 listable models, got ${count}`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
```

- [ ] **Step 2: Run the script**

Run: `node scripts/curate-listable-models.mjs`
Expected: 13 `✓ <slug> (listable)` lines and `listable RobotModel count = 13`, no error.

- [ ] **Step 3: Verify the data**

Run:
```bash
node -e "const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.robotModel.findMany({where:{listable:true},select:{productName:true,priceDaily:true,useCase:true},orderBy:{productName:'asc'}}).then(r=>{console.table(r);return p.\$disconnect()})"
```
Expected: 13 rows with the labels, daily prices, and use cases from the table above.

- [ ] **Step 4: Commit**

```bash
git add scripts/curate-listable-models.mjs
git commit -m "feat(catalog): curate 13 listable robots with tiered prices and use cases"
```

---

## Task 4: Robot picker shows only listable models with tiers

**Files:**
- Modify: `app/api/robot-models/route.ts`
- Modify: `hook/useRobotModels.ts`
- Modify: `components/inputs/RobotPicker.tsx`

**Interfaces:**
- Consumes: `RobotModel.listable`, `priceHourly/Daily/Monthly`, `useCase` from Tasks 1/3.
- Produces: `RobotModelOption` gains `priceHourly: number | null`, `priceDaily: number | null`, `priceMonthly: number | null`, `useCase: string[]`. API returns only listable rows.

- [ ] **Step 1: Filter the API to listable rows and select tiers**

In `app/api/robot-models/route.ts`, change the `findMany` call to:

```ts
  const robots = await prisma.robotModel.findMany({
    where: { listable: true },
    orderBy: [{ brand: "asc" }, { model: "asc" }],
    select: {
      id: true,
      slug: true,
      brand: true,
      model: true,
      productName: true,
      description: true,
      msrp: true,
      serviceCategory: true,
      capabilityTag: true,
      imageUrl: true,
      priceHourly: true,
      priceDaily: true,
      priceMonthly: true,
      useCase: true,
    },
  });
```

- [ ] **Step 2: Extend the option type**

In `hook/useRobotModels.ts`, add to the `RobotModelOption` type (after `imageUrl`):

```ts
  priceHourly: number | null;
  priceDaily: number | null;
  priceMonthly: number | null;
  useCase: string[];
```

- [ ] **Step 3: Switch the picker's secondary filter to use cases**

In `components/inputs/RobotPicker.tsx`:
- Replace the import `import { SERVICE_CATEGORIES } from "@/lib/serviceCategories";` with `import { USE_CASES } from "@/lib/useCases";`.
- Replace the `category` filter predicate `r.serviceCategory === category` with `r.useCase.includes(category)`.
- Replace any rendering of `SERVICE_CATEGORIES` chips with `USE_CASES`.

Concretely, the `results` memo becomes:

```tsx
  const results = useMemo(
    () =>
      robots.filter(
        (r) =>
          (!query || matches(r, query)) &&
          (!brand || r.brand === brand) &&
          (!category || r.useCase.includes(category))
      ),
    [robots, query, brand, category]
  );
```

and any `SERVICE_CATEGORIES.map(...)` chip block uses `USE_CASES.map(...)` instead.

- [ ] **Step 4: Verify lint + build**

Run: `npm run lint && npm run build`
Expected: no errors outside `RentModal.tsx` (rewritten in Task 7).

- [ ] **Step 5: Manual check**

Run `npm run dev`, sign in as a provider, open Create Service. Expected: the picker lists exactly the 13 labels (G1 Edu, A2 Edu, A3, A2 Ultra, X2 Ultra, Unitree A2, Go2 Edu U2, D1 Ultra, D1 Edu, C5, Pudu MT1, R1 Edu, Go2 Pro) and the filter chips show the 6 use cases.

- [ ] **Step 6: Commit**

```bash
git add app/api/robot-models/route.ts hook/useRobotModels.ts components/inputs/RobotPicker.tsx
git commit -m "feat(picker): restrict robot picker to listable models and filter by use case"
```

---

## Task 5: Browse/listing fetch filters by use case

**Files:**
- Modify: `app/actions/getListings.ts`

**Interfaces:**
- Consumes: `isUseCase` from Task 2; `RobotModel.useCase`, `Listing.category` (repurposed to a primary use case), `Listing.robotModelId`.
- Produces: `getListings` returns listings whose linked model has the selected use case OR whose own `category` equals it.

- [ ] **Step 1: Replace the category import + guard**

In `app/actions/getListings.ts`, replace `import { isServiceCategory } from "@/lib/serviceCategories";` with `import { isUseCase } from "@/lib/useCases";`.

Replace:
```ts
    if (category && !isServiceCategory(category)) {
      return [];
    }

    if (category) {
      query.category = category;
    }
```
with:
```ts
    if (category && !isUseCase(category)) {
      return [];
    }

    if (category) {
      query.OR = [
        { robotModel: { is: { useCase: { has: category } } } },
        { category },
      ];
    }
```

- [ ] **Step 2: Fix the default sort that referenced the old category**

Replace the `!category` sort block:
```ts
    if (!category) {
      safeListings.sort((a, b) => {
        const aIsShowcase = a.category === "Showcase & Performance" ? 0 : 1;
        const bIsShowcase = b.category === "Showcase & Performance" ? 0 : 1;
        return aIsShowcase - bIsShowcase;
      });
    }
```
with:
```ts
    if (!category) {
      safeListings.sort((a, b) => {
        const aIsPerformance = a.category === "Performance" ? 0 : 1;
        const bIsPerformance = b.category === "Performance" ? 0 : 1;
        return aIsPerformance - bIsPerformance;
      });
    }
```

- [ ] **Step 3: Verify lint + build**

Run: `npm run lint && npm run build`
Expected: no new errors (outside `RentModal.tsx`).

- [ ] **Step 4: Commit**

```bash
git add app/actions/getListings.ts
git commit -m "feat(browse): filter services by use case via model relation"
```

---

## Task 6: `POST /api/listings` becomes model-authoritative + stores SKU

**Files:**
- Modify: `app/api/listings/route.ts`

**Interfaces:**
- Consumes: `RobotModel.listable`, `priceDaily`, `useCase`; new request fields `sku`, `skuImageSrc`.
- Produces: a `Listing` whose `category` = model's first use case, `price` = model's `priceDaily`, with `sku`/`skuImageSrc` stored and counts defaulted to 1. `robotModelId` is now required.

- [ ] **Step 1: Require the robot model and derive its fields**

In `app/api/listings/route.ts`:
- Remove the `import { isServiceCategory } from "@/lib/serviceCategories";` line.
- Destructure `sku` and `skuImageSrc` from `body` (alongside the existing fields); `category`, `roomCount`, `bathroomCount`, `guestCount`, `price` from the client are no longer trusted for category/price.
- Replace the optional-robot block and the `isServiceCategory(category)` check with a required, authoritative lookup:

```ts
  if (!robotModelId) {
    return NextResponse.json(
      { error: "A robot model is required." },
      { status: 400 }
    );
  }

  const robot = await prisma.robotModel.findUnique({
    where: { id: String(robotModelId) },
    select: { id: true, listable: true, useCase: true, priceDaily: true },
  });

  if (!robot || !robot.listable) {
    return NextResponse.json(
      { error: "Selected robot model is not available for listing." },
      { status: 400 }
    );
  }

  if (robot.priceDaily == null || robot.useCase.length === 0) {
    return NextResponse.json(
      { error: "Selected robot model is missing pricing or use case." },
      { status: 400 }
    );
  }

  const derivedCategory = robot.useCase[0];
  const derivedPrice = robot.priceDaily;
```

- [ ] **Step 2: Default the legacy counts and remove the client price/capacity validation**

Replace the `parsedGuestCount/...parsedPrice` validation block with fixed defaults (the counters were removed from the flow):

```ts
  const parsedGuestCount = 1;
  const parsedRoomCount = 1;
  const parsedBathroomCount = 1;
```

(Remove the `Number.isFinite(...) || ... < 1` check entirely; price/category are now server-derived and trusted.)

- [ ] **Step 3: Write the listing with derived + SKU fields**

In the `prisma.listing.create` `data`, set `category: derivedCategory`, `price: derivedPrice`, drop `robotModelId`'s conditional spread in favor of always linking, and add the SKU fields:

```ts
  const listing = await prisma.listing.create({
    data: {
      title,
      description,
      imageSrc,
      ...(videoSrc ? { videoSrc } : {}),
      ...(sku ? { sku: String(sku) } : {}),
      ...(skuImageSrc ? { skuImageSrc: String(skuImageSrc) } : {}),
      category: derivedCategory,
      roomCount: parsedRoomCount,
      bathroomCount: parsedBathroomCount,
      guestCount: parsedGuestCount,
      locationValue: getMetroLabel(zipData.metro),
      metro: zipData.metro,
      zipCode: normalizedZip,
      lat: zipData.lat,
      lng: zipData.lng,
      price: derivedPrice,
      userId: currentUser.id,
      robotModelId: robot.id,
    },
  });
```

Keep the existing `title`/`description`/`imageSrc` required check and the zip validation untouched.

- [ ] **Step 4: Verify lint + build**

Run: `npm run lint && npm run build`
Expected: no new errors (outside `RentModal.tsx`).

- [ ] **Step 5: Commit**

```bash
git add app/api/listings/route.ts
git commit -m "feat(api): derive listing category/price from robot model and store SKU"
```

---

## Task 7: Rebuild `RentModal` — 5 steps, SKU capture, read-only price

**Files:**
- Modify: `components/models/RentModal.tsx`

**Interfaces:**
- Consumes: `RobotModelOption` (with tiers + `useCase`) from Task 4; `POST /api/listings` contract from Task 6.
- Produces: submit payload `{ robotModelId, zipCode, imageSrc, videoSrc?, skuImageSrc, sku, title, description }`.

- [ ] **Step 1: Replace the STEPS enum and remove the category import**

In `components/models/RentModal.tsx`:
- Remove `import CategoryInput from "../inputs/CategoryInput";`, `import Counter from "../inputs/Counter";`, and `import { categories } from "../navbar/Categories";`.
- Replace the `STEPS` enum with:

```ts
enum STEPS {
  ROBOT = 0,
  LOCATION = 1,
  IMAGES = 2,
  DETAILS = 3,
  PRICE = 4,
}
```

- [ ] **Step 2: Trim form defaults and watched fields**

Replace the `defaultValues` object with:

```ts
    defaultValues: {
      robotModelId: null,
      zipCode: "",
      imageSrc: "",
      videoSrc: "",
      skuImageSrc: "",
      sku: "",
      title: "",
      description: "",
    },
```

Remove the `category`, `guestCount`, `roomCount`, `bathroomCount` `watch(...)` lines and their usages. Add:

```ts
  const skuImageSrc = watch("skuImageSrc");
```

- [ ] **Step 3: Simplify `onSelectRobot` (no category prefill)**

Replace `onSelectRobot` with:

```ts
  // Picking a catalog robot pre-fills title/description/image (all still editable).
  // Category and price are derived server-side from the model, never set here.
  const onSelectRobot = (robot: RobotModelOption | null) => {
    setSelectedRobot(robot);
    setCustomValue("robotModelId", robot ? robot.id : null);
    if (robot) {
      setCustomValue("title", robot.productName);
      setCustomValue("description", robot.description ?? "");
      if (robot.imageUrl) {
        setCustomValue("imageSrc", robot.imageUrl);
      }
    }
  };
```

- [ ] **Step 4: Update step gating in `onSubmit` and labels**

In `onSubmit`, the location-step guard already uses `STEPS.LOCATION` and the final check uses `STEPS.PRICE` — both enum names are unchanged, so they still work. In the success handler, `setStep(STEPS.ROBOT)` is unchanged. Confirm `actionLabel` still keys off `STEPS.PRICE` ("Create Service") and `secondActionLabel`/`secondaryAction` off `STEPS.ROBOT`. No change needed beyond removing references to deleted steps.

- [ ] **Step 5: Replace the body content blocks**

Delete the `if (step === STEPS.CATEGORY)` and `if (step === STEPS.INFO)` blocks entirely. The IMAGES, DETAILS (was DESCRIPTION), and PRICE blocks become:

```tsx
  if (step === STEPS.IMAGES) {
    bodyContent = (
      <div className="flex flex-col gap-8">
        <Heading
          title="Add service visuals"
          subtitle="Show customers the robot, and upload a photo of its SKU label."
        />
        <ImageUpload
          onChange={(value) => setCustomValue("imageSrc", value)}
          value={imageSrc}
        />
        <hr />
        <Heading title="SKU photo" subtitle="Upload a clear photo of the robot's SKU label." />
        <ImageUpload
          onChange={(value) => setCustomValue("skuImageSrc", value)}
          value={skuImageSrc}
        />
        <VideoUpload
          onChange={(value) => setCustomValue("videoSrc", value)}
          value={videoSrc}
        />
      </div>
    );
  }

  if (step === STEPS.DETAILS) {
    bodyContent = (
      <div className="flex flex-col gap-8">
        <Heading
          title="Describe the service package"
          subtitle="Add a clear title, description, and the robot's SKU."
        />
        <Input
          id="title"
          label="Service Detail"
          disabled={isLoading}
          register={register}
          errors={errors}
          required
        />
        <hr />
        <Input
          id="description"
          label="Description"
          disabled={isLoading}
          register={register}
          errors={errors}
          required
        />
        <hr />
        <Input
          id="sku"
          label="SKU"
          disabled={isLoading}
          register={register}
          errors={errors}
          required
        />
      </div>
    );
  }

  if (step === STEPS.PRICE) {
    const tiers = [
      selectedRobot?.priceHourly != null ? `$${selectedRobot.priceHourly.toLocaleString()}/hr` : null,
      selectedRobot?.priceDaily != null ? `$${selectedRobot.priceDaily.toLocaleString()}/day` : null,
      selectedRobot?.priceMonthly != null ? `$${selectedRobot.priceMonthly.toLocaleString()}/mo` : null,
    ].filter(Boolean);

    bodyContent = (
      <div className="flex flex-col gap-8">
        <Heading
          title="Your price"
          subtitle="This price is set for the robot you selected."
        />
        <div className="rounded-xl border-2 border-neutral-200 p-6 text-center">
          <p className="text-2xl font-semibold text-black">{tiers.join("  ·  ")}</p>
          <p className="mt-2 text-sm text-neutral-500">
            Billed per day at checkout for now. Hourly and monthly options are coming soon.
          </p>
        </div>
      </div>
    );
  }
```

Note: the `if (step == STEPS.PRICE)` original used `==`; the rewrite uses `===`. The original `STEPS.DESCRIPTION` block is renamed to `STEPS.DETAILS`. Remove the old MSRP reference paragraph and the price `Input`.

- [ ] **Step 6: Verify lint + build**

Run: `npm run lint && npm run build`
Expected: clean — no errors anywhere now (this was the last file referencing removed steps/imports).

- [ ] **Step 7: Manual end-to-end check**

Run `npm run dev`, sign in as a provider with a complete profile. Create Service: pick a robot → enter a supported zip → upload a service image + SKU image → edit title/description + type a SKU → confirm the Price step shows the model's tiers read-only → submit. Expected: "Service created!" toast; the service appears in browse under its use case; in the DB the new `Listing` row has `sku`, `skuImageSrc`, `robotModelId`, `category` = the model's first use case, and `price` = the model's daily price.

- [ ] **Step 8: Commit**

```bash
git add components/models/RentModal.tsx
git commit -m "feat(rentmodal): robot-driven 5-step flow with SKU capture and read-only price"
```

---

## Task 8: Migrate existing listings onto use cases

**Files:**
- Create: `scripts/migrate-listing-use-cases.mjs`

**Interfaces:**
- Consumes: `Listing.category`, `Listing.robotModelId`, `RobotModel.useCase` from prior tasks.
- Produces: every existing listing's `category` holds a use case (not a legacy service category), so the browse filter and primary-use sort work.

Old→new mapping (confirmed default; adjust here if the user revises): `Showcase & Performance` → `Performance`, `Restaurant` → `Delivery`, `Warehouse` → `Patrol`.

- [ ] **Step 1: Write the migration script**

Create `scripts/migrate-listing-use-cases.mjs`:

```js
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
```

- [ ] **Step 2: Run the migration**

Run: `node scripts/migrate-listing-use-cases.mjs`
Expected: prints scanned/updated counts, no error.

- [ ] **Step 3: Verify no legacy categories remain**

Run:
```bash
node -e "const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.listing.groupBy({by:['category'],_count:true}).then(r=>{console.table(r);return p.\$disconnect()})"
```
Expected: every `category` value is one of the 6 use cases (no `Showcase & Performance` / `Warehouse` / `Restaurant`).

- [ ] **Step 4: Commit**

```bash
git add scripts/migrate-listing-use-cases.mjs
git commit -m "chore(data): migrate existing listing categories to use cases"
```

---

## Final verification (after all tasks)

- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] Picker shows exactly the 13 listable models with new labels.
- [ ] Creating a service through the 5-step flow persists `sku` + `skuImageSrc`, sets `category` = model's first use case and `price` = model's daily price.
- [ ] Browse filter shows the 6 use-case chips; selecting one shows matching services; a multi-use model (R1 Edu) listing appears under both Performance and Guide.
- [ ] No listing carries a legacy 3-category value.
- [ ] Booking/checkout still works day-based (unchanged).
```
