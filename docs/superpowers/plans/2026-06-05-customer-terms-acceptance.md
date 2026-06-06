# Customer Terms Acceptance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require CUSTOMER users to accept the BotSharing Rental Terms at sign-up via a gated checkbox, persist acceptance (timestamp + version), and expose the full document at `/terms`.

**Architecture:** Single source of truth for the document text (`lib/termsContent.tsx`) exports both the `TERMS_VERSION` string and a React component used by the public `/terms` page and (indirectly, for the version constant) by the sign-up modal. The CUSTOMER branch of `RegisterModal` gains a checkbox that controls submit-button disabled state; on submit, the version is sent to `/api/register`, which validates and stores `termsAcceptedAt`/`termsAcceptedVersion` on the new `User`. PROVIDER flow is untouched.

**Tech Stack:** Next.js 13 App Router, TypeScript, Tailwind, React Hook Form, Prisma + Supabase Postgres, NextAuth.

**Testing approach:** This codebase has no automated test suite for the auth flow. Verification is `npm run lint`, `npm run build`, and the manual checks in Task 6. Each task ends with `npm run lint` to keep the working tree clean.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `lib/termsContent.tsx` | Create | Exports `TERMS_VERSION` constant and `<TermsContent />` JSX node containing the full rental terms. |
| `app/terms/page.tsx` | Create | Public, unauthenticated server-rendered page displaying `<TermsContent />` in a prose container. |
| `prisma/schema.prisma` | Modify | Adds two nullable fields to `User`: `termsAcceptedAt` and `termsAcceptedVersion`. |
| `app/api/register/route.ts` | Modify | Validates `termsVersion` for CUSTOMER signups and persists `termsAcceptedAt`/`termsAcceptedVersion`. |
| `components/models/RegisterModal.tsx` | Modify | Adds gated "I agree" checkbox to CUSTOMER step 2; submits `termsVersion` in payload. |

---

### Task 1: Terms content module

**Files:**
- Create: `lib/termsContent.tsx`

- [ ] **Step 1: Create the file with the version constant and JSX content**

Write `lib/termsContent.tsx` with the exact content below. The text is the full BotSharing Robot Rental Platform Terms; do not abridge it.

