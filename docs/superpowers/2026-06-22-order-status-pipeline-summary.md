# Order Status Pipeline — Implementation Summary

**Date:** 2026-06-22
**Branch:** `feat/order-status-pipeline`
**PR:** https://github.com/robotx-ai/botshare/pull/4
**Spec:** `docs/superpowers/specs/2026-06-22-order-status-pipeline-design.md`
**Plan:** `docs/superpowers/plans/2026-06-22-order-status-pipeline.md`

## What shipped

A strictly-forward 7-step order-status lifecycle (plus cancel) for bookings,
with role-gated transitions and a dedicated `/orders/[reservationId]` stepper
page.

Lifecycle: `PLACED → CONFIRMED → SHIPPED → DELIVERED → RETURN_INITIATED →
RETURN_RECEIVED → COMPLETED`, plus `CANCELLED`. Provider drives the outbound
legs (confirm, ship), customer drives the in-possession/return legs (delivery,
return), provider verifies and completes. Admin can drive any transition.
Settlement at step 7 is a status flag only — no money moves.

## Key decisions

- **Approach A**: a `status` enum column on `Reservation` for current state + an
  append-only `ReservationEvent` history table (actor + timestamp) for the
  timeline. Single source of truth for transitions lives in a pure, unit-tested
  module `lib/orderStatus.ts`.
- **Settlement = status flag only** (no Stripe Connect / payout).
- **Minimal unhappy path**: only `CANCELLED` is modeled. Customer/provider may
  cancel pre-ship (`PLACED`/`CONFIRMED`); admin may cancel any non-terminal.
- **Dedicated detail page** `/orders/[reservationId]`; list cards link into it.
- **Soft cancel**: cancellation is a transition to `CANCELLED`; hard `DELETE`
  restricted to admins.
- **Vitest** added (project had no test runner) for the guard matrix.

## Files

Created:
- `lib/orderStatus.ts` — statuses, steps, labels, transition table,
  `resolveOrderRole`, `canTransition`, `nextHappyStatus`, `isOrderStatus`.
- `lib/orderStatus.test.ts` — 20 unit tests (full transition matrix).
- `vitest.config.ts`.
- `prisma/migrations/20260622000000_order_status_pipeline/migration.sql`.
- `app/api/reservations/[reservationId]/status/route.ts` — `PATCH` guard endpoint.
- `app/actions/getOrderById.ts` — access-gated loader.
- `app/orders/[reservationId]/page.tsx` + `OrderStatusClient.tsx`.
- `components/orders/StatusBadge.tsx` + `OrderStepper.tsx`.

Modified:
- `package.json` (vitest + test scripts), `prisma/schema.prisma` (enum +
  `Reservation.status` + `ReservationEvent`), `types.ts` (status + order-detail
  safe types), `app/checkout/success/page.tsx` (seed `PLACED` event),
  `app/api/reservations/[reservationId]/route.ts` (DELETE → admin-only),
  `middleware.ts` (protect `/orders`), `components/listing/ListingCard.tsx`
  (badge + order link), `app/trips/TripsClient.tsx` + `app/reservations/ReservationsClient.tsx`
  (drop inline cancel), `app/admin/orders/OrdersTable.tsx` (status column + soft cancel).

## Verification

- **Unit:** 20/20 pass (`npm run test`).
- **Static:** `npm run lint`, `npx tsc --noEmit`, `npm run build` all green
  (build emitted `/orders/[reservationId]` route).
- **Live server gates** (dev server, unauthenticated curl):
  - `PATCH .../status` no auth → 401
  - `GET /orders/[id]` no auth → 307 redirect to `/api/auth/signin` (middleware)
  - `GET` on the PATCH-only route → 405
- **Migration applied to prod Supabase** (`jylxrvwxsjehthsqswib`, project
  `botsharing-us`) via `apply_migration`; schema verified — `Reservation.status`
  (`OrderStatus`, default `PLACED`) and `ReservationEvent` table + FK present.
  Prod had 0 existing reservations, so the backfill was a no-op.

## Demo data (prod DB)

Seeded one `PLACED` order so the flow can be exercised once the app runs:
- Order id `demo-order-info-20260622`, service "Unitree A2-W Pro" ($6000),
  customer `info@usrobotx.com` (also admin → can drive all 7 steps solo).
- Remove with: `DELETE FROM "Reservation" WHERE id = 'demo-order-info-20260622';`

## Outstanding / known blocker

- **Local build + Netlify deploy blocked by the dev machine's proxy** (fake-IP
  TUN + intermittent 503s). `next build` fetches Google Fonts via Node `fetch`,
  which bypasses `HTTP_PROXY` and dials the fake IP → fails (next/font runs in
  worker threads, so a global dispatcher override didn't reach it). The Netlify
  site is not git-linked, so the PR cannot cloud-build either. None of this is
  the code — earlier `npm run build` (before the proxy restart) passed.
- **To produce a preview / test the UI:** turn off the proxy TUN, then either
  `npm run dev` (reaches DB → test locally, no deploy) or `npm run deploy:preview`.
  Alternatively merge PR #4 and deploy via the normal flow.

## Follow-ups

- [ ] Two-role UI walkthrough (provider + customer, or admin solo) — all 7 steps + cancel.
- [ ] Deploy preview (after proxy resolved) or merge + prod deploy.
- [ ] Remove the demo order when finished testing.
