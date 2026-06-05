# Agreement Signing in Booking Workflow — Design

**Date:** 2026-06-06
**Status:** Approved (design), pending spec review
**Topic:** Insert tripartite robot rental agreement signing into the lease/booking flow

## Goal

Require the customer (Party C) to review and electronically sign the
**Tripartite Robot Rental Platform Agreement** as a gate before payment, with
BotSharing (Party A) and Robot X (Party B) pre-executed. Capture an immutable,
legally-defensible signing record and link it to the resulting reservation.

## Decisions (locked during brainstorming)

1. **When:** Sign *before* payment — signing gates Stripe checkout.
2. **Capture method:** Click-to-accept — scroll full agreement, type legal name +
   title, check "I agree", click Sign. Records name/title/timestamp/IP/template
   version. E-SIGN / UETA aligned; the agreement itself permits electronic
   execution (Sec. 17 "Electronic Signatures").
3. **Party A & B:** Pre-executed. Authorized signatories stored in config and
   auto-stamped (snapshotted) on every agreement. Keeps the gate instant.
4. **Stored record:** Structured DB record + versioned template. Agreement
   rendered from record on demand. PDF generated lazily on download. No blob
   storage in the hot path.
5. **Party C identity:** Collect company fields at signing — legal name, address,
   contact name, contact title (required); Tax ID (optional). B2B-correct.

## Flow

```
Reserve clicked (ListingClient)
  → AgreementModal opens
      • renders tripartite agreement, fields auto-filled from booking
      • customer fills Party C company block
      • scroll-to-bottom + required fields + typed name/title + "I agree" check
        → Sign enabled
  → POST /api/agreements
      • validates booking fields (listing exists, total > 0, dates valid)
      • generates agreementNo (TPA-YYYYMM-NNNN)
      • captures signedAt + signedIp (x-forwarded-for / x-real-ip)
      • snapshots Party A + Party B signatories into fieldSnapshot
      • writes Agreement record (status SIGNED, reservationId null)
      • respects writeGuard
      • returns { agreementId }
  → POST /api/checkout  (body now includes agreementId)
      • agreementId added to Stripe session metadata
  → Stripe Checkout
  → /checkout/success
      • creates Reservation (existing idempotent block)
      • links Agreement.reservationId = reservation.id
      • emails include link to signed agreement
```

**Orphan case:** customer signs then abandons Stripe → Agreement exists with
`reservationId = null`. Acceptable. No cleanup job for MVP (YAGNI).

## Data Model (additive — no redesign of existing models)

```prisma
model Agreement {
  id              String   @id @default(cuid())
  agreementNo     String   @unique          // TPA-YYYYMM-NNNN
  templateVersion String                    // "tripartite-v1"

  userId          String
  listingId       String
  reservationId   String?  @unique          // linked after Stripe success

  // booking snapshot (must match Stripe)
  startDate       DateTime
  endDate         DateTime
  totalPrice      Int
  tierId          String
  robotCount      Int

  // Party C captured fields
  partyCLegalName    String
  partyCTaxId        String?
  partyCAddress      String
  partyCContactName  String
  partyCContactTitle String

  // full frozen render map (A/B signatories, equipment, pricing lines,
  // governing law, etc.) — view page renders purely from this
  fieldSnapshot   Json

  // Party C signature record
  signedName      String
  signedTitle     String
  signedAt        DateTime @default(now())
  signedIp        String?

  status          String   @default("SIGNED")   // SIGNED | (future VOID)
  createdAt       DateTime @default(now())

  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  listing     Listing      @relation(fields: [listingId], references: [id], onDelete: Cascade)
  reservation Reservation? @relation(fields: [reservationId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([listingId])
  @@index([reservationId])
}
```

Back-relations added to `User`, `Listing`, `Reservation` (`agreement Agreement?`).

- `fieldSnapshot` freezes the full rendered field map so future template/config
  edits never alter historical agreements.
- `agreementNo`: `TPA-` + YYYYMM + zero-padded monthly sequence.
- Party A/B signatories sourced from `lib/agreementParties.ts`, snapshotted at
  sign time.
- Migration is purely additive and safe. `writeGuard` lock honored in API route.

## Field Mapping (template placeholder → source)

| Contract field | Source |
|---|---|
| Agreement No. | generated `TPA-YYYYMM-NNNN` |
| Date of Agreement | sign date |
| Commencement / Expiry | booking `startDate` / `endDate` |
| Equipment / Robot Model | `listing.title` (+ `robotModel.ts` if derivable) |
| Quantity | `robotCount` |
| Serial No. | fixed placeholder "To be assigned at shipment" |
| Condition | template default "Good – Pre-rental Inspection Required" |
| Delivery / Deployment Location | `listing.locationValue` (+ zip/city/state) |
| Governing Law / venue State | deployment state from listing; fallback platform default const |
| Rental Charges | `totalPrice` |
| Shipping / Platform Fee / Taxes / Deposit | omitted MVP — "$ —" / "If applicable" |
| Total Amount Due | `totalPrice` |
| Party A block | `lib/agreementParties.ts` (BotSharing) |
| Party B block | `lib/agreementParties.ts` (Robot X) |
| Party C block | customer-entered fields |
| Term duration | computed from date diff |

