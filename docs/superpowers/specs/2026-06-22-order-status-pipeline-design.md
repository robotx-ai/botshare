# Order Status Pipeline — Design Spec

**Date:** 2026-06-22
**Status:** Approved (design); pending implementation plan
**Approach:** A — `status` enum on `Reservation` + append-only `ReservationEvent` history table

## 1. Goal

Add an order-status monitor to BotShare bookings: a strictly forward 7-step
lifecycle (plus cancel) with role-gated transitions, surfaced on a dedicated
order-detail page with a stepper timeline.

Each physical robot-rental booking moves through: placed → confirmed → shipped
to customer → delivered → returned → return-received → completed. The provider
drives the outbound legs; the customer drives the in-possession/return legs; the
provider verifies and closes. Settlement at step 7 is a **status flag only** —
no money moves (payment is already captured upfront at Stripe checkout; there is
no Stripe Connect/payout in this project).

## 2. Scope

### In scope
- One `OrderStatus` enum (8 values) + `status` column on `Reservation`.
- New `ReservationEvent` append-only history table (status, actor, timestamp, optional note).
- `PATCH /api/reservations/[reservationId]/status` transition endpoint with
  server-side role + transition validation.
- New `/orders/[reservationId]` detail page: vertical stepper, per-step
  timestamp + actor, single role-appropriate action button, access gated to the
  order's customer / provider / admin.
- Status badge + link into the detail page from `/trips`, `/reservations`, and
  `/admin/orders`.
- Soft-cancel: cancel transitions status to `CANCELLED` (replaces hard `DELETE`
  in the three list UIs).
- Migration (hand-authored SQL) + backfill of existing rows.

### Out of scope (YAGNI for this iteration)
- Stripe Connect, payouts, refunds, or any real money movement.
- Decline / dispute / return-issue states (only `CANCELLED` is modeled).
- Notification emails per transition (existing booking emails unchanged).
- Backwards transitions / arbitrary admin status edits beyond cancel + override-complete.

## 3. State machine

8 states (7 happy-path + cancel). Internal enum names are neutral; display
labels follow BotShare terminology (customer-facing copy uses "booking",
"customer", "operator" — never host/guest/property).

| # | Enum | Customer-facing label | Advances → it |
|---|------|----------------------|----------------|
| 1 | `PLACED` | Order placed | auto (checkout success) |
| 2 | `CONFIRMED` | Confirmed by operator | **Provider** |
| 3 | `SHIPPED` | On the way to you | **Provider** |
| 4 | `DELIVERED` | Delivered — you have it | **Customer** |
| 5 | `RETURN_INITIATED` | Return shipped back | **Customer** |
| 6 | `RETURN_RECEIVED` | Return received — verifying | **Provider** |
| 7 | `COMPLETED` | Completed & settled | **Provider** (admin override) |
| — | `CANCELLED` | Cancelled | Customer/Provider while `PLACED`/`CONFIRMED`; Admin anytime |

### Transition table (the single source of truth for the guard)

| From | To | Allowed actor |
|------|----|---------------|
| `PLACED` | `CONFIRMED` | provider, admin |
| `CONFIRMED` | `SHIPPED` | provider, admin |
| `SHIPPED` | `DELIVERED` | customer, admin |
| `DELIVERED` | `RETURN_INITIATED` | customer, admin |
| `RETURN_INITIATED` | `RETURN_RECEIVED` | provider, admin |
| `RETURN_RECEIVED` | `COMPLETED` | provider, admin |
| `PLACED` | `CANCELLED` | customer, provider, admin |
| `CONFIRMED` | `CANCELLED` | customer, provider, admin |
| any non-terminal | `CANCELLED` | admin |

Rules:
- Strictly forward — a happy-path transition is legal only from the immediately
  prior happy-path state (no skipping, no rewind).
- `CANCELLED` is terminal. `COMPLETED` is terminal.
- Cancel by customer/provider is allowed only before the robot ships
  (status ∈ {`PLACED`, `CONFIRMED`}). Admin may cancel from any non-terminal state.

### Identity mapping
- **Provider** = `listing.userId` (the service operator who owns the listing).
- **Customer** = `reservation.userId` (the renter who booked).
- **Admin** = `isAdminEmail(currentUser.email)` from `lib/adminAuth.ts`.

A single user could be both provider and customer on different orders; role is
resolved per-reservation, never global.

## 4. Schema

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

model Reservation {
  // ...existing fields unchanged...
  status OrderStatus       @default(PLACED)
  events ReservationEvent[]
}