```tsx
import React from "react";

export const TERMS_VERSION = "2026-06-05";

export function TermsContent() {
  return (
    <article className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">
          BotSharing Robot Rental Platform Terms
        </h1>
        <p className="text-sm text-neutral-500">
          User Agreement &ndash; Accepted at Registration
        </p>
        <p className="text-xs text-neutral-500">
          Version {TERMS_VERSION}
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">1. About These Terms</h2>
        <p>
          These Robot Rental Platform Terms (the &ldquo;Terms&rdquo;) govern the
          relationship among three roles: BotSharing, which operates the
          platform and collects payment (the &ldquo;Platform Operator&rdquo;);
          the equipment owner that supplies, ships, and retrieves the rental
          robot(s) (the &ldquo;Equipment Owner&rdquo;); and you, the customer
          who rents and uses the robot(s) (the &ldquo;Customer&rdquo;).
        </p>
        <p>
          By creating an account, registering, or clicking &ldquo;I Agree&rdquo;
          (or a similar control), you accept these Terms on behalf of yourself
          and any entity you represent. If you do not agree, do not register or
          use the platform or the robot(s).
        </p>
        <p className="italic text-neutral-600">
          Note: This is a general template and not legal advice. State-specific
          legal review is recommended before relying on these Terms.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">2. Nature of the Transaction</h2>
        <p>
          The Equipment Owner is the owner or authorized lessor of the robot(s)
          and agrees to rent such robot(s) to the Customer under these Terms.
        </p>
        <p>
          The Platform Operator operates the BotSharing platform, facilitates
          the transaction, and is authorized by the Equipment Owner to collect
          payment from the Customer.
        </p>
        <p>
          The Equipment Owner, and not the Platform Operator, is responsible
          for shipment, fulfillment, equipment availability, equipment
          conformity, and equipment retrieval unless expressly stated otherwise.
        </p>
        <p>
          The Customer shall pay all amounts due to the Platform Operator.
          Subject to Section 3, the Platform Operator will remit the applicable
          net proceeds to the Equipment Owner.
        </p>
        <p>
          The Platform Operator acts as a platform operator and payment
          collection party, and not as the manufacturer, owner, lessor,
          warehouseman, bailee, or carrier of the robot(s), except to the
          extent it expressly undertakes a specific obligation in writing.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          3. Payment, Collection, and Remittance
        </h2>
        <h3 className="text-lg font-semibold">3.1 Payment Collection</h3>
        <p>
          The Customer authorizes the Platform Operator to collect payments due
          on behalf of the Equipment Owner and, to the extent separately
          disclosed, for the Platform Operator&rsquo;s own platform fees.
        </p>
        <p>
          The Customer&rsquo;s payment obligation for invoiced amounts is
          satisfied only to the extent cleared funds are actually received by
          the Platform Operator. If a payment is reversed, charged back,
          recalled, rejected, or not finally settled, the Customer&rsquo;s
          payment obligation is reinstated to that extent.
        </p>
        <p>
          The Platform Operator may use a third-party payment processor to
          process payments.
        </p>
        <h3 className="text-lg font-semibold">
          3.2 Remittance to the Equipment Owner
        </h3>
        <p>
          The Platform Operator shall remit to the Equipment Owner the net
          amount collected that is allocable to the Equipment Owner, less any
          agreed platform fee, payment processing fee, taxes required to be
          remitted, refunds, credits, chargebacks, reserves, or other
          authorized amounts.
        </p>
        <p>
          Unless agreed otherwise in writing, remittance shall be made within
          five (5) business days after the later of: (i) receipt of cleared
          funds from the Customer; and (ii) the Equipment Owner&rsquo;s
          confirmation of the shipment or delivery milestone required by the
          applicable order.
        </p>
        <p>
          The Platform Operator may temporarily withhold or reserve amounts
          reasonably necessary to cover payment disputes, fraud review,
          chargebacks, refunds, taxes, or claimed breaches.
        </p>
        <h3 className="text-lg font-semibold">
          3.3 Deposit and Refund Handling
        </h3>
        <p>
          If a security deposit is required, the Platform Operator may collect
          and hold the deposit and apply it, in whole or in part, to unpaid
          charges, damage claims, late return charges, cleaning charges, repair
          costs, or other amounts properly payable.
        </p>
        <p>
          Any undisputed remaining balance of a deposit shall be returned to
          the Customer within fifteen (15) business days after final equipment
          return, inspection, and reconciliation.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          4. Shipment, Delivery, Acceptance, and Return
        </h2>
        <p>
          The Equipment Owner shall package, ship, and arrange delivery of the
          robot(s) to the agreed delivery location.
        </p>
        <p>
          Unless otherwise agreed in writing, the Equipment Owner bears the
          risk of loss or damage in transit until the robot(s) are delivered to
          the Customer or the Customer&rsquo;s designated site representative.
        </p>
        <p>
          The Customer shall inspect the robot(s) promptly upon delivery and
          notify both the Platform Operator and the Equipment Owner in writing
          of any visible damage, shortage, or non-conformity no later than two
          (2) business days after delivery.
        </p>
        <p>
          If the Customer fails to reject the robot(s) with reasonably specific
          written notice within that period, the robot(s) will be deemed
          accepted, subject to latent defects not reasonably discoverable upon
          delivery inspection.
        </p>
        <p>
          At the end of the rental term, the Equipment Owner shall coordinate
          return shipping, retrieval, or pickup unless the parties agree
          otherwise in writing. The Customer shall make the robot(s) available
          in the same condition as received, ordinary wear and tear excepted.
        </p>
        <p>
          The Platform Operator is not the carrier, shipper, or warehouse
          provider unless it separately agrees in writing to perform those
          functions.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          5. Title, Possession, and Risk of Loss During Rental
        </h2>
        <p>
          Title to the robot(s) remains at all times with the Equipment Owner
          or its licensors. No ownership rights transfer to the Customer.
        </p>
        <p>
          The Customer obtains only a temporary right to possess and use the
          robot(s) during the rental term and only for the permitted purpose.
        </p>
        <p>
          After delivery and acceptance, the Customer bears risk of loss,
          theft, confiscation, misuse, or damage to the robot(s) until they are
          returned to or collected by the Equipment Owner&rsquo;s authorized
          carrier, except to the extent caused by the Equipment Owner&rsquo;s
          defective packaging, latent defects, or the Platform Operator&rsquo;s
          or Equipment Owner&rsquo;s own negligence or misconduct.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          6. Use Restrictions, Site Obligations, and Compliance
        </h2>
        <p>
          The Customer shall use the robot(s) only for lawful business purposes
          and only at the approved deployment location unless the Equipment
          Owner gives prior written consent to relocation.
        </p>
        <p>
          The Customer shall provide a reasonably safe, suitable, and
          code-compliant site environment, including power, connectivity, floor
          conditions, clearances, and supervision reasonably required for
          deployment.
        </p>
        <p>
          The Customer shall not sublease, sublicense, sell, pledge, encumber,
          modify, disassemble, reverse engineer, or permit unauthorized third
          parties to access or operate the robot(s), except as expressly
          approved in writing by the Equipment Owner.
        </p>
        <p>
          Each party shall comply with all applicable federal, state, and local
          laws and regulations relevant to its own performance.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          7. Maintenance, Support, and Operational Responsibility
        </h2>
        <p>
          The Equipment Owner is responsible for the equipment&rsquo;s baseline
          condition at shipment, routine maintenance requirements disclosed
          before shipment, and repair of defects arising from ordinary wear and
          tear.
        </p>
        <p>
          The Equipment Owner shall provide remote support during standard
          business hours and shall use commercially reasonable efforts to
          address technical issues reported by the Customer.
        </p>
        <p>
          Unless separately contracted, the Platform Operator does not provide
          hardware maintenance, field service, or performance warranties for
          the robot(s).
        </p>
        <p>
          Damage caused by misuse, unauthorized modification, improper storage,
          improper charging, environmental exposure outside specifications,
          collision, neglect, or site hazards attributable to the Customer will
          be chargeable to the Customer.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          8. Data, Software Access, and Privacy
        </h2>
        <p>
          The Platform Operator may provide the Customer access to the
          BotSharing platform solely for account management, order tracking,
          payment management, support tickets, and other platform functions
          made available.
        </p>
        <p>
          The Equipment Owner may provide the Customer access to robot-specific
          software, firmware interfaces, or operational dashboards solely for
          use with the rented robot(s).
        </p>
        <p>
          Each party shall comply with applicable U.S. federal, state, and
          local privacy and data-security laws with respect to personal
          information and business data it handles.
        </p>
        <p>
          The Customer is responsible for any notices or consents legally
          required at the deployment site in connection with cameras, sensors,
          telemetry, voice, or other data-collection features of the robot(s),
          unless the parties expressly allocate that responsibility differently
          in writing.
        </p>
        <p>
          As between the Platform Operator and the Equipment Owner, the
          Platform Operator owns the BotSharing platform and the Equipment
          Owner owns its equipment, firmware, and equipment-specific
          operational materials. As between the Equipment Owner and the
          Customer, the Equipment Owner retains ownership of all embedded
          software and intellectual property in the robot(s).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          9. Representations, Warranties, and Disclaimers
        </h2>
        <p>
          <strong>Mutual Authority.</strong> Each party represents that it is
          duly organized, validly existing, and authorized to enter into and
          perform these Terms.
        </p>
        <p>
          <strong>Equipment Warranties.</strong> The Equipment Owner represents
          that, as of shipment, it has the right to lease the robot(s) and that
          the robot(s) will substantially conform to the agreed description,
          subject to routine configuration, setup, consumables, calibration,
          and disclosed operating limitations.
        </p>
        <p>
          <strong>Platform Warranties.</strong> The Platform Operator
          represents that it has authority to operate the BotSharing platform
          and to collect payments in the manner described herein.
        </p>
        <p>
          <strong>Customer Warranties.</strong> The Customer represents that it
          has authority to rent the robot(s), that the deployment site is
          suitable for the intended use, and that it will use the robot(s) in
          compliance with these Terms and applicable law.
        </p>
        <p className="uppercase text-sm">
          Disclaimer. Except as expressly set forth in these Terms, the
          BotSharing platform, the robot(s), and any related services are
          provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; and each
          of the Platform Operator and the Equipment Owner disclaims all
          implied warranties to the maximum extent permitted by law, including
          implied warranties of merchantability, fitness for a particular
          purpose, title, and non-infringement. Nothing in this section limits
          any warranty that cannot lawfully be disclaimed.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          10. Taxes, Chargebacks, and Disputes
        </h2>
        <p>
          The Customer shall pay all applicable sales, use, excise,
          transaction, and similar indirect taxes arising from the rental
          transaction, except taxes based on the Platform Operator&rsquo;s or
          Equipment Owner&rsquo;s net income.
        </p>
        <p>
          The Customer shall not initiate a chargeback or payment dispute
          except in good faith, and shall first provide written notice to the
          Platform Operator and the Equipment Owner describing the alleged
          issue in reasonable detail.
        </p>
        <p>
          If a chargeback, ACH reversal, card dispute, fraud claim, or other
          payment reversal occurs, the Platform Operator may offset or recover
          the affected amount from future remittances, deposits, or directly
          from the Customer, as applicable.
        </p>
        <p>
          The Equipment Owner shall reasonably cooperate with the Platform
          Operator in defending valid charges, responding to payment disputes,
          and substantiating shipment, delivery, acceptance, damage claims, and
          performance history.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">11. Termination</h2>
        <p>
          <strong>Expiry.</strong> These Terms (as applied to a given rental)
          expire automatically at the end of the rental term unless earlier
          terminated or extended in writing.
        </p>
        <p>
          <strong>Termination for Cause.</strong> Any non-breaching party may
          terminate upon written notice if another party materially breaches
          and fails to cure within ten (10) business days after receiving
          written notice, except that no cure period is required for fraud,
          intentional misuse of the robot(s), or unauthorized transfer of the
          robot(s).
        </p>
        <p>
          <strong>Insolvency and Risk Events.</strong> The Platform Operator or
          the Equipment Owner may suspend performance or terminate immediately
          upon written notice if the Customer becomes insolvent, ceases
          business operations, files for bankruptcy protection, or if continued
          deployment presents a material safety, legal, or payment-collection
          risk.
        </p>
        <p>
          <strong>Effect of Termination.</strong> The Customer shall
          immediately cease use of the robot(s) and cooperate in return or
          retrieval. The Platform Operator may withhold or apply funds it holds
          to outstanding fees, refunds, damage claims, or other obligations
          reasonably due. Accrued payment obligations, indemnities,
          confidentiality duties, liability limitations, and provisions that by
          their nature should survive will survive termination.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          12. Liability Allocation and Indemnification
        </h2>
        <p>
          The Platform Operator shall not be liable for equipment defects,
          shipment delays caused by the Equipment Owner or a carrier, site
          conditions, misuse by the Customer, or downtime arising from the
          Equipment Owner&rsquo;s equipment performance, except to the extent
          directly caused by the Platform Operator&rsquo;s own breach, fraud,
          or gross negligence.
        </p>
        <p>
          The Equipment Owner shall not be liable for payment processor
          outages, platform downtime attributable solely to the Platform
          Operator, or the Customer&rsquo;s misuse, improper site conditions,
          or unauthorized modifications.
        </p>
        <p>
          The Customer shall be liable for damage, theft, misuse, loss, and
          third-party claims arising from the Customer&rsquo;s operation,
          possession, or site control of the robot(s), except to the extent
          caused by the Platform Operator&rsquo;s or Equipment Owner&rsquo;s
          breach, negligence, product defect, or willful misconduct.
        </p>
        <p>
          Each party (the &ldquo;Indemnifying Party&rdquo;) shall defend,
          indemnify, and hold harmless the other parties and their respective
          officers, directors, employees, and agents from third-party claims,
          losses, damages, liabilities, and reasonable attorneys&rsquo; fees to
          the extent arising out of: (i) the Indemnifying Party&rsquo;s breach
          of these Terms; (ii) its negligence or willful misconduct; or (iii)
          its violation of law.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">13. Limitation of Liability</h2>
        <p className="uppercase text-sm">
          To the maximum extent permitted by law, neither the Platform Operator
          nor the Equipment Owner shall be liable to the other parties for any
          indirect, incidental, special, consequential, exemplary, or punitive
          damages, or for lost profits, lost revenue, loss of use, or business
          interruption, arising out of or relating to these Terms.
        </p>
        <p className="uppercase text-sm">
          To the maximum extent permitted by law, the Platform Operator&rsquo;s
          aggregate liability arising out of or relating to these Terms shall
          not exceed the total platform fees actually received by the Platform
          Operator.
        </p>
        <p className="uppercase text-sm">
          To the maximum extent permitted by law, the Equipment Owner&rsquo;s
          aggregate liability arising out of or relating to these Terms shall
          not exceed the total rental charges actually received by the
          Equipment Owner through the Platform Operator.
        </p>
        <p>
          The liability limitations in this Section do not apply to fraud,
          willful misconduct, gross negligence where non-waivable, unpaid
          amounts owed by the Customer, or a party&rsquo;s indemnification
          obligations to the extent such limitations are prohibited by law.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          14. Governing Law and Dispute Resolution
        </h2>
        <p>
          These Terms shall be governed by and construed in accordance with the
          laws of the applicable U.S. State designated by the Platform
          Operator, without regard to conflict-of-laws rules. The parties shall
          first attempt in good faith to resolve disputes through business
          negotiations. If a dispute is not resolved within thirty (30) days
          after written notice of dispute, any party may bring the dispute
          exclusively in the state or federal courts located in that State,
          and each party consents to personal jurisdiction and venue in those
          courts.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">15. General Provisions</h2>
        <p>
          <strong>Entire Agreement.</strong> These Terms, together with any
          schedules, order forms, and appendices, constitute the entire
          agreement among the parties with respect to the subject matter.
        </p>
        <p>
          <strong>Order of Precedence.</strong> If there is a conflict between
          these Terms and an order form or checkout confirmation, these Terms
          control unless the later document expressly states that it amends
          these Terms.
        </p>
        <p>
          <strong>Amendments.</strong> Any amendment must be in writing and
          agreed by the parties materially affected by it. The Platform
          Operator may update these Terms prospectively by posting an updated
          version and obtaining the Customer&rsquo;s acceptance.
        </p>
        <p>
          <strong>Assignment.</strong> The Customer may not assign these Terms
          without prior written consent from the Platform Operator and the
          Equipment Owner. The Platform Operator or the Equipment Owner may
          assign these Terms to an affiliate or successor in connection with a
          merger, reorganization, or sale of substantially all relevant assets
          upon written notice.
        </p>
        <p>
          <strong>Independent Contractors.</strong> The parties are independent
          contractors. Nothing creates a partnership, joint venture, fiduciary
          relationship, employment relationship, agency relationship between
          the Equipment Owner and the Customer, or a bailment or common-carrier
          obligation on the part of the Platform Operator.
        </p>
        <p>
          <strong>Notices.</strong> Formal notices must be sent by email with
          confirmation of transmission, recognized overnight courier, or
          certified mail to the contacts on file.
        </p>
        <p>
          <strong>Electronic Acceptance.</strong> The parties agree that these
          Terms may be accepted and executed electronically, including by
          clicking &ldquo;I Agree&rdquo; at registration or checkout, and that
          such acceptance has the same legal effect as a handwritten signature.
        </p>
        <p>
          <strong>Severability.</strong> If any provision is held
          unenforceable, the remaining provisions shall remain in effect to
          the fullest extent permitted by law.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">16. Acceptance</h2>
        <p>
          By clicking &ldquo;I Agree&rdquo; (or a similar control) or by
          registering for or using the BotSharing platform, you acknowledge
          that you have read, understood, and agree to be bound by these Terms.
        </p>
      </section>
    </article>
  );
}
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: PASS (no new warnings).

- [ ] **Step 3: Commit**

```bash
git add lib/termsContent.tsx
git commit -m "feat(terms): add BotSharing rental terms content module"
```

---

### Task 2: Public `/terms` page

**Files:**
- Create: `app/terms/page.tsx`

- [ ] **Step 1: Create the page**

Write `app/terms/page.tsx`:

```tsx
import { TermsContent } from "@/lib/termsContent";