**MVP field decisions:**
1. Single `totalPrice` → Rental Charges; no line-item split, no deposit collected
   at booking (Stripe charges one total today).
2. Governing law derived from deployment state; fallback to a platform default
   constant when unresolvable.
3. Serial numbers always placeholder (assigned at dispatch per contract Sec. 3).
4. Party A/B entity details seeded as clearly-marked TODO placeholders in
   `lib/agreementParties.ts`; real values filled before go-live.

## Modules

| File | Purpose |
|---|---|
| `prisma/schema.prisma` | `Agreement` model + back-relations |
| `lib/agreementTemplate.ts` | clause text + placeholder map + `tripartite-v1` version const; field-mapping builder |
| `lib/agreementParties.ts` | Party A + Party B entity/signatory config + platform default governing-law state |
| `app/api/agreements/route.ts` | POST create+sign; auth, validation, agreementNo gen, IP capture, snapshot, writeGuard |
| `components/models/AgreementModal.tsx` | signing UI (full-screen scrollable, sign gate) |
| `hook/useAgreementModal.ts` | Zustand store (matches existing modal pattern) |
| `app/agreements/[id]/page.tsx` | view rendered signed agreement (owner/admin) |
| `app/agreements/[id]/pdf/route.ts` | lazy PDF generation on download |
| `app/api/checkout/route.ts` | thread `agreementId` into Stripe metadata |
| `app/checkout/success/page.tsx` | link `Agreement.reservationId` after reservation create |
| `components/ListingClient.tsx` | `onCreateReservation` opens AgreementModal instead of calling checkout directly |
| `app/admin/orders/*` | add agreement link per order row |
| `lib/email.ts` | add signed-agreement link to customer + admin emails |

## Signing UI

`AgreementModal` reuses existing `Modal` + `hook/` Zustand pattern. White/gray/
black theme only.

- Top: booking summary (equipment, dates, total).
- Body: Party C company form (legal name\*, address\*, contact name\*, title\*,
  Tax ID optional) → full rendered agreement with auto-filled fields inline.
- **Sign gate** — button enabled only when ALL true:
  (a) scrolled to bottom of agreement, (b) required Party C fields filled,
  (c) typed legal name + title present, (d) "I have read and agree" checked.
- Sign → POST `/api/agreements` → on success POST `/api/checkout` with
  `agreementId` → redirect Stripe (spinner persists through nav, as today).
- Cancel → close, no record, return to listing.

## Server: /api/agreements

- Auth required (`getCurrentUser`); 401 otherwise.
- Re-validate booking fields (mirror checkout: listing exists, `totalPrice > 0`,
  valid dates) — never trust client.
- Generate `agreementNo`.
- Capture IP from `x-forwarded-for` (first hop) / `x-real-ip`.
- Snapshot Party A/B from config into `fieldSnapshot`.
- Honor `writeGuard` (read-only migration lock) — return blocked response.
- Write record; return `{ agreementId }`.

## View / Admin / Email

- `/agreements/[id]`: renders from record `fieldSnapshot`. Access = owner
  (`userId === currentUser.id`) or admin (`isAdminEmail`); else redirect/404.
  "Download PDF" button.
- Lazy PDF: `/agreements/[id]/pdf` generates on demand. Implementation approach
  (print-css headless vs light server PDF lib) chosen at impl, isolated behind
  one module. Never blocks booking.
- Admin `/admin/orders`: each order row links to its agreement when present.
- Emails (`lib/email.ts`): customer confirmation + admin notification gain a line
  + link to the signed agreement.

## Testing

- **Unit:** agreementNo generation, template field mapping, sign-gate logic, IP
  parsing, governing-law derivation/fallback.
- **Integration:** `/api/agreements` (auth, validation, writeGuard, record shape);
  success-page reservation→agreement linking; checkout metadata threading.
- **E2E (Playwright):** reserve → sign → checkout happy path; cancel path;
  abandon-payment orphan (agreement with null reservationId).

## Terminology / Constraints

- User-facing copy follows AGENTS.md terminology (service, booking, customer,
  per day; no host/guest/property). Note: legal contract text is a fixed external
  document — its wording is reproduced verbatim and is exempt from copy rewrites.
- Theme: white/gray/black only.
- Access control: signing requires authenticated user; agreement view gated to
  owner or admin.
- No existing Prisma model redesigned; no existing route shapes changed (only
  additive metadata field on checkout body).

## Out of Scope (YAGNI)

- Orphan-agreement cleanup job.
- Party B async countersignature workflow.
- Multi-currency, deposit collection, line-item pricing split.
- Third-party e-sign (DocuSign) integration.
- Agreement amendment / re-signing on booking change.
