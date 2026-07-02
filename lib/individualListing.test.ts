import { describe, it, expect } from "vitest";
import {
  INDIVIDUAL_EARNINGS_PERCENT,
  individualEarningsCopy,
  canClaimListing,
  hasActiveSkuConflict,
  isCustomerVisible,
  customerVisibilityWhere,
} from "./individualListing";

describe("earnings copy", () => {
  it("is 15 percent", () => {
    expect(INDIVIDUAL_EARNINGS_PERCENT).toBe(15);
    expect(individualEarningsCopy()).toBe("15% of the price will be given to you.");
  });
});

describe("canClaimListing", () => {
  it("allows claiming an available individual robot", () => {
    expect(canClaimListing({ isIndividualOwned: true, status: "AVAILABLE" })).toBe(true);
  });
  it("rejects an already-claimed robot", () => {
    expect(canClaimListing({ isIndividualOwned: true, status: "CLAIMED" })).toBe(false);
  });
  it("rejects a normal company listing", () => {
    expect(canClaimListing({ isIndividualOwned: false, status: null })).toBe(false);
  });
});

describe("hasActiveSkuConflict", () => {
  it("is true when an active listing exists", () => {
    expect(hasActiveSkuConflict([{ status: "AVAILABLE" }])).toBe(true);
    expect(hasActiveSkuConflict([{ status: "CLAIMED" }])).toBe(true);
  });
  it("is false when none exist", () => {
    expect(hasActiveSkuConflict([])).toBe(false);
  });
});

describe("isCustomerVisible", () => {
  it("shows company listings", () => {
    expect(isCustomerVisible({ isIndividualOwned: false, status: null })).toBe(true);
  });
  it("shows claimed individual robots", () => {
    expect(isCustomerVisible({ isIndividualOwned: true, status: "CLAIMED" })).toBe(true);
  });
  it("hides available (pool) individual robots", () => {
    expect(isCustomerVisible({ isIndividualOwned: true, status: "AVAILABLE" })).toBe(false);
  });
});

describe("customerVisibilityWhere", () => {
  it("is an OR of company listings plus claimed individual ones", () => {
    expect(customerVisibilityWhere()).toEqual({
      OR: [
        { isIndividualOwned: false },
        { isIndividualOwned: true, status: "CLAIMED" },
      ],
    });
  });
});