export const metadata = {
  title: "Terms of Service | BotSharing US",
};

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12 text-neutral-800 leading-relaxed">
      <TermsContent />
    </main>
  );
}
```

- [ ] **Step 2: Lint and build**

Run: `npm run lint && npm run build`
Expected: PASS. Build output should list `/terms` as a static page.

- [ ] **Step 3: Manual smoke check**

Run: `npm run dev`
In a browser, open `http://localhost:3000/terms`.
Expected: Page loads with title "BotSharing Robot Rental Platform Terms" and all 16 sections render in white/gray/black. No console errors. Stop the dev server with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add app/terms/page.tsx
git commit -m "feat(terms): add public /terms page"
```

---

### Task 3: Prisma schema fields

**Files:**
- Modify: `prisma/schema.prisma` (User model, lines 29-45)

> **Important — do not run the migration against Supabase.** This task writes the schema change, generates the Prisma client, and *prints* the migration command. The user runs the migration manually when ready.

- [ ] **Step 1: Add the two fields to `User`**

In `prisma/schema.prisma`, after the `businessName     String?` line (currently line 40) and before `accounts         Account[]`, add:

```prisma
  termsAcceptedAt      DateTime?
  termsAcceptedVersion String?
```

The complete `User` model should read:

```prisma
model User {
  id                   String         @id @default(cuid())
  name                 String?
  email                String?        @unique
  emailVerified        DateTime?
  image                String?
  hashedPassword       String?
  createdAt            DateTime       @default(now())
  updatedAt            DateTime       @updatedAt
  userType             UserType       @default(CUSTOMER)
  phone                String?
  businessName         String?
  termsAcceptedAt      DateTime?
  termsAcceptedVersion String?
  accounts             Account[]
  listings             Listing[]
  reservations         Reservation[]
  favoriteListings     UserFavorite[]
}
```

- [ ] **Step 2: Regenerate the Prisma client**

Run: `npx prisma generate`
Expected: `✔ Generated Prisma Client` (or similar). No errors.

This makes `termsAcceptedAt` and `termsAcceptedVersion` typed and available to TypeScript before the database actually has the columns. This is safe because Task 4 only writes these fields after the user runs the migration.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 4: Stop and surface the migration command to the user**

Print the following to the user as a status update; **do not execute it**:

> Schema change is in. Before running the app against Supabase, please run:
> ```
> npx prisma migrate dev --name add_terms_acceptance
> ```
> from the project root. This adds the two nullable columns to the `User` table. Once it's applied, I'll continue with the API and modal changes.

Wait for the user to confirm they have run the migration before proceeding to Task 4.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add termsAcceptedAt and termsAcceptedVersion to User"
```

