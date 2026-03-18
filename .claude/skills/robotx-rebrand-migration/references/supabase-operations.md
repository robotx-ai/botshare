# Supabase Operations

## Environment readiness
Required variables for admin control:
- `SUPABASE_PROJECT_REF`
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL` (fallback)

Use `scripts/check_supabase_env.sh <repo_path>` before Supabase actions.

## Safety policy
- Start with non-destructive operations:
  - schema introspection
  - migration/state verification
  - RLS/auth/storage policy inspection
- Destructive operations need explicit user confirmation:
  - `DROP`, `TRUNCATE`, broad `DELETE`
  - bucket deletion
  - auth provider reset
- Production-impacting operations require explicit in-thread approval.

## Project
This repo targets Supabase project `ncqmdyjchvmksxprgiut` (`robotxshare.com`).
Local `.env` should point to this project. Production env vars live in the Netlify dashboard for site `288834e5`.

- When running Supabase CLI or MCP operations, confirm `SUPABASE_PROJECT_REF=ncqmdyjchvmksxprgiut` is active before executing.

## Integration notes for this repo
- Prisma remains the schema source of truth in MVP.
- Supabase is the managed Postgres + auth/storage platform backing this app.
- Keep API route shapes unchanged while rebranding semantics.
- Prefer policy and access control updates that preserve current app behavior.

## Reporting requirements
When running Supabase tasks, report:
1. Which environment was targeted.
2. Which checks/actions were run.
3. What changed (or confirmation that no data-mutating action was executed).
4. Any follow-up risk or rollback concern.
