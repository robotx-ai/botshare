import { describe, expect, it } from "vitest";
import {
  TEMPLATE_VERSION,
  formatAgreementNo,
  termDurationDays,
  buildFieldSnapshot,
} from "./agreementTemplate";
import { PARTY_A, PARTY_B } from "./agreementParties";

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