---

### Task 4: Register API — validate and persist terms acceptance

**Files:**
- Modify: `app/api/register/route.ts`

- [ ] **Step 1: Update the route**

Replace the entire contents of `app/api/register/route.ts` with:

```ts
import prisma from "@/lib/prismadb";
import { TERMS_VERSION } from "@/lib/termsContent";
import { getWritesBlockedResponse } from "@/lib/writeGuard";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const writesBlocked = getWritesBlockedResponse();
  if (writesBlocked) return writesBlocked;

  const body = await request.json();
  const { email, name, password, userType, phone, businessName, termsVersion } = body;

  if (userType !== "CUSTOMER" && userType !== "PROVIDER") {
    return NextResponse.json({ error: "Invalid user type." }, { status: 400 });
  }

  if (userType === "CUSTOMER") {
    if (typeof termsVersion !== "string" || termsVersion.length === 0) {
      return NextResponse.json(
        { error: "You must accept the Terms to continue." },
        { status: 400 }
      );
    }
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      hashedPassword,
      userType,
      ...(phone ? { phone } : {}),
      ...(businessName ? { businessName } : {}),
      ...(userType === "CUSTOMER"
        ? { termsAcceptedAt: new Date(), termsAcceptedVersion: termsVersion }
        : {}),
    },
  });

  return NextResponse.json(user);
}
```

