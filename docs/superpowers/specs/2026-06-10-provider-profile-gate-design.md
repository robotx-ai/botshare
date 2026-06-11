# Provider Profile + Listing Gate — Design Spec (Sub-project 3 of 3)

**Date:** 2026-06-10
**Status:** Approved design → implementation

## Goal

Give providers a profile page to manage their info, require a complete profile before
they can list a robot, and (incidentally but necessarily) make the listing flow
reachable by providers at all. Verification is a separate, admin-granted badge that does
NOT block listing.

## Decisions (locked)

- **Required-to-list fields:** `name`, `phone`, `businessName` (Company) — all present.
- **Gate behavior:** clicking "List a Service" with an incomplete profile redirects to
  `/profile` with a prompt; the modal opens normally once complete. Also enforced at the
  API.
- **Verified badge:** shown only on the provider's own profile for now (not on public
  listings).
- **Provider listing access:** the listing modal must be openable by providers, not just
  admins (current gap — see below).

## Known gap this fixes

The listing modal is currently admin-only: `app/layout.tsx` mounts
`{isAdmin && <RentModal />}` and `UserMenu.onRent` early-returns for non-admins. Providers
cannot open the listing flow at all. This sub-project opens it to providers.

## Schema Change

Add to `User`:
```prisma
verified Boolean @default(false)
```
Additive, hand-scoped migration (same approach as sub-projects 1 & 2). `name`, `email`,
`phone`, `businessName` already exist.

## Profile completeness

A single source of truth helper (e.g. `lib/providerProfile.ts`):
```ts
export function isProviderProfileComplete(u): boolean {
  return Boolean(u?.name?.trim() && u?.phone?.trim() && u?.businessName?.trim());
}
```
Used by the UI gate, the API gate, and the profile-page notice.

## Components / Work

### 1. Enable providers to list (fix the gap)
- `app/layout.tsx`: mount `<RentModal />` for `isAdmin || isProvider`.
- `components/navbar/UserMenu.tsx`:
  - Show the "List a Service" nav button and menu item for `isAdmin || isProvider`.
  - `onRent`: for a signed-in provider/admin, if profile incomplete →
    `router.push("/profile")` + toast "Complete your profile to start listing";
    else `rentModal.onOpen()`.
  - Add a "Profile" menu item (→ `/profile`) for signed-in users.

### 2. Profile page — `/profile`
- Add `/profile` to the `middleware.ts` matcher.
- `app/profile/page.tsx` (server): `getCurrentUser`; if none → Unauthorized EmptyState.
  Render `ProfileClient` with the user.
- `app/profile/ProfileClient.tsx` (client): form with
  - **Name** (`name`), **Company** (`businessName`), **Phone** (`phone`) — editable inputs
  - **Email** — read-only (from auth)
  - **Verified** — read-only badge: "✓ Verified provider" (verified) / "Pending
    verification" (not). Neutral theme.
  - Top notice when incomplete: "Complete your profile to start listing robots."
  - Save → `PATCH /api/profile`; on success toast + `router.refresh()`.

### 3. Profile update API — `PATCH /api/profile`
- Auth required (401 if not signed in).
- Body: `name`, `phone`, `businessName`. Trim; reject if any provided field is an empty
  string after trim (but allow updating a subset). Update the current user; return the
  updated safe user. Does not allow changing `email`, `userType`, or `verified`.

### 4. API listing gate
- `POST /api/listings`: after the existing provider/admin check, if the user is a
  provider (not admin) and `!isProviderProfileComplete(currentUser)`, return 400
  `{ error: "Complete your provider profile (name, phone, company) before listing." }`.

## Data Flow

Provider clicks "List a Service" → `onRent` checks completeness → incomplete: go to
`/profile`; complete: open modal. Provider edits `/profile` → `PATCH /api/profile` →
refresh. On listing submit, `POST /api/listings` re-checks completeness server-side.

## Error Handling

- `PATCH /api/profile` with all-empty body → 400 "Nothing to update."
- Empty-string field → 400 with which field.
- Incomplete profile at listing API → 400 with the gate message.

## Verification / Success Criteria

- A provider can open the listing modal (gap fixed).
- New provider with empty profile → "List a Service" routes to `/profile` with a prompt;
  `POST /api/listings` (if forced) returns 400.
- Filling name + phone + company on `/profile` saves; afterwards the modal opens and a
  listing can be created.
- Verified badge reflects the DB `verified` value.
- `npm run lint` and `tsc --noEmit` pass.

## Out of Scope

- Admin UI to verify providers (future; set `verified` in DB for now).
- Public "Verified provider" badge on listing cards/detail (future).
- Deferred polish: picker image cropping; description textarea.
