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
  - Update metadata title/description/icon branding; controls service-management UI mount for authorized users.
- `/Users/jasonliu/Github/botshare/README.md`
  - Remove Airbnb references for onboarding clarity.
- `/Users/jasonliu/Github/botshare/.env.example`
  - Document Supabase variables required for automation and admin control.

## Backend policy points
- `/Users/jasonliu/Github/botshare/app/api/listings/route.ts`
  - Enforce category allowlist and provider-owned create policy with admin override.
- `/Users/jasonliu/Github/botshare/app/api/listings/[listingId]/route.ts`
  - Enforce provider ownership on update/delete, with admin override.
- `/Users/jasonliu/Github/botshare/app/api/reservations/route.ts`
  - Keep date-range booking semantics; wording updates only in response messages/UI.
- `/Users/jasonliu/Github/botshare/app/api/reservations/[reservationId]/route.ts`
  - Enforce provider ownership or admin override when managing incoming bookings.
- `/Users/jasonliu/Github/botshare/app/actions/getListings.ts`
  - Ensure category filtering remains compatible with canonical labels and owner-scoped listing views.
- `/Users/jasonliu/Github/botshare/app/actions/getReservations.ts`
  - Keep provider booking views scoped to the current operator's services.
- `/Users/jasonliu/Github/botshare/lib/adminAuth.ts`
  - Ownership/admin helpers for provider-scoped service management and `ADMIN_EMAILS` override.
- `/Users/jasonliu/Github/botshare/lib/serviceCategories.ts`
  - Source of truth for canonical category constants.
- `/Users/jasonliu/Github/botshare/app/my-listings/page.tsx`
  - Provider-facing service management surface for owned listings.
- `/Users/jasonliu/Github/botshare/app/reservations/page.tsx`
  - Provider-facing incoming bookings surface for owned services.

## Schema compatibility guardrails
- `/Users/jasonliu/Github/botshare/prisma/schema.prisma`
  - Keep structure unchanged in MVP.
  - Semantics only: `Listing.category`, `Listing.price`, `locationValue` reinterpretation.

## Supabase operations context
- `/Users/jasonliu/Github/botshare/.env.example`
  - Template for local dev env vars. Production env vars live in Netlify dashboard for site `147defb9`.
- See `references/supabase-operations.md` for Supabase project config.