Notes for the implementer:
- The `termsVersion` sent by the client is the authoritative value stored. The server does not coerce it to `TERMS_VERSION`. This preserves which version the user actually saw.
- `TERMS_VERSION` is imported but currently unused in this file (the client sends the value). The import is intentional to make future server-side enforcement (e.g., reject stale versions) a one-line change. **If the linter flags the unused import, remove the import line.**
- PROVIDER acceptance is intentionally not handled here (see spec § Non-Goals).

- [ ] **Step 2: Confirm the unused import status**

Run: `npm run lint`

If the linter flags `TERMS_VERSION` as unused: remove the `import { TERMS_VERSION } from "@/lib/termsContent";` line from the file, then re-run `npm run lint`.

Expected (after any fix): PASS.

- [ ] **Step 3: Manual API check**

Start the dev server: `npm run dev`

In a separate terminal, send a CUSTOMER request *without* `termsVersion`:

```bash
curl -i -X POST http://localhost:3000/api/register \
  -H 'content-type: application/json' \
  -d '{"email":"plan-test-1@example.com","name":"Plan Test","password":"x","userType":"CUSTOMER"}'
```

Expected: `HTTP/1.1 400` with body `{"error":"You must accept the Terms to continue."}`.

Send the same request *with* `termsVersion`:

