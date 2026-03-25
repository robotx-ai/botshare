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
- **Auth guard:** `isAdminEmail(currentUser.email)` from `lib/adminAuth.ts` — same pattern as `app/properties/page.tsx`
  - Not authenticated → redirected to login by `middleware.ts`
  - Authenticated but not admin → `<EmptyState title="Unauthorized" />`
- **Middleware:** Add `/admin/orders` to the `matcher` array in `middleware.ts`
- **Nav entry:** Add "Orders" link in `components/navbar/UserMenu.tsx`, rendered only when the current user is an admin

---

## Data Layer

### New server action: `app/actions/getAllReservations.ts`

Admin-scoped fetch of all reservations. Filters are applied at the Prisma query layer (not client-side).

```ts
interface IAdminReservationParams {
  search?: string;    // case-insensitive match on customer name or email
  category?: string;  // service category slug (e.g. "warehouse")
  startDate?: string; // ISO date — include bookings with startDate >= this
  endDate?: string;   // ISO date — include bookings with endDate <= this
}
```

**Prisma query includes:**
- `user` relation: `name`, `email`, `phone`, `businessName`
- `listing` relation: `title`, `category`, `userId`
- Ordered by `createdAt` descending

**No schema changes required** — all fields exist on current User and Listing models.

### New type: `SafeAdminReservation` (in `types.ts`)

Extends the existing `SafeReservation` with flattened customer contact fields:

```ts
export type SafeAdminReservation = SafeReservation & {
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  customerBusinessName: string | null;
};
```

### API modification: `app/api/reservations/[reservationId]/route.ts`

Add `isAdminEmail(currentUser.email)` as an additional OR condition in the existing delete guard, so admins can cancel any booking regardless of listing ownership.

---

## File Structure

```
app/admin/orders/
  page.tsx           ← server RSC: auth check, filter param parsing, data fetch
  OrdersClient.tsx   ← "use client": filter state, URL search params, router
  OrdersTable.tsx    ← "use client": table rows, expandable detail, cancel action
  FilterBar.tsx      ← "use client": search input, category select, date inputs
```

---

## UI Layout

```
<Container>
  <Heading title="Rental Orders" subtitle="Manage all service bookings" />
  <FilterBar />           ← search · category · start date · end date
  <OrdersTable />         ← table with expandable rows
  <EmptyState />          ← shown when no results match filters
```

### FilterBar

Four controls in a single row (wraps on mobile):
- **Search** — text input, placeholder "Search customer name or email"
- **Category** — `<select>`: All / Showcase & Performance / Warehouse / Restaurant
- **Start date** — `<input type="date">`
- **End date** — `<input type="date">`

Filter state lives in URL search params. On any change, `router.push` with updated params. The server component re-fetches on navigation, so no client-side data management is needed.

### OrdersTable

Standard HTML `<table>` with these columns:

| Customer | Service | Dates | Total | Booked On | Actions |
|----------|---------|-------|-------|-----------|---------|

- **Customer** — `customerName` (primary), click to expand row
- **Service** — `listing.title` + category badge
- **Dates** — `startDate → endDate`
- **Total** — `$totalPrice`
- **Booked On** — `createdAt` date
- **Actions** — "Cancel" button

**Expandable row:** Clicking a customer name toggles a sub-row showing:
`Email: ... · Phone: ... · Business: ...`

**Styling:** white/gray/black only
- Table: `border border-gray-200`, `divide-y divide-gray-200`
- Row: `hover:bg-gray-50`
- Text: `text-gray-900` (primary), `text-gray-500` (secondary)
- Cancel button: existing `<Button>` component

---

## Cancel/Delete Action

**Endpoint:** Reuse `DELETE /api/reservations/[reservationId]` — no new route needed.

**Client flow:**
1. Admin clicks "Cancel" on a row
2. `window.confirm("Cancel this booking?")` — if dismissed, stop
3. `axios.delete('/api/reservations/' + id)` fires
4. Button enters disabled/loading state via `deletingId` state variable
5. Success → `toast.success("Booking cancelled")` + `router.refresh()`
6. Error → `toast.error("Something went wrong")` + loading clears

---

## Out of Scope (MVP)

- Email notification to customer on cancellation
- Booking status field (`pending` / `completed` / `cancelled`) — requires schema change
- Revenue/stats summary header
- Pagination — filter + refresh sufficient for MVP booking volume

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
| Modify | `middleware.ts` — add `/admin/orders` to matcher |
| Modify | `app/api/reservations/[reservationId]/route.ts` — admin bypass |
| Modify | `components/navbar/UserMenu.tsx` — add Orders link for admins |

---

## Verification Checklist

- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] Unauthenticated user visiting `/admin/orders` is redirected to login
- [ ] Non-admin authenticated user sees "Unauthorized" empty state
- [ ] Admin sees all reservations across all customers
- [ ] Search by customer name filters results
- [ ] Search by customer email filters results
- [ ] Category filter narrows to correct services
- [ ] Date range filter returns only bookings within range
- [ ] Expanding a row shows email, phone, businessName
- [ ] Cancel: confirm dialog appears; dismissing does nothing
- [ ] Cancel: confirmed → booking removed, toast shown
- [ ] "Orders" link visible in UserMenu for admin users only
- [ ] "Orders" link not visible for non-admin users
