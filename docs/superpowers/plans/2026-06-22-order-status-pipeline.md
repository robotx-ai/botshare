# Order Status Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a strictly-forward 7-step order-status lifecycle (plus cancel) to BotShare bookings, with role-gated transitions and a dedicated `/orders/[reservationId]` stepper page.

**Architecture:** Approach A — a single `status` enum column on `Reservation` holds the current state; an append-only `ReservationEvent` table records each transition (actor + timestamp). A pure, unit-tested guard module (`lib/orderStatus.ts`) is the single source of truth for legal transitions; a thin `PATCH` route enforces it server-side. The detail page renders a vertical stepper from the event timeline.

**Tech Stack:** Next.js 13 (App Router), Prisma + Supabase Postgres, NextAuth, Vitest (newly added) for unit tests, Tailwind (white/gray/black only), axios + react-toastify on the client.

**Spec:** `docs/superpowers/specs/2026-06-22-order-status-pipeline-design.md`

**Conventions for every task:**
- Migrations are hand-authored SQL applied out-of-band; never run `prisma migrate dev`. Use `npx prisma generate` after schema edits to refresh the client.
- Verification gate per task that touches app code: `npm run lint` and `npx tsc --noEmit` must pass. Final task also runs `npm run build`.
- User-facing copy follows BotShare terminology (booking/customer/operator — never host/guest/property/per-night).
- Theme colors: white, gray, black only.
- Commit after each task with the shown message.

---

## File Structure

**Create:**
- `lib/orderStatus.ts` — pure transition module (statuses, steps, labels, transition table, `resolveOrderRole`, `canTransition`, `nextHappyStatus`, `isOrderStatus`). No Prisma/React imports.
- `lib/orderStatus.test.ts` — Vitest unit tests (full transition matrix).
- `vitest.config.ts` — Vitest config (node environment).
- `prisma/migrations/20260622000000_order_status_pipeline/migration.sql` — hand-authored SQL.
- `app/api/reservations/[reservationId]/status/route.ts` — `PATCH` transition endpoint.
- `app/actions/getOrderById.ts` — access-gated loader returning reservation + listing + ordered events, safe-serialized.
- `app/orders/[reservationId]/page.tsx` — protected server component.
- `app/orders/[reservationId]/OrderStatusClient.tsx` — client stepper + action buttons.
- `components/orders/OrderStepper.tsx` — presentational vertical stepper.
- `components/orders/StatusBadge.tsx` — small status pill, reused in cards + admin.

**Modify:**
- `package.json` — add `vitest` devDependency + `test` script.
- `prisma/schema.prisma` — add `OrderStatus` enum, `Reservation.status`, `ReservationEvent` model.
- `types.ts` — add `OrderStatus` to imports, `status` to `SafeReservation`, new `SafeReservationEvent` + `SafeOrderDetail` types.
- `app/checkout/success/page.tsx` — write a seed `PLACED` event when a reservation is created.
- `app/api/reservations/[reservationId]/route.ts` — tighten `DELETE` to admin-only (true removal).
- `middleware.ts` — add `/orders/:path*` to the protected matcher.
- `components/listing/ListingCard.tsx` — show a `StatusBadge` + "View order status" link when a reservation is present.
- `app/trips/TripsClient.tsx` — drop inline cancel; rely on order detail page.
- `app/reservations/ReservationsClient.tsx` — drop inline cancel; rely on order detail page.
- `app/admin/orders/OrdersTable.tsx` — add Status column; switch cancel to soft `PATCH` → `CANCELLED`.

---

## Task 1: Add Vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Install Vitest**

Run: `npm install -D vitest@^2`
Expected: adds `vitest` to `devDependencies`, exits 0.

- [ ] **Step 2: Add the `test` script**

In `package.json`, add to `"scripts"` (keep existing entries):

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Verify the runner starts (no tests yet is fine)**

Run: `npx vitest run`
Expected: exits cleanly with "No test files found" or runs 0 files. Not an error.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add vitest for unit tests"
```

---

## Task 2: Pure transition guard module (TDD)

This module is the single source of truth. The status string-union is defined here (NOT imported from `@prisma/client`) so the tests need no Prisma generation; the Prisma enum in Task 3 must list the exact same names.

**Files:**
- Create: `lib/orderStatus.ts`
- Test: `lib/orderStatus.test.ts`

- [ ] **Step 1: Write the failing tests**

`lib/orderStatus.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  ORDER_STATUSES,
  ORDER_STEPS,
  isOrderStatus,
  nextHappyStatus,
  resolveOrderRole,
  canTransition,
  type OrderStatus,
} from "./orderStatus";

describe("isOrderStatus", () => {
  it("accepts known statuses", () => {
    expect(isOrderStatus("PLACED")).toBe(true);
    expect(isOrderStatus("COMPLETED")).toBe(true);
  });
  it("rejects unknown values", () => {
    expect(isOrderStatus("BOGUS")).toBe(false);
    expect(isOrderStatus("")).toBe(false);
  });
});

