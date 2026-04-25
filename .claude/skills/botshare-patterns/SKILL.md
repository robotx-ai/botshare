---
name: botshare-patterns
description: Descriptive coding patterns, commit conventions, architecture hotspots, and workflow templates extracted from the BotShare repository git history. Complement to bot-sharing-web (which holds prescriptive standards).
version: 1.0.0
source: local-git-analysis
analyzed_commits: 47
---

# BotShare Patterns

Robot service rental booking platform (`botsharing.us`). Next.js 13 hybrid (App Router + Pages Router), Prisma + Supabase Postgres, NextAuth, Tailwind.

See also: `bot-sharing-web` skill — the prescriptive side (terminology, categories, theme, access-control rules). This file documents *how the team actually works* based on commit history.

## Commit Conventions

Conventional Commits for recent work. 24 of ~35 analyzable commits use `feat:`; secondary types `fix:`, `chore:`, `docs:`. Older commits were freeform prose — do not imitate.

Prefix rules:
- `feat:` — new user-facing capability or new server action/route
- `fix:` — bug fix, code-review follow-up
- `docs:` — planning/design specs, spec corrections (kept in `.claude/skills/*/references/` or `docs/`)
- `chore:` — gitignore, dependency bumps, skill file updates
- `refactor:` — structural change, no behavior change

Body: one short line describing *what*, not *why*. Title length routinely 60-120 chars; no hard cap observed.

## Code Architecture

```
app/
├── actions/            # server data fetchers — get* prefix (getListings, getReservations, getAllReservations, getCurrentUser)
├── admin/              # admin-only routes (orders, etc.)
├── api/                # App Router API routes (listings, reservations, favorites, register)
├── checkout/           # Stripe checkout pages
├── listings/[listingId]/
├── services/           # browse/filter catalog
├── trips/ reservations/ favorites/ my-listings/   # authenticated user views
└── layout.tsx          # mounts modals conditionally (admin-only RentModal)

pages/api/
└── auth/[...nextauth].ts   # only legacy Pages Router endpoint

components/
├── Button.tsx, Heading.tsx, Container.tsx ...   # shared primitives at top level
├── inputs/             # form inputs
├── listing/            # ListingCard + detail sub-components
├── models/             # modal dialogs (Login, Register, Rent, Search)
├── navbar/             # Navbar, Categories, Search, UserMenu, Logo
└── robot-types/        # landing-section pieces

hook/                   # Zustand modal stores + small utilities
lib/                    # adminAuth, serviceCategories, serviceLocation, writeGuard, prismadb
prisma/                 # schema.prisma, seed.js, migrations
scripts/                # one-off data scripts (duplicate-ca-to-fl.js, expand-fl-listings.js)
.claude/skills/         # repo-local Claude skills (e.g. bot-sharing-web)
```

Hot files (change frequency over 200 commits): `components/navbar/UserMenu.tsx`, `prisma/schema.prisma`, `components/ListingClient.tsx`, `app/api/listings/route.ts`, `components/navbar/Search.tsx`, `components/navbar/Categories.tsx`. Treat these as interface surfaces — changes there ripple widely.

## Workflows

### Spec-before-code for non-trivial features

Admin Orders page flow (6+ sequential commits) is the template:
1. `docs:` design spec to `.claude/skills/*/references/` or `docs/`
2. `docs:` spec corrections after review
3. `feat:` add type (`SafeAdminReservation`)
4. `feat:` add server action (`getAllReservations`)
5. `feat:` wire middleware matcher
6. `feat:` add API route mutation (DELETE admin override)
7. `feat:` add each UI subcomponent as a separate commit (`FilterBar`, `OrdersTable`, `OrdersClient`)
8. `feat:` final server-component page
9. `feat:` nav link
10. `fix:` code-review fixes

Apply for: new authenticated pages, role-gated flows, payment surfaces.

### Adding a new listings filter

1. Extend `app/actions/getListings.ts` query shape
2. Add lib helper in `lib/` if reusable (e.g. `serviceLocation.ts` for zip proximity)
3. Add UI input under `components/inputs/` or `components/navbar/`
4. Thread URL search param through `components/navbar/Search.tsx`

### Schema change

1. Edit `prisma/schema.prisma`
2. Generate migration (Supabase)
3. Update `app/actions/` fetchers — preserve shapes of `/listings/[listingId]`, `/api/listings`, `/api/reservations`
4. Respect `writeGuard` read-only lock when migrating

### Data backfill / one-off

Drop a script in `scripts/` (plain `.js`, not wired to build). Examples: `duplicate-ca-to-fl.js`, `expand-fl-listings.js`. Scripts connect via `DATABASE_URL` and exit.

## Testing Patterns

No automated test suite observed in git history. Pre-merge gate is `npm run lint`. Production verification path:

1. `npm run build` locally
2. `npm run deploy:preview` (safe, no live impact)
3. Manual QA against preview URL
4. `npm run deploy:prod` only after preview verified

Future test additions should live alongside source (`__tests__/` or `.test.ts` suffix) and hit 80%+ per global rules.

## Deploy Topology

- Netlify site `147defb9`
- Supabase project `jylxrvwxsjehthsqswib`
- Env managed in Netlify dashboard (DATABASE_URL, SUPABASE_*, NEXTAUTH_URL, ADMIN_EMAILS, CLOUDINARY_*)
- Local `.env` is dev-only

## Red Flags in PRs

- New UI color outside white/gray/black palette
- User-facing string using banned terminology (see `bot-sharing-web` skill)
- New category added to `serviceCategories.ts`
- Service mutation route missing `isAdminEmail()` check
- Video file added to `public/videos/`
- Prisma schema redesign without explicit request
- Change to route shape `/listings/[listingId]`, `/api/listings`, `/api/reservations`
