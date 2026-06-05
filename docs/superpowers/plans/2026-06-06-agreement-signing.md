# Agreement Signing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require the customer (Party C) to e-sign the tripartite robot rental agreement as a gate before Stripe checkout, capturing an immutable signing record linked to the resulting reservation.

**Architecture:** A signing modal opens when the customer clicks Reserve. It renders the agreement with fields auto-filled from the booking, collects Party C company info + a typed signature, and POSTs to `/api/agreements` which writes an immutable `Agreement` record (Party A/B pre-executed from config, snapshotted to JSON). On success it proceeds to `/api/checkout`, threading the `agreementId` through Stripe metadata; `/checkout/success` links the agreement to the new reservation. A view page renders signed agreements from the frozen snapshot; "Download PDF" uses browser print.

**Tech Stack:** Next.js 13 (App + Pages hybrid), Prisma + Supabase Postgres, Zustand, Stripe Checkout, Resend email, Vitest (unit/integration), Playwright (E2E).

**Spec:** `docs/superpowers/specs/2026-06-06-agreement-signing-design.md`

---

## File Structure

| File | Created/Modified | Responsibility |
|---|---|---|
| `vitest.config.ts` | Create | Vitest config (jsdom, `@/` alias) |
| `vitest.setup.ts` | Create | Testing-library matchers |
| `playwright.config.ts` | Create | Playwright E2E config |
| `lib/agreementParties.ts` | Create | Party A/B config; metro→state map; default state |
| `lib/agreementTemplate.ts` | Create | Version const, agreementNo formatter, snapshot builder, term/duration helpers |
| `lib/agreementSignGate.ts` | Create | Pure sign-gate readiness predicate |
| `lib/clientIp.ts` | Create | Parse client IP from request headers |
| `prisma/schema.prisma` | Modify | `Agreement` model + back-relations |
| `app/api/agreements/route.ts` | Create | POST create+sign endpoint |
| `hook/useAgreementModal.ts` | Create | Zustand store holding booking context + open/close |
| `components/models/AgreementModal.tsx` | Create | Signing UI |
| `app/layout.tsx` | Modify | Mount `AgreementModal` |
| `components/ListingClient.tsx` | Modify | Reserve opens modal instead of direct checkout |
| `app/api/checkout/route.ts` | Modify | Accept + thread `agreementId` into Stripe metadata |
| `app/checkout/success/page.tsx` | Modify | Link `Agreement.reservationId` after reservation create |
| `components/agreement/AgreementDocument.tsx` | Create | Pure presentational render of a snapshot |
| `app/agreements/[id]/page.tsx` | Create | View page + access control + print button |
| `lib/email.ts` | Modify | Add agreement link to emails |
| `app/admin/orders/*` | Modify | Link to agreement per order |
| `e2e/agreement-signing.spec.ts` | Create | Playwright flows |

---

## Task 0: Test Infrastructure

