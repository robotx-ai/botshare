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
  metro: "VEGAS" as const,
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
