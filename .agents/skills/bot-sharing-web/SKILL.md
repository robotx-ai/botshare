---
name: bot-sharing-web
description: Use when working on the BotShare (botsharing.us) Next.js web app — enforcing terminology, category constraints, white/gray/black theme colors, provider-owned service policy with admin oversight, Supabase operations, and regression validation.
---

# BotShare Web Standards

## When to use this skill
Use this skill when any request includes:
- Updating service taxonomy, category filters, booking copy, or service detail text.
- Updating or normalizing UI theme colors to white/gray/black.
- Enforcing BotShare provider-ownership and admin-oversight rules for service catalog endpoints and booking-management surfaces.
- Running Supabase checks/migrations/policies for this repo.
- Running QA checks to detect regressions in wording, taxonomy, or authorization.

## Workflow
Follow this sequence unless the user requests a narrower scope.

### 1. Check for terminology drift
- Run `scripts/find_legacy_terms.sh <repo_path>`.
- Review any hits and fix customer-facing copy immediately.

### 2. Update taxonomy sources
- Canonical categories are fixed to:
  - `Showcase & Performance`
  - `Warehouse`
  - `Restaurant`
- Update category constants/UI filters first.
- Keep route/API shapes unchanged in MVP.
- Run `scripts/validate_service_categories.sh <repo_path>`.

### 3. Rebrand booking and service copy
- Prioritize user-facing components:
  - category/filter chips
  - search modal
  - create-service modal
  - listing/service cards
  - listing/service detail page
  - navbar/footer CTAs
- Apply canonical terminology map from `references/term-map.md`.

### 4. Normalize theme colors
- Set user-facing palette to white/gray/black only.
- Replace legacy accent colors (for example rose/coral/indigo/blue) with neutral grayscale classes or tokens.
- Prefer centralized theme tokens in Tailwind/CSS over scattered hardcoded hex values.
- Verify there are no non-neutral color regressions in updated files.

### 5. Enforce catalog ownership rules
- Providers can manage only their own services in MVP.
- Providers can view and manage bookings on their own services.
- Customers cannot create/edit/delete services or manage another operator's bookings.
- Admins retain full catalog and booking oversight through `ADMIN_EMAILS`.
- Enforce ownership checks at API layer even if UI is hidden.

### 6. Validate
- Run quality checks:
  - `npm run lint`
  - `npm run build`
- Execute smoke scenarios from `references/qa-checklist.md`.
- Deploy to preview before promoting to production:
  - `npm run deploy:preview` — preview deploy
  - `npm run deploy:prod` — production deploy (only after preview is verified)

### 7. Supabase operations (when requested)
- Confirm env readiness with `scripts/check_supabase_env.sh <repo_path>`.
- Use `SUPABASE_URL` if present, otherwise use `NEXT_PUBLIC_SUPABASE_URL`.
- Apply non-destructive checks first (introspection, policy verification, migration dry checks).
- Treat destructive/production-impacting actions as confirmation-required.

### 8. Report
Provide:
- file-level patch summary
- validation evidence
- unresolved risks or deferred items (especially anything in out-of-scope list)

## Rules
- Preserve existing route and API paths.
- Do not run schema migrations unless explicitly requested.
- Keep Prisma models structurally unchanged unless explicitly requested.
- `Listing.category` must map to one of the 3 BotShare service categories.
- `Listing.price` is per-day service pricing.
- `locationValue` is service coverage area.
- Provider access must be scoped to records they own unless the user is an admin.
- No banned terms in user-facing copy (see `references/term-map.md`).
- Theme colors in user-facing UI must stay within white/gray/black unless explicitly requested otherwise.
- Never expose Supabase secret values in outputs.

## Required references
- `references/term-map.md`
- `references/repo-hotspots.md`
- `references/qa-checklist.md`
- `references/acceptance-criteria.md`
- `references/supabase-operations.md`

## Expected output format
For migration tasks, output should include:
1. Files changed and why.
2. Commands run and key results.
3. Acceptance criteria pass/fail summary.
4. Explicit deferred items tied to out-of-scope policy.