**Files:**
- Create: `vitest.config.ts`, `vitest.setup.ts`, `playwright.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Install dev dependencies**

```bash
npm install -D vitest@^2 @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event vite-tsconfig-paths @playwright/test
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next", "e2e/**"],
  },
});
```

- [ ] **Step 3: Create `vitest.setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Create `playwright.config.ts`**

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  use: { baseURL: "http://localhost:3000" },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
```

- [ ] **Step 5: Add test scripts to `package.json`**

Add to the `"scripts"` object:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:e2e": "playwright test"
```

- [ ] **Step 6: Verify Vitest runs (no tests yet = exit 0 with "no test files")**

Run: `npm test`
Expected: exits without error (reports "No test files found" — acceptable for now).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.ts vitest.setup.ts playwright.config.ts
git commit -m "chore(test): add Vitest + Playwright test infrastructure"
```

---

## Task 1: Party Config & Governing-Law Map

**Files:**
- Create: `lib/agreementParties.ts`
- Test: `lib/agreementParties.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/agreementParties.test.ts
import { describe, expect, it } from "vitest";
import { PARTY_A, PARTY_B, governingStateForMetro } from "./agreementParties";

describe("agreementParties", () => {
  it("maps each metro to its US state", () => {
    expect(governingStateForMetro("SF")).toBe("California");
    expect(governingStateForMetro("LA")).toBe("California");
    expect(governingStateForMetro("VEGAS")).toBe("Nevada");
    expect(governingStateForMetro("DALLAS")).toBe("Texas");
    expect(governingStateForMetro("NYC")).toBe("New York");
    expect(governingStateForMetro("MIAMI")).toBe("Florida");
  });

  it("falls back to the default state for unknown metros", () => {
    // @ts-expect-error testing fallback path
    expect(governingStateForMetro("MARS")).toBe("Delaware");
  });

  it("exposes Party A and Party B signatory blocks", () => {
    expect(PARTY_A.companyName).toContain("BotSharing");
    expect(PARTY_A.signatoryName).toBeTruthy();
    expect(PARTY_B.companyName).toContain("Robot X");
    expect(PARTY_B.signatoryName).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/agreementParties.test.ts`
Expected: FAIL — cannot find module `./agreementParties`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/agreementParties.ts
import type { Metro } from "@/lib/metro";

export interface PartySignatory {
  companyName: string;
  stateOfFormation: string;
  address: string;
  website: string;
  signatoryName: string;
  signatoryTitle: string;
  email: string;
  phone: string;
}

// TODO(go-live): replace placeholder values with real registered entity details.
export const PARTY_A: PartySignatory = {
  companyName: "BotSharing [U.S. legal entity name]",
  stateOfFormation: "[State]",
  address: "[U.S. business address]",
  website: "botsharing.us",
  signatoryName: "[Authorized Signatory Name]",
  signatoryTitle: "[Title]",
  email: "[email address]",
  phone: "[phone number]",
};

// TODO(go-live): replace placeholder values with real registered entity details.
export const PARTY_B: PartySignatory = {
  companyName: "Robot X [U.S. legal entity name]",
  stateOfFormation: "[State]",
  address: "[U.S. business address]",
  website: "[website]",
  signatoryName: "[Authorized Signatory Name]",
  signatoryTitle: "[Title]",
  email: "[email address]",
  phone: "[phone number]",
};

export const DEFAULT_GOVERNING_STATE = "Delaware";

const METRO_STATE: Record<Metro, string> = {
  SF: "California",
  LA: "California",
  VEGAS: "Nevada",
  DALLAS: "Texas",
  NYC: "New York",
  MIAMI: "Florida",
};

export function governingStateForMetro(metro: Metro): string {
  return METRO_STATE[metro] ?? DEFAULT_GOVERNING_STATE;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/agreementParties.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/agreementParties.ts lib/agreementParties.test.ts
git commit -m "feat(agreement): add party config and metro->state governing-law map"
```

---

## Task 2: Agreement Number Formatter

**Files:**
- Create: `lib/agreementTemplate.ts`
- Test: `lib/agreementTemplate.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/agreementTemplate.test.ts
import { describe, expect, it } from "vitest";
import {
  TEMPLATE_VERSION,
  formatAgreementNo,
  termDurationDays,
} from "./agreementTemplate";

describe("agreementTemplate", () => {
  it("pins the template version", () => {
    expect(TEMPLATE_VERSION).toBe("tripartite-v1");
  });

  it("formats agreement numbers as TPA-YYYYMM-NNNN", () => {
    const date = new Date("2026-06-04T12:00:00Z");
    expect(formatAgreementNo(date, 1)).toBe("TPA-202606-0001");
    expect(formatAgreementNo(date, 42)).toBe("TPA-202606-0042");
    expect(formatAgreementNo(new Date("2026-12-01T00:00:00Z"), 7)).toBe(
      "TPA-202612-0007"
    );
  });

  it("computes term duration in whole days", () => {
    expect(
      termDurationDays(new Date("2026-06-01"), new Date("2026-06-06"))
    ).toBe(5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/agreementTemplate.test.ts`
Expected: FAIL — cannot find module `./agreementTemplate`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/agreementTemplate.ts
import { differenceInCalendarDays } from "date-fns";

export const TEMPLATE_VERSION = "tripartite-v1";

export function formatAgreementNo(date: Date, seq: number): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const seqStr = String(seq).padStart(4, "0");
  return `TPA-${year}${month}-${seqStr}`;
}

export function termDurationDays(start: Date, end: Date): number {
  return differenceInCalendarDays(end, start);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/agreementTemplate.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/agreementTemplate.ts lib/agreementTemplate.test.ts
git commit -m "feat(agreement): add template version + agreement-number formatter"
```

---

## Task 3: Field Snapshot Builder

**Files:**
- Modify: `lib/agreementTemplate.ts`
- Test: `lib/agreementTemplate.test.ts` (add cases)

- [ ] **Step 1: Add the failing test**

Append to `lib/agreementTemplate.test.ts`:

```ts
import { buildFieldSnapshot } from "./agreementTemplate";
import { PARTY_A, PARTY_B } from "./agreementParties";

describe("buildFieldSnapshot", () => {
  const input = {
    agreementNo: "TPA-202606-0001",
    signedAt: new Date("2026-06-04T12:00:00Z"),
    listing: {
      title: "AGIBot A2 Showcase",
      locationValue: "Las Vegas Metro",
      metro: "VEGAS" as const,
    },
    startDate: new Date("2026-07-01"),
    endDate: new Date("2026-07-08"),
    totalPrice: 7000,
    tierId: "gold",
    robotCount: 2,
    partyC: {
      legalName: "Acme Robotics LLC",
      taxId: "12-3456789",
      address: "100 Main St, Las Vegas, NV",
      contactName: "Jane Doe",
      contactTitle: "COO",
    },
  };

  it("freezes parties, equipment, pricing, and governing law", () => {
    const snap = buildFieldSnapshot(input);
    expect(snap.agreementNo).toBe("TPA-202606-0001");
    expect(snap.partyA.companyName).toBe(PARTY_A.companyName);
    expect(snap.partyB.companyName).toBe(PARTY_B.companyName);
    expect(snap.partyC.legalName).toBe("Acme Robotics LLC");
    expect(snap.equipment.model).toBe("AGIBot A2 Showcase");
    expect(snap.equipment.quantity).toBe(2);
    expect(snap.equipment.serialNo).toBe("To be assigned at shipment");
    expect(snap.pricing.rentalCharges).toBe(7000);
    expect(snap.pricing.totalDue).toBe(7000);
    expect(snap.governingState).toBe("Nevada");
    expect(snap.term.durationDays).toBe(7);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/agreementTemplate.test.ts`
Expected: FAIL — `buildFieldSnapshot` is not exported.

- [ ] **Step 3: Implement `buildFieldSnapshot`**

Append to `lib/agreementTemplate.ts`:

```ts
import type { Metro } from "@/lib/metro";
import {
  PARTY_A,
  PARTY_B,
  PartySignatory,
  governingStateForMetro,
} from "@/lib/agreementParties";

export interface PartyCInput {
  legalName: string;
  taxId?: string | null;
  address: string;
  contactName: string;
  contactTitle: string;
}

export interface SnapshotInput {
  agreementNo: string;
  signedAt: Date;
  listing: { title: string; locationValue: string; metro: Metro };
  startDate: Date;
  endDate: Date;
  totalPrice: number;
  tierId: string;
  robotCount: number;
  partyC: PartyCInput;
}

export interface AgreementSnapshot {
  agreementNo: string;
  templateVersion: string;
  dateOfAgreement: string;
  partyA: PartySignatory;
  partyB: PartySignatory;
  partyC: PartyCInput;
  equipment: {
    model: string;
    serialNo: string;
    condition: string;
    quantity: number;
  };
  location: { delivery: string; deployment: string };
  term: { commencement: string; expiry: string; durationDays: number };
  pricing: {
    rentalCharges: number;
    shipping: null;
    platformFee: null;
    taxes: null;
    deposit: null;
    totalDue: number;
  };
  governingState: string;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function buildFieldSnapshot(input: SnapshotInput): AgreementSnapshot {
  return {
    agreementNo: input.agreementNo,
    templateVersion: TEMPLATE_VERSION,
    dateOfAgreement: isoDate(input.signedAt),
    partyA: PARTY_A,
    partyB: PARTY_B,
    partyC: {
      legalName: input.partyC.legalName,
      taxId: input.partyC.taxId ?? null,
      address: input.partyC.address,
      contactName: input.partyC.contactName,
      contactTitle: input.partyC.contactTitle,
    },
    equipment: {
      model: input.listing.title,
      serialNo: "To be assigned at shipment",
      condition: "Good - Pre-rental Inspection Required",
      quantity: input.robotCount,
    },
    location: {
      delivery: input.listing.locationValue,
      deployment: input.listing.locationValue,
    },
    term: {
      commencement: isoDate(input.startDate),
      expiry: isoDate(input.endDate),
      durationDays: termDurationDays(input.startDate, input.endDate),
    },
    pricing: {
      rentalCharges: input.totalPrice,
      shipping: null,
      platformFee: null,
      taxes: null,
      deposit: null,
      totalDue: input.totalPrice,
    },
    governingState: governingStateForMetro(input.listing.metro),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/agreementTemplate.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add lib/agreementTemplate.ts lib/agreementTemplate.test.ts
git commit -m "feat(agreement): add immutable field snapshot builder"
```

---

## Task 4: Sign-Gate Predicate

**Files:**
- Create: `lib/agreementSignGate.ts`
- Test: `lib/agreementSignGate.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/agreementSignGate.test.ts
import { describe, expect, it } from "vitest";
import { isSignReady, SignGateState } from "./agreementSignGate";

const ready: SignGateState = {
  scrolledToBottom: true,
  legalName: "Acme Robotics LLC",
  address: "100 Main St",
  contactName: "Jane Doe",
  contactTitle: "COO",
  signedName: "Jane Doe",
  signedTitle: "COO",
  agreed: true,
};

describe("isSignReady", () => {
  it("returns true when every requirement is met", () => {
    expect(isSignReady(ready)).toBe(true);
  });

  it("is false until scrolled to bottom", () => {
    expect(isSignReady({ ...ready, scrolledToBottom: false })).toBe(false);
  });

  it("is false when a required Party C field is blank", () => {
    expect(isSignReady({ ...ready, legalName: "  " })).toBe(false);
    expect(isSignReady({ ...ready, address: "" })).toBe(false);
    expect(isSignReady({ ...ready, contactName: "" })).toBe(false);
    expect(isSignReady({ ...ready, contactTitle: "" })).toBe(false);
  });

  it("is false without a typed signature name/title", () => {
    expect(isSignReady({ ...ready, signedName: "" })).toBe(false);
    expect(isSignReady({ ...ready, signedTitle: "" })).toBe(false);
  });

  it("is false until the agree box is checked", () => {
    expect(isSignReady({ ...ready, agreed: false })).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/agreementSignGate.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/agreementSignGate.ts
export interface SignGateState {
  scrolledToBottom: boolean;
  legalName: string;
  address: string;
  contactName: string;
  contactTitle: string;
  signedName: string;
  signedTitle: string;
  agreed: boolean;
}

const filled = (v: string) => v.trim().length > 0;

export function isSignReady(s: SignGateState): boolean {
  return (
    s.scrolledToBottom &&
    s.agreed &&
    filled(s.legalName) &&
    filled(s.address) &&
    filled(s.contactName) &&
    filled(s.contactTitle) &&
    filled(s.signedName) &&
    filled(s.signedTitle)
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/agreementSignGate.test.ts`
Expected: PASS (5 cases).

- [ ] **Step 5: Commit**

```bash
git add lib/agreementSignGate.ts lib/agreementSignGate.test.ts
git commit -m "feat(agreement): add sign-gate readiness predicate"
```

---

## Task 5: Client IP Parser

**Files:**
- Create: `lib/clientIp.ts`
- Test: `lib/clientIp.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/clientIp.test.ts
import { describe, expect, it } from "vitest";
import { clientIpFromHeaders } from "./clientIp";

const h = (entries: Record<string, string>) => new Headers(entries);

describe("clientIpFromHeaders", () => {
  it("takes the first hop from x-forwarded-for", () => {
    expect(
      clientIpFromHeaders(h({ "x-forwarded-for": "203.0.113.5, 70.41.3.18" }))
    ).toBe("203.0.113.5");
  });

  it("falls back to x-real-ip", () => {
    expect(clientIpFromHeaders(h({ "x-real-ip": "198.51.100.2" }))).toBe(
      "198.51.100.2"
    );
  });

  it("returns null when no IP header is present", () => {
    expect(clientIpFromHeaders(h({}))).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/clientIp.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/clientIp.ts
export function clientIpFromHeaders(headers: Headers): string | null {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = headers.get("x-real-ip");
  return real?.trim() || null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/clientIp.test.ts`
Expected: PASS (3 cases).

- [ ] **Step 5: Commit**

```bash
git add lib/clientIp.ts lib/clientIp.test.ts
git commit -m "feat(agreement): add client IP header parser"
```

---

## Task 6: Agreement Prisma Model

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add the `Agreement` model**

Add to `prisma/schema.prisma` (after the `Reservation` model):

```prisma
model Agreement {
  id              String   @id @default(cuid())
  agreementNo     String   @unique
  templateVersion String

  userId          String
  listingId       String
  reservationId   String?  @unique

  startDate       DateTime
  endDate         DateTime
  totalPrice      Int
  tierId          String
  robotCount      Int

  partyCLegalName    String
  partyCTaxId        String?
  partyCAddress      String
  partyCContactName  String
  partyCContactTitle String

  fieldSnapshot   Json

  signedName      String
  signedTitle     String
  signedAt        DateTime @default(now())
  signedIp        String?

  status          String   @default("SIGNED")
  createdAt       DateTime @default(now())

  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  listing     Listing      @relation(fields: [listingId], references: [id], onDelete: Cascade)
  reservation Reservation? @relation(fields: [reservationId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([listingId])
  @@index([reservationId])
}
```

- [ ] **Step 2: Add back-relations to existing models**

In `model User { ... }` add:

```prisma
  agreements   Agreement[]
```

In `model Listing { ... }` add (next to `reservations`):

```prisma
  agreements   Agreement[]
```

In `model Reservation { ... }` add:

```prisma
  agreement       Agreement?
```

- [ ] **Step 3: Format and validate the schema**

Run: `npx prisma validate && npx prisma format`
Expected: "The schema is valid" and formatted output.

- [ ] **Step 4: Create the migration against the dev database**

Run: `npx prisma migrate dev --name add_agreement`
Expected: migration created under `prisma/migrations/`, `Agreement` table created, Prisma Client regenerated.

> If no shadow/dev DB is available, instead run
> `npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script` to generate SQL and apply it via the Supabase MCP `apply_migration`. Confirm the table exists with `list_tables`.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(agreement): add Agreement model and migration"
```

---

## Task 7: POST /api/agreements

**Files:**
- Create: `app/api/agreements/route.ts`
- Test: `app/api/agreements/route.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// app/api/agreements/route.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const findUnique = vi.fn();
const count = vi.fn();
const create = vi.fn();

vi.mock("@/app/actions/getCurrentUser", () => ({ default: getCurrentUser }));
vi.mock("@/lib/prismadb", () => ({
  default: { listing: { findUnique }, agreement: { count, create } },
}));
vi.mock("@/lib/writeGuard", () => ({ getWritesBlockedResponse: () => null }));

import { POST } from "./route";

function req(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/agreements", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const validBody = {
  listingId: "listing1",
  startDate: "2026-07-01",
  endDate: "2026-07-08",
  totalPrice: 7000,
  tierId: "gold",
  robotCount: 2,
  partyC: {
    legalName: "Acme Robotics LLC",
    taxId: "12-3456789",
    address: "100 Main St, Las Vegas, NV",
    contactName: "Jane Doe",
    contactTitle: "COO",
  },
  signedName: "Jane Doe",
  signedTitle: "COO",
};

describe("POST /api/agreements", () => {
  beforeEach(() => {
    getCurrentUser.mockReset();
    findUnique.mockReset();
    count.mockReset();
    create.mockReset();
    getCurrentUser.mockResolvedValue({ id: "user1" });
    findUnique.mockResolvedValue({
      id: "listing1",
      title: "AGIBot A2 Showcase",
      locationValue: "Las Vegas Metro",
      metro: "VEGAS",
    });
    count.mockResolvedValue(0);
    create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: "agr1", ...data })
    );
  });

  it("rejects unauthenticated requests with 401", async () => {
    getCurrentUser.mockResolvedValue(null);
    const res = await POST(req(validBody));
    expect(res.status).toBe(401);
  });

  it("rejects missing required fields with 400", async () => {
    const res = await POST(req({ ...validBody, partyC: { legalName: "" } }));
    expect(res.status).toBe(400);
  });

  it("rejects unknown listings with 404", async () => {
    findUnique.mockResolvedValue(null);
    const res = await POST(req(validBody));
    expect(res.status).toBe(404);
  });

  it("creates a signed agreement and returns its id + number", async () => {
    const res = await POST(
      req(validBody, { "x-forwarded-for": "203.0.113.5" })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.agreementId).toBe("agr1");
    expect(json.agreementNo).toMatch(/^TPA-\d{6}-0001$/);

    const arg = create.mock.calls[0][0].data;
    expect(arg.userId).toBe("user1");
    expect(arg.signedIp).toBe("203.0.113.5");
    expect(arg.status).toBe("SIGNED");
    expect(arg.fieldSnapshot.governingState).toBe("Nevada");
  });
});
```

> The agreementNo month segment is derived from the real current month at runtime, so the test matches it with a regex and pins only the sequence (`0001`).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/api/agreements/route.test.ts`
Expected: FAIL — cannot find module `./route`.

- [ ] **Step 3: Write minimal implementation**

```ts
// app/api/agreements/route.ts
import getCurrentUser from "@/app/actions/getCurrentUser";
import {
  buildFieldSnapshot,
  formatAgreementNo,
} from "@/lib/agreementTemplate";
import { clientIpFromHeaders } from "@/lib/clientIp";
import prisma from "@/lib/prismadb";
import { getWritesBlockedResponse } from "@/lib/writeGuard";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const writesBlocked = getWritesBlockedResponse();
  if (writesBlocked) return writesBlocked;

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    listingId,
    startDate,
    endDate,
    totalPrice,
    tierId,
    robotCount,
    partyC,
    signedName,
    signedTitle,
  } = body ?? {};

  const partyCValid =
    partyC &&
    typeof partyC.legalName === "string" &&
    partyC.legalName.trim() &&
    typeof partyC.address === "string" &&
    partyC.address.trim() &&
    typeof partyC.contactName === "string" &&
    partyC.contactName.trim() &&
    typeof partyC.contactTitle === "string" &&
    partyC.contactTitle.trim();

  if (
    !listingId ||
    !startDate ||
    !endDate ||
    !totalPrice ||
    !tierId ||
    !robotCount ||
    !partyCValid ||
    !signedName?.trim() ||
    !signedTitle?.trim()
  ) {
    return NextResponse.json(
      { error: "Missing agreement fields." },
      { status: 400 }
    );
  }

  if (totalPrice <= 0) {
    return NextResponse.json(
      { error: "Invalid booking total." },
      { status: 400 }
    );
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, title: true, locationValue: true, metro: true },
  });

  if (!listing) {
    return NextResponse.json({ error: "Service not found." }, { status: 404 });
  }

  const signedAt = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  const monthPrefix = formatAgreementNo(signedAt, 0).slice(0, -4);
  const monthCount = await prisma.agreement.count({
    where: { agreementNo: { startsWith: monthPrefix } },
  });
  const agreementNo = formatAgreementNo(signedAt, monthCount + 1);

  const snapshot = buildFieldSnapshot({
    agreementNo,
    signedAt,
    listing: {
      title: listing.title,
      locationValue: listing.locationValue,
      metro: listing.metro,
    },
    startDate: start,
    endDate: end,
    totalPrice,
    tierId,
    robotCount,
    partyC,
  });

  const agreement = await prisma.agreement.create({
    data: {
      agreementNo,
      templateVersion: snapshot.templateVersion,
      userId: currentUser.id,
      listingId: listing.id,
      startDate: start,
      endDate: end,
      totalPrice,
      tierId,
      robotCount,
      partyCLegalName: partyC.legalName,
      partyCTaxId: partyC.taxId ?? null,
      partyCAddress: partyC.address,
      partyCContactName: partyC.contactName,
      partyCContactTitle: partyC.contactTitle,
      fieldSnapshot: snapshot as object,
      signedName,
      signedTitle,
      signedIp: clientIpFromHeaders(request.headers),
      status: "SIGNED",
    },
  });

  return NextResponse.json({
    agreementId: agreement.id,
    agreementNo: agreement.agreementNo,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/api/agreements/route.test.ts`
Expected: PASS (4 cases).

- [ ] **Step 5: Commit**

```bash
git add app/api/agreements/route.ts app/api/agreements/route.test.ts
git commit -m "feat(agreement): add POST /api/agreements signing endpoint"
```

---

## Task 8: Agreement Modal Store

**Files:**
- Create: `hook/useAgreementModal.ts`
- Test: `hook/useAgreementModal.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// hook/useAgreementModal.test.ts
import { describe, expect, it } from "vitest";
import useAgreementModal from "./useAgreementModal";

const ctx = {
  listingId: "listing1",
  listingTitle: "AGIBot A2 Showcase",
  startDate: "2026-07-01",
  endDate: "2026-07-08",
  totalPrice: 7000,
  tierId: "gold",
  robotCount: 2,
};

describe("useAgreementModal", () => {
  it("opens with booking context and closes clearing it", () => {
    useAgreementModal.getState().onOpen(ctx);
    expect(useAgreementModal.getState().isOpen).toBe(true);
    expect(useAgreementModal.getState().booking?.totalPrice).toBe(7000);

    useAgreementModal.getState().onClose();
    expect(useAgreementModal.getState().isOpen).toBe(false);
    expect(useAgreementModal.getState().booking).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run hook/useAgreementModal.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write minimal implementation**

```ts
// hook/useAgreementModal.ts
import { create } from "zustand";

export interface AgreementBookingContext {
  listingId: string;
  listingTitle: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  tierId: string;
  robotCount: number;
}

interface AgreementModalStore {
  isOpen: boolean;
  booking: AgreementBookingContext | null;
  onOpen: (booking: AgreementBookingContext) => void;
  onClose: () => void;
}

const useAgreementModal = create<AgreementModalStore>((set) => ({
  isOpen: false,
  booking: null,
  onOpen: (booking) => set({ isOpen: true, booking }),
  onClose: () => set({ isOpen: false, booking: null }),
}));

export default useAgreementModal;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run hook/useAgreementModal.test.ts`
Expected: PASS (1 case).

- [ ] **Step 5: Commit**

```bash
git add hook/useAgreementModal.ts hook/useAgreementModal.test.ts
git commit -m "feat(agreement): add agreement modal Zustand store"
```

---

## Task 9: Agreement Document Renderer

**Files:**
- Create: `components/agreement/AgreementDocument.tsx`
- Test: `components/agreement/AgreementDocument.test.tsx`

This pure component renders an `AgreementSnapshot`. Reused by both the modal preview and the view page — single source of agreement text.

- [ ] **Step 1: Write the failing test**

```tsx
// components/agreement/AgreementDocument.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AgreementDocument from "./AgreementDocument";
import { buildFieldSnapshot } from "@/lib/agreementTemplate";

const snap = buildFieldSnapshot({
  agreementNo: "TPA-202606-0001",
  signedAt: new Date("2026-06-04T12:00:00Z"),
  listing: {
    title: "AGIBot A2 Showcase",
    locationValue: "Las Vegas Metro",
    metro: "VEGAS",
  },
  startDate: new Date("2026-07-01"),
  endDate: new Date("2026-07-08"),
  totalPrice: 7000,
  tierId: "gold",
  robotCount: 2,
  partyC: {
    legalName: "Acme Robotics LLC",
    taxId: null,
    address: "100 Main St",
    contactName: "Jane Doe",
    contactTitle: "COO",
  },
});

describe("AgreementDocument", () => {
  it("renders key agreement fields", () => {
    render(<AgreementDocument snapshot={snap} />);
    expect(
      screen.getByText(/Tripartite Robot Rental Platform Agreement/i)
    ).toBeInTheDocument();
    expect(screen.getByText("TPA-202606-0001")).toBeInTheDocument();
    expect(screen.getByText("Acme Robotics LLC")).toBeInTheDocument();
    expect(screen.getAllByText(/Nevada/).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/agreement/AgreementDocument.test.tsx`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write minimal implementation**

```tsx
// components/agreement/AgreementDocument.tsx
import React from "react";
import type { AgreementSnapshot } from "@/lib/agreementTemplate";

interface Props {
  snapshot: AgreementSnapshot;
  signature?: { name: string; title: string; date: string } | null;
}

const money = (v: number | null) =>
  v === null ? "$ —" : `$${v.toLocaleString()}`;

function SignatureBlock({
  label,
  p,
  executed,
}: {
  label: string;
  p: { signatoryName: string; signatoryTitle: string };
  executed?: boolean;
}) {
  return (
    <div>
      <p className="font-semibold">{label}</p>
      <p>
        /s/ {p.signatoryName}, {p.signatoryTitle}
        {executed ? " — pre-executed" : ""}
      </p>
    </div>
  );
}

function AgreementDocument({ snapshot: s, signature }: Props) {
  return (
    <article className="text-sm text-black leading-relaxed space-y-4">
      <header className="space-y-1">
        <h1 className="text-lg font-bold">
          Tripartite Robot Rental Platform Agreement
        </h1>
        <p className="text-gray-600">
          BotSharing Platform Transaction for Robot X Equipment Rental
        </p>
      </header>

      <section>
        <h2 className="font-semibold">Contract Summary</h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
          <dt className="text-gray-500">Agreement No.</dt>
          <dd>{s.agreementNo}</dd>
          <dt className="text-gray-500">Date of Agreement</dt>
          <dd>{s.dateOfAgreement}</dd>
          <dt className="text-gray-500">Commencement</dt>
          <dd>{s.term.commencement}</dd>
          <dt className="text-gray-500">Expiry</dt>
          <dd>{s.term.expiry}</dd>
          <dt className="text-gray-500">Equipment</dt>
          <dd>
            {s.equipment.model} × {s.equipment.quantity}
          </dd>
          <dt className="text-gray-500">Deployment Location</dt>
          <dd>{s.location.deployment}</dd>
          <dt className="text-gray-500">Governing Law</dt>
          <dd>{s.governingState}</dd>
        </dl>
      </section>

      <section>
        <h2 className="font-semibold">1. Parties</h2>
        <p>
          <strong>Party A — Platform &amp; Payment Collection:</strong>{" "}
          {s.partyA.companyName}, {s.partyA.address}.
        </p>
        <p>
          <strong>Party B — Equipment Owner &amp; Lessor:</strong>{" "}
          {s.partyB.companyName}, {s.partyB.address}.
        </p>
        <p>
          <strong>Party C — Lessee / Customer:</strong> {s.partyC.legalName}
          {s.partyC.taxId ? ` (Tax ID ${s.partyC.taxId})` : ""},{" "}
          {s.partyC.address}. Contact: {s.partyC.contactName},{" "}
          {s.partyC.contactTitle}.
        </p>
      </section>

      <section>
        <h2 className="font-semibold">3. Equipment</h2>
        <p>
          {s.equipment.model} — Serial No.: {s.equipment.serialNo} — Condition:{" "}
          {s.equipment.condition} — Quantity: {s.equipment.quantity}.
        </p>
      </section>

      <section>
        <h2 className="font-semibold">5. Commercial Terms (USD)</h2>
        <ul className="list-disc pl-5">
          <li>Rental Charges: {money(s.pricing.rentalCharges)}</li>
          <li>Shipping / Logistics: {money(s.pricing.shipping)} (if applicable)</li>
          <li>Platform Service Fee: {money(s.pricing.platformFee)} (if applicable)</li>
          <li>Taxes: {money(s.pricing.taxes)} (if applicable)</li>
          <li>Security Deposit: {money(s.pricing.deposit)} (if applicable)</li>
          <li>
            <strong>Total Amount Due: {money(s.pricing.totalDue)}</strong>
          </li>
        </ul>
      </section>

      <section>
        <h2 className="font-semibold">16. Governing Law</h2>
        <p>
          This Agreement is governed by the laws of the State of{" "}
          {s.governingState}, and disputes are subject to the state and federal
          courts located in {s.governingState}.
        </p>
      </section>

      <p className="text-gray-600 italic">
        Full terms (Sections 2, 4, 6–15, 17 and Appendices A–E) of the
        BotSharing Tripartite Robot Rental Platform Agreement, template version{" "}
        {s.templateVersion}, apply and are incorporated by reference. Party A and
        Party B are pre-executed; Party C executes electronically below.
      </p>

      <section className="grid grid-cols-1 gap-3 pt-4 border-t border-gray-200">
        <SignatureBlock label="Party A — BotSharing" p={s.partyA} executed />
        <SignatureBlock label="Party B — Robot X" p={s.partyB} executed />
        <div>
          <p className="font-semibold">Party C — Lessee / Customer</p>
          {signature ? (
            <p>
              /s/ {signature.name}, {signature.title} — {signature.date}
            </p>
          ) : (
            <p className="text-gray-400">Signature pending</p>
          )}
        </div>
      </section>
    </article>
  );
}

export default AgreementDocument;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/agreement/AgreementDocument.test.tsx`
Expected: PASS (1 case).

- [ ] **Step 5: Commit**

```bash
git add components/agreement/AgreementDocument.tsx components/agreement/AgreementDocument.test.tsx
git commit -m "feat(agreement): add reusable agreement document renderer"
```

---

## Task 10: Agreement Signing Modal

**Files:**
- Create: `components/models/AgreementModal.tsx`
- Modify: `app/layout.tsx`

This component has no unit test (its pure logic — sign gate, snapshot — is already covered in Tasks 3–4; UI behavior is covered by the Task 16 E2E). Verify via build + E2E.

> **Before writing:** read `components/inputs/Input.tsx` to confirm its prop signature. The repo's `Input` (used by `RentModal`/`LoginModal`) is `react-hook-form`-based and takes `register`/`errors`. This modal uses local `useState`, so use plain controlled `<input>` elements (shown below) rather than that `Input` component, to avoid pulling in a form context.

- [ ] **Step 1: Create the modal**

```tsx
// components/models/AgreementModal.tsx
"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import Modal from "./Modal";
import useAgreementModal from "@/hook/useAgreementModal";
import AgreementDocument from "../agreement/AgreementDocument";
import { buildFieldSnapshot } from "@/lib/agreementTemplate";
import { isSignReady } from "@/lib/agreementSignGate";

function Field({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-black">
      <span className="text-gray-600">{label}</span>
      <input
        className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:border-black disabled:opacity-50"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </label>
  );
}

function AgreementModal() {
  const { isOpen, booking, onClose } = useAgreementModal();
  const [isLoading, setIsLoading] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);

  const [legalName, setLegalName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [address, setAddress] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactTitle, setContactTitle] = useState("");
  const [signedName, setSignedName] = useState("");
  const [signedTitle, setSignedTitle] = useState("");
  const [agreed, setAgreed] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const previewSnapshot = useMemo(() => {
    if (!booking) return null;
    return buildFieldSnapshot({
      agreementNo: "TPA-PREVIEW",
      signedAt: new Date(),
      listing: {
        title: booking.listingTitle,
        // location/metro unknown client-side; server re-derives authoritative
        // values. Preview shows a placeholder the server overrides.
        locationValue: "Deployment location on file",
        metro: "SF",
      },
      startDate: new Date(booking.startDate),
      endDate: new Date(booking.endDate),
      totalPrice: booking.totalPrice,
      tierId: booking.tierId,
      robotCount: booking.robotCount,
      partyC: {
        legalName: legalName || "[Customer legal entity name]",
        taxId: taxId || null,
        address: address || "[Address]",
        contactName: contactName || "[Contact]",
        contactTitle: contactTitle || "[Title]",
      },
    });
  }, [booking, legalName, taxId, address, contactName, contactTitle]);

  const ready = isSignReady({
    scrolledToBottom,
    legalName,
    address,
    contactName,
    contactTitle,
    signedName,
    signedTitle,
    agreed,
  });

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 40) {
      setScrolledToBottom(true);
    }
  }, []);

  const handleSign = useCallback(() => {
    if (!booking || !ready) return;
    setIsLoading(true);

    axios
      .post("/api/agreements", {
        listingId: booking.listingId,
        startDate: booking.startDate,
        endDate: booking.endDate,
        totalPrice: booking.totalPrice,
        tierId: booking.tierId,
        robotCount: booking.robotCount,
        partyC: {
          legalName,
          taxId: taxId || null,
          address,
          contactName,
          contactTitle,
        },
        signedName,
        signedTitle,
      })
      .then((res) => {
        const agreementId = res.data?.agreementId;
        if (!agreementId) {
          toast.error("Could not record the agreement. Please try again.");
          setIsLoading(false);
          return;
        }
        return axios
          .post("/api/checkout", {
            agreementId,
            totalPrice: booking.totalPrice,
            startDate: booking.startDate,
            endDate: booking.endDate,
            listingId: booking.listingId,
          })
          .then((checkout) => {
            if (checkout.data?.url) {
              window.location.href = checkout.data.url;
            } else {
              toast.error("Could not start checkout. Please try again.");
              setIsLoading(false);
            }
          });
      })
      .catch(() => {
        toast.error("Something went wrong");
        setIsLoading(false);
      });
    // success path intentionally leaves spinner on — browser navigates to Stripe
  }, [
    booking,
    ready,
    legalName,
    taxId,
    address,
    contactName,
    contactTitle,
    signedName,
    signedTitle,
  ]);

  const body = (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Company legal name" value={legalName} onChange={setLegalName} disabled={isLoading} />
        <Field label="Tax ID (optional)" value={taxId} onChange={setTaxId} disabled={isLoading} />
        <Field label="Company address" value={address} onChange={setAddress} disabled={isLoading} />
        <Field label="Contact person" value={contactName} onChange={setContactName} disabled={isLoading} />
        <Field label="Contact title" value={contactTitle} onChange={setContactTitle} disabled={isLoading} />
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="max-h-[40vh] overflow-y-auto border border-gray-200 rounded-lg p-4 bg-white"
      >
        {previewSnapshot && <AgreementDocument snapshot={previewSnapshot} />}
      </div>
      {!scrolledToBottom && (
        <p className="text-xs text-gray-500">
          Scroll to the end of the agreement to enable signing.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Type your legal name" value={signedName} onChange={setSignedName} disabled={isLoading} />
        <Field label="Your title" value={signedTitle} onChange={setSignedTitle} disabled={isLoading} />
      </div>

      <label className="flex items-center gap-2 text-sm text-black">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          disabled={isLoading}
        />
        I have read and agree to the Tripartite Robot Rental Platform Agreement.
      </label>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      title="Sign rental agreement"
      actionLabel="Sign & continue to payment"
      onClose={onClose}
      onSubmit={handleSign}
      disabled={isLoading || !ready}
      body={body}
    />
  );
}

export default AgreementModal;
```

- [ ] **Step 2: Mount the modal in `app/layout.tsx`**

Find where `RentModal` / `LoginModal` are rendered and add alongside them:

```tsx
import AgreementModal from "@/components/models/AgreementModal";
// ...inside the JSX where other modals are mounted:
<AgreementModal />
```

- [ ] **Step 3: Verify it builds**

Run: `npm run build`
Expected: build succeeds (type-checks the new component + layout).

- [ ] **Step 4: Commit**

```bash
git add components/models/AgreementModal.tsx app/layout.tsx
git commit -m "feat(agreement): add signing modal and mount in layout"
```

---

## Task 11: Wire ListingClient to Open the Modal

**Files:**
- Modify: `components/ListingClient.tsx`

- [ ] **Step 1: Import the agreement modal store**

Add near the other `hook/` imports in `components/ListingClient.tsx`:

```tsx
import useAgreementModal from "@/hook/useAgreementModal";
```

And inside the component body, near `const loginModal = useLoginModal();`:

```tsx
const agreementModal = useAgreementModal();
```

> Confirm `toast` is already imported (it is used elsewhere in this file). If not, add `import { toast } from "react-toastify";`.

- [ ] **Step 2: Replace the body of `onCreateReservation`**

Replace the existing `onCreateReservation` (currently posts directly to `/api/checkout`) with a handler that opens the agreement modal carrying booking context:

```tsx
const onCreateReservation = useCallback(() => {
  if (!currentUser) {
    return loginModal.onOpen();
  }

  if (!dateRange.startDate || !dateRange.endDate) {
    toast.error("Select your rental dates first.");
    return;
  }

  agreementModal.onOpen({
    listingId: listing.id,
    listingTitle: listing.title,
    startDate: dateRange.startDate.toISOString(),
    endDate: dateRange.endDate.toISOString(),
    totalPrice,
    tierId: selectedTierId,
    robotCount,
  });
}, [
  currentUser,
  loginModal,
  agreementModal,
  dateRange,
  listing.id,
  listing.title,
  totalPrice,
  selectedTierId,
  robotCount,
]);
```

> `isLoading` is no longer set here. Leave the existing `isLoading` state and the `disabled={isLoading}` prop on `ListingReservation` as-is (it stays false, so the Reserve button is always enabled to open the modal). The spinner now lives in the modal.

- [ ] **Step 3: Verify it builds**

Run: `npm run build`
Expected: build succeeds. The booking dates/tier/count now flow into the modal.

- [ ] **Step 4: Manual smoke check**

Run: `npm run dev`, open a listing, pick dates, click Reserve.
Expected: the agreement modal opens (instead of jumping straight to Stripe).

- [ ] **Step 5: Commit**

```bash
git add components/ListingClient.tsx
git commit -m "feat(agreement): open signing modal from Reserve action"
```

---

## Task 12: Thread agreementId Through Checkout

**Files:**
- Modify: `app/api/checkout/route.ts`
- Test: `app/api/checkout/route.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// app/api/checkout/route.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const findUnique = vi.fn();
const sessionsCreate = vi.fn();

vi.mock("@/app/actions/getCurrentUser", () => ({ default: getCurrentUser }));
vi.mock("@/lib/prismadb", () => ({
  default: { listing: { findUnique } },
}));
vi.mock("@/lib/writeGuard", () => ({ getWritesBlockedResponse: () => null }));
vi.mock("@/lib/stripe", () => ({
  default: () => ({ checkout: { sessions: { create: sessionsCreate } } }),
}));

import { POST } from "./route";

function req(body: unknown) {
  return new Request("http://localhost/api/checkout", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/checkout", () => {
  beforeEach(() => {
    getCurrentUser.mockReset();
    findUnique.mockReset();
    sessionsCreate.mockReset();
    getCurrentUser.mockResolvedValue({ id: "user1" });
    findUnique.mockResolvedValue({ title: "AGIBot A2 Showcase" });
    sessionsCreate.mockResolvedValue({ url: "https://stripe.test/session" });
  });

  it("puts agreementId into Stripe session metadata", async () => {
    const res = await POST(
      req({
        agreementId: "agr1",
        listingId: "listing1",
        startDate: "2026-07-01",
        endDate: "2026-07-08",
        totalPrice: 7000,
      })
    );
    expect(res.status).toBe(200);
    const metadata = sessionsCreate.mock.calls[0][0].metadata;
    expect(metadata.agreementId).toBe("agr1");
    expect(metadata.userId).toBe("user1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/api/checkout/route.test.ts`
Expected: FAIL — `metadata.agreementId` is undefined.

- [ ] **Step 3: Modify the checkout route**

In `app/api/checkout/route.ts`, destructure `agreementId` and add it to metadata:

```ts
const { listingId, startDate, endDate, totalPrice, agreementId } = body;
```

In the `metadata` object passed to `stripe().checkout.sessions.create`, add the `agreementId` line:

```ts
    metadata: {
      userId: currentUser.id,
      listingId,
      startDate,
      endDate,
      totalPrice: String(totalPrice),
      agreementId: agreementId ?? "",
    },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/api/checkout/route.test.ts`
Expected: PASS (1 case).

- [ ] **Step 5: Commit**

```bash
git add app/api/checkout/route.ts app/api/checkout/route.test.ts
git commit -m "feat(agreement): thread agreementId into Stripe checkout metadata"
```

---

## Task 13: Link Agreement to Reservation on Success

**Files:**
- Modify: `app/checkout/success/page.tsx`

- [ ] **Step 1: Read the agreementId from metadata**

In `app/checkout/success/page.tsx`, extend the metadata destructure:

```tsx
const { userId, listingId, startDate, endDate, totalPrice, agreementId } =
  session.metadata ?? {};
```

- [ ] **Step 2: Link the agreement inside the idempotent new-reservation block**

Immediately after the `reservation` is created/resolved, guarded by `isNewReservation`, add (place it BEFORE the email-sending block so Task 15 can include the link):

```tsx
if (isNewReservation && agreementId) {
  try {
    await prisma.agreement.update({
      where: { id: agreementId },
      data: { reservationId: reservation.id },
    });
  } catch {
    // Non-fatal: reservation already succeeded. Agreement stays a signed
    // orphan and can be reconciled by admin. Do not block the success page.
  }
}
```

- [ ] **Step 3: Verify it builds**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add app/checkout/success/page.tsx
git commit -m "feat(agreement): link signed agreement to reservation after payment"
```

---

## Task 14: Agreement View Page + Access Control

**Files:**
- Create: `app/agreements/[id]/page.tsx`

- [ ] **Step 1: Create the view page**

```tsx
// app/agreements/[id]/page.tsx
import getCurrentUser from "@/app/actions/getCurrentUser";
import AgreementDocument from "@/components/agreement/AgreementDocument";
import Container from "@/components/Container";
import { isAdminEmail } from "@/lib/adminAuth";
import prisma from "@/lib/prismadb";
import type { AgreementSnapshot } from "@/lib/agreementTemplate";
import { redirect } from "next/navigation";

interface Props {
  params: { id: string };
}

function PrintButton() {
  return (
    <form action="javascript:window.print()">
      <button
        type="submit"
        className="px-4 py-2 rounded-lg bg-black text-white text-sm hover:bg-gray-800 transition"
      >
        Download PDF
      </button>
    </form>
  );
}

export default async function AgreementPage({ params }: Props) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/");

  const agreement = await prisma.agreement.findUnique({
    where: { id: params.id },
  });

  if (!agreement) redirect("/");

  const isOwner = agreement.userId === currentUser.id;
  const isAdmin = isAdminEmail(currentUser.email);
  if (!isOwner && !isAdmin) redirect("/");

  const snapshot = agreement.fieldSnapshot as unknown as AgreementSnapshot;
  const signature = {
    name: agreement.signedName,
    title: agreement.signedTitle,
    date: agreement.signedAt.toISOString().slice(0, 10),
  };

  return (
    <Container>
      <div className="max-w-3xl mx-auto py-8 print:py-0">
        <div className="flex justify-between items-center mb-6 print:hidden">
          <h1 className="text-xl font-semibold text-black">
            Signed Agreement {agreement.agreementNo}
          </h1>
          <PrintButton />
        </div>
        <div className="border border-gray-200 rounded-lg p-6 bg-white">
          <AgreementDocument snapshot={snapshot} signature={signature} />
        </div>
      </div>
    </Container>
  );
}
```

> `print:hidden` / `print:py-0` use Tailwind's print variant (on by default in Next/Tailwind). The "Download PDF" button triggers the browser's native print-to-PDF; no server dependency. If a server-rendered PDF is later required, add it behind `/agreements/[id]/pdf` without touching this page.

- [ ] **Step 2: Verify it builds**

Run: `npm run build`
Expected: build succeeds; `/agreements/[id]` route compiles.

- [ ] **Step 3: Commit**

```bash
git add app/agreements
git commit -m "feat(agreement): add signed agreement view page with access control"
```

---

## Task 15: Agreement Links in Emails + Admin Orders

**Files:**
- Modify: `lib/email.ts`, `app/checkout/success/page.tsx`, `types.ts`, `app/actions/getAllReservations.ts`, admin orders component

- [ ] **Step 1: Extend `BookingEmailData` with an optional agreement**

In `lib/email.ts`, add to the `BookingEmailData` interface:

```ts
  agreement?: {
    id: string;
    agreementNo: string;
  } | null;
```

- [ ] **Step 2: Add an agreement row + CTA to the emails**

In `sendAdminBookingNotification`, add to its booking-details `sectionTable` rows array:

```ts
      ...(data.agreement
        ? [{ label: "Agreement", value: data.agreement.agreementNo }]
        : []),
```

In `sendCustomerBookingConfirmation`, build a CTA using the existing `ctaButton` helper and insert it into the email HTML body where other CTAs render:

```ts
  const baseUrl = process.env.NEXTAUTH_URL ?? "https://botsharing.us";
  const agreementCta = data.agreement
    ? ctaButton(
        "View signed agreement",
        `${baseUrl}/agreements/${data.agreement.id}`
      )
    : "";
```

Insert `${agreementCta}` into the template literal that builds the customer email body.

- [ ] **Step 3: Pass the agreement into the email data on the success page**

In `app/checkout/success/page.tsx`, after linking the agreement (Task 13), fetch its number and include it in `emailData`. Replace the existing `const emailData = { reservation, customer, listing };` with:

```tsx
const agreementForEmail =
  isNewReservation && agreementId
    ? await prisma.agreement.findUnique({
        where: { id: agreementId },
        select: { id: true, agreementNo: true },
      })
    : null;

const emailData = {
  reservation,
  customer,
  listing,
  agreement: agreementForEmail,
};
```

- [ ] **Step 4: Surface `agreementId` on admin reservation rows**

Read `app/admin/orders/` and `app/actions/getAllReservations.ts` first to match their shapes. Then:

In `types.ts`, add to `SafeAdminReservation`:

```ts
  agreementId: string | null;
```

In `app/actions/getAllReservations.ts`, add `agreement: { select: { id: true } }` to the reservation query `include`/`select`, and map `agreementId: r.agreement?.id ?? null` onto each returned row.

- [ ] **Step 5: Render the agreement link in the admin orders table**

In the admin orders row component under `app/admin/orders/`, add a cell:

```tsx
{row.agreementId ? (
  <a
    href={`/agreements/${row.agreementId}`}
    className="text-black underline hover:text-gray-600"
  >
    View agreement
  </a>
) : (
  <span className="text-gray-400">—</span>
)}
```

(`row` = whatever the existing map variable is named — match it.)

- [ ] **Step 6: Verify it builds**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 7: Commit**

```bash
git add lib/email.ts app/checkout/success/page.tsx app/admin/orders app/actions/getAllReservations.ts types.ts
git commit -m "feat(agreement): surface agreement links in emails and admin orders"
```

---

## Task 16: E2E Flow (Playwright)

**Files:**
- Create: `e2e/agreement-signing.spec.ts`

E2E here verifies the gate + modal behavior up to the Stripe redirect. We do not drive Stripe's hosted page; we assert the agreement modal/login gate appears.

- [ ] **Step 1: Write the E2E test**

```ts
// e2e/agreement-signing.spec.ts
import { test, expect } from "@playwright/test";

test.describe("agreement signing gate", () => {
  test("Reserve surfaces the agreement modal or login gate", async ({
    page,
  }) => {
    await page.goto("/");
    // Navigate to the first service detail page.
    await page.getByRole("link").first().click();

    const reserve = page.getByRole("button", { name: /reserve|book/i });
    await reserve.first().click();

    // Authenticated → agreement modal; unauthenticated → login modal.
    // Either proves Reserve no longer jumps straight to Stripe.
    const agreementHeading = page.getByText(/Sign rental agreement/i);
    const loginHeading = page.getByText(/login|sign in|continue with/i);
    await expect(agreementHeading.or(loginHeading)).toBeVisible();
  });

  test("full signing flow enables Sign only when complete", async ({
    page,
  }) => {
    // Requires an authenticated context (NextAuth test login).
    // Steps once auth fixture exists:
    // 1. open listing, pick dates, click Reserve
    // 2. assert "Sign & continue to payment" is disabled
    // 3. fill Party C fields, scroll agreement to bottom, type name/title, check agree
    // 4. assert the button becomes enabled
    test.skip(
      !process.env.E2E_AUTH_READY,
      "Set E2E_AUTH_READY + an auth fixture to run the authenticated signing flow."
    );
  });
});
```

> The authenticated flow depends on the project's test-login mechanism (NextAuth). Wire it when an auth fixture exists; the first test runs today and proves the gate. The `test.skip` documents the gap explicitly rather than silently omitting coverage.

- [ ] **Step 2: Run the E2E suite**

Run: `npm run test:e2e`
Expected: first test passes (gate visible); second is skipped with the documented reason.

- [ ] **Step 3: Commit**

```bash
git add e2e/agreement-signing.spec.ts
git commit -m "test(agreement): add Playwright gate + signing-flow E2E scaffold"
```

---

## Task 17: Full Verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full unit/integration suite**

Run: `npm test`
Expected: all Vitest tests pass (agreementParties, agreementTemplate, agreementSignGate, clientIp, AgreementDocument, /api/agreements, /api/checkout, useAgreementModal).

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Manual end-to-end walkthrough (dev)**

Run: `npm run dev`. As a logged-in customer: open a service → pick dates/tier/count → Reserve → fill Party C fields → scroll agreement → type name/title → check agree → Sign. Confirm redirect toward Stripe. Use a Stripe test card to complete, land on `/checkout/success`, then open the agreement link from the confirmation and confirm it renders with your signature and the correct governing-law state.

- [ ] **Step 5: Final commit (if any verification fixes were needed)**

```bash
git add -A
git commit -m "chore(agreement): verification fixes"
```

---

## Self-Review Notes (author)

- **Spec coverage:** flow gate (T11), click-to-accept capture (T10), Party A/B pre-execution (T1/T9), structured immutable record (T3/T6/T7), lazy PDF via print (T14), Party C company fields (T7/T10), agreementNo (T2), IP capture (T5/T7), governing-law derivation (T1), checkout threading + linking (T12/T13), view+access (T14), emails+admin (T15), tests (T0/T16). All spec sections mapped.
- **Deviation from spec:** PDF is `window.print()` (zero-dep, Netlify-serverless-safe) rather than a dedicated `/pdf` route. Spec left the PDF approach open ("chosen at impl"), so this is in scope. Noted in T14 with an extension path.
- **Type consistency:** `AgreementSnapshot`, `SignGateState`, `AgreementBookingContext`, `PartySignatory`, `PartyCInput` defined once and reused; `buildFieldSnapshot`/`formatAgreementNo`/`isSignReady`/`clientIpFromHeaders` names consistent across producer and consumer tasks.
- **Known open detail flagged inline:** `components/inputs/Input.tsx` is react-hook-form-based, so the modal uses plain controlled inputs (T10). Admin orders row variable name + `getAllReservations` shape must be matched at T15.
- **Concurrency note:** `agreementNo` sequence uses a per-month count; under heavy concurrent signing two requests could compute the same sequence. The `@unique` constraint on `agreementNo` will reject the loser. Low risk at MVP volume; if it surfaces, wrap create in a retry-on-unique-violation loop. Documented, not built (YAGNI).
```
