# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Identity

**RobotX Share** (`robotxshare.com`) is a robot service rental booking platform. The `AGENTS.md` file contains the authoritative product and terminology rules; always consult it for any user-facing copy decisions.

A secondary commerce domain, `robotxshop.com`, exists as a CTA cross-link only — there is no shared auth/cart between the two.

## Commands

```bash
npm run dev          # Start dev server on http://localhost:3000
npm run build        # Production build
npm run lint         # ESLint check (must pass before any PR/merge)
```

## Deployment

This repo deploys to **two separate Netlify sites** from a single codebase. Each site uses its own Supabase database via Netlify environment variables.

| Site | Domain | Supabase Project |
|------|--------|-----------------|
| robotx-share | robotxshare.com | `ncqmdyjchvmksxprgiut` |
| botshare | botsharing.us | `jylxrvwxsjehthsqswib` |

```bash
# Preview deploys (safe — no live site impact)
npm run deploy:robotx         # robotx-share preview
npm run deploy:botshare       # botshare preview
npm run deploy:all            # both preview

# Production deploys
npm run deploy:robotx:prod    # robotx-share live
npm run deploy:botshare:prod  # botshare live
npm run deploy:all:prod       # both live
```

**Default:** always deploy preview first; use `:prod` only when verified.

Each Netlify site manages its own env vars (DATABASE_URL, SUPABASE_*, NEXTAUTH_URL, etc.) in the Netlify dashboard. The `.env` file is for local dev only.

## Architecture

**Framework**: Next.js 13 (App Router + Pages Router hybrid)
- `app/` — React Server Components (App Router): layout, page routes, server actions
- `pages/api/` — API routes (Pages Router): currently only `auth/[...nextauth].ts`
- The main CRUD API endpoints (listings, reservations, favorites, register) appear to live in the `app/` directory or are legacy routes

**Key directories**:
- `app/actions/` — Server-side data fetchers: `getListings`, `getListingById`, `getReservations`, `getFavoriteListings`, `getCurrentUser`
- `app/listings/[listingId]/` — Service detail page
- `app/services/` — Browse/filter services catalog
- `app/trips/`, `app/reservations/`, `app/favorites/`, `app/properties/` — Authenticated user pages (protected by `middleware.ts`)
- `components/models/` — Modal dialogs: Login, Register, RentModal (admin-only: create service), Search
- `components/navbar/` — Navbar with Categories filter, Search, UserMenu
- `components/listing/` — Service card and detail sub-components
- `lib/` — Shared utilities: `robotxAdmin.ts` (admin check), `robotxServiceCategories.ts` (category constants), `writeGuard.ts` (migration read-only lock), `prismadb.ts` (Prisma singleton)
- `hook/` — Zustand modal stores and utility hooks

**Database**: Supabase Postgres via Prisma (migrated from MongoDB). Schema in `prisma/schema.prisma`. Models: `User`, `Account`, `Listing`, `Reservation`, `UserFavorite`.

**Auth**: NextAuth with Google + Facebook providers, Prisma adapter. Admin access gated by `ROBOTX_ADMIN_EMAILS` env var (comma-separated email allowlist).

## Mandatory Terminology (User-Facing Copy)

| Use | Avoid |
|-----|-------|
| service | listing |
| booking | reservation |
| customer | guest |
| service package / deployment | home / place / property |
| per day | per night |
| RobotX Service Assurance | AirCover |
| RobotX / service operator | host |

**Banned in new copy**: Airbnb, host, guest, property, per night, AirCover.

Internal variable names and route paths may keep legacy names during MVP for compatibility.

## Service Categories (Canonical — Do Not Add Without Explicit Request)

- `Showcase & Performance` (slug: `showcase-performance`)
- `Warehouse` (slug: `warehouse`)
- `Restaurant` (slug: `restaurant`)

Source of truth: `lib/robotxServiceCategories.ts`

## Access Control

- Service catalog is RobotX-managed only. Non-admin users must not create/edit/delete services.
- Admin check: `isRobotxAdminEmail()` from `lib/robotxAdmin.ts` — reads `ROBOTX_ADMIN_EMAILS` env var.
- Enforce at API layer regardless of UI visibility. `RentModal` (create service) is only mounted for admins in `app/layout.tsx`.

## Theme Colors (MVP Constraint)

User-facing UI must use only **white, gray, and black**. Replace any legacy rose/coral/indigo/blue accent colors with neutral grayscale Tailwind classes. Prefer updating centralized Tailwind tokens over scattered hardcoded values.

## Schema Guardrails

- Do not redesign the Prisma schema without explicit request.
- Keep existing route shapes (`/listings/[listingId]`, `/api/listings`, `/api/reservations`, etc.).
- `Listing.category` → one of the 3 RobotX service categories.
- `Listing.price` → per-day service price.
- `locationValue` → service coverage city/region.
- `guestCount`, `roomCount`, `bathroomCount` are legacy compatibility fields; do not repurpose.

## Environment Variables

Copy `.env.example` to `.env` and fill in values. Key vars:
- `DATABASE_URL` — Supabase Postgres connection string
- `ROBOTX_ADMIN_EMAILS` — comma-separated admin email allowlist
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL` — NextAuth config
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` — Cloudinary cloud name (used for image and video delivery)
- `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — Cloudinary server-side credentials for uploads
- `CLOUDINARY_URL` — shorthand `cloudinary://<key>:<secret>@<cloud>` (alternative to key/secret pair)
- `SUPABASE_*` — for Supabase CLI operations

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
| `showcase-bg` | `components/ServiceShowcase.tsx` | Unitree G1 demo, 25s loop, 1080p |

## RobotX Rebrand Migration Skill

Use the `/robotx-rebrand-migration` skill for any task involving: terminology cleanup, category filter updates, theme color normalization, admin-write enforcement, or Supabase operations. It has a structured workflow with validation scripts in `scripts/` and reference docs in `.claude/skills/robotx-rebrand-migration/references/`.

Definition of done for rebrand tasks: all Airbnb wording removed, 4-category filters working, non-admin blocked from mutations, white/gray/black-only theme, `npm run lint` and `npm run build` both pass.
