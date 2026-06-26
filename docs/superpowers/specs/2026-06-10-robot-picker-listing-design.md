# Robot Picker in Listing Flow — Design Spec (Sub-project 2 of 3)

**Date:** 2026-06-10
**Status:** Approved design → implementation
**Depends on:** Sub-project 1 (`RobotModel` table seeded — see
2026-06-10-robot-catalog-db-seed-design.md).

## Goal

Let a signed-in provider **pick a robot from the catalog** when creating a service,
auto-filling the robot's details, instead of typing everything by hand. Picking is
optional — manual entry remains as a fallback.

## Decisions (locked)

- **Listing ↔ catalog link:** hybrid — a nullable `Listing.robotModelId` reference
  **plus** a snapshot into the columns `Listing` already has (`title`, `description`,
  `imageSrc`, `category`). No new snapshot columns (brand/model stay inside the title,
  joinable via `robotModelId`).
- **Category step:** kept and pre-selected from the robot's `serviceCategory`; provider
  can still change it.
- **Price:** never pre-filled. MSRP shown only as a greyed reference.
- **Catalog endpoint:** gated to provider/admin (the audience that can create listings).

## Schema Change

```prisma
model Listing {
  // ...existing fields...
  robotModelId String?
  robotModel   RobotModel? @relation(fields: [robotModelId], references: [id])
  @@index([robotModelId])
}

model RobotModel {
  // ...existing fields...
  listings Listing[]
}
```

Additive only (new nullable column + FK). Migration scoped by hand to avoid the
unrelated auto-diff noise, same as sub-project 1.

## API

### `GET /api/robot-models` (new)
- Auth: 401 if not signed in; 403 if `!canManageServices(currentUser)`.
- Returns all `RobotModel` rows, fields: `id, slug, brand, model, productName,
  description, msrp, serviceCategory, capabilityTag, imageUrl`. ~98 rows.
- Ordered by `brand, model`.

### `POST /api/listings` (modify)
- Accept optional `robotModelId` in the body.
- If present: validate the `RobotModel` exists (404/400 if not); store it on the listing.
- All existing validation (category, zip, capacity, price) unchanged.

## UI

### New component: `components/inputs/RobotPicker.tsx`
- Props: `value` (selected robotModelId | null), `onSelect(robot | null)`.
- Fetches `/api/robot-models` once (via a small `hook/useRobotModels.ts` or internal
  effect); shows a loading state and an error state (error → still allow manual entry).
- Renders: search input + brand filter chips + category filter chips + scrollable
  result list. Each result: thumbnail (`imageUrl`), `productName`, `brand`,
  `serviceCategory`, MSRP as greyed reference. Selected row highlighted.
- **Fuzzy search:** in-memory; normalize lowercase; match when every query token is a
  substring of `productName + brand + model`. Filters AND with the search.
- A "I'll enter details manually" affordance that calls `onSelect(null)`.

### `RentModal` changes
- New first step `ROBOT` (step 0); existing steps shift down. Enum becomes
  `ROBOT, CATEGORY, LOCATION, INFO, IMAGES, DESCRIPTION, PRICE`.
- `ROBOT` step renders `RobotPicker`. On select of a robot, set form values:
  `robotModelId`, `category` (=serviceCategory), `title` (=productName),
  `description`, `imageSrc` (=imageUrl). On manual, clear `robotModelId` and leave
  fields empty.
- `defaultValues` gains `robotModelId: null`.
- Submit posts `robotModelId` alongside the existing payload.
- `PRICE` step: if a robot is selected, show a small helper line
  "Reference purchase price (MSRP): $X — set your daily rental rate below."
- Provider can edit every pre-filled field on its respective step (snapshot reflects
  edits).

## Data Flow

modal opens → fetch catalog → RobotPicker list → onSelect sets form values →
provider completes Location / Capacity / Images / Description / Price (editing any
pre-filled value) → submit → `POST /api/listings` validates `robotModelId` + stores
listing with the FK and the snapshot fields.

## Error Handling

- Catalog fetch fails → picker shows an error and the manual-entry affordance still works.
- `robotModelId` that doesn't exist on POST → 400, listing not created.
- Empty search / no results → "No robots match — try another term or enter manually."

## Verification / Success Criteria

- As a provider: open RentModal, search "G1", pick **Unitree G1 Basic** → Category,
  Title, Description, Image are pre-filled; complete the flow → listing is created with
  `robotModelId` set and snapshot fields populated.
- Manual path (no robot) still creates a listing with `robotModelId = null`.
- `GET /api/robot-models` returns 403 for a customer, 200 for a provider/admin.
- `npm run lint` passes.

## Out of Scope

- Provider profile + listing gate (sub-project 3).
- Showing the linked robot's specs on the public listing detail page (future polish).
- Admin editing of `RobotModel` rows (future).