describe("ORDER_STEPS", () => {
  it("is the 7 happy-path states in order, excluding CANCELLED", () => {
    expect(ORDER_STEPS).toEqual([
      "PLACED",
      "CONFIRMED",
      "SHIPPED",
      "DELIVERED",
      "RETURN_INITIATED",
      "RETURN_RECEIVED",
      "COMPLETED",
    ]);
    expect(ORDER_STATUSES).toContain("CANCELLED");
  });
});

describe("nextHappyStatus", () => {
  it("returns the next step", () => {
    expect(nextHappyStatus("PLACED")).toBe("CONFIRMED");
    expect(nextHappyStatus("RETURN_RECEIVED")).toBe("COMPLETED");
  });
  it("returns null at terminal/last states", () => {
    expect(nextHappyStatus("COMPLETED")).toBeNull();
    expect(nextHappyStatus("CANCELLED")).toBeNull();
  });
});

describe("resolveOrderRole", () => {
  const base = { currentUserId: "u1", customerId: "cust", providerId: "prov", isAdmin: false };
  it("returns admin when isAdmin, regardless of ids", () => {
    expect(resolveOrderRole({ ...base, isAdmin: true })).toBe("admin");
  });
  it("returns customer when current user booked", () => {
    expect(resolveOrderRole({ ...base, currentUserId: "cust" })).toBe("customer");
  });
  it("returns provider when current user owns the listing", () => {
    expect(resolveOrderRole({ ...base, currentUserId: "prov" })).toBe("provider");
  });
  it("returns null for an unrelated user", () => {
    expect(resolveOrderRole(base)).toBeNull();
  });
});

describe("canTransition — happy path", () => {
  const legal: Array<[OrderStatus, OrderStatus, "provider" | "customer"]> = [
    ["PLACED", "CONFIRMED", "provider"],
    ["CONFIRMED", "SHIPPED", "provider"],
    ["SHIPPED", "DELIVERED", "customer"],
    ["DELIVERED", "RETURN_INITIATED", "customer"],
    ["RETURN_INITIATED", "RETURN_RECEIVED", "provider"],
    ["RETURN_RECEIVED", "COMPLETED", "provider"],
  ];
  it.each(legal)("%s -> %s allowed for %s and for admin", (from, to, role) => {
    expect(canTransition(from, to, role)).toBe(true);
    expect(canTransition(from, to, "admin")).toBe(true);
  });
  it("denies the wrong role", () => {
    expect(canTransition("PLACED", "CONFIRMED", "customer")).toBe(false);
    expect(canTransition("SHIPPED", "DELIVERED", "provider")).toBe(false);
  });
});

describe("canTransition — illegal shapes", () => {
  it("denies skips and rewinds", () => {
    expect(canTransition("PLACED", "SHIPPED", "admin")).toBe(false);
    expect(canTransition("CONFIRMED", "PLACED", "admin")).toBe(false);
    expect(canTransition("DELIVERED", "CONFIRMED", "admin")).toBe(false);
  });
  it("denies any transition out of terminal states", () => {
    expect(canTransition("COMPLETED", "CANCELLED", "admin")).toBe(false);
    expect(canTransition("CANCELLED", "PLACED", "admin")).toBe(false);
  });
});