```bash
curl -i -X POST http://localhost:3000/api/register \
  -H 'content-type: application/json' \
  -d '{"email":"plan-test-2@example.com","name":"Plan Test","password":"x","userType":"CUSTOMER","termsVersion":"2026-06-05"}'
```

Expected: `HTTP/1.1 200` with a JSON user including `termsAcceptedAt` (an ISO timestamp) and `termsAcceptedVersion: "2026-06-05"`.

Stop the dev server with Ctrl+C. (These two test rows can stay in the DB; they will be filtered out manually if needed.)

- [ ] **Step 4: Commit**

```bash
git add app/api/register/route.ts
git commit -m "feat(register): require terms acceptance for CUSTOMER signups"
```

---

### Task 5: RegisterModal — gated checkbox for CUSTOMER

**Files:**
- Modify: `components/models/RegisterModal.tsx`

- [ ] **Step 1: Replace the file**

Replace the entire contents of `components/models/RegisterModal.tsx` with:

```tsx
"use client";

import useLoginModel from "@/hook/useLoginModal";
import useRegisterModal from "@/hook/useRegisterModal";
import { TERMS_VERSION } from "@/lib/termsContent";
import axios from "axios";
import { useCallback, useState } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { TbRobot } from "react-icons/tb";
import { MdOutlineStorefront } from "react-icons/md";

import Button from "../Button";
import Heading from "../Heading";
import Input from "../inputs/Input";
import Modal from "./Modal";

type UserType = "CUSTOMER" | "PROVIDER";

function RegisterModal() {
  const registerModel = useRegisterModal();
  const loginModel = useLoginModel();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [userType, setUserType] = useState<UserType | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<FieldValues>({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phone: "",
      businessName: "",
      agreed: false,
    },
  });

  const agreed = watch("agreed");

  const handleClose = useCallback(() => {
    setStep(1);
    setUserType(null);
    reset();
    registerModel.onClose();
  }, [registerModel, reset]);

  const handleSelectType = useCallback((type: UserType) => {
    setUserType(type);
    setStep(2);
  }, []);

  const handleBack = useCallback(() => {
    setStep(1);
    setUserType(null);
  }, []);

  const onSubmit: SubmitHandler<FieldValues> = (data) => {
    if (!userType) return;
    if (userType === "CUSTOMER" && !data.agreed) return;
    setIsLoading(true);

    const payload: Record<string, unknown> = { ...data, userType };
    delete payload.agreed;
    if (userType === "CUSTOMER") {
      payload.termsVersion = TERMS_VERSION;
    }

    axios
      .post("/api/register", payload)
      .then(() => {
        toast.success("Account created! Please log in.");
        loginModel.onOpen();
        handleClose();
      })
      .catch(() => toast.error("Something went wrong."))
      .finally(() => setIsLoading(false));
  };

  const toggle = useCallback(() => {
    loginModel.onOpen();
    handleClose();
  }, [loginModel, handleClose]);

  const step1Body = (
    <div className="flex flex-col gap-6">
      <Heading
        title="Welcome to BotSharing US"
        subtitle="How would you like to use BotSharing US?"
        center
      />
      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => handleSelectType("CUSTOMER")}
          className="flex flex-col items-center gap-3 p-6 border-2 border-neutral-200 rounded-xl hover:border-black transition cursor-pointer text-center"
        >
          <TbRobot size={36} className="text-neutral-700" />
          <span className="font-semibold text-neutral-800">Rent a Robot</span>
          <span className="text-sm text-neutral-500 font-light">
            Find and book robot services for your needs
          </span>
        </button>
        <button
          type="button"
          onClick={() => handleSelectType("PROVIDER")}
          className="flex flex-col items-center gap-3 p-6 border-2 border-neutral-200 rounded-xl hover:border-black transition cursor-pointer text-center"
        >
          <MdOutlineStorefront size={36} className="text-neutral-700" />
          <span className="font-semibold text-neutral-800">List my Robot</span>
          <span className="text-sm text-neutral-500 font-light">
            Offer your robot services to customers
          </span>
        </button>
      </div>
    </div>
  );

  const step2Body = (
    <div className="flex flex-col gap-4">
      <Heading
        title={userType === "PROVIDER" ? "Create a provider account" : "Create an account"}
        subtitle={userType === "PROVIDER" ? "List your robot services on BotSharing US" : "Book robot services with BotSharing US"}
        center
      />
      <Input
        id="email"
        label="Email Address"
        disabled={isLoading}
        register={register}
        errors={errors}
        required
      />
      <Input
        id="name"
        label="User Name"
        disabled={isLoading}
        register={register}
        errors={errors}
        required
      />
      <Input
        id="password"
        label="Password"
        type="password"
        disabled={isLoading}
        register={register}
        errors={errors}
        required
      />
      {userType === "PROVIDER" && (
        <>
          <Input
            id="phone"
            label="Phone Number (optional)"
            disabled={isLoading}
            register={register}
            errors={errors}
          />
          <Input
            id="businessName"
            label="Business Name (optional)"
            disabled={isLoading}
            register={register}
            errors={errors}
          />
        </>
      )}
      {userType === "CUSTOMER" && (
        <label className="flex items-start gap-3 text-sm text-neutral-700 mt-1">
          <input
            type="checkbox"
            disabled={isLoading}
            className="mt-1 h-4 w-4 accent-black"
            {...register("agreed")}
          />
          <span>
            I have read and agree to the{" "}
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-neutral-900 hover:text-black"
            >
              BotSharing Terms
            </a>
            .
          </span>
        </label>
      )}
    </div>
  );

  const footerContent = (
    <div className="flex flex-col gap-4 mt-3">
      <hr />
      <div className="text-neutral-500 text-center mt-4 font-light">
        Already have an account?{" "}
        <span
          onClick={toggle}
          className="text-neutral-800 cursor-pointer hover:underline"
        >
          Log in
        </span>
      </div>
    </div>
  );

  if (step === 1) {
    return (
      <Modal
        isOpen={registerModel.isOpen}
        title="Sign Up"
        actionLabel=""
        onClose={handleClose}
        onSubmit={() => {}}
        body={step1Body}
        footer={footerContent}
      />
    );
  }

  const submitDisabled =
    isLoading || (userType === "CUSTOMER" && !agreed);

  return (
    <Modal
      disabled={submitDisabled}
      isOpen={registerModel.isOpen}
      title="Sign Up"
      actionLabel="Create Account"
      secondaryActionLabel="Back"
      secondaryAction={handleBack}
      onClose={handleClose}
      onSubmit={handleSubmit(onSubmit)}
      body={step2Body}
      footer={footerContent}
    />
  );
}

export default RegisterModal;
```

