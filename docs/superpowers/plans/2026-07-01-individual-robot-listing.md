# Individual Robot Listing → Org Pickup Marketplace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let any individual (a `CUSTOMER`) list their own robot into a pool that business orgs (`PROVIDER` users) browse and claim to operate, turning it into a live customer-facing listing where the individual is told they earn 15%.

**Architecture:** Extend the existing `Listing` table with a few columns (`isIndividualOwned`, `status`, `operatorId`, `claimedAt`) rather than adding a second table — an individual's robot *is* a `Listing` from creation, flagged and held in an `AVAILABLE` pool, hidden from customers until an org claims it (`CLAIMED`). The create wizard (`RentModal`) is reused in an "individual" mode that only changes the final-step copy and the submit payload. All pure decision logic lives in a new `lib/individualListing.ts` module with vitest unit tests; API/UI wiring is verified via `npm run lint` + `npm run build`.

**Tech Stack:** Next.js 13 (App Router), Prisma 4 + Supabase Postgres, NextAuth, react-hook-form, zustand, vitest (node env), Tailwind.

## Global Constraints

- **Terminology (user-facing copy only):** use robot, service, booking, customer, service operator. Banned: Airbnb, host, guest, property, per night, AirCover. Internal variable/route names may keep legacy terms.
- **Theme:** user-facing UI uses only white, gray, black Tailwind classes. No rose/coral/indigo/blue accents.
- **Service categories:** the canonical 3 only (`Showcase & Performance`, `Warehouse`, `Restaurant`). Do not add categories. Category is derived server-side from the robot model — never set in this feature.
- **Price is never typed by a user.** It is derived from `RobotModel.priceDaily` server-side. This feature only changes the final-step *copy* for individuals.
- **`.env` points at the PRODUCTION Supabase DB — there is no dev DB.** Any Prisma/migration command runs against live prod data. Run migrations deliberately (see Task 1).
- **Do not redesign the schema or change existing route shapes.** Only additive columns and new routes.
- **`npm run lint` must pass before any merge.**
- **Vitest only discovers `lib/**/*.test.ts`** (see `vitest.config.ts`). Put unit tests there.
- **Schema role axis is `User.userType` (CUSTOMER | PROVIDER).** Do not add a third role or parallel role boolean.

---

## File Structure

**New files**
- `lib/individualListing.ts` — pure helpers: earnings copy/rate, claim-eligibility, SKU-conflict, customer-visibility predicate + Prisma `where` fragment.
- `lib/individualListing.test.ts` — vitest unit tests for the above.
- `hook/useIndividualRentModal.ts` — zustand store toggling the individual-mode create modal.
- `app/actions/getMyRobots.ts` — fetch an individual's own pool/claimed robots.
- `app/actions/getAvailableRobots.ts` — fetch the `AVAILABLE` pool for orgs.
- `app/api/listings/[listingId]/claim/route.ts` — org claims an available robot.
- `app/my-robots/page.tsx`, `app/my-robots/MyRobotsClient.tsx` — individual portal.
- `app/available-robots/page.tsx`, `app/available-robots/AvailableRobotsClient.tsx` — company portal + claim UI.

**Modified files**
- `prisma/schema.prisma` — `ListingStatus` enum + 4 columns + `operator` relation.
- `app/api/listings/route.ts` — branch create for individual intent (gate + flags + SKU check).
- `app/actions/getListings.ts` — hide `AVAILABLE` pool listings from the public catalog.
- `components/models/RentModal.tsx` — `mode` prop ("provider" | "individual").
- `app/layout.tsx` — mount `<RentModal mode="individual" />` for logged-in users.
- `components/navbar/UserMenu.tsx` — customer entries: "List your robot", "My robots".
- `middleware.ts` — gate `/available-robots` and `/my-robots`.

---

## Task 1: Schema — add listing pool columns

**Files:**
- Modify: `prisma/schema.prisma` (enums block + `Listing` model + `User` model)
- Migration: `prisma/migrations/<timestamp>_add_individual_listing/migration.sql` (generated)

**Interfaces:**
- Produces: `Listing.isIndividualOwned: Boolean`, `Listing.status: ListingStatus?`, `Listing.operatorId: String?`, `Listing.claimedAt: DateTime?`, `Listing.operator: User?`; new enum `ListingStatus { AVAILABLE, CLAIMED }`; `User.operatedListings: Listing[]`.

- [ ] **Step 1: Add the enum** — after the existing `enum OrderStatus { ... }` block in `prisma/schema.prisma`, add:

```prisma
enum ListingStatus {
  AVAILABLE
  CLAIMED
}
```

- [ ] **Step 2: Add columns + relation to `Listing`** — inside `model Listing`, add these fields alongside the existing ones (place after `skuImageSrc`):

```prisma
  isIndividualOwned Boolean        @default(false)
  status            ListingStatus?
  operatorId        String?
  claimedAt         DateTime?
  operator          User?          @relation("operatorListings", fields: [operatorId], references: [id])
```

