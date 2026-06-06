# Customer Terms Acceptance at Sign-Up

**Date:** 2026-06-05
**Status:** Approved design — ready for plan

## Background

The current sign-up modal (`components/models/RegisterModal.tsx`) has two steps:

1. Choose role: **Rent a Robot** (CUSTOMER) or **List my Robot** (PROVIDER).
2. Fill email/name/password (+ optional phone/business name for PROVIDER) and submit.

Submission posts to `POST /api/register`, which hashes the password and creates a `User` row. No terms acceptance is recorded today.

The source document `BotSharing Robot Rental Platform Terms` (extracted from `BotSharing_Rental_Terms_1.docx`) covers Platform Operator, Equipment Owner, and Customer responsibilities. Section 16 specifies that acceptance occurs "by clicking 'I Agree' (or a similar control) or by registering."

## Goal

Customers signing up via the **Rent a Robot** path must explicitly agree to the BotSharing Rental Terms before their account is created. Acceptance must be persisted (timestamp + document version) for legal defensibility and to enable future re-acceptance prompts when the document changes.

## Non-Goals

- PROVIDER sign-up flow changes (out of scope; preserve current behavior).
- Re-prompting existing users on terms updates (deferred — schema supports it via version comparison, but the UI/flow is not part of this work).
- Footer link to `/terms`, marketing surfaces, or SEO metadata polish beyond what's needed for the page to render.
- Localization of the terms text.

## Design

### 1. Terms content module

**New file:** `lib/termsContent.tsx`

Exports:

- `TERMS_VERSION` — a string constant identifying the document version. Initial value: `"2026-06-05"`. Bumped whenever the legal text changes.
- `TermsContent` — a React component that renders the full terms text as semantic HTML (headings + paragraphs). No styling logic inside; callers wrap it in their own prose container.

Storing the document as a TSX component (rather than markdown + a renderer) avoids a new dependency and keeps the version constant co-located with the text.

### 2. Dedicated `/terms` page

**New file:** `app/terms/page.tsx`

Server component. Renders `<TermsContent />` inside a centered, max-width prose container using the existing white/gray/black palette (per CLAUDE.md theme constraint). Plain text-only page — no auth required, no interactive elements. Sets a sensible `<title>` via Next.js metadata.

Path: `/terms`. Used by the sign-up modal's "BotSharing Terms" link (opens in a new tab).

### 3. Sign-up modal change

**File:** `components/models/RegisterModal.tsx`

Changes apply **only when `userType === "CUSTOMER"`** in step 2. PROVIDER flow is untouched.

- Add `agreed: false` to `useForm` `defaultValues`.
- Below the password input (CUSTOMER branch only), render a checkbox row:
  - Checkbox bound via `register("agreed")`.
  - Label: `I have read and agree to the BotSharing Terms` where "BotSharing Terms" is a link to `/terms` (`target="_blank"`, `rel="noopener noreferrer"`).
- Use `watch("agreed")` to control the submit button's disabled state. The `Modal`'s `disabled` prop already exists — pass `isLoading || (userType === "CUSTOMER" && !watch("agreed"))`.
- In `onSubmit`, when `userType === "CUSTOMER"`, include `termsVersion: TERMS_VERSION` in the POST body. PROVIDER payload is unchanged.

### 4. Schema change

**File:** `prisma/schema.prisma`

Add two nullable fields to `User`:

```prisma
termsAcceptedAt        DateTime?
termsAcceptedVersion   String?
```

Both nullable so existing user rows and the PROVIDER path remain valid without backfill.

### 5. Register API

**File:** `app/api/register/route.ts`

- When `userType === "CUSTOMER"`:
  - Require `termsVersion` to be a non-empty string in the request body. If missing, return `400 { error: "You must accept the Terms to continue." }`.
  - On `prisma.user.create`, set `termsAcceptedAt: new Date()` and `termsAcceptedVersion: body.termsVersion`.
- When `userType === "PROVIDER"`:
  - No terms validation. Do not set the new fields.
- All existing validation (userType check, password hash, writeGuard) is preserved.

### 6. Migration

A Prisma migration is required after the schema change:

```
npx prisma migrate dev --name add_terms_acceptance
```

The agent that implements this work will **write** the schema change and **draft** the migration command, but will not run it against Supabase. The user runs the migration when ready.

## Data Flow

```
User opens RegisterModal
  └─ Step 1: clicks "Rent a Robot" → userType = "CUSTOMER"
  └─ Step 2: fills email/name/password, ticks "I agree" checkbox
       (link to /terms available; opens new tab)
  └─ Submit button enables only when checkbox is ticked
  └─ POST /api/register { email, name, password, userType: "CUSTOMER", termsVersion: "2026-06-05" }
       └─ Server validates termsVersion present
       └─ Creates User with termsAcceptedAt = now(), termsAcceptedVersion = "2026-06-05"
  └─ Toast success, open LoginModal
```

## Error Handling

| Case | Behavior |
|---|---|
| Customer submits without checkbox ticked | Submit button is disabled; cannot reach API. |
| Customer payload arrives without `termsVersion` (e.g., direct API call) | API returns 400 with explanatory error. |
| Provider sign-up | No terms field, no validation; behaves as today. |
| `writeGuard` is active | Existing 503 response from `getWritesBlockedResponse()` fires before any new logic. |
| Duplicate email | Existing behavior preserved (Prisma throws → generic 500 today; not addressed by this work). |

## Testing

Manual verification (no automated test suite exists for this flow today):

1. Open sign-up modal, pick **Rent a Robot**, attempt to submit without ticking the checkbox → submit disabled.
2. Tick the checkbox → submit enables → account creates → DB row shows `termsAcceptedAt` and `termsAcceptedVersion = "2026-06-05"`.
3. Click the "BotSharing Terms" link → `/terms` page opens in a new tab and renders the full document.
4. Pick **List my Robot**, fill the form, submit → account creates → `termsAcceptedAt` and `termsAcceptedVersion` are null (PROVIDER unchanged).
5. `curl` `POST /api/register` with `userType: "CUSTOMER"` and no `termsVersion` → 400.
6. `npm run lint` passes.

## Future Work (out of scope here)

- Re-prompt existing customers when `TERMS_VERSION` changes (compare stored version on login).
- Add a footer link to `/terms`.
- Separate Provider Terms document and acceptance flow for the PROVIDER path.
