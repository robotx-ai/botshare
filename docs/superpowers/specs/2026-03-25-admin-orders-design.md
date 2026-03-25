# Admin Orders Page — Design Spec

**Date:** 2026-03-25
**Status:** Approved
**Project:** BotShare (`botsharing.us`)

---

## Problem & Goal

BotShare has no global view of rental bookings. Admins can only see bookings on their own services via `/reservations`. This page provides a single admin-only place to view all bookings across all customers, search and filter them, inspect customer contact info, and cancel bookings when needed.

---

## Route & Auth

- **URL:** `/admin/orders`
- **File:** `app/admin/orders/page.tsx` (Next.js App Router server component)
- **Auth guard (two levels, distinct purposes):**
  - **Level 1 — `middleware.ts`:** Add `"/admin/orders"` to the `matcher` array (same plain-string style as `"/trips"`, `"/reservations"`, etc.). This only gates **unauthenticated** access — it redirects users with no NextAuth session to the sign-in page. It does **not** enforce admin status. Prefix match behaviour is acceptable (no sub-routes).
  - **Level 2 — `page.tsx`:** This is the **real admin gate**. Two separate branches, matching the pattern in `app/my-listings/page.tsx`:
    ```ts
    if (!currentUser) return <EmptyState title="Unauthorized" />;                     // defensive fallback (middleware should catch this first)
    if (!isAdminEmail(currentUser.email)) return <EmptyState title="Admin access required" />;
    ```
    Both branches are required. The middleware does not check `isAdminEmail` — a logged-in non-admin user passes middleware and must be blocked here.
    > **Note:** `currentUser.email` is `string | null`. `isAdminEmail` accepts `string | null | undefined` and returns `false` for null — no additional null guard needed. Do not add a redundant `if (!currentUser.email)` check between the two branches.
- **Nav entry:** Add "Orders" link in `components/navbar/UserMenu.tsx`, rendered only when `currentUser` is an admin.

---

## Data Layer

### New server action: `app/actions/getAllReservations.ts`

Admin-scoped fetch of all reservations. Filters are applied at the Prisma query layer (not client-side).

```ts
interface IAdminReservationParams {
  search?: string;    // case-insensitive match on customer name or email
  category?: string;  // full display name as stored in DB: "Warehouse" | "Restaurant" | "Showcase & Performance"
  startDate?: string; // ISO date — include bookings with startDate >= this
  endDate?: string;   // ISO date — include bookings with endDate <= this
}
```

> **Note on `category`:** `Listing.category` stores the full display name (e.g. `"Warehouse"`), not a slug. The FilterBar select options must use display name values.

**Prisma query:**
- Includes `user` relation: `name`, `email`, `phone`, `businessName`
- Includes `listing` relation: `include: { listing: true }` — full listing fields, **no** `listing: { include: { user: true } }`. The listing's owner (operator) is not needed. Do not add a nested `user` include on `listing`, as it would create a naming conflict with the reservation's `user` relation in the serializer.
- Ordered by `createdAt` descending

**Serialization / flattening:** After the Prisma query, map results to `SafeAdminReservation`. The raw `user` relation **must be destructured out** before spreading — it contains `DateTime` objects that are not serializable for RSC prop passing and would cause a Next.js serialization error. The flattened customer fields are promoted to the top level instead. Because the query does not include `listing.user`, `operatorName` on the returned `safeListing` is intentionally `undefined` (it is an optional field on `safeListing`). The admin orders table does not display it.

```ts
return reservations.map((r) => {
  const { user, ...rest } = r; // drop raw user object (contains DateTime — not serializable)
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
```

**No schema changes required.**

### New type: `SafeAdminReservation` (in `types.ts`)

```ts
export type SafeAdminReservation = SafeReservation & {
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  customerBusinessName: string | null;
};
```

`SafeReservation` already includes the full `safeListing` object (with `operatorName?: string` as an optional field — its absence is type-safe). The raw `user` object is not included on the returned type.

### API modification: `app/api/reservations/[reservationId]/route.ts`

Admin users must be able to cancel any booking. **Only the `where` clause changes** — the existing `getWritesBlockedResponse()` guard at the top of the handler must be retained as-is.

Replace only the `where` clause used in `deleteMany`:

```ts
// Keep all existing code above (getWritesBlockedResponse, auth checks, etc.)
// Only change the where clause:
const where = isAdminEmail(currentUser.email)
  ? { id: reservationId }
  : {
      id: reservationId,
      OR: [{ userId: currentUser.id }, { listing: { userId: currentUser.id } }],
    };
const result = await prisma.reservation.deleteMany({ where });
```

> **Pre-existing behaviour:** `deleteMany` returns `{ count: 0 }` with a 200 on double-cancel. The client will show `toast.success` on any 2xx. Fixing this is out of scope.

---

## URL Search Param Names

`page.tsx` parses these from the `searchParams` RSC prop and passes them to `getAllReservations`. `OrdersClient` reads and writes these same names via `useSearchParams` / `router.push`.

| Param | Type | Example |
|-------|------|---------|
| `search` | string | `?search=acme` |
| `category` | string | `?category=Warehouse` |
| `startDate` | ISO date string | `?startDate=2026-01-01` |
| `endDate` | ISO date string | `?endDate=2026-12-31` |

**Date filter semantics:** `startDate` / `endDate` filter bookings whose service window **overlaps** the given range. The Prisma `where` clause is:

```ts
...(startDate && { startDate: { lte: new Date(endDate   ?? "9999-12-31") } }),
...(endDate   && { endDate:   { gte: new Date(startDate ?? "0001-01-01") } }),
```

