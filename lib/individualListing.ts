// Pure decision logic for the individual-owned robot pool.
// No DB access here — callers pass plain objects so this stays unit-testable.

export const INDIVIDUAL_EARNINGS_PERCENT = 15;

export function individualEarningsCopy(): string {
  return `${INDIVIDUAL_EARNINGS_PERCENT}% of the price will be given to you.`;
}

export type ListingStatusValue = "AVAILABLE" | "CLAIMED";

type PoolListing = {
  isIndividualOwned: boolean;
  status: ListingStatusValue | null;
};

// A robot can be claimed only if it is an individual-owned listing still AVAILABLE.
export function canClaimListing(l: PoolListing): boolean {
  return l.isIndividualOwned === true && l.status === "AVAILABLE";
}

// Given the active individual listings already sharing a SKU, is there a conflict?
// The caller queries with status in (AVAILABLE, CLAIMED); any row means conflict.
export function hasActiveSkuConflict(
  existing: Array<{ status: ListingStatusValue | null }>
): boolean {
  return existing.some((l) => l.status === "AVAILABLE" || l.status === "CLAIMED");
}

// Customer catalog visibility: all company listings, plus CLAIMED individual ones.
export function isCustomerVisible(l: PoolListing): boolean {
  if (!l.isIndividualOwned) return true;
  return l.status === "CLAIMED";
}

// Prisma `where` fragment expressing the same rule as isCustomerVisible.
export function customerVisibilityWhere(): { OR: Array<Record<string, unknown>> } {
  return {
    OR: [
      { isIndividualOwned: false },
      { isIndividualOwned: true, status: "CLAIMED" },
    ],
  };
}
