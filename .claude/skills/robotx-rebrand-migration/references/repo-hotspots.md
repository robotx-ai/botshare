# Repo Hotspots

Prioritize these files for RobotX migration tasks.

## Core UX surfaces
- `/Users/jasonliu/Github/botshare/components/navbar/Categories.tsx`
  - Replace category definitions with the 4 RobotX services.
- `/Users/jasonliu/Github/botshare/components/models/RentModal.tsx`
  - Rebrand create flow copy from property/home language to service package language.
- `/Users/jasonliu/Github/botshare/components/models/SearchModal.tsx`
  - Rebrand filters copy to service coverage and booking date wording.
- `/Users/jasonliu/Github/botshare/components/listing/ListingInfo.tsx`
  - Remove host/property/AirCover wording; adopt RobotX service assurance copy.
- `/Users/jasonliu/Github/botshare/components/listing/ListingReservation.tsx`
  - Replace per-night text with per-day booking language.
- `/Users/jasonliu/Github/botshare/components/navbar/Search.tsx`
  - Reword guests and travel text to customer and service-booking semantics.
- `/Users/jasonliu/Github/botshare/components/Footer.tsx`
  - Add/verify visible cross-link to `robotxshop.com`.

## App shell and metadata
- `/Users/jasonliu/Github/botshare/app/layout.tsx`
  - Update metadata title/description/icon branding.
- `/Users/jasonliu/Github/botshare/README.md`
  - Remove Airbnb references for onboarding clarity.
- `/Users/jasonliu/Github/botshare/.env.example`
  - Document Supabase variables required for automation and admin control.

## Backend policy points
- `/Users/jasonliu/Github/botshare/app/api/listings/route.ts`
  - Enforce category allowlist and admin-write policy (`ROBOTX_ADMIN_EMAILS`).
- `/Users/jasonliu/Github/botshare/app/api/listings/[listingId]/route.ts`
  - Enforce admin-only delete/update behavior.
- `/Users/jasonliu/Github/botshare/app/api/reservations/route.ts`
  - Keep date-range booking semantics; wording updates only in response messages/UI.
- `/Users/jasonliu/Github/botshare/app/actions/getListings.ts`
  - Ensure category filtering remains compatible with canonical labels.

## Schema compatibility guardrails
- `/Users/jasonliu/Github/botshare/prisma/schema.prisma`
  - Keep structure unchanged in MVP.
  - Semantics only: `Listing.category`, `Listing.price`, `locationValue` reinterpretation.

## Supabase operations context
- `/Users/jasonliu/Github/botshare/.env.example`
  - Template for local dev env vars. Production env vars live in Netlify dashboard per site.
- See `references/supabase-operations.md` for Supabase project config.
