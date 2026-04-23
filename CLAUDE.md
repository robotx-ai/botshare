# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Identity

**BotShare** (`botsharing.us`) is a robot service rental booking platform. The `AGENTS.md` file contains the authoritative product and terminology rules; always consult it for any user-facing copy decisions.

## Commands

```bash
npm run dev          # Start dev server on http://localhost:3000
npm run build        # Production build
npm run lint         # ESLint check (must pass before any PR/merge)
```

## Deployment

This repo deploys to **botsharing.us** (Netlify site `147defb9`, Supabase project `jylxrvwxsjehthsqswib`).

```bash
npm run deploy:preview   # Preview deploy (safe — no live site impact)
npm run deploy:prod      # Production deploy
```

**Default:** always deploy preview first; use `deploy:prod` only when verified.

Netlify manages env vars (DATABASE_URL, SUPABASE_*, NEXTAUTH_URL, etc.) in the site dashboard. The `.env` file is for local dev only.

## Architecture

**Framework**: Next.js 13 (App Router + Pages Router hybrid)
- `app/` — React Server Components (App Router): layout, page routes, server actions, API routes
- `pages/api/` — Pages Router API: only `auth/[...nextauth].ts` (NextAuth requires Pages Router)
- All other API endpoints live under `app/api/`

**Key directories**:
- `app/actions/` — Server-side data fetchers: `getListings`, `getListingById`, `getReservations`, `getAllReservations` (admin), `getFavoriteListings`, `getCurrentUser`
- `app/api/` — `listings/`, `reservations/`, `favorites/`, `register/`, `checkout/` (Stripe session), `upload/` (Cloudinary signatures)
- `app/listings/[listingId]/` — Service detail page
- `app/services/` — Browse/filter services catalog
- `app/trips/`, `app/reservations/`, `app/favorites/`, `app/my-listings/` — Authenticated user pages (protected by `middleware.ts`)
- `app/admin/orders/` — Admin-only orders dashboard with filter/cancel
- `app/checkout/success/` — Stripe post-payment landing
- `app/robot-types/` — Static marketing pages for robot models
- `components/models/` — Modal dialogs: Login, Register, RentModal (provider/admin: create service), Search
- `components/navbar/` — Navbar with Categories filter, Search (incl. zip proximity), UserMenu (role-aware)
- `components/listing/` — Service card and detail sub-components
- `components/robot-types/` — Robot type landing components
- `lib/` — Shared utilities:
  - `adminAuth.ts` — admin email allowlist check
  - `prismadb.ts` — Prisma singleton
  - `stripe.ts` — Stripe client
  - `email.ts` — transactional email helpers
  - `serviceCategories.ts` — category constants
  - `serviceLocation.ts`, `zipCentroid.ts` — zip-code proximity search
  - `scenarioPricing.ts`, `agibotScenarioDetails.ts` — scenario-based pricing model
  - `robotModel.ts`, `robotTypeCatalog.ts` — robot taxonomy
  - `writeGuard.ts` — migration read-only lock
- `hook/` — Zustand modal stores and utility hooks
- `scripts/` — one-off data scripts (e.g. `duplicate-ca-to-fl.js`, `expand-fl-listings.js`, migration helpers)

**Database**: Supabase Postgres via Prisma (migrated from MongoDB). Schema in `prisma/schema.prisma`. Models: `User`, `Account`, `Listing`, `Reservation`, `UserFavorite`. Enum `UserType { CUSTOMER, PROVIDER }`.

**Auth**: NextAuth with Google + Facebook providers, Prisma adapter. Two role axes:
- `User.userType` (CUSTOMER | PROVIDER) — product role; determines UserMenu options and MyListings access
- `ADMIN_EMAILS` env allowlist (via `isAdminEmail()` in `lib/adminAuth.ts`) — elevated ops role for admin routes and cross-tenant cancel

**Payments**: Stripe Checkout Sessions. Booking flow: `POST /api/checkout` creates session → redirect to Stripe → `/checkout/success` finalizes `Reservation` with `stripeSessionId`.

**Maps**: MapLibre GL (migrated from Leaflet). Zip-code proximity search powered by `lib/serviceLocation.ts` + `lib/zipCentroid.ts`.

## Mandatory Terminology (User-Facing Copy)

| Use | Avoid |
|-----|-------|
| service | listing |
| booking | reservation |
| customer | guest |
| service package / deployment | home / place / property |
| per day | per night |
| BotSharing US Service Assurance | AirCover |
| service operator | host |