model ReservationEvent {
  id            String      @id @default(cuid())
  reservationId String
  status        OrderStatus
  actorId       String      // user id who triggered the transition
  note          String?
  createdAt     DateTime    @default(now())
  reservation   Reservation @relation(fields: [reservationId], references: [id], onDelete: Cascade)

  @@index([reservationId])
}
```

Guardrails honored: existing `Reservation` fields/route shapes untouched; only
additive changes. `status` defaults to `PLACED` so existing inserts keep working.

### Migration & backfill
- Hand-authored SQL migration (project applies migrations out-of-band; build
  pins Node 20 to match Netlify).
- Create enum type + `status` column (default `PLACED`) + `ReservationEvent`
  table + index.
- Backfill: set all existing reservations to `PLACED` and insert one seed
  `ReservationEvent { status: PLACED, actorId: reservation.userId, createdAt:
  reservation.createdAt }` per row, so every order has a non-empty timeline.

## 5. API

### `PATCH /api/reservations/[reservationId]/status`
Body: `{ status: OrderStatus, note?: string }` (validated with a Zod/string-union
schema — reject unknown values).

Guard order (fail fast, explicit errors):
1. `getWritesBlockedResponse()` — honor migration write lock.
2. `getCurrentUser()` — 401 if absent.
3. Load reservation including `listing` (for `listing.userId`) — 404 if missing.
4. Resolve actor role for this reservation (customer / provider / admin; a user
   with none → 403).
5. Look up `(currentStatus → targetStatus)` in the transition table — 409 if the
   transition is not defined.
6. Assert the actor's role is in that transition's allowed-actor set — 403 otherwise.
7. In a single Prisma transaction: update `Reservation.status` and append a
   `ReservationEvent`.
8. Return the updated reservation (safe-serialized).

The transition table + guard live in a pure, unit-testable module
(e.g. `lib/orderStatus.ts`): `canTransition(from, to, role)`,
`nextStatus(from)`, label/role metadata. The route is a thin wrapper.

### Cancel
Soft-cancel = `PATCH` with `status: CANCELLED`. The `onCancel` handlers in
`TripsClient`, `ReservationsClient`, and `OrdersTable` switch from
`DELETE /api/reservations/[id]` to the status PATCH. The existing `DELETE`
endpoint is retained **admin-only** for true row removal.

## 6. UI

### `/orders/[reservationId]` (new route, App Router, protected)
- Server component loads the reservation + listing + ordered events; 404/redirect
  if the current user is not the order's customer, provider, or admin.
- Vertical stepper: each of the 7 steps rendered as completed (with timestamp +
  actor), current (highlighted), or upcoming (muted). `CANCELLED` renders a
  distinct terminal state.
- A single primary action button shows only when the current user owns the next
  transition (provider sees "Mark confirmed" / "Mark shipped" / "Confirm return
  received" / "Verify & complete"; customer sees "Confirm delivery" / "Mark
  returned"). Cancel button shown to customer/provider only while pre-ship.
- Client action posts the PATCH, toasts, and refreshes.
- Colors strictly white / gray / black per MVP theme constraint. Compositor-only
  motion if any.

### List surfaces
- `/trips` and `/reservations`: each `ListingCard` gains a compact status badge
  and links to `/orders/[id]`; the inline "Cancel booking" action moves to the
  detail page (soft-cancel).
- `/admin/orders`: add a Status column; optionally an inline advance/override
  control for admins.

## 7. Access control

- Detail page view + every transition enforced **at the API/server layer**,
  not just UI visibility (per project access-control rule).
- Role resolved per-reservation from `listing.userId` / `reservation.userId` /
  `isAdminEmail`.
- No new global role flags; `User.userType` and the admin allowlist remain the
  only role axes.

## 8. Testing

- **Unit** (`lib/orderStatus.ts`): exhaustive matrix — every (from, to, role)
  pair asserts the exact allow/deny from the transition table, including illegal
  skips, rewinds, post-ship cancels, and terminal-state transitions.
- **Integration** (status route): 401 / 403 / 404 / 409 / 200 paths; verifies
  the `ReservationEvent` is appended and `status` updated atomically; write-guard
  honored.
- **E2E** (Playwright): happy path walking all 7 steps across a provider session
  and a customer session; asserts each role only sees its own action button.
- **Gates**: `npm run lint`, `tsc`, `npm run build` all green before PR.

## 9. Open implementation notes (decided, for the plan)

- Step 7 trigger = **provider verifies → COMPLETED** (admin may override). Not automatic.
- Settlement = **status flag only**.
- Cancel = **soft** (`CANCELLED`), replacing hard delete in list UIs; `DELETE`
  kept admin-only.
- Display = **dedicated `/orders/[reservationId]` page** (list cards link in).
- Terminology: user-facing labels use booking/customer/operator; enum + route
  names stay neutral/legacy-compatible.
