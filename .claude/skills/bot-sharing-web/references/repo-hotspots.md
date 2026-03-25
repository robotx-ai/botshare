# Repo Hotspots

Prioritize these files for BotShare web tasks.

## Core UX surfaces
- `/Users/jasonliu/Github/botshare/components/navbar/Categories.tsx`
  - Update category definitions to the 3 BotShare service categories.
- `/Users/jasonliu/Github/botshare/components/modals/RentModal.tsx`
  - Rebrand create flow copy from property/home language to service package language.
- `/Users/jasonliu/Github/botshare/components/modals/SearchModal.tsx`
  - Rebrand filters copy to service coverage and booking date wording.
- `/Users/jasonliu/Github/botshare/components/listing/ListingInfo.tsx`
  - Remove host/property/AirCover wording; adopt BotSharing US Service Assurance copy.
- `/Users/jasonliu/Github/botshare/components/listing/ListingReservation.tsx`
  - Replace per-night text with per-day booking language.
- `/Users/jasonliu/Github/botshare/components/navbar/Search.tsx`
  - Reword guests and travel text to customer and service-booking semantics.

## App shell and metadata
- `/Users/jasonliu/Github/botshare/app/layout.tsx`
  - Update metadata title/description/icon branding; controls RentModal admin-only mount.
- `/Users/jasonliu/Github/botshare/README.md`
  - Remove Airbnb references for onboarding clarity.
- `/Users/jasonliu/Github/botshare/.env.example`
  - Document Supabase variables required for automation and admin control.

## Backend policy points
- `/Users/jasonliu/Github/botshare/app/api/listings/route.ts`
  - Enforce category allowlist and admin-write policy (`ADMIN_EMAILS`).
- `/Users/jasonliu/Github/botshare/app/api/listings/[listingId]/route.ts`
  - Enforce admin-only delete/update behavior.
- `/Users/jasonliu/Github/botshare/app/api/reservations/route.ts`
  - Keep date-range booking semantics; wording updates only in response messages/UI.
- `/Users/jasonliu/Github/botshare/app/actions/getListings.ts`
  - Ensure category filtering remains compatible with canonical labels.
- `/Users/jasonliu/Github/botshare/lib/adminAuth.ts`
  - Admin email check via `ADMIN_EMAILS` env var.
- `/Users/jasonliu/Github/botshare/lib/serviceCategories.ts`
  - Source of truth for canonical category constants.

## Schema compatibility guardrails
- `/Users/jasonliu/Github/botshare/prisma/schema.prisma`
  - Keep structure unchanged in MVP.
  - Semantics only: `Listing.category`, `Listing.price`, `locationValue` reinterpretation.

## Supabase operations context
- `/Users/jasonliu/Github/botshare/.env.example`
  - Template for local dev env vars. Production env vars live in Netlify dashboard for site `147defb9`.
- See `references/supabase-operations.md` for Supabase project config.
