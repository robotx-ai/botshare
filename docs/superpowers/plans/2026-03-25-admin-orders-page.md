# Admin Orders Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an admin-only `/admin/orders` page that lists all rental bookings across all customers with search/filter, expandable customer contact info, and cancel action.

**Architecture:** Next.js 13 App Router server RSC (`page.tsx`) fetches filtered data via a new `getAllReservations` server action and passes it to a client shell (`OrdersClient`) that owns URL search-param filter state, delegating rendering to a controlled `FilterBar` and a stateful `OrdersTable`. Cancel reuses the existing DELETE API route with a new admin bypass.

**Tech Stack:** Next.js 13 App Router, Prisma (Supabase Postgres), NextAuth, axios, react-hot-toast, Tailwind CSS (white/gray/black only)

> **No test framework is set up in this project.** TDD steps use `npm run build` and `npm run lint` as build-time verification, plus manual smoke testing for runtime behavior.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `types.ts` | Add `SafeAdminReservation` type |
| Create | `app/actions/getAllReservations.ts` | Admin-scoped DB fetch with filters |
| Modify | `app/api/reservations/[reservationId]/route.ts` | Admin bypass in delete guard |
| Modify | `middleware.ts` | Protect `/admin/orders` from unauthenticated access |
| Create | `app/admin/orders/FilterBar.tsx` | Controlled filter inputs (pure props, no state) |
| Create | `app/admin/orders/OrdersTable.tsx` | Table with expandable rows + cancel action |
| Create | `app/admin/orders/OrdersClient.tsx` | URL param state shell, composes FilterBar + OrdersTable |
| Create | `app/admin/orders/page.tsx` | Server RSC: auth gate + data fetch |
| Modify | `components/navbar/UserMenu.tsx` | "Orders" link for admin users |

---

## Task 1: Add SafeAdminReservation type

**Files:**
- Modify: `types.ts`

- [ ] **Step 1: Add the type**

Open `types.ts`. After the existing `SafeReservation` type (line 8–16), add:

```ts
export type SafeAdminReservation = SafeReservation & {
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  customerBusinessName: string | null;
};
```

The full file should now look like:

```ts
import { Listing, Reservation, User } from "@prisma/client";

export type safeListing = Omit<Listing, "createdAt"> & {
  createdAt: string;
  operatorName?: string;
};

export type SafeReservation = Omit<
  Reservation,
  "createdAt" | "startDate" | "endDate" | "listing"
> & {
  createdAt: string;
  startDate: string;
  endDate: string;
  listing: safeListing;
};

export type SafeAdminReservation = SafeReservation & {
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  customerBusinessName: string | null;
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

- [ ] **Step 2: Verify with build**

```bash
cd /Users/jasonliu/Github/botshare && npm run build 2>&1 | tail -20
```

Expected: build completes (or same errors as before — no new type errors).

- [ ] **Step 3: Commit**

```bash
git add types.ts
git commit -m "feat: add SafeAdminReservation type"
```

---

## Task 2: Create getAllReservations server action

**Files:**
- Create: `app/actions/getAllReservations.ts`

- [ ] **Step 1: Create the file**

```ts
// app/actions/getAllReservations.ts
import prisma from "@/lib/prismadb";
import { SafeAdminReservation } from "@/types";

interface IAdminReservationParams {
  search?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
}

