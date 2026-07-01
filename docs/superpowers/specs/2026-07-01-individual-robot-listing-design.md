# Individual Robot Listing → Org Pickup Marketplace — Design

**Date:** 2026-07-01
**Status:** Approved (design), pending implementation plan

## Summary

Let any individual (a `CUSTOMER` who signed up primarily to rent) list their own
physical robot into a pool. Business orgs (existing `PROVIDER` users) browse that
pool, **claim** a robot (take physical custody), and operate it — making it a live,
bookable listing near the org's location. The individual owns the robot and is told
they earn **15% of the price**; the org operates it.

This adds a two-sided layer (individual **owner** → org **operator** → customer) on
top of the existing single-sided marketplace, without introducing a new user role.

## Goals

- Individuals can list a robot, choosing its type from the existing robot catalog
  (`RobotModel`) — the same picker orgs use.
- The list wizard is the same as today's, except the final step's copy changes to
  *"15% of the price will be given to you."*
- An individual portal page shows an individual their listed robots and each one's
  status.
- A company portal page lets an org browse all available individual robots and claim
  one to operate.

## Non-Goals (MVP / YAGNI)

- **Payout accounting.** The 15% is display copy only — no payout records, no money
  movement, no Stripe Connect.
- **Unclaim / release.** Once claimed, a robot stays claimed for MVP.
- **Loop-completion / auto-relist.** When a rental cycle eventually ends, the
  individual manually creates a fresh listing. We do not build the completion trigger.
- **Manual Claimed → Live confirmation.** Claiming makes the robot live immediately.

## Key Decisions

1. **No new role.** Any authenticated `CUSTOMER` can list a robot. Ownership is
   already expressed by `Listing.userId`; we do not add a third role to the
   `UserType` axis. Orgs remain `PROVIDER` users.

2. **Extend `Listing`, do not add a `RobotOffer` table.** An individual's robot *is*
   a `Listing` from creation — flagged and held in a pool — so we reuse the existing
   wizard and avoid a fragile copy-on-claim between two tables.

3. **Owner stays `userId`; operation is a separate `operatorId`.** Claiming does not
   change `Listing.userId` (which booking, my-listings, and delete-auth all depend
   on). The claiming org is recorded in a new `operatorId`. Owner vs. operator stay
   cleanly separated.

4. **Price is unchanged mechanically.** Price is already derived from the robot
   catalog (`RobotModel.priceDaily`), never typed by the user. The only change for
   individuals is the final-step copy.

## State Machine

```
Available  ──(org claims)──▶  Claimed  (terminal for MVP; also "Live" to customers)
```

- **Available** — listed, in the pool, waiting for an org. Not visible to customers.
- **Claimed** — an org has taken custody; overwritten with the org's location; live
  and bookable in the customer catalog. The individual now (nominally) earns 15%.

## Data Model — new columns on `Listing`

| Column             | Type              | Notes                                                        |
|--------------------|-------------------|--------------------------------------------------------------|
| `isIndividualOwned`| `Boolean @default(false)` | Marks a robot in the individual→org pool.            |
| `status`           | enum `ListingStatus { AVAILABLE, CLAIMED }` | Meaningful only when `isIndividualOwned`. |
| `operatorId`       | `String?` + relation to `User` | The org that claimed/operates it.               |
| `claimedAt`        | `DateTime?`       | Set on claim.                                                |

- Add a `ListingStatus` enum to the schema.
- Add the `operator` relation on `User` (e.g. `operatedListings Listing[] @relation("operator")`)
  and the inverse on `Listing`.
- **Location fields** (`zipCode`, `lat`, `lng`, `metro`, `locationValue`) hold the
  **individual's pickup location** while `AVAILABLE`; on claim they are **overwritten
  with the org's confirmed operating location**. Pickup origin is not preserved in MVP.
- Existing company listings keep `isIndividualOwned=false`; `status`/`operatorId`/
  `claimedAt` are irrelevant for them.

## Access Control

- **Individual list flow:** available to any authenticated user.
- **`POST /api/listings`** branches on individual intent:
  - Individual-intent request (`isIndividualOwned` true) → allowed for any
    authenticated user; server forces `status=AVAILABLE`, `userId=session user`.
  - Otherwise → the existing `canManageServices` (provider/admin) gate stays.
- **`/available-robots`** (company page) and the claim endpoint → `PROVIDER` + admin
  only, gated in `middleware.ts` (`/available-robots`) and enforced at the API layer.
- **`/my-robots`** (individual portal) → any authenticated user (shows only their own
  individual-owned listings).

## Surfaces

### 1. Individual list wizard
- Reuse `components/models/RentModal.tsx` in an **"individual" mode**.
- Steps identical: Robot → Location → Images → Details → Price.
- **Final Price step** shows *"15% of the price will be given to you"* instead of the
  plain price confirmation. All other steps unchanged.
- On submit: `POST /api/listings` with individual intent → creates a `Listing` with
  `isIndividualOwned=true`, `status=AVAILABLE`, `userId=me`, pickup location from the
  Location step.
- Entry point: a "List your robot" item in the customer's UserMenu and/or a CTA on
  `/my-robots`.

### 2. Individual portal — `/my-robots`
- New route; any authenticated user.
- Lists the user's `isIndividualOwned` listings with:
  - status badge (**Available** / **Claimed · Live**),
  - operator org name once claimed,
  - the "you earn 15%" note.
- CTA to list another robot.

### 3. Company portal — `/available-robots`
- New route; provider/admin only.
- Grid of `AVAILABLE` individual listings: robot type, image, pickup location, SKU.
- **"List this robot"** → confirm dialog where the org enters its operating location →
  `POST /api/listings/[id]/claim`.
- Claim endpoint: sets `operatorId=org`, `status=CLAIMED`, `claimedAt=now`, and
  overwrites the location fields with the org's confirmed location.
- **Guard:** only an `AVAILABLE` listing can be claimed — blocks double-claim / SKU
  races.

## SKU Uniqueness

- On create of an individual listing, reject (`409`) if the SKU already has an active
  individual listing (`AVAILABLE` or `CLAIMED`). A single physical robot cannot be in
  the pool or claimed twice at once. Re-listing after a completed cycle is a new
  create once no active listing for that SKU exists.

## Customer-Facing Visibility

- `getListings` (customer catalog) shows:
  - normal company listings (`isIndividualOwned=false`), **plus**
  - individual listings that are `CLAIMED` (now operated and live).
- It **hides** `AVAILABLE` (pool) individual listings from customers.

## Terminology & Theme

- User-facing copy follows the mandatory glossary (robot, service, booking, customer;
  no host/guest/property/per-night).
- White / gray / black theme only.
- Page labels: "My Robots" (individual), "Available Robots" (company).

## Affected / New Files (indicative)

- `prisma/schema.prisma` — new enum + columns + relation; migration.
- `app/api/listings/route.ts` — branch gate + individual-intent create + SKU check.
- `app/api/listings/[id]/claim/route.ts` — new claim endpoint.
- `components/models/RentModal.tsx` — individual mode + final-step copy.
- `app/my-robots/` — individual portal page + client.
- `app/available-robots/` — company portal page + client.
- `app/actions/` — fetchers for available pool and an individual's robots.
- `middleware.ts` — gate `/available-robots`.
- `components/navbar/UserMenu` — "List your robot" / "My Robots" entries.
- `app/actions/getListings` — visibility rule update.
