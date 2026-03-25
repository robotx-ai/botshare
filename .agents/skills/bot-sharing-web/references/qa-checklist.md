# QA Checklist

Run these checks for each task PR.

## Automated checks
- `npm run lint`
- `npm run build`
- `scripts/find_legacy_terms.sh /Users/jasonliu/Github/botshare`
- `scripts/validate_service_categories.sh /Users/jasonliu/Github/botshare`
- `scripts/check_supabase_env.sh /Users/jasonliu/Github/botshare`

## Manual smoke checks
1. Home page
- Category chips render exactly 3 services.
- No Airbnb/property/host wording visible.

2. Search flow
- Location and date filters still work.
- Copy refers to service booking (not travel lodging).

3. Service detail
- Pricing language is per day.
- Assurance copy is BotSharing US Service Assurance branded.

4. Create-service flow
- Customers cannot create or mutate service records.
- Providers can create and manage only their own service records.
- Admins can create records with valid category values and retain override access.

5. Booking flow
- Booking still requires date range and computes total price.
- Reservation/trips/favorites pages render without regressions.
- Provider incoming-booking views stay scoped to the current operator's services.

6. Navigation and branding
- Metadata and major page headings reflect BotShare (botsharing.us) branding.

7. Supabase control readiness
- Required Supabase env vars report as set.
- Any missing/empty variable is called out before attempting Supabase operations.
- Destructive Supabase actions are not run without explicit user confirmation.

## Evidence required in PR notes
- Commands run + pass/fail.
- Screenshots or logs for manual checks.
- Explicit list of deferred out-of-scope items.