Implementation notes:
- `watch("agreed")` re-renders the parent on every checkbox toggle, which is what flips `submitDisabled`. This is intentional.
- We strip `agreed` from the payload before POSTing so the server never sees an unrecognized field.
- The `Button` import is preserved (unchanged from the original file) even though it isn't used directly in this component — it was already unused in the prior version and removing it is out of scope.

- [ ] **Step 2: Lint and build**

Run: `npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/models/RegisterModal.tsx
git commit -m "feat(register-modal): gate CUSTOMER signup on terms acceptance"
```

---

### Task 6: End-to-end manual verification

**Files:** none modified.

This task is a verification gate, not a code change. Do not skip — it is the only test of the integrated behavior.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Expected: server starts on `http://localhost:3000`.

- [ ] **Step 2: CUSTOMER — checkbox gate works**

In the browser:
1. Open the site, click the Sign Up control.
2. Click **Rent a Robot**.
3. Fill email (e.g., `e2e-customer-1@example.com`), name, password.
4. **Do not** tick the checkbox.

Expected: "Create Account" button is visibly disabled (greyed) and clicking it does nothing.

- [ ] **Step 3: CUSTOMER — terms link opens in new tab**

Click the "BotSharing Terms" link in the checkbox label.
Expected: a new tab opens at `/terms` with the full document.

