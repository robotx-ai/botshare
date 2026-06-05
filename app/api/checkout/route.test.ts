import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUser, findUnique, sessionsCreate } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findUnique: vi.fn(),
  sessionsCreate: vi.fn(),
}));

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
