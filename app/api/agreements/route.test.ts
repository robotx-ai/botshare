import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUser, findUnique, count, create } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findUnique: vi.fn(),
  count: vi.fn(),
  create: vi.fn(),
}));

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
