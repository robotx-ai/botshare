import { describe, it, expect } from "vitest";
import {
  ORDER_STATUSES,
  ORDER_STEPS,
  isOrderStatus,
  nextHappyStatus,
  resolveOrderRole,
  canTransition,
  type OrderStatus,
} from "./orderStatus";

describe("isOrderStatus", () => {
  it("accepts known statuses", () => {
    expect(isOrderStatus("PLACED")).toBe(true);
    expect(isOrderStatus("COMPLETED")).toBe(true);
  });
  it("rejects unknown values", () => {
    expect(isOrderStatus("BOGUS")).toBe(false);
    expect(isOrderStatus("")).toBe(false);
  });
});

describe("ORDER_STEPS", () => {
  it("is the 7 happy-path states in order, excluding CANCELLED", () => {
    expect(ORDER_STEPS).toEqual([
      "PLACED",
      "CONFIRMED",
      "SHIPPED",
      "DELIVERED",
      "RETURN_INITIATED",
      "RETURN_RECEIVED",
      "COMPLETED",
    ]);
    expect(ORDER_STATUSES).toContain("CANCELLED");
  });
});

describe("nextHappyStatus", () => {
  it("returns the next step", () => {
    expect(nextHappyStatus("PLACED")).toBe("CONFIRMED");
    expect(nextHappyStatus("RETURN_RECEIVED")).toBe("COMPLETED");
  });
  it("returns null at terminal/last states", () => {
    expect(nextHappyStatus("COMPLETED")).toBeNull();
    expect(nextHappyStatus("CANCELLED")).toBeNull();
  });
});

describe("resolveOrderRole", () => {
  const base = { currentUserId: "u1", customerId: "cust", providerId: "prov", isAdmin: false };
  it("returns admin when isAdmin, regardless of ids", () => {
    expect(resolveOrderRole({ ...base, isAdmin: true })).toBe("admin");
  });
  it("returns customer when current user booked", () => {
    expect(resolveOrderRole({ ...base, currentUserId: "cust" })).toBe("customer");
  });
  it("returns provider when current user owns the listing", () => {
    expect(resolveOrderRole({ ...base, currentUserId: "prov" })).toBe("provider");
  });
  it("returns null for an unrelated user", () => {
    expect(resolveOrderRole(base)).toBeNull();
  });
});

describe("canTransition — happy path", () => {
  const legal: Array<[OrderStatus, OrderStatus, "provider" | "customer"]> = [
    ["PLACED", "CONFIRMED", "provider"],
    ["CONFIRMED", "SHIPPED", "provider"],
    ["SHIPPED", "DELIVERED", "customer"],
    ["DELIVERED", "RETURN_INITIATED", "customer"],
    ["RETURN_INITIATED", "RETURN_RECEIVED", "provider"],
    ["RETURN_RECEIVED", "COMPLETED", "provider"],
  ];
  it.each(legal)("%s -> %s allowed for %s and for admin", (from, to, role) => {
    expect(canTransition(from, to, role)).toBe(true);
    expect(canTransition(from, to, "admin")).toBe(true);
  });
  it("denies the wrong role", () => {
    expect(canTransition("PLACED", "CONFIRMED", "customer")).toBe(false);
    expect(canTransition("SHIPPED", "DELIVERED", "provider")).toBe(false);
  });
});

describe("canTransition — illegal shapes", () => {
  it("denies skips and rewinds", () => {
    expect(canTransition("PLACED", "SHIPPED", "admin")).toBe(false);
    expect(canTransition("CONFIRMED", "PLACED", "admin")).toBe(false);
    expect(canTransition("DELIVERED", "CONFIRMED", "admin")).toBe(false);
  });
  it("denies any transition out of terminal states", () => {
    expect(canTransition("COMPLETED", "CANCELLED", "admin")).toBe(false);
    expect(canTransition("CANCELLED", "PLACED", "admin")).toBe(false);
  });
});

describe("canTransition — cancel rules", () => {
  it("customer/provider may cancel only pre-ship (PLACED, CONFIRMED)", () => {
    expect(canTransition("PLACED", "CANCELLED", "customer")).toBe(true);
    expect(canTransition("CONFIRMED", "CANCELLED", "provider")).toBe(true);
    expect(canTransition("SHIPPED", "CANCELLED", "customer")).toBe(false);
    expect(canTransition("DELIVERED", "CANCELLED", "provider")).toBe(false);
  });
  it("admin may cancel from any non-terminal state", () => {
    expect(canTransition("SHIPPED", "CANCELLED", "admin")).toBe(true);
    expect(canTransition("RETURN_RECEIVED", "CANCELLED", "admin")).toBe(true);
    expect(canTransition("COMPLETED", "CANCELLED", "admin")).toBe(false);
  });
});