Then add an index near the other `@@index` lines in `Listing`:

```prisma
  @@index([operatorId])
  @@index([isIndividualOwned, status])
```

- [ ] **Step 3: Add the inverse relation to `User`** — inside `model User`, next to the existing `listings Listing[]` line, add:

```prisma
  operatedListings     Listing[]      @relation("operatorListings")
```

Note: the existing `listings Listing[]` implicitly uses the default relation; because `Listing` now has two relations to `User` (owner via `userId`, operator via `operatorId`), you must name the owner relation too. Change the existing `Listing.user` line to:

```prisma
  user          User           @relation("ownerListings", fields: [userId], references: [id], onDelete: Cascade)
```

and the existing `User.listings` line to:

```prisma
  listings             Listing[]      @relation("ownerListings")
```

- [ ] **Step 4: Validate the schema (no DB write)**

Run: `npx prisma format && npx prisma validate`
Expected: `The schema at prisma/schema.prisma is valid 🚀`

- [ ] **Step 5: Generate the migration SQL WITHOUT applying it**

Run: `npx prisma migrate dev --name add_individual_listing --create-only`
Expected: a new folder `prisma/migrations/<timestamp>_add_individual_listing/` containing `migration.sql`. Open it and confirm it is **additive only** — `ALTER TABLE "Listing" ADD COLUMN`, `CREATE TYPE "ListingStatus"`, `CREATE INDEX` — with **no** `DROP` and no `NOT NULL` on a column lacking a default. `isIndividualOwned` must have `DEFAULT false`; `status`/`operatorId`/`claimedAt` are nullable. If anything else appears, stop and fix the schema.

- [ ] **Step 6: Apply the migration to the (production) DB — deliberately**

⚠️ `.env` is the live prod DB. This is additive and safe, but review Step 5's SQL first.
Run: `npx prisma migrate deploy`
Expected: `The following migration(s) have been applied` listing `add_individual_listing`.

If it fails with `relation/type already exists` (prod drift, per CLAUDE.md), recover with `npx prisma migrate resolve --applied <migration_name>` then re-run `migrate deploy`.

- [ ] **Step 7: Regenerate the client + verify columns exist (read-only)**

Run: `npx prisma generate`
Then verify: `npx prisma db execute --stdin <<'SQL'
SELECT column_name FROM information_schema.columns WHERE table_name='Listing' AND column_name IN ('isIndividualOwned','status','operatorId','claimedAt');
SQL`
Expected: the command succeeds (4 columns present).

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(schema): add individual-owned listing pool columns"
```

---

## Task 2: Pure logic — `lib/individualListing.ts` (TDD)

**Files:**
- Create: `lib/individualListing.ts`
- Test: `lib/individualListing.test.ts`

**Interfaces:**
- Produces:
  - `INDIVIDUAL_EARNINGS_PERCENT: number` (= 15)
  - `individualEarningsCopy(): string` → `"15% of the price will be given to you."`
  - `type ListingStatusValue = "AVAILABLE" | "CLAIMED"`
  - `canClaimListing(l: { isIndividualOwned: boolean; status: ListingStatusValue | null }): boolean`
  - `hasActiveSkuConflict(existing: Array<{ status: ListingStatusValue | null }>): boolean`
  - `isCustomerVisible(l: { isIndividualOwned: boolean; status: ListingStatusValue | null }): boolean`
  - `customerVisibilityWhere(): { OR: Array<Record<string, unknown>> }`

- [ ] **Step 1: Write the failing test** — create `lib/individualListing.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  INDIVIDUAL_EARNINGS_PERCENT,
  individualEarningsCopy,
  canClaimListing,
  hasActiveSkuConflict,
  isCustomerVisible,
  customerVisibilityWhere,
} from "./individualListing";

describe("earnings copy", () => {
  it("is 15 percent", () => {
    expect(INDIVIDUAL_EARNINGS_PERCENT).toBe(15);
    expect(individualEarningsCopy()).toBe("15% of the price will be given to you.");
  });
});

describe("canClaimListing", () => {
  it("allows claiming an available individual robot", () => {
    expect(canClaimListing({ isIndividualOwned: true, status: "AVAILABLE" })).toBe(true);
  });
  it("rejects an already-claimed robot", () => {
    expect(canClaimListing({ isIndividualOwned: true, status: "CLAIMED" })).toBe(false);
  });
  it("rejects a normal company listing", () => {
    expect(canClaimListing({ isIndividualOwned: false, status: null })).toBe(false);
  });
});

describe("hasActiveSkuConflict", () => {
  it("is true when an active listing exists", () => {
    expect(hasActiveSkuConflict([{ status: "AVAILABLE" }])).toBe(true);
    expect(hasActiveSkuConflict([{ status: "CLAIMED" }])).toBe(true);
  });
  it("is false when none exist", () => {
    expect(hasActiveSkuConflict([])).toBe(false);
  });
});