**Banned in new copy**: Airbnb, host, guest, property, per night, AirCover.

Internal variable names and route paths may keep legacy names during MVP for compatibility.

## Service Categories (Canonical — Do Not Add Without Explicit Request)

- `Showcase & Performance` (slug: `showcase-performance`)
- `Warehouse` (slug: `warehouse`)
- `Restaurant` (slug: `restaurant`)

Source of truth: `lib/serviceCategories.ts`

## Access Control

- Service catalog write access is gated to **providers and admins**. Customers must not create/edit/delete services.
  - Provider check: `session.user.userType === 'PROVIDER'`
  - Admin check: `isAdminEmail()` from `lib/adminAuth.ts` — reads `ADMIN_EMAILS` env var
- Enforce at API layer regardless of UI visibility. `RentModal` (create service) is mounted conditionally in `app/layout.tsx` for eligible roles.
- **Admin-only surfaces**: `/admin/orders` (all bookings, filter, cross-tenant cancel). Middleware matcher in `middleware.ts` gates `/admin/*`.
- **Reservation cancellation**: owners can cancel their own; admins can cancel any (DELETE `/api/reservations/[id]`).

## Theme Colors (MVP Constraint)

User-facing UI must use only **white, gray, and black**. Replace any legacy rose/coral/indigo/blue accent colors with neutral grayscale Tailwind classes. Prefer updating centralized Tailwind tokens over scattered hardcoded values.

## Schema Guardrails

- Do not redesign the Prisma schema without explicit request.
- Keep existing route shapes (`/listings/[listingId]`, `/api/listings`, `/api/reservations`, `/api/checkout`, etc.).
- `Listing.category` → one of the 3 service categories.
- `Listing.price` → per-day service price.
- `Listing.locationValue` → service coverage city/region.
- `Listing.zipCode`, `Listing.lat`, `Listing.lng` → nullable; populated for zip proximity search.
- `Listing.videoSrc` → nullable Cloudinary video delivery URL.
- `Reservation.stripeSessionId` → unique; set after successful Stripe checkout.
- `guestCount`, `roomCount`, `bathroomCount` on `Listing` are legacy compatibility fields; do not repurpose.
- `User.userType` is the canonical role flag — don't add parallel role booleans.

## Environment Variables

Copy `.env.example` to `.env` and fill in values. Key vars:
- `DATABASE_URL` — Supabase Postgres connection string (pooled)
- `DIRECT_URL` — direct Supabase connection for migrations
- `ADMIN_EMAILS` — comma-separated admin email allowlist
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL` — NextAuth config
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET` — OAuth providers
- `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` — Stripe payments
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` — Cloudinary cloud name (image + video delivery)
- `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — Cloudinary server-side credentials
- `CLOUDINARY_URL` — shorthand `cloudinary://<key>:<secret>@<cloud>` (alternative to key/secret pair)
- `SUPABASE_*` — for Supabase CLI operations
- SMTP credentials (for `lib/email.ts`) as applicable

## Cloudinary Video Management

Cloudinary (cloud name `dmrhtzqyx`) is used for both image uploads and video asset hosting. Video files must **never** be committed to git — `public/videos/*.mp4|.mov|.webm` is gitignored.

**To upload a video programmatically** (credentials are in `.env`):
```bash
curl -X POST \
  -F "file=@public/videos/<file>.mp4" \
  -F "public_id=<asset-name>" \
  -F "resource_type=video" \
  -F "overwrite=true" \
  -u "$CLOUDINARY_API_KEY:$CLOUDINARY_API_SECRET" \
  "https://api.cloudinary.com/v1_1/$NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME/video/upload"
```

**Delivery URL pattern:**
```
https://res.cloudinary.com/dmrhtzqyx/video/upload/q_auto,f_auto/<public_id>.mp4
```
- `q_auto` — auto quality per device/network
- `f_auto` — serves WebM to Chrome, mp4 elsewhere

**Current video assets:**
| public_id | Component | Notes |
|---|---|---|
| `showcase-bg` | `components/ServiceShowcase.tsx` | AGIBot demo, 25s loop, 1080p |
| `pepsi-bg` | `components/HeroCarousel.tsx` | Pepsi performance, 22s, hero slot 1 |
| `paris-performance-bg` | `components/HeroCarousel.tsx` | Paris performance, 10s, hero slot 2 |