describe("canTransition — cancel rules", () => {
  it("customer/provider may cancel only pre-ship (PLACED, CONFIRMED)", () => {
    expect(canTransition("PLACED", "CANCELLED", "customer")).toBe(true);
    expect(canTransition("CONFIRMED", "CANCELLED", "provider")).toBe(true);
    expect(canTransition("SHIPPED", "CANCELLED", "customer")).toBe(false);
    expect(canTransition("DELIVERED", "CANCELLED", "provider")).toBe(false);
  });
  it("admin may cancel from any non-terminal state", () => {
    expect(canTransition("SHIPPED", "CANCELLED", "admin")).toBe(true);
    expect(canTransition("RETURN_RECEIVED", "CANCELLED", "admin")).toBe(true);
    expect(canTransition("COMPLETED", "CANCELLED", "admin")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/orderStatus.test.ts`
Expected: FAIL — `Failed to resolve import "./orderStatus"` (module not created yet).

- [ ] **Step 3: Write the implementation**

`lib/orderStatus.ts`:

```ts
// Single source of truth for the order lifecycle. The status names below MUST
// stay identical to the Prisma `OrderStatus` enum in prisma/schema.prisma.

export const ORDER_STATUSES = [
  "PLACED",
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
  "RETURN_INITIATED",
  "RETURN_RECEIVED",
  "COMPLETED",
  "CANCELLED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

// The 7 happy-path steps in order (CANCELLED is a side-exit, not a step).
export const ORDER_STEPS: OrderStatus[] = [
  "PLACED",
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
  "RETURN_INITIATED",
  "RETURN_RECEIVED",
  "COMPLETED",
];

export const TERMINAL_STATUSES: OrderStatus[] = ["COMPLETED", "CANCELLED"];

// Customer-facing labels (BotShare terminology).
export const STATUS_LABELS: Record<OrderStatus, string> = {
  PLACED: "Order placed",
  CONFIRMED: "Confirmed by operator",
  SHIPPED: "On the way to you",
  DELIVERED: "Delivered — you have it",
  RETURN_INITIATED: "Return shipped back",
  RETURN_RECEIVED: "Return received — verifying",
  COMPLETED: "Completed & settled",
  CANCELLED: "Cancelled",
};

export type OrderRole = "customer" | "provider" | "admin";

type TransitionRule = {
  from: OrderStatus;
  to: OrderStatus;
  roles: OrderRole[];
};

// The complete, explicit transition table. Anything not listed is illegal.
export const TRANSITIONS: TransitionRule[] = [
  { from: "PLACED", to: "CONFIRMED", roles: ["provider", "admin"] },
  { from: "CONFIRMED", to: "SHIPPED", roles: ["provider", "admin"] },
  { from: "SHIPPED", to: "DELIVERED", roles: ["customer", "admin"] },
  { from: "DELIVERED", to: "RETURN_INITIATED", roles: ["customer", "admin"] },
  { from: "RETURN_INITIATED", to: "RETURN_RECEIVED", roles: ["provider", "admin"] },
  { from: "RETURN_RECEIVED", to: "COMPLETED", roles: ["provider", "admin"] },
  // Cancel: customer/provider only before the robot ships; admin while non-terminal.
  { from: "PLACED", to: "CANCELLED", roles: ["customer", "provider", "admin"] },
  { from: "CONFIRMED", to: "CANCELLED", roles: ["customer", "provider", "admin"] },
  { from: "SHIPPED", to: "CANCELLED", roles: ["admin"] },
  { from: "DELIVERED", to: "CANCELLED", roles: ["admin"] },
  { from: "RETURN_INITIATED", to: "CANCELLED", roles: ["admin"] },
  { from: "RETURN_RECEIVED", to: "CANCELLED", roles: ["admin"] },
];

export function isOrderStatus(value: unknown): value is OrderStatus {
  return (
    typeof value === "string" &&
    (ORDER_STATUSES as readonly string[]).includes(value)
  );
}

export function nextHappyStatus(from: OrderStatus): OrderStatus | null {
  const idx = ORDER_STEPS.indexOf(from);
  if (idx === -1 || idx === ORDER_STEPS.length - 1) return null;
  return ORDER_STEPS[idx + 1];
}

export function resolveOrderRole(input: {
  currentUserId: string;
  customerId: string;
  providerId: string;
  isAdmin: boolean;
}): OrderRole | null {
  if (input.isAdmin) return "admin";
  if (input.currentUserId === input.customerId) return "customer";
  if (input.currentUserId === input.providerId) return "provider";
  return null;
}

export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
  role: OrderRole
): boolean {
  const rule = TRANSITIONS.find((t) => t.from === from && t.to === to);
  return !!rule && rule.roles.includes(role);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/orderStatus.test.ts`
Expected: PASS — all suites green.

- [ ] **Step 5: Commit**

```bash
git add lib/orderStatus.ts lib/orderStatus.test.ts
git commit -m "feat: order status transition guard module with tests"
```

---

## Task 3: Schema + migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260622000000_order_status_pipeline/migration.sql`

- [ ] **Step 1: Add the enum and fields to `prisma/schema.prisma`**

Add the enum near the other enums (after `enum Metro { ... }`):

```prisma
enum OrderStatus {
  PLACED
  CONFIRMED
  SHIPPED
  DELIVERED
  RETURN_INITIATED
  RETURN_RECEIVED
  COMPLETED
  CANCELLED
}
```

In `model Reservation`, add these two lines (keep all existing fields and indexes):

```prisma
  status          OrderStatus       @default(PLACED)
  events          ReservationEvent[]
```

Add the new model after `model Reservation { ... }`:

```prisma
model ReservationEvent {
  id            String      @id @default(cuid())
  reservationId String
  status        OrderStatus
  actorId       String
  note          String?
  createdAt     DateTime    @default(now())
  reservation   Reservation @relation(fields: [reservationId], references: [id], onDelete: Cascade)

  @@index([reservationId])
}
```

- [ ] **Step 2: Write the migration SQL**

`prisma/migrations/20260622000000_order_status_pipeline/migration.sql`:

```sql
-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PLACED', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'RETURN_INITIATED', 'RETURN_RECEIVED', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN "status" "OrderStatus" NOT NULL DEFAULT 'PLACED';

-- CreateTable
CREATE TABLE "ReservationEvent" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "actorId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReservationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReservationEvent_reservationId_idx" ON "ReservationEvent"("reservationId");

-- AddForeignKey
ALTER TABLE "ReservationEvent" ADD CONSTRAINT "ReservationEvent_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill one seed PLACED event per existing reservation so every order has a timeline.
INSERT INTO "ReservationEvent" ("id", "reservationId", "status", "actorId", "createdAt")
SELECT 'seed_' || r."id", r."id", 'PLACED', r."userId", r."createdAt"
FROM "Reservation" r
WHERE NOT EXISTS (
  SELECT 1 FROM "ReservationEvent" e WHERE e."reservationId" = r."id"
);
```

- [ ] **Step 3: Regenerate the Prisma client and type-check**

Run: `npx prisma generate && npx tsc --noEmit`
Expected: client regenerates; `tsc` passes (no consumers of the new fields yet).

- [ ] **Step 4: Apply the migration to the database**

Apply the SQL via the project's Supabase connection (psql `$DIRECT_URL` or the Supabase SQL editor). Confirm: `SELECT COUNT(*) FROM "ReservationEvent";` returns one row per existing reservation, and `SELECT DISTINCT status FROM "Reservation";` returns `PLACED`.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260622000000_order_status_pipeline/migration.sql
git commit -m "feat: add OrderStatus enum, Reservation.status, ReservationEvent"
```

---

## Task 4: Safe types

**Files:**
- Modify: `types.ts`

- [ ] **Step 1: Update `types.ts`**

Change the import line and add the new types. The full updated file:

```ts
import { Listing, Reservation, User, ReservationEvent } from "@prisma/client";
import { OrderStatus } from "@/lib/orderStatus";

export type safeListing = Omit<Listing, "createdAt"> & {
  createdAt: string;
  operatorName?: string;
};

export type SafeReservation = Omit<
  Reservation,
  "createdAt" | "startDate" | "endDate" | "listing" | "status"
> & {
  createdAt: string;
  startDate: string;
  endDate: string;
  status: OrderStatus;
  listing: safeListing;
};

export type SafeAdminReservation = SafeReservation & {
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  customerBusinessName: string | null;
};

export type SafeReservationEvent = Omit<ReservationEvent, "createdAt" | "status"> & {
  createdAt: string;
  status: OrderStatus;
  actorName: string | null;
};

export type SafeOrderDetail = SafeReservation & {
  providerId: string;
  events: SafeReservationEvent[];
};

export type SafeUser = Omit<
  User,
  "createdAt" | "updatedAt" | "emailVerified"
> & {
  createdAt: string;
  updatedAt: string;
  emailVerified: string | null;
  favoriteListingIds: string[];
};
```

(We `Omit` the Prisma-generated `status` and re-add it as our own `OrderStatus` union so consumers get the structural string-union type, avoiding nominal enum friction.)

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add types.ts
git commit -m "feat: add status + order-detail safe types"
```

---

## Task 5: PATCH transition endpoint

**Files:**
- Create: `app/api/reservations/[reservationId]/status/route.ts`

- [ ] **Step 1: Write the route**

```ts
import getCurrentUser from "@/app/actions/getCurrentUser";
import { isAdminEmail } from "@/lib/adminAuth";
import prisma from "@/lib/prismadb";
import { getWritesBlockedResponse } from "@/lib/writeGuard";
import {
  canTransition,
  isOrderStatus,
  resolveOrderRole,
  type OrderStatus,
} from "@/lib/orderStatus";
import { NextResponse } from "next/server";

interface IParams {
  reservationId?: string;
}

export async function PATCH(
  request: Request,
  { params }: { params: IParams }
) {
  const writesBlocked = getWritesBlockedResponse();
  if (writesBlocked) return writesBlocked;

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { reservationId } = params;
  if (!reservationId || typeof reservationId !== "string") {
    return NextResponse.json({ error: "Invalid booking id." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const targetStatus = body?.status;
  const note = typeof body?.note === "string" ? body.note : null;

  if (!isOrderStatus(targetStatus)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { listing: { select: { userId: true } } },
  });

  if (!reservation) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  const role = resolveOrderRole({
    currentUserId: currentUser.id,
    customerId: reservation.userId,
    providerId: reservation.listing.userId,
    isAdmin: isAdminEmail(currentUser.email),
  });

  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const currentStatus = reservation.status as OrderStatus;

  if (!canTransition(currentStatus, targetStatus, role)) {
    return NextResponse.json(
      { error: `Cannot move from ${currentStatus} to ${targetStatus}.` },
      { status: 409 }
    );
  }

  const [updated] = await prisma.$transaction([
    prisma.reservation.update({
      where: { id: reservationId },
      data: { status: targetStatus },
    }),
    prisma.reservationEvent.create({
      data: {
        reservationId,
        status: targetStatus,
        actorId: currentUser.id,
        note,
      },
    }),
  ]);

  return NextResponse.json({
    id: updated.id,
    status: updated.status,
  });
}
```

- [ ] **Step 2: Type-check + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 3: Manual smoke test**

Start `npm run dev`. As the provider on a `PLACED` order, `PATCH /api/reservations/<id>/status` with `{ "status": "CONFIRMED" }` → 200. Repeat the same call → 409 (already past PLACED). As the customer on a `PLACED` order, send `{ "status": "CONFIRMED" }` → 403.

- [ ] **Step 4: Commit**

```bash
git add app/api/reservations/[reservationId]/status/route.ts
git commit -m "feat: status transition endpoint with role + transition guard"
```

---

## Task 6: Seed PLACED event at checkout

**Files:**
- Modify: `app/checkout/success/page.tsx`

- [ ] **Step 1: Write the seed event on reservation creation**

In `app/checkout/success/page.tsx`, replace the reservation-create expression (the `existing ?? (await prisma.reservation.create({ ... }))` block at lines ~47-58) with a create that also writes the seed event in one transaction:

```tsx
  const reservation =
    existing ??
    (await prisma.$transaction(async (tx) => {
      const created = await tx.reservation.create({
        data: {
          userId,
          listingId,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          totalPrice: parseInt(totalPrice, 10),
          stripeSessionId: sessionId,
        },
      });
      await tx.reservationEvent.create({
        data: {
          reservationId: created.id,
          status: "PLACED",
          actorId: userId,
        },
      });
      return created;
    }));
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/checkout/success/page.tsx
git commit -m "feat: seed PLACED event when booking is created"
```

---

## Task 7: Access-gated order loader

**Files:**
- Create: `app/actions/getOrderById.ts`

- [ ] **Step 1: Write the loader**

```ts
import prisma from "@/lib/prismadb";
import { isAdminEmail } from "@/lib/adminAuth";
import { resolveOrderRole, type OrderStatus } from "@/lib/orderStatus";
import { SafeOrderDetail, SafeUser } from "@/types";

export default async function getOrderById(
  reservationId: string,
  currentUser: SafeUser
): Promise<SafeOrderDetail | null> {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: {
      listing: true,
      events: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!reservation) return null;

  const role = resolveOrderRole({
    currentUserId: currentUser.id,
    customerId: reservation.userId,
    providerId: reservation.listing.userId,
    isAdmin: isAdminEmail(currentUser.email),
  });

  if (!role) return null; // access denied → caller treats as not found

  // Resolve actor names for the timeline (small N, one query).
  const actorIds = Array.from(new Set(reservation.events.map((e) => e.actorId)));
  const actors = await prisma.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, name: true },
  });
  const nameById = new Map(actors.map((a) => [a.id, a.name ?? null]));

  return {
    ...reservation,
    createdAt: reservation.createdAt.toISOString(),
    startDate: reservation.startDate.toISOString(),
    endDate: reservation.endDate.toISOString(),
    status: reservation.status as OrderStatus,
    providerId: reservation.listing.userId,
    listing: {
      ...reservation.listing,
      createdAt: reservation.listing.createdAt.toISOString(),
    },
    events: reservation.events.map((e) => ({
      ...e,
      status: e.status as OrderStatus,
      createdAt: e.createdAt.toISOString(),
      actorName: nameById.get(e.actorId) ?? null,
    })),
  };
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/actions/getOrderById.ts
git commit -m "feat: access-gated order detail loader"
```

---

## Task 8: StatusBadge + OrderStepper components

**Files:**
- Create: `components/orders/StatusBadge.tsx`
- Create: `components/orders/OrderStepper.tsx`

- [ ] **Step 1: Write `StatusBadge.tsx`**

```tsx
import { OrderStatus, STATUS_LABELS } from "@/lib/orderStatus";

const TONE: Record<OrderStatus, string> = {
  PLACED: "bg-gray-100 text-gray-700 border-gray-200",
  CONFIRMED: "bg-gray-100 text-gray-700 border-gray-200",
  SHIPPED: "bg-gray-200 text-gray-800 border-gray-300",
  DELIVERED: "bg-gray-200 text-gray-800 border-gray-300",
  RETURN_INITIATED: "bg-gray-200 text-gray-800 border-gray-300",
  RETURN_RECEIVED: "bg-gray-200 text-gray-800 border-gray-300",
  COMPLETED: "bg-black text-white border-black",
  CANCELLED: "bg-white text-gray-400 border-gray-200 line-through",
};

export default function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONE[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
```

- [ ] **Step 2: Write `OrderStepper.tsx`**

```tsx
import { ORDER_STEPS, STATUS_LABELS, type OrderStatus } from "@/lib/orderStatus";
import { SafeReservationEvent } from "@/types";

type Props = {
  status: OrderStatus;
  events: SafeReservationEvent[];
};

function formatTs(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function OrderStepper({ status, events }: Props) {
  const eventByStatus = new Map(events.map((e) => [e.status, e]));
  const isCancelled = status === "CANCELLED";
  const currentIndex = ORDER_STEPS.indexOf(status);

  return (
    <ol className="flex flex-col">
      {ORDER_STEPS.map((step, i) => {
        const done = !isCancelled && i <= currentIndex;
        const isCurrent = !isCancelled && i === currentIndex;
        const evt = eventByStatus.get(step);
        return (
          <li key={step} className="flex gap-4 pb-6 last:pb-0">
            <div className="flex flex-col items-center">
              <span
                className={[
                  "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold",
                  done ? "bg-black text-white border-black" : "bg-white text-gray-400 border-gray-300",
                ].join(" ")}
              >
                {i + 1}
              </span>
              {i < ORDER_STEPS.length - 1 && (
                <span className={`mt-1 w-px flex-1 ${done ? "bg-black" : "bg-gray-200"}`} />
              )}
            </div>
            <div className="pt-0.5">
              <div className={`text-sm font-medium ${done ? "text-gray-900" : "text-gray-400"} ${isCurrent ? "underline" : ""}`}>
                {STATUS_LABELS[step]}
              </div>
              {evt && (
                <div className="text-xs text-gray-500">
                  {formatTs(evt.createdAt)}
                  {evt.actorName ? ` · ${evt.actorName}` : ""}
                </div>
              )}
            </div>
          </li>
        );
      })}
      {isCancelled && (
        <li className="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">
          {STATUS_LABELS.CANCELLED}
        </li>
      )}
    </ol>
  );
}
```

- [ ] **Step 3: Type-check + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/orders/StatusBadge.tsx components/orders/OrderStepper.tsx
git commit -m "feat: StatusBadge and OrderStepper presentational components"
```

---

## Task 9: Order detail page + client actions

**Files:**
- Create: `app/orders/[reservationId]/page.tsx`
- Create: `app/orders/[reservationId]/OrderStatusClient.tsx`

- [ ] **Step 1: Write the client component**

`app/orders/[reservationId]/OrderStatusClient.tsx`:

```tsx
"use client";

import axios from "axios";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";
import {
  canTransition,
  nextHappyStatus,
  type OrderRole,
  type OrderStatus,
} from "@/lib/orderStatus";
import { SafeOrderDetail } from "@/types";
import OrderStepper from "@/components/orders/OrderStepper";
import StatusBadge from "@/components/orders/StatusBadge";

// Button copy keyed by the CURRENT status (the action moves it forward).
const ADVANCE_LABEL: Partial<Record<OrderStatus, string>> = {
  PLACED: "Confirm booking",
  CONFIRMED: "Mark as shipped",
  SHIPPED: "Confirm delivery",
  DELIVERED: "Mark as returned",
  RETURN_INITIATED: "Confirm return received",
  RETURN_RECEIVED: "Verify & complete",
};

type Props = {
  order: SafeOrderDetail;
  role: OrderRole;
};

export default function OrderStatusClient({ order, role }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const status = order.status;

  const next = nextHappyStatus(status);
  const canAdvance = !!next && canTransition(status, next, role);
  const canCancel = canTransition(status, "CANCELLED", role);

  const patch = async (to: OrderStatus, successMsg: string) => {
    setBusy(true);
    try {
      await axios.patch(`/api/reservations/${order.id}/status`, { status: to });
      toast.success(successMsg);
      router.refresh();
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{order.listing.title}</h1>
          <p className="text-sm text-gray-500">Order #{order.id.slice(-8)}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="rounded-xl border border-gray-200 p-6">
        <OrderStepper status={status} events={order.events} />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {canAdvance && next && (
          <button
            disabled={busy}
            onClick={() => patch(next, "Status updated")}
            className="rounded-lg bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
          >
            {busy ? "Updating…" : ADVANCE_LABEL[status]}
          </button>
        )}
        {canCancel && (
          <button
            disabled={busy}
            onClick={() => {
              if (window.confirm("Cancel this booking?")) patch("CANCELLED", "Booking cancelled");
            }}
            className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
          >
            Cancel booking
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write the page**

`app/orders/[reservationId]/page.tsx`:

```tsx
import { notFound, redirect } from "next/navigation";
import getCurrentUser from "@/app/actions/getCurrentUser";
import getOrderById from "@/app/actions/getOrderById";
import { isAdminEmail } from "@/lib/adminAuth";
import { resolveOrderRole } from "@/lib/orderStatus";
import ClientOnly from "@/components/ClientOnly";
import OrderStatusClient from "./OrderStatusClient";

type Props = { params: { reservationId: string } };

export default async function OrderDetailPage({ params }: Props) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/");

  const order = await getOrderById(params.reservationId, currentUser);
  if (!order) notFound();

  const role = resolveOrderRole({
    currentUserId: currentUser.id,
    customerId: order.userId,
    providerId: order.providerId,
    isAdmin: isAdminEmail(currentUser.email),
  });
  if (!role) notFound();

  return (
    <ClientOnly>
      <OrderStatusClient order={order} role={role} />
    </ClientOnly>
  );
}
```

- [ ] **Step 3: Type-check + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 4: Manual smoke test**

`npm run dev`. Visit `/orders/<id>` as the customer → see stepper + correct buttons; as an unrelated user → 404; as provider on `PLACED` → "Confirm booking" advances to CONFIRMED and a timeline row appears.

- [ ] **Step 5: Commit**

```bash
git add app/orders/[reservationId]/page.tsx app/orders/[reservationId]/OrderStatusClient.tsx
git commit -m "feat: order detail page with stepper and role-gated actions"
```

---

## Task 10: Protect the route in middleware

**Files:**
- Modify: `middleware.ts`

- [ ] **Step 1: Add `/orders` to the matcher**

```ts
export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/trips", "/reservations", "/my-listings", "/favorites", "/admin/orders", "/orders/:path*"],
};
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: PASS. Manually: logged-out visit to `/orders/<id>` redirects to login.

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat: protect /orders routes via middleware"
```

---

## Task 11: ListingCard badge + link; drop inline cancel on trips/reservations

**Files:**
- Modify: `components/listing/ListingCard.tsx`
- Modify: `app/trips/TripsClient.tsx`
- Modify: `app/reservations/ReservationsClient.tsx`

- [ ] **Step 1: Add badge + order link to `ListingCard.tsx`**

Add these imports at the top (alongside the existing imports):

```tsx
import Link from "next/link";
import StatusBadge from "../orders/StatusBadge";
```

Replace the trailing action block (the `{onAction && actionLabel && ( <Button ... /> )}` at lines ~102-109) with a status badge + order link when a reservation is present, falling back to the existing action button otherwise:

```tsx
        {reservation && (
          <div className="flex items-center justify-between gap-2">
            <StatusBadge status={reservation.status} />
            <Link
              href={`/orders/${reservation.id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-sm font-medium text-gray-700 underline hover:text-black"
            >
              View order status
            </Link>
          </div>
        )}
        {!reservation && onAction && actionLabel && (
          <Button
            disabled={disabled}
            small
            label={actionLabel}
            onClick={handleCancel}
          />
        )}
```

- [ ] **Step 2: Simplify `TripsClient.tsx`** (cancel now lives on the order detail page)

Replace the whole file with:

```tsx
"use client";

import Container from "@/components/Container";
import Heading from "@/components/Heading";
import ListingCard from "@/components/listing/ListingCard";
import { SafeReservation, SafeUser } from "@/types";
import React from "react";

type Props = {
  reservations: SafeReservation[];
  currentUser?: SafeUser | null;
};

function TripsClient({ reservations, currentUser }: Props) {
  return (
    <Container>
      <Heading
        title="My Scheduled Services"
        subtitle="Upcoming and past service bookings."
      />
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
        {reservations.map((reservation) => (
          <ListingCard
            key={reservation.id}
            data={reservation.listing}
            reservation={reservation}
            currentUser={currentUser}
          />
        ))}
      </div>
    </Container>
  );
}

export default TripsClient;
```

- [ ] **Step 3: Simplify `ReservationsClient.tsx`**

Replace the whole file with:

```tsx
"use client";

import { SafeReservation, SafeUser } from "@/types";
import React from "react";

import Container from "@/components/Container";
import Heading from "@/components/Heading";
import ListingCard from "@/components/listing/ListingCard";

type Props = {
  reservations: SafeReservation[];
  currentUser?: SafeUser | null;
};

function ReservationsClient({ reservations, currentUser }: Props) {
  return (
    <Container>
      <Heading title="Service Bookings" subtitle="Bookings placed on your published services." />
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
        {reservations.map((reservation) => (
          <ListingCard
            key={reservation.id}
            data={reservation.listing}
            reservation={reservation}
            currentUser={currentUser}
          />
        ))}
      </div>
    </Container>
  );
}

export default ReservationsClient;
```

- [ ] **Step 4: Type-check + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS. (`axios`, `useRouter`, `useState`, `useCallback`, `toast` imports are gone from both clients — confirm no unused-variable lint errors.)

- [ ] **Step 5: Commit**

```bash
git add components/listing/ListingCard.tsx app/trips/TripsClient.tsx app/reservations/ReservationsClient.tsx
git commit -m "feat: show status badge + order link on booking cards"
```

---

## Task 12: Admin orders — status column + soft cancel; tighten DELETE

**Files:**
- Modify: `app/admin/orders/OrdersTable.tsx`
- Modify: `app/api/reservations/[reservationId]/route.ts`

- [ ] **Step 1: Add a Status column and switch cancel to soft PATCH in `OrdersTable.tsx`**

Add the import:

```tsx
import StatusBadge from "@/components/orders/StatusBadge";
```

Change `handleCancel` to call the status endpoint instead of DELETE:

```tsx
  const handleCancel = async (id: string) => {
    if (!window.confirm("Cancel this booking?")) return;
    setDeletingId(id);
    try {
      await axios.patch(`/api/reservations/${id}/status`, { status: "CANCELLED" });
      toast.success("Booking cancelled");
      router.refresh();
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? "Something went wrong");
    } finally {
      setDeletingId(null);
    }
  };
```

Add a `Status` header cell to BOTH `<thead>` rows (the empty-state table and the data table), after the `Total` header and before `Booked On`:

```tsx
            <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
```

Update the empty-state body `colSpan` from `6` to `7`, and the expanded-detail row `colSpan` from `6` to `7`.

Add a status cell in the data row, after the Total `<td>` and before the Booked-On `<td>`:

```tsx
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} />
                </td>
```

(The admin "Cancel" button now soft-cancels via PATCH; for an already-`COMPLETED` order the API returns 409 and the toast surfaces it — acceptable, admin can cancel any non-terminal state.)

- [ ] **Step 2: Tighten DELETE to admin-only in `app/api/reservations/[reservationId]/route.ts`**

Replace the role/`where` block (the `const where = isAdminEmail(...) ? ... : {...}` plus the `deleteMany` call, lines ~30-43) with an admin gate, since soft-cancel now handles owner cancellation:

```ts
  if (!isAdminEmail(currentUser.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const reservation = await prisma.reservation.deleteMany({
    where: { id: reservationId },
  });

  return NextResponse.json(reservation);
```

- [ ] **Step 3: Type-check + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 4: Manual smoke test**

`/admin/orders`: Status column renders a badge per row; "Cancel" on a `PLACED`/`CONFIRMED`/`SHIPPED` order sets it to CANCELLED and refreshes.

- [ ] **Step 5: Commit**

```bash
git add app/admin/orders/OrdersTable.tsx app/api/reservations/[reservationId]/route.ts
git commit -m "feat: admin status column + soft cancel; restrict hard delete to admin"
```

---

## Task 13: Full verification + E2E walkthrough

**Files:** none (verification only)

- [ ] **Step 1: Run the unit suite**

Run: `npm run test`
Expected: PASS — `lib/orderStatus.test.ts` green.

- [ ] **Step 2: Lint + type-check + production build**

Run: `npm run lint && npx tsc --noEmit && npm run build`
Expected: all three PASS (build exits 0, generates `.next`).

- [ ] **Step 3: Manual two-role walkthrough (Playwright MCP or browser)**

With a provider account and a customer account on one booking, walk all 7 steps in order, asserting at each step that only the correct role's action button is visible:
1. Customer books → order shows `PLACED`.
2. Provider: "Confirm booking" → `CONFIRMED`.
3. Provider: "Mark as shipped" → `SHIPPED`.
4. Customer: "Confirm delivery" → `DELIVERED`.
5. Customer: "Mark as returned" → `RETURN_INITIATED`.
6. Provider: "Confirm return received" → `RETURN_RECEIVED`.
7. Provider: "Verify & complete" → `COMPLETED`; no further buttons; timeline shows 7 rows with timestamps.
Separately: customer cancels a fresh `PLACED` order → `CANCELLED`; confirm the cancel button is hidden once `SHIPPED`.

- [ ] **Step 4: Final commit (if any verification fixups were needed)**

```bash
git add -A
git commit -m "test: verify order status pipeline end-to-end"
```

---

## Self-Review (completed by plan author)

**Spec coverage:** state machine → Task 2; schema/migration/backfill → Task 3; safe types → Task 4; PATCH guard endpoint → Task 5; checkout seed event → Task 6; access-gated loader → Task 7; stepper/badge UI → Tasks 8-9; `/orders/[id]` page + access gate → Task 9; route protection → Task 10; card badge+link + soft-cancel → Tasks 11-12; admin status column → Task 12; DELETE admin-only → Task 12; unit/lint/tsc/build + E2E → Task 13. All spec sections mapped.

**Placeholder scan:** No TBD/TODO; every code step shows complete code; commands have expected output.

**Type consistency:** `OrderStatus` union defined once in `lib/orderStatus.ts` and reused everywhere; `SafeReservation.status`, `SafeOrderDetail.providerId`, `SafeReservationEvent.actorName`/`.status` referenced consistently across Tasks 4/7/8/9/11/12; `canTransition`/`nextHappyStatus`/`resolveOrderRole`/`isOrderStatus` signatures stable from Task 2 through their consumers. Both list clients drop `onAction`/`actionLabel`, matching ListingCard's `!reservation && onAction` fallback (cards in those pages always pass a reservation).