export default async function getAllReservations(
  params: IAdminReservationParams
): Promise<SafeAdminReservation[]> {
  try {
    const { search, category, startDate, endDate } = params;

    const where: any = {};

    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (category) {
      where.listing = { category };
    }

    // Date filter: service window overlaps [startDate, endDate]
    if (startDate) {
      where.startDate = { lte: new Date(endDate ?? "9999-12-31") };
    }
    if (endDate) {
      where.endDate = { gte: new Date(startDate ?? "0001-01-01") };
    }

    const reservations = await prisma.reservation.findMany({
      where,
      include: {
        user: true,
        listing: true,        // NO listing.user — operator info not needed on this page
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return reservations.map((r) => {
      const { user, ...rest } = r; // drop raw user — contains DateTime, not RSC-serializable
      return {
        ...rest,
        createdAt: r.createdAt.toISOString(),
        startDate: r.startDate.toISOString(),
        endDate: r.endDate.toISOString(),
        listing: {
          ...r.listing,
          createdAt: r.listing.createdAt.toISOString(),
          // operatorName intentionally omitted — listing.user not included in query
        },
        customerName: user.name ?? "",
        customerEmail: user.email ?? "",
        customerPhone: user.phone ?? null,
        customerBusinessName: user.businessName ?? null,
      };
    });
  } catch (error: any) {
    throw new Error(error.message);
  }
}
```

> **Why `const { user, ...rest } = r`:** The raw Prisma `user` object contains `DateTime` fields which are not JSON-serializable. We promote the needed fields to top-level and discard the raw relation.

> **Why no `listing.user`:** Adding `listing: { include: { user: true } }` would create a naming conflict (`r.user` would be ambiguous) and operator name is not shown on this page.

- [ ] **Step 2: Verify with build**

```bash
npm run build 2>&1 | tail -20
```

Expected: no new TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add app/actions/getAllReservations.ts
git commit -m "feat: add getAllReservations server action with admin filters"
```

---

## Task 3: Add admin bypass to DELETE reservation route

**Files:**
- Modify: `app/api/reservations/[reservationId]/route.ts`

- [ ] **Step 1: Add the isAdminEmail import and update the where clause**

The current file is:
```ts
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/lib/prismadb";
import { getWritesBlockedResponse } from "@/lib/writeGuard";
import { NextResponse } from "next/server";
```

Add the `isAdminEmail` import and replace the `deleteMany` call. The full updated file:

```ts
import getCurrentUser from "@/app/actions/getCurrentUser";
import { isAdminEmail } from "@/lib/adminAuth";
import prisma from "@/lib/prismadb";
import { getWritesBlockedResponse } from "@/lib/writeGuard";
import { NextResponse } from "next/server";

interface IParams {
  reservationId?: string;
}

export async function DELETE(
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

  // Admins can cancel any booking; others can only cancel their own or bookings on their services
  const where = isAdminEmail(currentUser.email)
    ? { id: reservationId }
    : {
        id: reservationId,
        OR: [
          { userId: currentUser.id },
          { listing: { userId: currentUser.id } },
        ],
      };

  const reservation = await prisma.reservation.deleteMany({ where });

  return NextResponse.json(reservation);
}
```

- [ ] **Step 2: Verify with build**

```bash
npm run build 2>&1 | tail -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/reservations/[reservationId]/route.ts
git commit -m "feat: allow admins to cancel any booking in DELETE reservation route"
```

---

## Task 4: Protect /admin/orders in middleware

**Files:**
- Modify: `middleware.ts`

- [ ] **Step 1: Add the route to the matcher**

```ts
export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/trips", "/reservations", "/my-listings", "/favorites", "/admin/orders"],
};
```

> This redirects unauthenticated users to the sign-in page. It does NOT enforce admin status — that is handled in `page.tsx`.

- [ ] **Step 2: Verify with build**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat: add /admin/orders to auth middleware matcher"
```

---

## Task 5: Build FilterBar component

**Files:**
- Create: `app/admin/orders/FilterBar.tsx`

- [ ] **Step 1: Create the file**

```tsx
// app/admin/orders/FilterBar.tsx
"use client";

type Props = {
  search: string;
  category: string;
  startDate: string;
  endDate: string;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
};

const CATEGORIES = [
  { value: "", label: "All categories" },
  { value: "Showcase & Performance", label: "Showcase & Performance" },
  { value: "Warehouse", label: "Warehouse" },
  { value: "Restaurant", label: "Restaurant" },
];

export default function FilterBar({
  search,
  category,
  startDate,
  endDate,
  onSearchChange,
  onCategoryChange,
  onStartDateChange,
  onEndDateChange,
}: Props) {
  return (
    <div className="flex flex-wrap gap-3 mb-6">
      <input
        type="text"
        placeholder="Search by name or email"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 min-w-[200px]"
      />
      <select
        value={category}
        onChange={(e) => onCategoryChange(e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400"
      >
        {CATEGORIES.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
      <input
        type="date"
        value={startDate}
        onChange={(e) => onStartDateChange(e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400"
      />
      <input
        type="date"
        value={endDate}
        onChange={(e) => onEndDateChange(e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400"
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify with build**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 3: Commit**

```bash
git add app/admin/orders/FilterBar.tsx
git commit -m "feat: add FilterBar component for admin orders page"
```

---

## Task 6: Build OrdersTable component

**Files:**
- Create: `app/admin/orders/OrdersTable.tsx`

- [ ] **Step 1: Create the file**

```tsx
// app/admin/orders/OrdersTable.tsx
"use client";

import { SafeAdminReservation } from "@/types";
import axios from "axios";
import React from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

type Props = {
  reservations: SafeAdminReservation[];
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function OrdersTable({ reservations }: Props) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleCancel = async (id: string) => {
    if (!window.confirm("Cancel this booking?")) return;
    setDeletingId(id);
    try {
      await axios.delete(`/api/reservations/${id}`);
      toast.success("Booking cancelled");
      router.refresh(); // re-runs page.tsx server action with current search params
    } catch {
      toast.error("Something went wrong");
    } finally {
      setDeletingId(null);
    }
  };

  if (reservations.length === 0) {
    return (
      <table className="w-full border border-gray-200 rounded-lg text-sm">
        <tbody>
          <tr>
            <td className="px-4 py-8 text-center text-gray-500" colSpan={6}>
              No bookings found.
            </td>
          </tr>
        </tbody>
      </table>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border border-gray-200 rounded-lg text-sm divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Customer</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Service</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Dates</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Total</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Booked On</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {reservations.map((r) => (
            <React.Fragment key={r.id}>
              <tr
                className="hover:bg-gray-50 transition"
              >
                <td className="px-4 py-3">
                  <button
                    onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                    className="text-gray-900 font-medium hover:underline text-left"
                  >
                    {r.customerName || "(no name)"}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="text-gray-900">{r.listing.title}</div>
                  <div className="text-gray-500 text-xs">{r.listing.category}</div>
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {formatDate(r.startDate)} → {formatDate(r.endDate)}
                </td>
                <td className="px-4 py-3 text-gray-900">${r.totalPrice}</td>
                <td className="px-4 py-3 text-gray-500">{formatDate(r.createdAt)}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleCancel(r.id)}
                    disabled={deletingId === r.id}
                    className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {deletingId === r.id ? "Cancelling…" : "Cancel"}
                  </button>
                </td>
              </tr>
              {expandedId === r.id && (
                <tr className="bg-gray-50">
                  <td colSpan={6} className="px-4 py-3 text-sm text-gray-600">
                    <span className="mr-4">
                      <span className="font-medium">Email:</span> {r.customerEmail || "—"}
                    </span>
                    <span className="mr-4">
                      <span className="font-medium">Phone:</span> {r.customerPhone ?? "—"}
                    </span>
                    <span>
                      <span className="font-medium">Business:</span>{" "}
                      {r.customerBusinessName ?? "—"}
                    </span>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Verify with build**

```bash
npm run build 2>&1 | tail -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add app/admin/orders/OrdersTable.tsx
git commit -m "feat: add OrdersTable with expandable rows and cancel action"
```

---

## Task 7: Build OrdersClient component

**Files:**
- Create: `app/admin/orders/OrdersClient.tsx`

- [ ] **Step 1: Create the file**

```tsx
// app/admin/orders/OrdersClient.tsx
"use client";

import { SafeAdminReservation } from "@/types";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import FilterBar from "./FilterBar";
import OrdersTable from "./OrdersTable";

type Props = {
  reservations: SafeAdminReservation[];
};

export default function OrdersClient({ reservations }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const search = searchParams.get("search") ?? "";
  const category = searchParams.get("category") ?? "";
  const startDate = searchParams.get("startDate") ?? "";
  const endDate = searchParams.get("endDate") ?? "";

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/admin/orders?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <>
      <FilterBar
        search={search}
        category={category}
        startDate={startDate}
        endDate={endDate}
        onSearchChange={(v) => updateParam("search", v)}
        onCategoryChange={(v) => updateParam("category", v)}
        onStartDateChange={(v) => updateParam("startDate", v)}
        onEndDateChange={(v) => updateParam("endDate", v)}
      />
      <OrdersTable reservations={reservations} />
    </>
  );
}
```

- [ ] **Step 2: Verify with build**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 3: Commit**

```bash
git add app/admin/orders/OrdersClient.tsx
git commit -m "feat: add OrdersClient with URL search param filter state"
```

---

## Task 8: Build page.tsx (server RSC)

**Files:**
- Create: `app/admin/orders/page.tsx`

- [ ] **Step 1: Create the file**

```tsx
// app/admin/orders/page.tsx
import ClientOnly from "@/components/ClientOnly";
import EmptyState from "@/components/EmptyState";
import { isAdminEmail } from "@/lib/adminAuth";
import getAllReservations from "@/app/actions/getAllReservations";
import getCurrentUser from "@/app/actions/getCurrentUser";
import OrdersClient from "./OrdersClient";

interface Props {
  searchParams: {
    search?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
  };
}

export default async function AdminOrdersPage({ searchParams }: Props) {
  const currentUser = await getCurrentUser();

  // Level 1: defensive fallback (middleware handles unauthenticated users first)
  if (!currentUser) {
    return (
      <ClientOnly>
        <EmptyState title="Unauthorized" subtitle="Please login" />
      </ClientOnly>
    );
  }

  // Level 2: real admin gate — logged-in non-admins are blocked here
  if (!isAdminEmail(currentUser.email)) {
    return (
      <ClientOnly>
        <EmptyState
          title="Admin access required"
          subtitle="Only admins can view rental orders."
        />
      </ClientOnly>
    );
  }

  const reservations = await getAllReservations({
    search: searchParams.search,
    category: searchParams.category,
    startDate: searchParams.startDate,
    endDate: searchParams.endDate,
  });

  return (
    <ClientOnly>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Rental Orders</h1>
        <p className="text-sm text-gray-500 mb-6">Manage all service bookings</p>
        <OrdersClient reservations={reservations} />
      </div>
    </ClientOnly>
  );
}
```

> **Why `max-w-7xl` instead of `<Container>`:** The existing `<Container>` component caps at `max-w-7xl` — using it inline avoids an unnecessary import but you can use `<Container>` if you prefer consistency with other pages.

> **Why inline heading instead of `<Heading>`:** The `<Heading>` component is used on card-grid pages; a simple `h1/p` is more appropriate for a data table page.

- [ ] **Step 2: Verify with build**

```bash
npm run build 2>&1 | tail -20
```

Expected: clean build. If you see `Module not found` for `../actions/getAllReservations`, check the import path — it should be relative from `app/admin/orders/` to `app/actions/`.

- [ ] **Step 3: Verify with lint**

```bash
npm run lint 2>&1 | tail -20
```

Expected: no new lint errors.

- [ ] **Step 4: Commit**

```bash
git add app/admin/orders/page.tsx
git commit -m "feat: add admin orders page server component"
```

---

## Task 9: Add Orders link to UserMenu

**Files:**
- Modify: `components/navbar/UserMenu.tsx`

- [ ] **Step 1: Add the Orders MenuItem**

In the `{isAdmin && ...}` block (around line 97–103), add a new `MenuItem` for Orders. Insert it after the "My services" link and before "List a service":

```tsx
{isAdmin && (
  <MenuItem
    onClick={() => { setIsOpen(false); router.push("/my-listings"); }}
    label="My services"
  />
)}
{isAdmin && (
  <MenuItem
    onClick={() => { setIsOpen(false); router.push("/admin/orders"); }}
    label="Orders"
  />
)}
{isAdmin && <MenuItem onClick={() => { setIsOpen(false); onRent(); }} label="List a service" />}
```

- [ ] **Step 2: Verify with build and lint**

```bash
npm run build 2>&1 | tail -20 && npm run lint 2>&1 | tail -20
```

- [ ] **Step 3: Commit**

```bash
git add components/navbar/UserMenu.tsx
git commit -m "feat: add Orders nav link for admin users"
```

---

## Task 10: Smoke test and final validation

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

Open `http://localhost:3000`.

- [ ] **Step 2: Test auth gates**

  - Open an incognito window. Navigate to `http://localhost:3000/admin/orders`. Expect: redirect to sign-in page.
  - Log in as a non-admin user. Navigate to `/admin/orders`. Expect: "Admin access required" empty state.
  - Log in as an admin (email in `ADMIN_EMAILS` env var). Expect: orders table loads.

- [ ] **Step 3: Test filters**

  - Search for a customer by name → table narrows.
  - Search by email → table narrows.
  - Select a category → table narrows to that category only.
  - Set a date range covering known bookings → correct bookings appear.
  - Clear filters → all bookings return.

- [ ] **Step 4: Test expandable rows**

  - Click a customer name → sub-row appears showing email, phone, business name.
  - Click again → sub-row collapses.
  - Customers with no phone/business show "—".

- [ ] **Step 5: Test cancel flow**

  - Click "Cancel" → confirm dialog appears.
  - Dismiss confirm → nothing happens, booking still in table.
  - Click "Cancel" → confirm → booking disappears from table, success toast shows.
  - Verify admin can cancel a booking they did not create (booking owned by another user).

- [ ] **Step 6: Test nav link**

  - As admin: open UserMenu → "Orders" link is visible.
  - As non-admin: open UserMenu → "Orders" link is not visible.

- [ ] **Step 7: Final build and lint**

```bash
npm run build && npm run lint
```

Expected: both pass with no errors.

- [ ] **Step 8: Final commit**

```bash
git add -A
git commit -m "feat: complete admin orders page implementation"
```