describe("isCustomerVisible", () => {
  it("shows company listings", () => {
    expect(isCustomerVisible({ isIndividualOwned: false, status: null })).toBe(true);
  });
  it("shows claimed individual robots", () => {
    expect(isCustomerVisible({ isIndividualOwned: true, status: "CLAIMED" })).toBe(true);
  });
  it("hides available (pool) individual robots", () => {
    expect(isCustomerVisible({ isIndividualOwned: true, status: "AVAILABLE" })).toBe(false);
  });
});

describe("customerVisibilityWhere", () => {
  it("is an OR of company listings plus claimed individual ones", () => {
    expect(customerVisibilityWhere()).toEqual({
      OR: [
        { isIndividualOwned: false },
        { isIndividualOwned: true, status: "CLAIMED" },
      ],
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/individualListing.test.ts`
Expected: FAIL — `Failed to resolve import "./individualListing"`.

- [ ] **Step 3: Write the implementation** — create `lib/individualListing.ts`:

```ts
// Pure decision logic for the individual-owned robot pool.
// No DB access here — callers pass plain objects so this stays unit-testable.

export const INDIVIDUAL_EARNINGS_PERCENT = 15;

export function individualEarningsCopy(): string {
  return `${INDIVIDUAL_EARNINGS_PERCENT}% of the price will be given to you.`;
}

export type ListingStatusValue = "AVAILABLE" | "CLAIMED";

type PoolListing = {
  isIndividualOwned: boolean;
  status: ListingStatusValue | null;
};

// A robot can be claimed only if it is an individual-owned listing still AVAILABLE.
export function canClaimListing(l: PoolListing): boolean {
  return l.isIndividualOwned === true && l.status === "AVAILABLE";
}

// Given the active individual listings already sharing a SKU, is there a conflict?
// The caller queries with status in (AVAILABLE, CLAIMED); any row means conflict.
export function hasActiveSkuConflict(
  existing: Array<{ status: ListingStatusValue | null }>
): boolean {
  return existing.some((l) => l.status === "AVAILABLE" || l.status === "CLAIMED");
}

// Customer catalog visibility: all company listings, plus CLAIMED individual ones.
export function isCustomerVisible(l: PoolListing): boolean {
  if (!l.isIndividualOwned) return true;
  return l.status === "CLAIMED";
}

// Prisma `where` fragment expressing the same rule as isCustomerVisible.
export function customerVisibilityWhere(): { OR: Array<Record<string, unknown>> } {
  return {
    OR: [
      { isIndividualOwned: false },
      { isIndividualOwned: true, status: "CLAIMED" },
    ],
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/individualListing.test.ts`
Expected: PASS (all specs green).

- [ ] **Step 5: Commit**

```bash
git add lib/individualListing.ts lib/individualListing.test.ts
git commit -m "feat: add individual-listing pool decision helpers"
```

---

## Task 3: Hide the pool from the public catalog

**Files:**
- Modify: `app/actions/getListings.ts`

**Interfaces:**
- Consumes: `customerVisibilityWhere()` from Task 2.
- Behavior: when no `userId` is passed (public catalog), only company listings and `CLAIMED` individual listings are returned; owner-scoped calls (`userId` present) are unchanged.

- [ ] **Step 1: Import the helper** — at the top of `app/actions/getListings.ts`, add:

```ts
import { customerVisibilityWhere } from "@/lib/individualListing";
```

- [ ] **Step 2: Apply visibility only to the public catalog** — find the block that sets `if (userId) { query.userId = userId; }` near the start of the function and replace it with:

```ts
    if (userId) {
      query.userId = userId;
    } else {
      // Public catalog: hide AVAILABLE individual-owned pool robots; show
      // company listings and CLAIMED (now operator-run) individual robots.
      Object.assign(query, customerVisibilityWhere());
    }
```

Note: `customerVisibilityWhere()` sets `query.OR`. The category filter also uses `query.OR`; that branch only runs when a `category` is present. When both a category and the public catalog apply, merge them: change the category block from `query.OR = [...]` to `query.AND = [...(query.AND ?? []), { OR: [...] }]` is overkill — instead, guard: if `query.OR` already exists (visibility set it), push the category OR under `query.AND`. Implement the category block as:

```ts
    if (category) {
      const categoryOr = [
        { robotModel: { is: { useCase: { has: category } } } },
        { category },
      ];
      if (query.OR) {
        query.AND = [...(query.AND ?? []), { OR: categoryOr }];
      } else {
        query.OR = categoryOr;
      }
    }
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors introduced by this file.

- [ ] **Step 4: Manual sanity check (reads prod)**

Run: `npm run dev`, open `http://localhost:3000` — the catalog still renders existing company listings (no individual robots exist yet, so the list is unchanged). Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add app/actions/getListings.ts
git commit -m "feat(catalog): hide available individual robots from public listings"
```

---

## Task 4: Fetchers — `getMyRobots` and `getAvailableRobots`

**Files:**
- Create: `app/actions/getMyRobots.ts`
- Create: `app/actions/getAvailableRobots.ts`

**Interfaces:**
- Produces:
  - `getMyRobots(userId: string): Promise<safeListing[]>` — that user's `isIndividualOwned` robots (any status), newest first, with `operatorName` set to the claiming org's name when `CLAIMED`.
  - `getAvailableRobots(): Promise<safeListing[]>` — all `isIndividualOwned` + `status: "AVAILABLE"` robots, newest first.
- Consumes `safeListing` from `@/types`.

- [ ] **Step 1: Create `getMyRobots`** — `app/actions/getMyRobots.ts`:

```ts
import prisma from "@/lib/prismadb";
import { safeListing } from "@/types";

export default async function getMyRobots(userId: string): Promise<safeListing[]> {
  const rows = await prisma.listing.findMany({
    where: { userId, isIndividualOwned: true },
    orderBy: { createdAt: "desc" },
    include: {
      operator: { select: { name: true, businessName: true } },
    },
  });

  return rows.map(({ operator, ...list }) => ({
    ...list,
    createdAt: list.createdAt.toISOString(),
    operatorName: operator?.businessName || operator?.name || undefined,
  }));
}
```

- [ ] **Step 2: Create `getAvailableRobots`** — `app/actions/getAvailableRobots.ts`:

```ts
import prisma from "@/lib/prismadb";
import { safeListing } from "@/types";

export default async function getAvailableRobots(): Promise<safeListing[]> {
  const rows = await prisma.listing.findMany({
    where: { isIndividualOwned: true, status: "AVAILABLE" },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, businessName: true } },
    },
  });

  return rows.map(({ user, ...list }) => ({
    ...list,
    createdAt: list.createdAt.toISOString(),
    operatorName: user?.name || undefined, // owner's name, for org context
  }));
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (confirms the new `status`/`isIndividualOwned`/`operator` fields exist on the Prisma types from Task 1).

- [ ] **Step 4: Commit**

```bash
git add app/actions/getMyRobots.ts app/actions/getAvailableRobots.ts
git commit -m "feat(actions): add getMyRobots and getAvailableRobots fetchers"
```

---

## Task 5: API — branch `POST /api/listings` for individual intent

**Files:**
- Modify: `app/api/listings/route.ts`

**Interfaces:**
- Consumes: `hasActiveSkuConflict` from Task 2.
- Request body gains optional `isIndividualOwned: boolean`. When true: any authenticated user may create; the provider-profile check is skipped; the row is created with `isIndividualOwned: true`, `status: "AVAILABLE"`; a `sku` is **required** and must not collide with an active individual listing (`409` on conflict).

- [ ] **Step 1: Import the SKU helper** — add to the imports at the top of `app/api/listings/route.ts`:

```ts
import { hasActiveSkuConflict } from "@/lib/individualListing";
```

- [ ] **Step 2: Read the intent flag** — in the destructure of `body`, add `isIndividualOwned` and compute the intent right after:

```ts
  const {
    title,
    description,
    imageSrc,
    videoSrc,
    sku,
    skuImageSrc,
    zipCode,
    robotModelId,
    isIndividualOwned,
  } = body;

  const individualIntent = isIndividualOwned === true;
```

- [ ] **Step 3: Branch the access gate** — replace the existing gate block:

```ts
  if (!canManageServices(currentUser)) {
    return NextResponse.json(
      { error: "Forbidden: service provider access required." },
      { status: 403 }
    );
  }

  // Anyone listing must have a complete provider profile (name, phone, company).
  if (!isProviderProfileComplete(currentUser)) {
    return NextResponse.json(
      { error: "Complete your provider profile (name, phone, company) before listing." },
      { status: 400 }
    );
  }
```

with:

```ts
  // Company listings require provider/admin + a complete provider profile.
  // Individual robot listings are open to any authenticated user.
  if (!individualIntent) {
    if (!canManageServices(currentUser)) {
      return NextResponse.json(
        { error: "Forbidden: service provider access required." },
        { status: 403 }
      );
    }
    if (!isProviderProfileComplete(currentUser)) {
      return NextResponse.json(
        { error: "Complete your provider profile (name, phone, company) before listing." },
        { status: 400 }
      );
    }
  }
```

- [ ] **Step 4: Require + de-duplicate SKU for individual listings** — after the existing robot-model validation block (right before `const derivedCategory = robot.useCase[0];`), insert:

```ts
  if (individualIntent) {
    const normalizedSku = sku ? String(sku).trim() : "";
    if (!normalizedSku) {
      return NextResponse.json(
        { error: "A SKU is required to list your robot." },
        { status: 400 }
      );
    }
    const activeSameSku = await prisma.listing.findMany({
      where: {
        sku: normalizedSku,
        isIndividualOwned: true,
        status: { in: ["AVAILABLE", "CLAIMED"] },
      },
      select: { status: true },
    });
    if (hasActiveSkuConflict(activeSameSku)) {
      return NextResponse.json(
        { error: "This robot (SKU) already has an active listing." },
        { status: 409 }
      );
    }
  }
```

- [ ] **Step 5: Persist the pool fields** — in the `prisma.listing.create({ data: { ... } })` call, add these two lines inside `data` (e.g. after `robotModelId: robot.id,`):

```ts
      isIndividualOwned: individualIntent,
      ...(individualIntent ? { status: "AVAILABLE" as const } : {}),
```

- [ ] **Step 6: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add app/api/listings/route.ts
git commit -m "feat(api): allow individuals to list robots into the pool"
```

---

## Task 6: API — claim endpoint

**Files:**
- Create: `app/api/listings/[listingId]/claim/route.ts`

**Interfaces:**
- Consumes: `canClaimListing` from Task 2; `getZipData`, `getMetroLabel` from `@/lib/zipMetro`; `canManageServices` from `@/lib/adminAuth`.
- `POST /api/listings/[listingId]/claim` with body `{ zipCode: string }`. Provider/admin only. Sets `operatorId`, `status: "CLAIMED"`, `claimedAt: now`, and overwrites `metro/zipCode/lat/lng/locationValue` with the org's location. `404` if not found, `409` if not claimable, `400` on bad zip.

- [ ] **Step 1: Write the route** — create `app/api/listings/[listingId]/claim/route.ts`:

```ts
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/lib/prismadb";
import { canManageServices } from "@/lib/adminAuth";
import { canClaimListing } from "@/lib/individualListing";
import { getMetroLabel, getZipData } from "@/lib/zipMetro";
import { getWritesBlockedResponse } from "@/lib/writeGuard";
import { NextResponse } from "next/server";

interface IParams {
  listingId?: string;
}

export async function POST(
  request: Request,
  { params }: { params: IParams }
) {
  const writesBlocked = getWritesBlockedResponse();
  if (writesBlocked) return writesBlocked;

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageServices(currentUser)) {
    return NextResponse.json(
      { error: "Forbidden: service operator access required." },
      { status: 403 }
    );
  }

  const { listingId } = params;
  if (!listingId) {
    return NextResponse.json({ error: "Invalid listing id." }, { status: 400 });
  }

  const body = await request.json();
  const normalizedZip = body?.zipCode ? String(body.zipCode).trim() : "";
  if (!/^\d{5}$/.test(normalizedZip)) {
    return NextResponse.json(
      { error: "A 5-digit operating zip code is required." },
      { status: 400 }
    );
  }
  const zipData = getZipData(normalizedZip);
  if (!zipData) {
    return NextResponse.json(
      { error: "Zip code is not in a supported service area." },
      { status: 400 }
    );
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, isIndividualOwned: true, status: true },
  });
  if (!listing) {
    return NextResponse.json({ error: "Robot not found." }, { status: 404 });
  }
  if (!canClaimListing(listing)) {
    return NextResponse.json(
      { error: "This robot is no longer available to claim." },
      { status: 409 }
    );
  }

  const updated = await prisma.listing.update({
    where: { id: listingId },
    data: {
      operatorId: currentUser.id,
      status: "CLAIMED",
      claimedAt: new Date(),
      metro: zipData.metro,
      zipCode: normalizedZip,
      lat: zipData.lat,
      lng: zipData.lng,
      locationValue: getMetroLabel(zipData.metro),
    },
  });

  return NextResponse.json(updated);
}
```

- [ ] **Step 2: Guard against a claim race** — the `canClaimListing` check reads then `update` writes; to prevent two orgs claiming simultaneously, make the update conditional. Replace the `prisma.listing.update({...})` call above with an `updateMany` that only matches an still-`AVAILABLE` row, then re-read:

```ts
  const claim = await prisma.listing.updateMany({
    where: { id: listingId, isIndividualOwned: true, status: "AVAILABLE" },
    data: {
      operatorId: currentUser.id,
      status: "CLAIMED",
      claimedAt: new Date(),
      metro: zipData.metro,
      zipCode: normalizedZip,
      lat: zipData.lat,
      lng: zipData.lng,
      locationValue: getMetroLabel(zipData.metro),
    },
  });
  if (claim.count === 0) {
    return NextResponse.json(
      { error: "This robot was just claimed by someone else." },
      { status: 409 }
    );
  }
  const updated = await prisma.listing.findUnique({ where: { id: listingId } });
```

(Keep the earlier `findUnique` + `canClaimListing` block for the fast 404/409 path; the `updateMany` is the atomic guard.)

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/listings/[listingId]/claim/route.ts
git commit -m "feat(api): add claim endpoint for individual robots"
```

---

## Task 7: Individual create wizard — `mode` on `RentModal`

**Files:**
- Create: `hook/useIndividualRentModal.ts`
- Modify: `components/models/RentModal.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: `individualEarningsCopy` from Task 2.
- Produces: `useIndividualRentModal` store (`{ isOpen, onOpen, onClose }`); `RentModal` accepts `{ mode?: "provider" | "individual" }` (default `"provider"`).

- [ ] **Step 1: Create the store** — `hook/useIndividualRentModal.ts`:

```ts
import { create } from "zustand";

interface IndividualRentModalStore {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

const useIndividualRentModal = create<IndividualRentModalStore>((set) => ({
  isOpen: false,
  onOpen: () => set({ isOpen: true }),
  onClose: () => set({ isOpen: false }),
}));

export default useIndividualRentModal;
```

- [ ] **Step 2: Accept a `mode` prop and pick the store** — in `components/models/RentModal.tsx`, replace the imports/type/store lines. Change `type Props = {};` to:

```ts
type Mode = "provider" | "individual";
type Props = { mode?: Mode };
```

Add the import near the other hook imports:

```ts
import useIndividualRentModal from "@/hook/useIndividualRentModal";
import { individualEarningsCopy } from "@/lib/individualListing";
```

Change the function signature and store selection:

```ts
function RentModal({ mode = "provider" }: Props) {
  const isIndividual = mode === "individual";
  const defaultCenter = getMetroCentroid("LA");
  const router = useRouter();
  const providerModal = useRentModal();
  const individualModal = useIndividualRentModal();
  const rentModel = isIndividual ? individualModal : providerModal;
```

(Leave every existing `rentModel.onClose()` / `rentModel.isOpen` reference as-is — they now resolve to the mode's store.)

- [ ] **Step 3: Swap the PRICE-step copy for individual mode** — in the `if (step === STEPS.PRICE)` block, replace the inner `<div className="rounded-xl ...">...</div>` with:

```tsx
        <div className="rounded-xl border-2 border-neutral-200 p-6 text-center">
          <p className="text-2xl font-semibold text-black">{tiers.join("  ·  ")}</p>
          {isIndividual ? (
            <p className="mt-2 text-sm text-neutral-700 font-medium">
              {individualEarningsCopy()}
            </p>
          ) : (
            <p className="mt-2 text-sm text-neutral-500">
              Billed per day at checkout for now. Hourly and monthly options are coming soon.
            </p>
          )}
        </div>
```

Also change the PRICE-step `<Heading ... />` subtitle for individuals — replace the price-step `Heading` with:

```tsx
        <Heading
          title={isIndividual ? "Your earnings" : "Your price"}
          subtitle={
            isIndividual
              ? "An operator will run this robot. Here's your share of the price."
              : "This price is set for the robot you selected."
          }
        />
```

- [ ] **Step 4: Send the intent flag + mode-specific success copy** — in `onSubmit`, replace the `axios.post("/api/listings", data)` chain's first two lines with:

```ts
    axios
      .post("/api/listings", { ...data, isIndividualOwned: isIndividual })
      .then(() => {
        toast.success(isIndividual ? "Robot listed — an operator can now pick it up." : "Service created!");
```

And on error, surface the server message so the SKU-conflict `409` is visible:

```ts
      .catch((error) => {
        toast.error(error?.response?.data?.error ?? "Something went wrong");
      })
```

- [ ] **Step 5: Set the modal title by mode** — in the returned `<Modal ... title="Create a service" ... />`, change to:

```tsx
      title={isIndividual ? "List your robot" : "Create a service"}
```

- [ ] **Step 6: Mount the individual modal for logged-in users** — in `app/layout.tsx`, change the mounts block:

```tsx
          {isAdmin && <RentModal />}
          {currentUser && <RentModal mode="individual" />}
```

- [ ] **Step 7: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add hook/useIndividualRentModal.ts components/models/RentModal.tsx app/layout.tsx
git commit -m "feat(wizard): individual mode for the robot-listing modal"
```

---

## Task 8: Individual portal — `/my-robots`

**Files:**
- Create: `app/my-robots/page.tsx`
- Create: `app/my-robots/MyRobotsClient.tsx`
- Modify: `components/navbar/UserMenu.tsx`
- Modify: `middleware.ts`

**Interfaces:**
- Consumes: `getMyRobots` (Task 4), `useIndividualRentModal` (Task 7), `ListingCard`, `Container`, `Heading`, `individualEarningsCopy`.

- [ ] **Step 1: Create the client** — `app/my-robots/MyRobotsClient.tsx`:

```tsx
"use client";

import Container from "@/components/Container";
import Heading from "@/components/Heading";
import ListingCard from "@/components/listing/ListingCard";
import useIndividualRentModal from "@/hook/useIndividualRentModal";
import { individualEarningsCopy } from "@/lib/individualListing";
import { SafeUser, safeListing } from "@/types";

type Props = {
  robots: safeListing[];
  currentUser?: SafeUser | null;
};

function statusLabel(robot: safeListing): string {
  if (robot.status === "CLAIMED") {
    return robot.operatorName ? `Live · operated by ${robot.operatorName}` : "Live";
  }
  return "Available — waiting for an operator";
}

function MyRobotsClient({ robots, currentUser }: Props) {
  const individualModal = useIndividualRentModal();

  return (
    <Container>
      <div className="flex flex-col gap-2">
        <Heading title="My robots" subtitle={individualEarningsCopy()} />
        <button
          onClick={individualModal.onOpen}
          className="self-start rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
        >
          List a robot
        </button>
      </div>
      <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5">
        {robots.map((robot) => (
          <div key={robot.id} className="flex flex-col gap-2">
            <ListingCard data={robot} currentUser={currentUser} />
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-center text-xs font-medium text-neutral-800">
              {statusLabel(robot)}
            </span>
          </div>
        ))}
      </div>
    </Container>
  );
}

export default MyRobotsClient;
```

- [ ] **Step 2: Create the page** — `app/my-robots/page.tsx`:

```tsx
import ClientOnly from "@/components/ClientOnly";
import EmptyState from "@/components/EmptyState";
import getCurrentUser from "../actions/getCurrentUser";
import getMyRobots from "../actions/getMyRobots";
import MyRobotsClient from "./MyRobotsClient";

const MyRobotsPage = async () => {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <ClientOnly>
        <EmptyState title="Unauthorized" subtitle="Please login" />
      </ClientOnly>
    );
  }

  const robots = await getMyRobots(currentUser.id);

  if (robots.length === 0) {
    return (
      <ClientOnly>
        <EmptyState
          title="No robots listed yet"
          subtitle="List your robot and an operator can pick it up for you."
        />
      </ClientOnly>
    );
  }

  return (
    <ClientOnly>
      <MyRobotsClient robots={robots} currentUser={currentUser} />
    </ClientOnly>
  );
};

export default MyRobotsPage;
```

- [ ] **Step 3: Add customer menu entries** — in `components/navbar/UserMenu.tsx`, import the store near the other hook imports:

```ts
import useIndividualRentModal from "@/hook/useIndividualRentModal";
```

and inside the component, next to the other store hooks:

```ts
  const individualModal = useIndividualRentModal();
```

Then, in the `isCustomer` menu branch, add two items just above the `<hr />` that precedes Logout:

```tsx
                    <MenuItem
                      onClick={() => { setIsOpen(false); router.push("/my-robots"); }}
                      label="My robots"
                    />
                    <MenuItem
                      onClick={() => {
                        if (!currentUser) { setIsOpen(false); return loginModel.onOpen(); }
                        setIsOpen(false);
                        individualModal.onOpen();
                      }}
                      label="List your robot"
                    />
```

- [ ] **Step 4: Gate the route in middleware** — in `middleware.ts`, add `/my-robots` to the `matcher` array:

```ts
  matcher: ["/trips", "/reservations", "/my-listings", "/favorites", "/admin/orders", "/orders/:path*", "/profile", "/my-robots", "/available-robots"],
```

(`/available-robots` is added here now; its page-level provider gate comes in Task 9.)

- [ ] **Step 5: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/my-robots components/navbar/UserMenu.tsx middleware.ts
git commit -m "feat(portal): add individual /my-robots page and menu entries"
```

---

## Task 9: Company portal — `/available-robots` + claim UI

**Files:**
- Create: `app/available-robots/page.tsx`
- Create: `app/available-robots/AvailableRobotsClient.tsx`

**Interfaces:**
- Consumes: `getAvailableRobots` (Task 4), `canManageServices`, `ListingCard`, `Container`, `Heading`, the claim endpoint (Task 6).

- [ ] **Step 1: Create the client with claim action** — `app/available-robots/AvailableRobotsClient.tsx`:

```tsx
"use client";

import Container from "@/components/Container";
import Heading from "@/components/Heading";
import ListingCard from "@/components/listing/ListingCard";
import { SafeUser, safeListing } from "@/types";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "react-toastify";

type Props = {
  robots: safeListing[];
  currentUser?: SafeUser | null;
};

function AvailableRobotsClient({ robots, currentUser }: Props) {
  const router = useRouter();
  const [claimingId, setClaimingId] = useState("");

  const onClaim = useCallback(
    (id: string) => {
      const zipCode = window.prompt("Enter the 5-digit zip code where you'll operate this robot:");
      if (!zipCode) return;
      setClaimingId(id);
      axios
        .post(`/api/listings/${id}/claim`, { zipCode })
        .then(() => {
          toast.success("Robot claimed — it's now live for customers.");
          router.refresh();
        })
        .catch((error) => {
          toast.error(error?.response?.data?.error ?? "Could not claim this robot.");
        })
        .finally(() => setClaimingId(""));
    },
    [router]
  );

  return (
    <Container>
      <Heading
        title="Available robots"
        subtitle="Robots listed by individuals. Claim one to operate it for nearby customers."
      />
      <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5">
        {robots.map((robot) => (
          <ListingCard
            key={robot.id}
            data={robot}
            actionId={robot.id}
            onAction={onClaim}
            disabled={claimingId === robot.id}
            actionLabel="List this robot"
            currentUser={currentUser}
          />
        ))}
      </div>
    </Container>
  );
}

export default AvailableRobotsClient;
```

- [ ] **Step 2: Create the page (provider/admin gate)** — `app/available-robots/page.tsx`:

```tsx
import ClientOnly from "@/components/ClientOnly";
import EmptyState from "@/components/EmptyState";
import { canManageServices } from "@/lib/adminAuth";
import getCurrentUser from "../actions/getCurrentUser";
import getAvailableRobots from "../actions/getAvailableRobots";
import AvailableRobotsClient from "./AvailableRobotsClient";

const AvailableRobotsPage = async () => {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <ClientOnly>
        <EmptyState title="Unauthorized" subtitle="Please login" />
      </ClientOnly>
    );
  }

  if (!canManageServices(currentUser)) {
    return (
      <ClientOnly>
        <EmptyState
          title="Access required"
          subtitle="Only service operators and admins can claim robots."
        />
      </ClientOnly>
    );
  }

  const robots = await getAvailableRobots();

  if (robots.length === 0) {
    return (
      <ClientOnly>
        <EmptyState
          title="No robots available"
          subtitle="No individuals have listed a robot for pickup yet."
        />
      </ClientOnly>
    );
  }

  return (
    <ClientOnly>
      <AvailableRobotsClient robots={robots} currentUser={currentUser} />
    </ClientOnly>
  );
};

export default AvailableRobotsPage;
```

- [ ] **Step 3: Add the provider/admin menu entry** — in `components/navbar/UserMenu.tsx`, inside the non-customer branch (the `<>...</>` after the `isCustomer ?` ternary), add above the "Browse robot types" item:

```tsx
                    {(isAdmin || isProvider) && (
                      <MenuItem
                        onClick={() => { setIsOpen(false); router.push("/available-robots"); }}
                        label="Available robots"
                      />
                    )}
```

- [ ] **Step 4: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 5: Full build**

Run: `npm run build`
Expected: build completes; `/my-robots` and `/available-robots` appear in the route list.

- [ ] **Step 6: Commit**

```bash
git add app/available-robots components/navbar/UserMenu.tsx
git commit -m "feat(portal): add company /available-robots page with claim flow"
```

---

## Task 10: End-to-end manual verification (reads/writes prod — clean up after)

**Files:** none (manual).

⚠️ `.env` = prod DB. Use a throwaway SKU and delete the row when done.

- [ ] **Step 1: List as an individual** — `npm run dev`, log in as a `CUSTOMER`, open the menu → "List your robot". Complete the wizard (pick a catalog robot, enter a valid zip, upload images, enter a unique SKU like `TEST-INDIV-0001`). Confirm the final step reads "15% of the price will be given to you." Submit → success toast.

- [ ] **Step 2: Confirm it's pooled, not public** — visit the home catalog: the new robot must NOT appear. Visit `/my-robots`: it appears with status "Available — waiting for an operator."

- [ ] **Step 3: Duplicate-SKU guard** — try listing again with the same SKU `TEST-INDIV-0001`. Expect an error toast: "This robot (SKU) already has an active listing."

- [ ] **Step 4: Claim as an org** — log in as a `PROVIDER` (or admin), open menu → "Available robots". The robot appears. Click "List this robot", enter a valid operating zip. Expect success; the card disappears from the pool.

- [ ] **Step 5: Confirm it went live** — the robot now appears in the public catalog at the org's location. `/my-robots` (as the individual) shows status "Live · operated by <org>".

- [ ] **Step 6: Clean up** — delete the test listing (via `/my-listings` as admin, or `DELETE /api/listings/<id>`), and remove any uploaded test image from Supabase if applicable.

- [ ] **Step 7: Run the full test + lint gate**

Run: `npm run test && npm run lint`
Expected: all vitest specs pass; lint clean.

---

## Self-Review Notes (author)

- **Spec coverage:** roles/no-new-role (Tasks 5,7,8); extend-Listing data model (Task 1); owner-stays-`userId` + `operatorId` (Tasks 1,6); price-copy-only change (Task 7); state machine `AVAILABLE→CLAIMED` (Tasks 5,6); SKU one-active-per-robot (Tasks 2,5); location overwrite on claim (Task 6); pool hidden from customers (Tasks 2,3); individual portal `/my-robots` (Task 8); company portal `/available-robots` (Task 9); 15% display-only (Tasks 2,7,8 — no payout records). Out-of-scope items (payouts, unclaim, auto-relist, manual go-live) are intentionally absent.
- **Type consistency:** `isIndividualOwned`/`status`/`operatorId`/`claimedAt`/`operator` defined in Task 1 and used identically in Tasks 3–9; `individualEarningsCopy`/`canClaimListing`/`hasActiveSkuConflict`/`customerVisibilityWhere` defined in Task 2 and imported unchanged; `getMyRobots(userId)` / `getAvailableRobots()` signatures match their consumers.
- **Known MVP trade-off:** `getListings` zip-proximity raw SQL selects candidate ids before the visibility `where` is applied in `findMany`; pool listings are still filtered out by `findMany`, but the `DISTINCT ON (title)` candidate pick ignores visibility. Acceptable for MVP (documented here).
