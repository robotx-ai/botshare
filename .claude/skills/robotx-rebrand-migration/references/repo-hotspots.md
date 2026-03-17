# Repo Hotspots

Prioritize these files for RobotX migration tasks.

## Core UX surfaces
- `/Users/jasonliu/Github/robotx-share/components/navbar/Categories.tsx`
  - Replace category definitions with the 4 RobotX services.
- `/Users/jasonliu/Github/robotx-share/components/models/RentModal.tsx`
  - Rebrand create flow copy from property/home language to service package language.
- `/Users/jasonliu/Github/robotx-share/components/models/SearchModal.tsx`
  - Rebrand filters copy to service coverage and booking date wording.
- `/Users/jasonliu/Github/robotx-share/components/listing/ListingInfo.tsx`
  - Remove host/property/AirCover wording; adopt RobotX service assurance copy.
- `/Users/jasonliu/Github/robotx-share/components/listing/ListingReservation.tsx`
  - Replace per-night text with per-day booking language.
- `/Users/jasonliu/Github/robotx-share/components/navbar/Search.tsx`
  - Reword guests and travel text to customer and service-booking semantics.
- `/Users/jasonliu/Github/robotx-share/components/Footer.tsx`
  - Add/verify visible cross-link to `robotxshop.com`.

## App shell and metadata
- `/Users/jasonliu/Github/robotx-share/app/layout.tsx`
  - Update metadata title/description/icon branding.
- `/Users/jasonliu/Github/robotx-share/README.md`
  - Remove Airbnb references for onboarding clarity.
- `/Users/jasonliu/Github/robotx-share/.env.example`
  - Document Supabase variables required for automation and admin control.

## Backend policy points
- `/Users/jasonliu/Github/robotx-share/app/api/listings/route.ts`
  - Enforce category allowlist and admin-write policy (`ROBOTX_ADMIN_EMAILS`).
- `/Users/jasonliu/Github/robotx-share/app/api/listings/[listingId]/route.ts`
  - Enforce admin-only delete/update behavior.
- `/Users/jasonliu/Github/robotx-share/app/api/reservations/route.ts`
  - Keep date-range booking semantics; wording updates only in response messages/UI.
- `/Users/jasonliu/Github/robotx-share/app/actions/getListings.ts`
  - Ensure category filtering remains compatible with canonical labels.

## Schema compatibility guardrails
- `/Users/jasonliu/Github/robotx-share/prisma/schema.prisma`
  - Keep structure unchanged in MVP.
  - Semantics only: `Listing.category`, `Listing.price`, `locationValue` reinterpretation.

## Supabase operations context
- `/Users/jasonliu/Github/robotx-share/.env.example`
  - Template for local dev env vars. Production env vars live in Netlify dashboard per site.
- See `references/supabase-operations.md` for multi-project setup (robotx-share + botshare).
