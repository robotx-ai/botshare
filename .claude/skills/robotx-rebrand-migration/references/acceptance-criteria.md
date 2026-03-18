# Acceptance Criteria

A migration task is complete only if all criteria below pass.

## 1. Taxonomy
- Service taxonomy is constrained to:
  - `Showcase & Performance`
  - `Warehouse`
  - `Restaurant`
- Category UI uses only those values.
- API validation rejects category values outside the canonical set.

## 2. Copy integrity
- No new Airbnb terms in customer-facing copy.
- Search, listing card, listing detail, and create-service modal use RobotX service vocabulary.
- Pricing text uses per-day semantics.

## 3. Authorization
- Non-admin users receive 403 on service create/edit/delete endpoints.
- Admin authorization is controlled by `ROBOTX_ADMIN_EMAILS` allowlist.
- API authorization exists regardless of UI visibility.

## 4. Booking behavior
- Date-range booking remains functional.
- Total price calculations remain correct for day-based booking windows.
- Existing route/API shapes remain unchanged.

## 5. Regression safety
- `npm run lint` passes.
- `npm run build` passes.
- Home, detail, booking, favorites, trips/reservations, and auth flows continue to work.

## 6. Branding and domain linkage
- `robotxshare.com` branding is visible in primary app framing.
- `robotxshop.com` appears as a visible CTA in navbar/footer.
- Integration is cross-link only (no shared auth/cart).

## 7. Scope compliance
- No Prisma schema redesign included unless explicitly requested.
- No multi-provider marketplace features added.

## 8. Supabase operational readiness
- `SUPABASE_PROJECT_REF`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, and `SUPABASE_SERVICE_ROLE_KEY` are configured.
- A base URL is configured via `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`.
- Secret values are not exposed in task summaries.
- Destructive Supabase actions are executed only with explicit user approval.