- [ ] **Step 4: CUSTOMER — accept and submit succeeds**

Return to the sign-up tab. Tick the checkbox.
Expected: "Create Account" button enables.

Click "Create Account".
Expected: toast "Account created! Please log in." appears; the Login modal opens.

- [ ] **Step 5: Verify DB row**

In a separate terminal:
```bash
npx prisma studio
```
or query directly:
```bash
npx prisma db execute --schema=prisma/schema.prisma --stdin <<'SQL'
SELECT email, "userType", "termsAcceptedAt", "termsAcceptedVersion"
FROM "User"
WHERE email = 'e2e-customer-1@example.com';
SQL
```

Expected: row exists with `userType = CUSTOMER`, `termsAcceptedAt` populated with a recent timestamp, `termsAcceptedVersion = "2026-06-05"`.

- [ ] **Step 6: PROVIDER — unchanged flow**

In the browser, open Sign Up → **List my Robot** → fill email (e.g., `e2e-provider-1@example.com`), name, password.
Expected: no checkbox is shown. The "Create Account" button is enabled immediately. Submitting succeeds and the toast appears.

Verify the DB row has `userType = PROVIDER` and both `termsAcceptedAt` and `termsAcceptedVersion` are `NULL`.

- [ ] **Step 7: API rejection of malformed CUSTOMER request**

In a terminal:
```bash
curl -i -X POST http://localhost:3000/api/register \
  -H 'content-type: application/json' \
  -d '{"email":"e2e-reject@example.com","name":"x","password":"x","userType":"CUSTOMER"}'
```

Expected: `HTTP/1.1 400` and body `{"error":"You must accept the Terms to continue."}`.

- [ ] **Step 8: Stop the dev server**

Ctrl+C the `npm run dev` process.

- [ ] **Step 9: Final lint and build**

Run: `npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 10: Mark plan complete**

No new commit needed — verification produced no code changes. Report to the user that all six tasks are done, the migration has been applied, manual verification passed, and the feature is ready to ship (preview deploy or merge as appropriate).

---

## Self-review notes

- **Spec coverage:** All five files in the spec's "Files Affected" table map to tasks 1, 2, 3, 4, 5. Migration (spec § Design step 6) handled in Task 3 step 4 (drafted only, user runs). Manual testing matrix (spec § Testing) is Task 6. Future work explicitly excluded.
- **No placeholders:** Every code step shows complete file contents. The TermsContent JSX includes all 16 sections from the source doc verbatim.
- **Type consistency:** Schema fields `termsAcceptedAt` / `termsAcceptedVersion` are used identically in Tasks 3, 4, and 6. `TERMS_VERSION` is consistently imported from `@/lib/termsContent` in Tasks 4 and 5. Checkbox form key `agreed` is consistent across `useForm` defaults, the `register("agreed")` binding, the `watch("agreed")` read, and the payload-stripping `delete payload.agreed`.
