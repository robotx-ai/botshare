import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUser, listingFindUnique, agreementFindUnique, sessionsCreate } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  listingFindUnique: vi.fn(),
  agreementFindUnique: vi.fn(),
  sessionsCreate: vi.fn(),
}));

vi.mock("@/app/actions/getCurrentUser", () => ({ default: getCurrentUser }));
vi.mock("@/lib/prismadb", () => ({
  default: {
    listing: { findUnique: listingFindUnique },
    agreement: { findUnique: agreementFindUnique },
  },
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
    listingFindUnique.mockReset();
    agreementFindUnique.mockReset();
    sessionsCreate.mockReset();
    getCurrentUser.mockResolvedValue({ id: "user1" });
    listingFindUnique.mockResolvedValue({ title: "AGIBot A2 Showcase" });
    agreementFindUnique.mockResolvedValue({ userId: "user1" });
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

  it("rejects agreementId owned by a different user with 400", async () => {
    agreementFindUnique.mockResolvedValue({ userId: "other" });
    const res = await POST(
      req({
        agreementId: "agr1",
        listingId: "listing1",
        startDate: "2026-07-01",
        endDate: "2026-07-08",
        totalPrice: 7000,
      })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid agreement.");
  });
});
