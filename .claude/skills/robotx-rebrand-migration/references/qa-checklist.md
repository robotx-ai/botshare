# QA Checklist

Run these checks for each migration PR.

## Automated checks
- `npm run lint`
- `npm run build`
- `scripts/find_legacy_terms.sh /Users/jasonliu/Github/robotx-share`
- `scripts/validate_service_categories.sh /Users/jasonliu/Github/robotx-share`
- `scripts/check_supabase_env.sh /Users/jasonliu/Github/robotx-share`

## Manual smoke checks
1. Home page
- Category chips render exactly 4 services.
- No Airbnb/property/host wording visible.

2. Search flow
- Location and date filters still work.
- Copy refers to service booking (not travel lodging).

3. Service detail
- Pricing language is per day.
- Assurance copy is RobotX-branded.

4. Create-service flow
- Non-admin users cannot create or mutate service records.
- Admin users can create records with valid category values.

5. Booking flow
- Booking still requires date range and computes total price.
- Reservation/trips/favorites pages render without regressions.

6. Navigation and branding
- Navbar/footer include `robotxshop.com` CTA.
- Metadata and major page headings reflect RobotX branding.

7. Supabase control readiness
- Required Supabase env vars report as set.
- Any missing/empty variable is called out before attempting Supabase operations.
- Destructive Supabase actions are not run without explicit user confirmation.

## Evidence required in PR notes
- Commands run + pass/fail.
- Screenshots or logs for manual checks.
- Explicit list of deferred out-of-scope items.