Use full ISO date strings as fallbacks (`"9999-12-31"`, `"0001-01-01"`), not bare year strings — bare strings like `"9999"` produce `Invalid Date` in JavaScript. This returns any booking with at least one day within the selected window.

---

## File Structure

```
app/admin/orders/
  page.tsx           ← server RSC: auth check, searchParams parsing, getAllReservations call
  OrdersClient.tsx   ← "use client": owns URL search param state; renders FilterBar + OrdersTable
  OrdersTable.tsx    ← "use client": table rows, expandable detail row, cancel action
  FilterBar.tsx      ← "use client": pure controlled component — no internal state, props only
```

**Component responsibility split:**
- `OrdersClient` reads URL params via `useSearchParams`, builds the filter object, calls `router.push` on any filter change. Renders `<FilterBar>` (current values + onChange handlers) and `<OrdersTable>` (reservation data + cancel handler).
- `FilterBar` is a controlled component — all state lives in `OrdersClient`.
- `OrdersTable` owns only `deletingId` local state (for per-row loading state during cancel).

---

## UI Layout

```
<Container>
  <Heading title="Rental Orders" subtitle="Manage all service bookings" />
  <OrdersClient reservations={reservations} />
    ├── <FilterBar
    │     search, category, startDate, endDate (values)
    │     onSearchChange, onCategoryChange, onStartDateChange, onEndDateChange />
    └── <OrdersTable reservations={...} deletingId onCancel />
          ← when empty: single full-width row "No bookings found."
```

### FilterBar

Four controls in a single row (wraps on mobile):
- **Search** — `<input type="text">`, placeholder `"Search by name or email"`
- **Category** — `<select>`: `""` (All) / `"Showcase & Performance"` / `"Warehouse"` / `"Restaurant"` — option values match DB display names
- **Start date** — `<input type="date">`
- **End date** — `<input type="date">`

### OrdersTable

Standard `<table>` columns:

| Customer | Service | Dates | Total | Booked On | Actions |
|----------|---------|-------|-------|-----------|---------|

- **Customer** — `customerName`; click toggles expandable detail row
- **Service** — `listing.title` + category text
- **Dates** — `startDate → endDate` (formatted)
- **Total** — `$totalPrice`
- **Booked On** — `createdAt` date
- **Actions** — "Cancel" button (`disabled` when `deletingId === id`)

**Expandable row:** Toggles a `<tr>` sub-row spanning all columns:
`Email: {customerEmail}` · `Phone: {customerPhone ?? "—"}` · `Business: {customerBusinessName ?? "—"}`

**Zero-results state:** Handled client-side in `OrdersTable`. When `reservations.length === 0`, render a single full-width `<td>` row: `"No bookings found."`

**Styling:** white/gray/black only
- Table: `border border-gray-200`, `divide-y divide-gray-200`
- Row: `hover:bg-gray-50`
- Text: `text-gray-900` (primary), `text-gray-500` (secondary)
- Cancel button: existing `<Button>` component

---

## Cancel/Delete Action

**Endpoint:** `DELETE /api/reservations/[reservationId]` (modified per Data Layer section above)

**Client flow in `OrdersTable`:**
1. Admin clicks "Cancel" → `window.confirm("Cancel this booking?")` — dismissed → stop
2. `setDeletingId(id)` → button enters disabled state
3. `axios.delete('/api/reservations/' + id)` fires
4. Success → `toast.success("Booking cancelled")` + `router.refresh()` + `setDeletingId(null)`
5. Error → `toast.error("Something went wrong")` + `setDeletingId(null)`

> **Why `router.refresh()`:** In Next.js 13 App Router, `router.refresh()` re-runs the server RSC (`page.tsx`) with the current URL search params. This re-executes `getAllReservations` with the active filters and pushes fresh data down to `OrdersClient` as props. The cancelled booking will disappear from the table after the refresh completes. This is the correct approach — do not splice local state manually.

---

## Out of Scope (MVP)

- Email notification to customer on cancellation
- Booking status field (`pending` / `completed` / `cancelled`) — requires schema change
- Revenue/stats summary header
- Pagination
- Double-cancel 200 fix (pre-existing behaviour)
- Displaying operator name on orders table

---

## Files to Create / Modify

| Action | File |
|--------|------|
| Create | `app/admin/orders/page.tsx` |
| Create | `app/admin/orders/OrdersClient.tsx` |
| Create | `app/admin/orders/OrdersTable.tsx` |
| Create | `app/admin/orders/FilterBar.tsx` |
| Create | `app/actions/getAllReservations.ts` |
| Modify | `types.ts` — add `SafeAdminReservation` |
| Modify | `middleware.ts` — add `"/admin/orders"` to matcher |
| Modify | `app/api/reservations/[reservationId]/route.ts` — admin bypass in delete guard |
| Modify | `components/navbar/UserMenu.tsx` — add Orders link for admins |

---

## Verification Checklist

- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] Unauthenticated user visiting `/admin/orders` is redirected to login
- [ ] Authenticated non-admin user sees "Admin access required" empty state
- [ ] Admin sees all reservations across all customers
- [ ] Search by customer name filters results
- [ ] Search by customer email filters results
- [ ] Category filter uses display names and narrows results correctly
- [ ] Date range filter returns only bookings within range
- [ ] Expanding a customer name row shows email, phone, businessName
- [ ] Cancel: confirm dialog appears; dismissing does nothing
- [ ] Cancel: confirmed → booking removed from table, success toast shown
- [ ] Admin can cancel a booking they do not own (admin bypass verified)
- [ ] "Orders" link visible in UserMenu for admin users only
- [ ] "Orders" link not visible for non-admin users
- [ ] Zero-results state shows "No bookings found." in table
